import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { closePool, idPlatillo, loginAs, query, resetDatabase, stock } from './helpers.js';

after(closePool);

const CENTRAL = 1;
const ESCALON = 2;

async function idInsumo(nombre) {
  const [row] = await query('SELECT id FROM insumos WHERE nombre = $1', [nombre]);
  return row.id;
}

const hoy = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);

let cajero;
let gerente;
let turno;
let latte;

before(async () => {
  await resetDatabase();
  cajero = await loginAs('prueba@origenes.sv');
  gerente = await loginAs('gerente.central@origenes.sv');
  latte = await idPlatillo('Latte Grande');
  turno = (await cajero.post('/turnos', { montoInicial: '20.00' })).body;
});

const venderLatte = (metodoPago = 'EFECTIVO', cantidad = 1) =>
  cajero.post('/ventas', {
    turnoId: turno.id, tipoDoc: 'FACTURA', metodoPago, items: [{ platilloId: latte, cantidad }],
  });

describe('Anulación de ventas', () => {
  it('devuelve el stock, deja kardex y la venta sale del arqueo', async () => {
    const leche = await stock(CENTRAL, 'Leche entera');
    const venta = (await venderLatte('EFECTIVO', 2)).body;
    assert.equal(await stock(CENTRAL, 'Leche entera'), leche - 500);

    const res = await gerente.post(`/ventas/${venta.id}/anulacion`, { motivo: 'Cliente canceló el pedido' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.anulada, true);
    assert.equal(res.body.numero, venta.numero, 'conserva su correlativo');
    assert.equal(res.body.motivoAnulacion, 'Cliente canceló el pedido');
    assert.equal(res.body.stockRevertido, true);
    assert.equal(await stock(CENTRAL, 'Leche entera'), leche);

    const movimientos = await query(
      'SELECT tipo, sum(cantidad) AS neto FROM movimientos_inventario WHERE venta_id = $1 GROUP BY tipo ORDER BY tipo',
      [venta.id],
    );
    // 2 lattes: café 36 + leche 500 + vaso 2 + tapadera 2 + viñeta 2 = 542.
    assert.deepEqual(movimientos.map((m) => [m.tipo, Number(m.neto)]), [
      ['ANULACION_VENTA', 542],
      ['VENTA', -542],
    ]);

    const resumen = (await cajero.get(`/turnos/${turno.id}`)).body;
    const efectivo = resumen.arqueo.medios.find((m) => m.metodo === 'EFECTIVO');
    assert.equal(efectivo.vendido, '0.00');
    assert.deepEqual(resumen.arqueo.anuladas, { ventas: 1, total: '7.00' });
  });

  it('no se anula dos veces, ni la anula un cajero, ni otra sucursal', async () => {
    const venta = (await venderLatte()).body;
    assert.equal((await cajero.post(`/ventas/${venta.id}/anulacion`, { motivo: 'Me equivoqué' })).status, 403);

    const otraSucursal = await loginAs('gerente.escalon@origenes.sv');
    assert.equal((await otraSucursal.post(`/ventas/${venta.id}/anulacion`, { motivo: 'Prueba ajena' })).status, 403);

    assert.equal((await gerente.post(`/ventas/${venta.id}/anulacion`, { motivo: 'ok' })).status, 400, 'motivo muy corto');
    assert.equal((await gerente.post(`/ventas/${venta.id}/anulacion`, { motivo: 'Error de digitación' })).status, 200);
    const otra = await gerente.post(`/ventas/${venta.id}/anulacion`, { motivo: 'Error de digitación' });
    assert.equal(otra.status, 409);
    assert.equal(otra.body.error.code, 'VENTA_YA_ANULADA');
  });

  it('una venta de un turno cerrado no se anula', async () => {
    const [cerrada] = await query(
      "SELECT v.id FROM ventas v JOIN turnos_caja t ON t.id = v.turno_id WHERE t.estado = 'CERRADO' AND v.sucursal_id = $1 LIMIT 1",
      [CENTRAL],
    );
    const res = await gerente.post(`/ventas/${cerrada.id}/anulacion`, { motivo: 'Fuera de tiempo' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'TURNO_CERRADO');
  });

  it('el listado marca las anuladas y permite filtrarlas', async () => {
    const res = await gerente.get(`/ventas?turnoId=${turno.id}&anulada=true`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 2);
    assert.ok(res.body.items.every((v) => v.anulada));
  });
});

describe('Ajustes de stock y kardex', () => {
  it('merma descuenta y queda en el historial con motivo y usuario', async () => {
    const insumoId = await idInsumo('Leche entera');
    const antes = await stock(CENTRAL, 'Leche entera');
    const res = await gerente.post('/inventario/ajustes', {
      insumoId, motivo: 'MERMA', cantidad: '-750', nota: 'Leche cortada',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(Number(res.body.stockActual), antes - 750);

    const kardex = await gerente.get(`/inventario/movimientos?insumoId=${insumoId}&tipo=AJUSTE`);
    const [ultimo] = kardex.body.items;
    assert.equal(ultimo.motivo, 'MERMA');
    assert.equal(Number(ultimo.cantidad), -750);
    assert.equal(Number(ultimo.stockResultante), antes - 750);
    assert.equal(ultimo.usuario, 'Roberto Hernández');
    assert.equal(ultimo.nota, 'Leche cortada');
  });

  it('conteo físico fija el stock y calcula la diferencia', async () => {
    const insumoId = await idInsumo('Croissant');
    const antes = await stock(CENTRAL, 'Croissant');
    const res = await gerente.post('/inventario/ajustes', { insumoId, motivo: 'CONTEO', stockContado: '42' });
    assert.equal(res.status, 201);
    assert.equal(Number(res.body.stockActual), 42);
    assert.equal(Number(res.body.cantidad), 42 - antes);
  });

  it('rechaza dejar stock negativo, ajustes sin cambio y datos incoherentes', async () => {
    const insumoId = await idInsumo('Huevo');
    const negativo = await gerente.post('/inventario/ajustes', { insumoId, motivo: 'DANO', cantidad: '-100000' });
    assert.equal(negativo.status, 409);
    assert.equal(negativo.body.error.code, 'STOCK_NEGATIVO');

    const actual = String(await stock(CENTRAL, 'Huevo'));
    const igual = await gerente.post('/inventario/ajustes', { insumoId, motivo: 'CONTEO', stockContado: actual });
    assert.equal(igual.status, 400);

    const mezcla = await gerente.post('/inventario/ajustes', { insumoId, motivo: 'CONTEO', cantidad: '5' });
    assert.equal(mezcla.status, 400);
  });

  it('las ventas y compras también dejan movimientos', async () => {
    const venta = (await venderLatte()).body;
    const [{ count }] = await query(
      "SELECT count(*)::int FROM movimientos_inventario WHERE venta_id = $1 AND tipo = 'VENTA'",
      [venta.id],
    );
    assert.equal(count, 5);

    const compra = await gerente.post('/compras', {
      proveedorId: 3, numeroFactura: 'K-1', condicion: 'CONTADO',
      items: [{ insumoId: await idInsumo('Tapadera'), cantidad: '100', costoUnitario: '0.04' }],
    });
    assert.equal(compra.status, 201);
    const mov = await gerente.get(`/inventario/movimientos?tipo=COMPRA`);
    assert.equal(mov.body.items[0].compraId, compra.body.id);
    assert.equal(Number(mov.body.items[0].cantidad), 100);
  });

  it('cajero no ajusta; gerente no ajusta otra sucursal', async () => {
    const insumoId = await idInsumo('Huevo');
    assert.equal((await cajero.post('/inventario/ajustes', { insumoId, motivo: 'MERMA', cantidad: '-1' })).status, 403);
    const ajena = await gerente.post('/inventario/ajustes', {
      sucursalId: ESCALON, insumoId, motivo: 'MERMA', cantidad: '-1',
    });
    assert.equal(ajena.status, 403);
  });
});

describe('Reportes de ventas', () => {
  it('resume por día, sucursal, medio de pago y tipo, sin anuladas', async () => {
    await venderLatte('TARJETA');
    const admin = await loginAs('admin@origenes.sv');
    const res = await admin.get(`/reportes/ventas?desde=${hoy()}&hasta=${hoy()}&sucursalId=${CENTRAL}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const [esperado] = await query(
      `SELECT count(*)::int AS n, COALESCE(sum(total),0)::numeric(12,2) AS total FROM ventas
       WHERE sucursal_id = $1 AND anulada_en IS NULL AND creado_en::date = $2::date`,
      [CENTRAL, hoy()],
    );
    assert.equal(res.body.totales.ventas, esperado.n);
    assert.equal(res.body.totales.total, esperado.total);
    assert.ok(res.body.anuladas.ventas >= 2);

    const sumaMetodos = res.body.porMetodo.reduce((a, m) => a + Number(m.total), 0);
    assert.equal(sumaMetodos.toFixed(2), esperado.total);
    assert.equal(res.body.porMetodo.find((m) => m.metodoPago === 'BITCOIN').etiqueta, 'Bitcoin/Chivo Wallet');
    assert.deepEqual(res.body.porDia.map((d) => d.fecha), [hoy()]);
    assert.equal(res.body.porSucursal.length, 1);
  });

  it('la administración central ve todas las sucursales; el gerente solo la suya', async () => {
    const admin = await loginAs('admin@origenes.sv');
    const desde = new Date(Date.parse(hoy()) - 20 * 86_400_000).toISOString().slice(0, 10);
    const todas = await admin.get(`/reportes/ventas?desde=${desde}&hasta=${hoy()}`);
    assert.equal(todas.body.porSucursal.length, 3);
    assert.equal(todas.body.porDia.length, 21);

    assert.equal((await gerente.get(`/reportes/ventas?desde=${desde}&hasta=${hoy()}&sucursalId=${ESCALON}`)).status, 403);
    const propia = await gerente.get(`/reportes/ventas?desde=${desde}&hasta=${hoy()}`);
    assert.deepEqual(propia.body.porSucursal.map((s) => s.sucursalId), [CENTRAL]);
  });

  it('productos más vendidos y validaciones del período', async () => {
    const res = await gerente.get(`/reportes/productos?desde=${hoy()}&hasta=${hoy()}&limite=5`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.some((p) => p.nombre === 'Latte Grande'));

    assert.equal((await gerente.get('/reportes/ventas?desde=2026-11-10&hasta=2026-11-01')).status, 400);
    assert.equal((await gerente.get('/reportes/ventas?desde=2024-01-01&hasta=2026-11-01')).status, 400);
    assert.equal((await cajero.get(`/reportes/ventas?desde=${hoy()}&hasta=${hoy()}`)).status, 403);
  });
});
