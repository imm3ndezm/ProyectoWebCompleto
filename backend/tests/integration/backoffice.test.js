import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { closePool, loginAs, query, resetDatabase, stock } from './helpers.js';

before(resetDatabase);
after(closePool);

const CENTRAL = 1;
const ESCALON = 2;

async function idInsumo(nombre) {
  const [row] = await query('SELECT id FROM insumos WHERE nombre = $1', [nombre]);
  return row.id;
}

describe('Compras y cuentas por pagar', () => {
  let gerente;
  let compraId;

  before(async () => {
    gerente = await loginAs('gerente.central@origenes.sv');
  });

  it('compra a crédito: suma stock una vez y queda pendiente', async () => {
    const leche = await stock(CENTRAL, 'Leche entera');
    const res = await gerente.post('/compras', {
      proveedorId: 2,
      numeroFactura: '  FAC   9001 ',
      condicion: 'CREDITO',
      items: [{ insumoId: await idInsumo('Leche entera'), cantidad: '1000', costoUnitario: '0.0013' }],
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.estadoPago, 'PENDIENTE');
    assert.equal(res.body.numeroFactura, 'FAC 9001');
    assert.equal(res.body.total, '1.30');
    assert.equal(res.body.sucursalId, CENTRAL);
    assert.ok(res.body.fechaVencimiento);
    assert.equal(await stock(CENTRAL, 'Leche entera'), leche + 1000);
    compraId = res.body.id;

    const pendientes = await gerente.get('/compras?estadoPago=PENDIENTE');
    assert.ok(pendientes.body.items.some((c) => c.id === compraId));
  });

  it('la misma factura del mismo proveedor responde 409', async () => {
    const res = await gerente.post('/compras', {
      proveedorId: 2,
      numeroFactura: 'FAC 9001',
      condicion: 'CONTADO',
      items: [{ insumoId: await idInsumo('Leche entera'), cantidad: '1', costoUnitario: '1' }],
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'FACTURA_DUPLICADA');
  });

  it('pagar no vuelve a sumar stock y la deuda deja de aparecer', async () => {
    const leche = await stock(CENTRAL, 'Leche entera');
    const pago = await gerente.put(`/compras/${compraId}/pago`, {});
    assert.equal(pago.status, 200);
    assert.equal(pago.body.estadoPago, 'PAGADA');
    assert.ok(pago.body.fechaPago);
    assert.equal(await stock(CENTRAL, 'Leche entera'), leche);

    const pendientes = await gerente.get('/compras?estadoPago=PENDIENTE');
    assert.ok(!pendientes.body.items.some((c) => c.id === compraId));
    const otraVez = await gerente.put(`/compras/${compraId}/pago`, {});
    assert.equal(otraVez.status, 409);
  });

  it('el gerente de una sucursal no registra compras en otra', async () => {
    const res = await gerente.post('/compras', {
      sucursalId: ESCALON,
      proveedorId: 2,
      numeroFactura: 'X-1',
      condicion: 'CONTADO',
      items: [{ insumoId: 1, cantidad: '1', costoUnitario: '1' }],
    });
    assert.equal(res.status, 403);
  });

  it('un cajero no accede a compras', async () => {
    const cajero = await loginAs('prueba@origenes.sv');
    assert.equal((await cajero.get('/compras')).status, 403);
  });
});

describe('Catálogo y alertas de stock', () => {
  it('el menú tiene al menos 12 elaborados activos con disponibilidad local', async () => {
    const cajero = await loginAs('prueba@origenes.sv');
    const res = await cajero.get('/platillos');
    assert.equal(res.status, 200);
    const elaborados = res.body.items.filter((p) => p.tipo === 'ELABORADO');
    assert.ok(elaborados.length >= 12);
    assert.ok(res.body.items.every((p) => p.activo));
    assert.ok(res.body.items.every((p) => Number.isInteger(p.disponibles)));
  });

  it('alertas de stock mínimo distintas por sucursal', async () => {
    const admin = await loginAs('admin@origenes.sv');
    const central = await admin.get(`/inventario/alertas?sucursalId=${CENTRAL}`);
    const escalon = await admin.get(`/inventario/alertas?sucursalId=${ESCALON}`);
    assert.ok(central.body.items.some((i) => i.insumo === 'Jarabe de caramelo'));
    assert.ok(escalon.body.items.some((i) => i.insumo === 'Huevo'));
    assert.ok(!central.body.items.some((i) => i.insumo === 'Huevo'));
  });

  it('solo la administración central modifica el menú; reventa exige receta unitaria', async () => {
    const gerente = await loginAs('gerente.central@origenes.sv');
    const negado = await gerente.post('/platillos', {
      nombre: 'Agua mineral', precio: '1.25', tipo: 'REVENTA', receta: [{ insumoId: 18, cantidad: '1' }],
    });
    assert.equal(negado.status, 403);

    const admin = await loginAs('admin@origenes.sv');
    const mal = await admin.post('/platillos', {
      nombre: 'Agua doble', precio: '2.00', tipo: 'REVENTA',
      receta: [{ insumoId: await idInsumo('Botella de agua 500ml'), cantidad: '2' }],
    });
    assert.equal(mal.status, 400);
    assert.equal(mal.body.error.code, 'RECETA_REVENTA_INVALIDA');

    const ok = await admin.post('/platillos', {
      nombre: 'Flat White', categoria: 'Bebidas calientes', precio: '3.25', tipo: 'ELABORADO',
      receta: [
        { insumoId: await idInsumo('Café de especialidad'), cantidad: '18' },
        { insumoId: await idInsumo('Leche entera'), cantidad: '180' },
        { insumoId: await idInsumo('Vaso 12oz'), cantidad: '1' },
      ],
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.receta.length, 3);
  });
});

describe('Recursos humanos y planilla', () => {
  it('generar dos veces la misma quincena no duplica ni recalcula', async () => {
    const rrhh = await loginAs('rrhh@origenes.sv');
    const periodo = { anio: 2026, mes: 11, quincena: 1 };
    const primera = await rrhh.post('/planillas', periodo);
    assert.equal(primera.status, 201, JSON.stringify(primera.body));
    assert.ok(primera.body.items.length > 0);

    const empleado = primera.body.items.find((i) => i.cargo === 'CAJERO');
    await query('UPDATE usuarios SET salario_base = 9999 WHERE id = $1', [empleado.usuarioId]);

    const segunda = await rrhh.post('/planillas', periodo);
    assert.equal(segunda.body.generados, 0);
    assert.equal(segunda.body.items.length, primera.body.items.length);
    const despues = segunda.body.items.find((i) => i.usuarioId === empleado.usuarioId);
    assert.equal(despues.salarioBruto, empleado.salarioBruto, 'el historial no cambia');

    const [{ count }] = await query(
      'SELECT count(*)::int FROM pagos_planilla WHERE usuario_id = $1 AND anio = 2026 AND mes = 11 AND quincena = 1',
      [empleado.usuarioId],
    );
    assert.equal(count, 1);
  });

  it('calcula ISSS con tope, AFP y renta por tramo', async () => {
    const rrhh = await loginAs('rrhh@origenes.sv');
    const res = await rrhh.get('/planillas?anio=2026&mes=11&quincena=1');
    const gerente = res.body.items.find((i) => i.nombre === 'Roberto Hernández'); // salario $1,100
    assert.deepEqual(
      [gerente.salarioBruto, gerente.isss, gerente.afp, gerente.renta, gerente.salarioNeto],
      ['550.00', '15.00', '39.88', '39.50', '455.62'],
    );
  });

  it('sin permiso: cajero y gerente de sucursal reciben 403 en planilla', async () => {
    const cajero = await loginAs('prueba@origenes.sv');
    const gerente = await loginAs('gerente.central@origenes.sv');
    assert.equal((await cajero.get('/planillas?anio=2026&mes=11&quincena=1')).status, 403);
    assert.equal((await gerente.get('/planillas?anio=2026&mes=11&quincena=1')).status, 403);
    assert.equal((await cajero.get('/empleados')).status, 403);
  });

  it('RR. HH. da de alta empleados pero no administradores', async () => {
    const rrhh = await loginAs('rrhh@origenes.sv');
    const nuevo = {
      nombre: 'Elena Portillo', email: 'elena.portillo@origenes.sv', password: 'Cafe2026x',
      rol: 'EMPLEADO', cargo: 'BARISTA', salarioBase: '480.00', sucursalId: 1,
    };
    const res = await rrhh.post('/empleados', nuevo);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.doesNotMatch(JSON.stringify(res.body), /password/i);

    const admin = await rrhh.post('/empleados', { ...nuevo, email: 'otro@origenes.sv', rol: 'ADMIN' });
    assert.equal(admin.status, 403);

    const login = await loginAs('elena.portillo@origenes.sv', 'Cafe2026x');
    assert.equal(login.user.role, 'EMPLEADO');
  });
});
