# Guía de extracción de componentes del frontend

**Raíz** `C:\UcaDev\ProyectoPW\frontend`. Todas las rutas de esta guía son relativas a esa raíz. Crear los componentes en `src/components`, respetando las carpetas existentes `Inputs` y `ui`. Las líneas corresponden al código antes de la migración. El índice al final permite abrir cada archivo una sola vez.

## 1. Separar los inputs sin mezclar los diseños de login y administración

| Destino | Fuente y consumidores | Contrato que conservar |
|---|---|---|
| `src/components/Inputs/TextInput.jsx` | Implementación actual desde L7. Login en `src/pages/Auth/Login.jsx:76`. | Reservar para texto y correo. Mantener el export por defecto, Headless UI `Field/Label/Input`, etiqueta opcional, `auth-label`, `input-base` y la clase `os-input` que pasa Login. El login usa inputs sin estado controlado y lee `FormData`. Conservar `name="email"`, `type="email"`, `required` y `autoComplete="username"`. |
| `src/components/Inputs/PasswordInput.jsx` | Extraer la rama de contraseña del mismo archivo. Sustituir el segundo `TextInput` en `src/pages/Auth/Login.jsx:86`. Segundo contexto en `src/pages/RRHH/EmpleadosPage.jsx:264–271`. | Login empieza oculto y conserva `name="password"`, `current-password` y `pr-12`. Mover intactos el botón de ojo, `aria-pressed`, las etiquetas Mostrar/Ocultar contraseña y `type="button"`. Conservar Eye/EyeOff de 19 px, hover 1.12, tap 0.88, resorte 400/20 y `AnimatePresence mode="wait" initial={false}` con rotación, escala y opacidad de 0.15 s. En empleados el campo actual es administrativo y carece de ojo. Si se comparte el control, conservar esa presentación con el ojo desactivado, el `Field` exterior, `new-password`, ayuda, errores y obligatoriedad solo en alta. |
| `src/components/Inputs/MaskedInput.jsx` | Componer sobre `src/components/ui/Field.jsx:4,36` para los formularios administrativos. En `src/components/caja/ClienteSelector.jsx` ver `NrcForm` L123–167, reglas L188–193, altas L240–241 y L255. | Usar texto con `inputMode` apropiado, conservar ceros iniciales, etiqueta, ayuda y errores asociados. Ofrecer formatos DUI, NIT, NRC y teléfono. Mantener el valor de edición y el valor enviado explícitos. Si el componente devuelve un valor, adaptar los consumidores que hoy leen `e.target.value`. |

**Máscaras y datos existentes**

- **DUI** admite presentación `########-#`. No hay un campo DUI en este frontend. Dejar el formato disponible, sin crear un campo de negocio nuevo.
- **NIT del cliente** permite 9 **o** 14 dígitos y acepta guiones. El alta puede recibir un NIT prellenado desde la búsqueda (L111, L198–199). La máscara debe permitir seguir escribiendo después del noveno dígito. El NIT de proveedor en `src/pages/Compras/ProveedoresPage.jsx:78,94,111` es texto opcional y convierte vacío a `null`. Conservar su tolerancia a datos previos y evitar imponerle la validación del cliente.
- **NRC** valida de 1 a 10 dígitos. Evitar longitud fija y relleno. Es opcional al crear cliente y requerido en el formulario que completa la ficha para CCF. **Teléfono** acepta 8 dígitos cuando se informa. La búsqueda libre en `ClienteSelector.jsx:62` también acepta nombres y debe seguir libre.
- Verificar las cargas útiles actuales en `src/api/clientesApi.js:30–50` y la actualización del NRC en `ClienteSelector.jsx:141`. El frontend hoy recorta espacios y convierte los opcionales vacíos a `null` en el alta. No introducir guiones de presentación en la petición por accidente. Probar precarga, pegado con/sin guiones, retroceso sobre separadores, edición en medio, limpieza y posiciones del cursor. Conservar el foco al primer error de `src/lib/forms.js`.
- Mantener `TextField` para fechas, números y campos administrativos existentes. Sus estilos `os-input bg-white`, su etiqueta con asterisco y sus IDs de ayuda/error difieren del login. Evitar campos o etiquetas anidados al compartir el control interno.

## 2. Tablas

Crear `src/components/ui/DataTable.jsx`. Punto de partida: tabla de proveedores (L37). Extraer `table.os-table`, el caption opcional `os-sr` y la fila de encabezados. Aceptar encabezados React con clave estable, alineación y contenido accesible, más cuerpo y pie por composición. Dejar datos, formatos, acciones y condiciones de permisos en la página. `TableScroll` ya existe en `src/components/ui/PageHeader.jsx:41` y aporta región con nombre y foco de teclado. Mantener un solo contenedor donde ya existe.

| Archivo | Líneas de apertura y variantes |
|---|---|
| `src/pages/Compras/ProveedoresPage.jsx` | 37 · lista sencilla, nombre como encabezado de fila y acción Editar. |
| `src/pages/Compras/ComprasPage.jsx` | 114 · sucursal condicional, estado y acciones. 217 · detalle en modal con scroll simple y pie con total. Conservar ese contenedor sin marco adicional. |
| `src/pages/Inventario/InventarioPage.jsx` | 140 · existencias con alertas y acciones por permiso. 481 · movimientos del kárdex. |
| `src/pages/Inventario/MenuPage.jsx` | 79 · una lista por categoría, nombre accesible en el contenedor. 171 · `RecipeTable` sin marco, con caption propio. |
| `src/pages/RRHH/EmpleadosPage.jsx`, `src/pages/RRHH/PlanillaPage.jsx` | 109 · empleados. 112 · planilla, pie de totales y `colSpan`. |
| `src/pages/Caja/ComprobantesPage.jsx` | 82 · comprobantes, estados y enlaces de navegación. |
| `src/pages/Reportes/ReportesPage.jsx` | 190 · alternativa tabular del gráfico, caption con período. 225 · `BreakdownTable` ya reutiliza el desglose. 264 · productos más vendidos. |
| `src/components/caja/ArqueoTable.jsx` | 8 · encabezados y celdas cambian al cerrar turno, con pie de totales. Su contenedor L7 puede usar `TableScroll` directamente. |
| `src/components/caja/Receipt.jsx` | 54 · conservar tabla de impresión independiente. Usa espaciado compacto, alineación derecha y bordes propios. Aplicar `os-table` cambiaría el comprobante. |

Las primeras 14 aperturas usan `os-table`. Conservar `scope="col"/"row"`, `os-number`, nombres de acciones ocultos, columnas opcionales y la diferencia entre el nombre de la región y el caption. Ver estilos en `src/styles/index.css` desde `.os-scroll` y reglas de impresión al final.

## 3. Botones y pies de formulario

Crear `src/components/ui/Button.jsx`. Mantener las variantes **secondary** (`os-btn`), **primary** (`os-btn os-btn--primary`), **danger** (`os-btn os-btn--danger`) y **link** (`os-link`, sin caja). Pasar `className`, iconos como hijos, `onClick`, `disabled`, `autoFocus` y atributos ARIA al botón real. Usar `type="button"` por defecto y `submit` explícito en formularios. Revisar los sitios exactos en el índice. Mantener los `Link` de React Router como enlaces, incluso cuando llevan clases de botón.

Extraer `src/components/ui/FormActions.jsx` para la pareja Cancelar/Enviar. Conservar el callback de cancelar, textos normales y pendientes, clase de la cuadrícula, bloqueo por `busy`, variante destructiva y foco inicial. Consumidores:

| Archivos bajo `src/` | Líneas de los pares |
|---|---|
| `pages/Compras/ProveedoresPage.jsx` · `pages/Compras/ComprasPage.jsx` | 114–115 · 386–387 |
| `pages/Inventario/InventarioPage.jsx` · `pages/Inventario/MenuPage.jsx` | 268–269 y 404–405 · 332–333 y 387–388 |
| `pages/RRHH/EmpleadosPage.jsx` · `components/caja/ClienteSelector.jsx` | 297–298 · 258–261, ambos en grid de dos columnas |
| `pages/Caja/ComprobantesPage.jsx` | 264–267, anulación con foco en Cancelar |

En `src/components/ui/Modal.jsx:54,57` el segundo botón llama a `onConfirm` directamente. Reutilizar `Button` conservando ese evento y el foco de confirmación destructiva. La tarjeta de producto, controles de cantidad y selectores de categoría de `PosPage`, las barras interactivas de `ReportesPage` y el botón de contraseña tienen controles propios. Mantener sus áreas de clic, estados y animaciones.

## 4. Selectores y filtros

Crear un `src/components/ui/Select.jsx` nativo con `os-input bg-white`, opciones como hijos y paso de atributos al DOM. Componerlo desde `SelectField` (`src/components/ui/Field.jsx:44`) y `BranchSelect` (`src/components/ui/BranchSelect.jsx:5`). Los filtros en línea llevan etiqueta horizontal y `w-auto`. El campo de formulario usa el ancho completo y recibe IDs y errores de `Field`. Las aperturas exactas aparecen abajo.

- **Compras** L75,83: estado y proveedor, este último con `max-w-64`. **Inventario** L441,450: insumo y tipo; mantener `max-w-56` del insumo. **Empleados** L73 y **Comprobantes** L50 conservan valores de texto. **Planilla** L80,88 convierte mes y quincena a número en sus callbacks.
- **Sucursal**: `BranchSelect` gestiona carga, error, `allowAll`, valor vacío y salida `number | null`. En `src/components/caja/CajaStatus.jsx:37` la fuente de sucursales ya viene del contexto de Caja y el evento pasa la cadena a `selectBranch`. Usar solo el control visual allí y mantener la altura compacta.
- **Menú de usuario**: `src/components/layouts/AdminLayout.jsx:130–204` usa Headless UI Menu, panel con foco, opacidad/escala (150 ms) y giro de flecha (200 ms). Conservarlo como menú de acciones. La búsqueda de clientes L62–99 es una lista interactiva de resultados. Ninguno corresponde al select nativo.

## 5. Otras extracciones con usos concretos

| Patrón | Dónde buscar | Alcance |
|---|---|---|
| Tarjeta de métrica | `src/pages/Compras/ComprasPage.jsx:196` (`Stat`), `src/pages/Reportes/ReportesPage.jsx:124` (`Metric`) | Crear `ui/MetricCard.jsx` con etiqueta, valor y período opcional. Mantener `dt/dd` dentro del `dl` actual. |
| Quitar/agregar insumo | `src/pages/Compras/ComprasPage.jsx:364,375`, `src/pages/Inventario/MenuPage.jsx:310,321` | Compartir el botón de quitar si coincide el marcado. Conservar nombre accesible con el número de fila, deshabilitación y lógica de líneas en cada formulario. Para agregar basta `Button`. |
| Fechas desde/hasta | `src/pages/Reportes/ReportesPage.jsx:50,60`, `src/pages/Inventario/InventarioPage.jsx:459,463` | Compartir el control visual si admite los anchos y atributos actuales. Cada página conserva límites, validación del rango y consulta. |
| Estado de Caja | `src/components/caja/CajaStatus.jsx:11–24`, `src/components/ui/PageHeader.jsx:35` | Reusar `Badge` admitiendo `className` para iconos y espaciado. Conservar el contenedor `aria-live`. |

Ya existen `PageHeader/Card/Badge/TableScroll` en `ui/PageHeader.jsx`, `Loading/ErrorState/EmptyState/Alert` en `ui/Feedback.jsx` y `Modal/ConfirmDialog` en `ui/Modal.jsx` (todos bajo `src/components`). Reutilizar sus exportaciones. En el modal conservar portal, backdrop, transición de 150 ms y `motion-reduce`. En los estados de carga conservar el spinner y su tratamiento de movimiento reducido.

## Índice de aperturas JSX

Rutas relativas a **`src/`**. Cada número señala la línea inicial de la etiqueta en el archivo original. «select» es el control HTML, «SelectField» su consumidor administrativo. Incluye controles especializados para poder distinguirlos durante la migración.

| Archivo | Etiquetas y líneas |
|---|---|
| `components/Inputs/TextInput.jsx` | `motion.button` 52 |
| `components/caja/CajaStatus.jsx` | `select` 37 |
| `components/caja/ClienteSelector.jsx` | `button` 48, 82, 104, 165, 258, 261 · `input` 62 · `SelectField` 244, 249 |
| `components/layouts/AdminLayout.jsx` | `button` 101, 193, 296 |
| `components/ui/BranchSelect.jsx` | `select` 11 |
| `components/ui/Feedback.jsx` | `button` 25, 40 |
| `components/ui/Field.jsx` | `input` 39 · `select` 48 |
| `components/ui/Modal.jsx` | `button` 21, 54, 57 |
| `context/ProtectedRoute.jsx` | `button` 26 |
| `pages/Auth/Login.jsx` | `button` 101 |
| `pages/Caja/ComprobantesPage.jsx` | `select` 50 · `button` 142, 146, 264, 267 |
| `pages/Caja/PosPage.jsx` | `input` 88, 352, 434 · `button` 99, 132, 250, 271, 283, 389, 413 |
| `pages/Caja/TurnoPage.jsx` | `button` 113, 240 |
| `pages/Compras/ComprasPage.jsx` | `button` 65, 147, 149, 364, 375, 386, 387 · `BranchSelect` 72, 317 · `select` 75, 83 · `SelectField` 321, 328, 350 |
| `pages/Compras/ProveedoresPage.jsx` | `button` 23, 52, 114, 115 |
| `pages/Inventario/InventarioPage.jsx` | `BranchSelect` 61 · `button` 69, 96, 105, 164, 169, 173, 268, 269, 404, 405 · `input` 116, 367, 459, 463 · `SelectField` 339 · `select` 441, 450 |
| `pages/Inventario/MenuPage.jsx` | `button` 56, 59, 97, 310, 321, 332, 333, 387, 388 · `SelectField` 270, 290, 373 · `input` 275 |
| `pages/RRHH/EmpleadosPage.jsx` | `button` 62, 136, 138, 297, 298 · `BranchSelect` 70 · `select` 73 · `input` 81 · `SelectField` 272, 277, 283 |
| `pages/RRHH/PlanillaPage.jsx` | `button` 60 · `input` 69 · `select` 80, 88 · `BranchSelect` 93 |
| `pages/Reportes/ReportesPage.jsx` | `input` 50, 60 · `BranchSelect` 69 · `button` 148, 162 |

## Verificación de la migración

Ejecutar `npm run lint` y `npm run build` desde el frontend y distinguir fallos preexistentes de regresiones. Comparar antes/después el login con teclado, el alta y edición de clientes/empleados, las tablas con desbordamiento móvil y totales, los filtros por sucursal, la confirmación destructiva y la vista previa de impresión del comprobante. Verificar hover, foco, estados deshabilitados y movimiento reducido donde ya existían. En los formularios con máscara comprobar el valor enviado además del visible.

