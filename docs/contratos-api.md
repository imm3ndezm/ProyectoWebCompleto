# Contratos de la API · Orígenes SV

Todas las rutas son relativas a `VITE_API_URL` = `http://localhost:3000/api/v1`.
El frontend usa la instancia de `frontend/src/api/axios.js` (`withCredentials: true`).

## Convenciones

| Tema | Regla |
|---|---|
| Listados | `{ "items": [...] }` (algunos agregan `resumen` o `totales`). |
| Dinero y cantidades | Cadenas decimales: `"3.50"`, `"18.000"`. Nunca `float`. |
| Precios | `platillos.precio` es precio al público **con IVA incluido**. |
| Fechas | Columnas de fecha (`fecha`, `fechaVencimiento`, `fechaPago`…) llegan como `"AAAA-MM-DD"`. Fechas con hora (`creadoEn`, `abiertoEn`…) como ISO 8601 en UTC. |
| Errores | `{"error":{"code":"STOCK_INSUFICIENTE","message":"…","details":[…]}}` |
| Códigos HTTP | 400 datos inválidos · 401 sin sesión · 403 sin permiso o CSRF inválido · 404 no existe · 409 conflicto de negocio · 429 demasiados intentos |
| Escrituras | POST/PUT exigen `X-CSRF-Token` (axios.js lo agrega solo). |
| Sucursal | Usuarios con sucursal solo ven la suya: pedir otra responde 403. La administración central (ADMIN sin sucursal) puede pasar `sucursalId`. |

`400 DATOS_INVALIDOS` trae `details: [{ campo, mensaje }]` para marcar el formulario.

## Roles

| Rol / cargo | Puede |
|---|---|
| ADMIN sin sucursal (administración central) | Todo, en todas las sucursales. Único que modifica menú, insumos y recetas, y crea cuentas ADMIN. |
| ADMIN con sucursal (gerente) | Caja, ventas, anulaciones, inventario y ajustes, compras, proveedores y reportes de su sucursal; ver empleados de su sucursal. |
| RRHH | Empleados y planilla de todas las sucursales. No accede a caja, ventas ni clientes. |
| EMPLEADO | Ventas, clientes, consulta de menú e inventario de su sucursal. Solo cargos CAJERO o GERENTE abren turno. |

## Autenticación (sin cambios para React)

| Método y ruta | Entrada | Respuesta |
|---|---|---|
| GET `/auth/csrf` | — | `{ csrfToken }` |
| POST `/auth/login` | `{ email, password }` | `{ user }` + cookies |
| POST `/auth/refresh` | cookie `os_rt` | `{ user }` + cookies nuevas, o 401 |
| GET `/auth/me` | cookie `os_at` | `{ user }` o 401 |
| POST `/auth/logout` | cookies | 204 |

`user = { id, name, email, role, cargo, branchId, branchName }`. Nunca incluye hash ni salario.

**Cómo funciona la sesión**

- `os_at`: JWT HS256 de 15 min (configurable). Payload mínimo: `sub` (usuario) y `sid` (sesión). Cookie HttpOnly.
- `os_rt`: token opaco aleatorio de 7 días, cookie HttpOnly limitada a `/api/v1/auth`. En la tabla `sesiones` se guarda solo su SHA-256.
- Cada `refresh` rota `os_rt`. Si llega un `os_rt` ya rotado (después de 30 s de gracia para pestañas simultáneas), se revoca la sesión entera: indica robo.
- En cada petición, Express verifica el JWT y además que la sesión no esté revocada y el usuario siga activo. Logout, baja de un empleado o cambio de rol/contraseña cortan el acceso al instante.
- `axios.js`: ante un 401, llama una sola vez a `/auth/refresh` (compartido entre peticiones simultáneas) y repite la petición. Si el refresh falla, se ejecuta el manejo de sesión vencida.
- Ningún token toca `localStorage` ni es legible desde JavaScript.

## Catálogo e inventario

| Método y ruta | Rol | Entrada / salida |
|---|---|---|
| GET `/sucursales` | todos | Sedes visibles para el usuario. |
| GET `/platillos?sucursalId=&categoria=&incluirInactivos=` | todos | Menú. `disponibles`: unidades que alcanzan con el stock local. |
| GET `/platillos/:id` · GET `/platillos/:id/receta` | todos | Platillo con receta `[{insumoId,nombre,unidad,cantidad}]`. |
| POST `/platillos` | admin central | `{nombre,categoria?,precio,tipo,imagen?,receta:[{insumoId,cantidad}]}` |
| PUT `/platillos/:id` · PUT `/platillos/:id/receta` | admin central | Cambios parciales · `{items:[…]}` reemplaza la receta. |
| GET `/insumos` · POST `/insumos` · PUT `/insumos/:id` | ADMIN/EMPLEADO · admin central | Alta crea la fila de stock (0) en todas las sucursales. |
| GET `/inventario?sucursalId=&estado=alertas\|agotados` | ADMIN, EMPLEADO | Stock, mínimo, `alerta`, `agotado`. |
| GET `/inventario/alertas?sucursalId=` | ADMIN, EMPLEADO | Insumos con stock ≤ mínimo. |
| PUT `/inventario/:insumoId` | ADMIN | `{sucursalId?, stockMinimo}` |
| POST `/inventario/ajustes` | ADMIN | Ajuste manual con movimiento (ver abajo). |
| GET `/inventario/movimientos?sucursalId=&insumoId=&tipo=&desde=&hasta=&limite=` | ADMIN | Kardex: historial de movimientos, del más reciente al más antiguo (límite 100 por defecto, máx. 500). |

Un producto de **REVENTA** se descuenta por unidad: su receta es un único insumo en `unidad` con cantidad 1 (si no, 400 `RECETA_REVENTA_INVALIDA`).

### Ajuste manual de stock

```js
// Salida por merma, caducidad, daño o corrección: cantidad con signo.
await api.post("/inventario/ajustes", {
  insumoId: 2, motivo: "MERMA", cantidad: "-750", nota: "Leche cortada",
});
// Conteo físico: se manda lo contado y el sistema calcula la diferencia.
await api.post("/inventario/ajustes", { insumoId: 11, motivo: "CONTEO", stockContado: "42" });
```

- `motivo`: `MERMA` | `CADUCIDAD` | `DANO` | `CONTEO` | `CORRECCION`. `CONTEO` lleva `stockContado`; los demás llevan `cantidad` (negativa sale, positiva entra). `nota` opcional (200).
- Respuesta 201: `{ sucursalId, insumoId, insumo, unidad, motivo, cantidad, stockAnterior, stockActual, stockMinimo, alerta }`.
- Errores: 409 `STOCK_NEGATIVO`, 400 `AJUSTE_SIN_CAMBIO`, 409 `SIN_STOCK_REGISTRADO`.

### Kardex (movimientos de inventario)

Cada cambio de stock deja un movimiento: `tipo` `VENTA` (salida), `ANULACION_VENTA` (devolución), `COMPRA` (entrada) o `AJUSTE`.
Item: `{ id, sucursalId, sucursal, insumoId, insumo, unidad, tipo, motivo, cantidad, stockResultante, nota, ventaId, compraId, usuarioId, usuario, creadoEn }`.
`cantidad` lleva signo (+ entra, − sale). Las ventas y compras de los datos de demo son anteriores al kardex y no tienen movimientos.

## Clientes fiscales (CCF)

| Método y ruta | Entrada | Notas |
|---|---|---|
| GET `/clientes?buscar=&incluirInactivos=&limite=` | texto | Busca por nombre, o por prefijo de NIT/NRC si son dígitos. |
| POST `/clientes` | `nombre, nit, direccion, giro, tipo_contribuyente, tamano_contribuyente` + opcionales `nrc, correo, telefono` | 201 con la ficha. Se aceptan guiones en NIT/NRC; se guardan solo dígitos. |
| PUT `/clientes/:id` | cualquier subconjunto + `activo` | 409 `NIT_DUPLICADO` / `NRC_DUPLICADO`. |

Roles: ADMIN y EMPLEADO.

## Caja

| Método y ruta | Entrada | Respuesta |
|---|---|---|
| POST `/turnos` | `{ sucursalId?, montoInicial }` | 201 turno con `arqueo`. 409 `TURNO_YA_ABIERTO`. |
| GET `/turnos/actual?sucursalId=` | — | `{ turno }` (o `null`) del usuario. |
| GET `/turnos/:id` | — | Turno + `arqueo`. |
| POST `/turnos/:id/cierre` | `{ efectivoContado, tarjetaReportada, bitcoinReportado }` | Turno cerrado con diferencias. |
| GET `/turnos?sucursalId=&estado=&desde=&hasta=` | ADMIN | Historial. |

`arqueo.medios[]`: `{ metodo, etiqueta, ventas, vendido, esperado, declarado, diferencia }`.
`arqueo.anuladas`: `{ ventas, total }`. Las ventas anuladas no cuentan en `vendido` ni en `esperado`.
Solo el efectivo suma el fondo inicial. `diferencia = declarado − esperado`.
Ejemplo: fondo $20, venta en efectivo $10, conteo $29 → esperado `"30.00"`, diferencia `"-1.00"`.
`BITCOIN` se muestra como «Bitcoin/Chivo Wallet».

## Ventas

```js
import api from "./axios";

const { data } = await api.post("/ventas", {
  turnoId,                       // turno ABIERTO del propio cajero
  tipoDoc: "CCF",                // o "FACTURA"
  metodoPago: "TARJETA",         // EFECTIVO | TARJETA | BITCOIN
  clienteId,                     // obligatorio para CCF
  claveOperacion: crypto.randomUUID(), // opcional: una por pedido, para reintentos
  items: [{ platilloId: 4, cantidad: 1 }],
});
```

Respuesta 201:

```json
{
  "id": 851, "tipoDoc": "CCF", "numero": 47, "sucursalId": 1, "turnoId": 99,
  "metodoPago": "TARJETA", "clienteId": 7,
  "cliente": { "id": 7, "nombre": "…", "nit": "06141111111010", "nrc": "0123456" },
  "subtotal": "3.10", "iva": "0.40", "total": "3.50",
  "items": [{ "platilloId": 4, "nombre": "Latte Grande", "cantidad": 1, "precioUnitario": "3.50", "totalLinea": "3.50" }],
  "alertasStock": [{ "insumo": "Tapadera", "stockActual": "150.000", "stockMinimo": "200.000" }]
}
```

- El servidor decide precio, número, IVA y datos fiscales. El navegador solo manda ids y cantidades.
- IVA: `total` = suma de líneas; `subtotal` = total / 1.13 redondeado a centavos; `iva` = total − subtotal.
- Todo ocurre en una transacción: si falta un insumo, no se guarda nada (409 `STOCK_INSUFICIENTE` con `details` por insumo).
- Reintento con la misma `claveOperacion` (o encabezado `Idempotency-Key`) y el mismo pedido → 200 con la venta ya creada. Con otro pedido → 409 `CLAVE_REUTILIZADA`.
- GET `/ventas/:id` → comprobante para reimprimir, con la fotografía fiscal de ese momento.
- GET `/ventas?sucursalId=&turnoId=&tipoDoc=&desde=&hasta=&anulada=true|false` → listado; cada venta trae `anulada`.
- El comprobante trae `anulada`, `anuladaEn`, `anuladaPor` (nombre) y `motivoAnulacion`.

### Anular una venta (ADMIN: gerente de la sucursal o administración central)

```js
const { data } = await api.post(`/ventas/${id}/anulacion`, { motivo: "Cliente canceló el pedido" });
```

- `motivo`: de 5 a 200 caracteres, obligatorio.
- Solo ventas de un turno **ABIERTO**. Un turno cerrado ya tiene su arqueo firmado: 409 `TURNO_CERRADO`.
- En una transacción: devuelve al stock exactamente lo que la venta descontó (según su kardex, aunque la receta haya cambiado), registra movimientos `ANULACION_VENTA` y marca la venta. Conserva su número: el correlativo fiscal no se reutiliza.
- La venta deja de contar en el arqueo del turno y en los reportes.
- Respuesta 200: el comprobante con `anulada: true`, más `stockRevertido` y `stockDevuelto: [{ insumoId, cantidad, stockResultante }]`. `stockRevertido: false` solo en ventas de demo anteriores al kardex, que no habían descontado stock.
- Errores: 409 `VENTA_YA_ANULADA`, 409 `TURNO_CERRADO`, 403 si es un cajero u otra sucursal.
- En el frontend, la vista de caja debe volver a pedir `GET /turnos/:id` y el inventario después de anular (no usar la caché de `methods.js`).

Errores frecuentes: `CLIENTE_REQUERIDO` (400), `NRC_REQUERIDO`, `TURNO_CERRADO`, `PLATILLO_NO_DISPONIBLE`, `RECETA_VACIA`, `STOCK_INSUFICIENTE` (409).

## Compras y cuentas por pagar (ADMIN)

| Método y ruta | Entrada / salida |
|---|---|
| GET/POST `/proveedores` · PUT `/proveedores/:id` | `{ nombre, nit? }` |
| POST `/compras` | `{ sucursalId?, proveedorId, numeroFactura, condicion: "CONTADO"\|"CREDITO", fechaVencimiento?, items:[{insumoId, cantidad, costoUnitario}] }` |
| GET `/compras?estadoPago=PENDIENTE&sucursalId=&proveedorId=` | `{ items, resumen: { cantidad, total, totalPendiente } }`; cada compra trae `vencida`. |
| GET `/compras/:id` | Factura con detalle. |
| PUT `/compras/:id/pago` | `{ fechaPago? }` → PAGADA. No vuelve a sumar stock. |

CREDITO queda PENDIENTE (vence a 30 días si no se indica). CONTADO queda PAGADA hoy.
El número de factura se normaliza (espacios) y es único por proveedor (409 `FACTURA_DUPLICADA`).

## Reportes (ADMIN)

Gerentes: siempre su sucursal (pedir otra → 403). Administración central: `sucursalId` opcional (sin él, todas).
`desde` y `hasta` (AAAA-MM-DD, inclusive, hora de El Salvador) son obligatorios; máximo 366 días. Solo cuentan ventas no anuladas.

**GET `/reportes/ventas?desde=2026-11-01&hasta=2026-11-21&sucursalId=1`**

```json
{
  "periodo": { "desde": "2026-11-01", "hasta": "2026-11-21", "sucursalId": 1 },
  "totales": { "ventas": 420, "subtotal": "5310.62", "iva": "690.38", "total": "6001.00", "ticketPromedio": "14.29" },
  "anuladas": { "ventas": 2, "total": "10.50" },
  "porDia": [{ "fecha": "2026-11-01", "ventas": 20, "subtotal": "…", "iva": "…", "total": "…" }],
  "porSucursal": [{ "sucursalId": 1, "sucursal": "Sucursal Central", "ventas": 420, "subtotal": "…", "iva": "…", "total": "…" }],
  "porMetodo": [{ "metodoPago": "BITCOIN", "etiqueta": "Bitcoin/Chivo Wallet", "ventas": 40, "subtotal": "…", "iva": "…", "total": "…" }],
  "porTipoDoc": [{ "tipoDoc": "CCF", "ventas": 60, "subtotal": "…", "iva": "…", "total": "…" }]
}
```

`porDia` trae todos los días del período (con ceros si no hubo ventas), listo para graficar. `porMetodo` siempre trae los tres medios y `porTipoDoc` los dos tipos.

**GET `/reportes/productos?desde=&hasta=&sucursalId=&limite=10`** → `{ periodo, items: [{ platilloId, nombre, categoria, tipo, cantidad, total }] }`, ordenado por unidades vendidas (límite máx. 100).

Errores: 400 `PERIODO_INVALIDO` (desde > hasta o más de 366 días).

## Recursos humanos y planilla (RRHH y admin central)

| Método y ruta | Entrada / salida |
|---|---|
| GET `/empleados?sucursalId=&cargo=&incluirInactivos=` | También para gerentes (solo su sucursal). |
| POST `/empleados` | `{ nombre, email, password, rol, cargo, salarioBase, sucursalId }` (contraseña ≥ 8 con letras y números; se guarda con bcrypt). |
| PUT `/empleados/:id` | Parcial. Baja: `{ activo: false }`. Cambios de acceso cierran sus sesiones. |
| POST `/planillas` | `{ anio, mes, quincena, sucursalId? }` → `{ generados, existentes, items, totales }` |
| GET `/planillas?anio=2026&mes=11&quincena=1` | Pagos del período y totales. |

Cálculo (`backend/src/modules/nomina/calculo.js`): bruto = salario mensual / 2; ISSS 3 % con tope de $1,000 mensuales; AFP 7.25 %; renta según tabla quincenal sobre bruto − ISSS − AFP. Generar dos veces la misma quincena no duplica ni recalcula pagos.
