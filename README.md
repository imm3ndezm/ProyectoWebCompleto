# Orígenes SV · ERP y POS

Sistema para Restaurante Orígenes SV: ventas y facturación (Factura y CCF con IVA 13 %),
inventario por receta y por sucursal, caja por turnos, compras y cuentas por pagar,
y planilla quincenal.

```
ProyectoPW/
  frontend/   React + Vite + Tailwind
  backend/    API REST Express (módulos: auth, sucursales, clientes, inventario, caja, ventas, compras, nomina, reportes)
  database/   schema.sql, seeds.sql, reset.sql, migrations/, diagnosticos/
  docs/       contratos-api.md
```

Recorrido de una petición: `routes` → middlewares (sesión, rol, CSRF) → `controller`
(valida con zod) → `service` (reglas de negocio y transacción) → `repository` (SQL parametrizado).

## Requisitos

- Node.js 22 o superior
- PostgreSQL 15 o superior

## Puesta en marcha

1. Crear un usuario de PostgreSQL para la app (una vez), por ejemplo en `psql`:

   ```sql
   CREATE ROLE origenes_app LOGIN PASSWORD 'una-contraseña-larga' CREATEDB;
   ```

2. Backend:

   ```powershell
   cd backend
   copy .env.example .env   # completar DB_PASSWORD, JWT_SECRET y CSRF_SECRET
   npm install
   npm run db:setup         # crea la BD, instala el esquema y aplica migraciones
   npm run db:reset         # opcional: datos de demo (borra los datos actuales)
   npm run dev              # http://localhost:3000/api/v1
   ```

   Para generar cada secreto: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

3. Frontend:

   ```powershell
   cd frontend
   copy .env.example .env   # VITE_API_URL=http://localhost:3000/api/v1
   npm install
   npm run dev              # http://localhost:5173
   ```

Usuarios de demo (contraseña `Admin1234`): `admin@origenes.sv` (administración central),
`gerente.central@origenes.sv`, `rrhh@origenes.sv`, `prueba@origenes.sv` (cajero, Sucursal Central).

## Pruebas

```powershell
cd backend
npm test
```

Las pruebas usan `DB_NAME_TEST` (debe contener «test»), que se **borra y recrea** en cada corrida.
Cubren: venta de Latte Grande y descuento por receta, venta fallida sin guardar nada, dos cajeros
por el último vaso, idempotencia, CCF con y sin cliente o NRC, fotografía fiscal, arqueo, cierre
concurrente con cobro, anulación de ventas, ajustes de stock y kardex, reportes, compra a crédito
y pago, alertas por sucursal, planilla duplicada, permisos (403) y el ciclo de sesión (login,
refresh con rotación, logout, baja de empleado).

## Base de datos y migraciones

- `npm run db:setup` en una base vacía ejecuta `database/schema.sql` (línea base, ya incluye
  las migraciones 20261110 y 20261119) y luego las migraciones nuevas.
- En una base existente, `npm run db:migrate` detecta qué migraciones históricas ya están y
  aplica solo las pendientes. Todo queda registrado en `schema_migrations`.
- `20261121_02_ccf_con_cliente.sql` crea la regla «todo CCF tiene cliente» como `NOT VALID` si
  hay CCF históricos sin ficha: se aplica a toda venta nueva, y las antiguas se vinculan con
  `database/diagnosticos/clientes_ccf_historicos.sql` antes de validarla.

## Seguridad

JWT de corta vida y refresh token rotado, ambos en cookies HttpOnly (nada en `localStorage`);
sesión revocable en BD; CSRF de doble envío firmado; contraseñas con bcrypt; validación de
entradas con zod; SQL parametrizado; helmet; CORS solo para `CORS_ORIGINS`; límite de intentos
de login por IP y correo; secretos solo en `.env` (no versionado). Detalle en `docs/contratos-api.md`.
