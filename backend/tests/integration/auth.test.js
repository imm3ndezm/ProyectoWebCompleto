import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { closePool, getApp, loginAs, newBrowser, PREFIX, query, resetDatabase } from './helpers.js';
import request from 'supertest';

before(resetDatabase);
after(closePool);

const parseCookies = (res) =>
  Object.fromEntries(
    (res.headers['set-cookie'] ?? []).map((cookie) => {
      const [pair] = cookie.split(';');
      const i = pair.indexOf('=');
      return [pair.slice(0, i), pair.slice(i + 1)];
    }),
  );

describe('Autenticación y sesión', () => {
  it('login devuelve el perfil sin datos sensibles y fija cookies HttpOnly', async () => {
    const browser = await newBrowser();
    const res = await browser.post('/auth/login', { email: 'Prueba@Origenes.sv', password: 'Admin1234' });
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body.user).sort(), [
      'branchId', 'branchName', 'cargo', 'email', 'id', 'name', 'role',
    ]);
    assert.equal(res.body.user.role, 'EMPLEADO');
    const cookies = res.headers['set-cookie'].join(';');
    assert.match(cookies, /os_at=.*HttpOnly/);
    assert.match(cookies, /os_rt=.*Path=\/api\/v1\/auth.*HttpOnly/);
    assert.doesNotMatch(JSON.stringify(res.body), /password|salario/i);
  });

  it('credenciales inválidas y usuario inactivo responden el mismo 401', async () => {
    const browser = await newBrowser();
    const wrong = await browser.post('/auth/login', { email: 'prueba@origenes.sv', password: 'otra' });
    const inactive = await browser.post('/auth/login', { email: 'fernando.aguilar@origenes.sv', password: 'Admin1234' });
    const unknown = await browser.post('/auth/login', { email: 'nadie@origenes.sv', password: 'Admin1234' });
    for (const res of [wrong, inactive, unknown]) {
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'CREDENCIALES_INVALIDAS');
    }
  });

  it('las escrituras sin token CSRF responden 403', async () => {
    const res = await request(getApp())
      .post(`${PREFIX}/auth/login`)
      .send({ email: 'prueba@origenes.sv', password: 'Admin1234' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'CSRF_INVALIDO');
  });

  it('GET /auth/me restaura la sesión y responde 401 sin cookie', async () => {
    const browser = await loginAs('prueba@origenes.sv');
    const me = await browser.get('/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'prueba@origenes.sv');
    const anon = await request(getApp()).get(`${PREFIX}/auth/me`);
    assert.equal(anon.status, 401);
  });

  it('refresh rota el token; reutilizar uno viejo revoca la sesión', async () => {
    const app = getApp();
    const csrfRes = await request(app).get(`${PREFIX}/auth/csrf`);
    const csrfCookie = `os_csrf=${parseCookies(csrfRes).os_csrf}`;
    const token = csrfRes.body.csrfToken;
    const post = (path, cookies) =>
      request(app).post(`${PREFIX}${path}`).set('X-CSRF-Token', token).set('Cookie', [csrfCookie, ...cookies]);

    const login = await post('/auth/login', []).send({ email: 'ana.rivas@origenes.sv', password: 'Admin1234' });
    const original = parseCookies(login);

    const first = await post('/auth/refresh', [`os_rt=${original.os_rt}`]);
    assert.equal(first.status, 200);
    const rotated = parseCookies(first);
    assert.ok(rotated.os_rt && rotated.os_rt !== original.os_rt, 'entrega un refresh nuevo');

    // Un atacante reutiliza el refresh viejo pasado el margen de 30 s.
    await query("UPDATE sesiones SET renovada_en = now() - interval '1 minute'");
    const stolen = await post('/auth/refresh', [`os_rt=${original.os_rt}`]);
    assert.equal(stolen.status, 401);

    const me = await request(app).get(`${PREFIX}/auth/me`).set('Cookie', `os_at=${rotated.os_at}`);
    assert.equal(me.status, 401, 'la sesión legítima también quedó revocada');
  });

  it('logout revoca la sesión aunque el cliente conserve la cookie', async () => {
    const app = getApp();
    const csrfRes = await request(app).get(`${PREFIX}/auth/csrf`);
    const csrfCookie = `os_csrf=${parseCookies(csrfRes).os_csrf}`;
    const token = csrfRes.body.csrfToken;
    const login = await request(app)
      .post(`${PREFIX}/auth/login`)
      .set('X-CSRF-Token', token)
      .set('Cookie', csrfCookie)
      .send({ email: 'carlos.molina@origenes.sv', password: 'Admin1234' });
    const { os_at: access } = parseCookies(login);

    const before = await request(app).get(`${PREFIX}/auth/me`).set('Cookie', `os_at=${access}`);
    assert.equal(before.status, 200);
    const out = await request(app)
      .post(`${PREFIX}/auth/logout`)
      .set('X-CSRF-Token', token)
      .set('Cookie', [csrfCookie, `os_at=${access}`]);
    assert.equal(out.status, 204);
    const replay = await request(app).get(`${PREFIX}/auth/me`).set('Cookie', `os_at=${access}`);
    assert.equal(replay.status, 401);
  });

  it('desactivar un empleado cierra sus sesiones al instante', async () => {
    const cajera = await loginAs('sofia.quintanilla@origenes.sv');
    const rrhh = await loginAs('rrhh@origenes.sv');
    const res = await rrhh.put(`/empleados/${cajera.user.id}`, { activo: false });
    assert.equal(res.status, 200);
    assert.equal((await cajera.get('/auth/me')).status, 401);
  });
});
