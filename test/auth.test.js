import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";

let tempDir;
let app;

describe("autenticacion segura", () => {
  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autopartes-"));
    process.env.DATA_DIR = tempDir;
    process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
    process.env.SESSION_SECRET = "clave-de-prueba-con-mas-de-32-caracteres";
    process.env.LOGIN_MAX_ATTEMPTS = "3";
    process.env.IP_LOGIN_MAX_ATTEMPTS = "10";
    process.env.ACCOUNT_LOCK_MS = "60000";

    const appModule = await import(`../src/app.js?test=${Date.now()}`);
    app = appModule.createApp();
  });

  afterEach(async () => {
    const dbModule = await import("../src/db.js");
    dbModule.closeDb();
    app.locals.sessionStore.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("registra, hashea contrasena e inicia sesion con CAPTCHA valido", async () => {
    const agent = request.agent(app);
    const captcha = await agent.get("/api/captcha").expect(200);

    await agent
      .post("/api/register")
      .send({
        name: "Ana Perez",
        email: "ana@example.com",
        phone: "5551234567",
        address: "Av. Central 123",
        password: "Seguro#123",
        captchaAnswer: solve(captcha.body.question)
      })
      .expect(201);

    const dbModule = await import("../src/db.js");
    const user = dbModule.findUserByEmail("ana@example.com");
    assert.ok(user.password_hash.startsWith("$2"));
    assert.notEqual(user.password_hash, "Seguro#123");

    const loginCaptcha = await agent.get("/api/captcha").expect(200);
    const login = await agent
      .post("/api/login")
      .send({
        email: "ana@example.com",
        password: "Seguro#123",
        captchaAnswer: solve(loginCaptcha.body.question)
      })
      .expect(200);

    assert.equal(login.body.user.email, "ana@example.com");
  });

  it("rechaza campos invalidos desde backend", async () => {
    const agent = request.agent(app);
    const captcha = await agent.get("/api/captcha").expect(200);

    const response = await agent
      .post("/api/register")
      .send({
        name: "A",
        email: "correo-malo",
        phone: "123",
        address: "x",
        password: "simple",
        captchaAnswer: solve(captcha.body.question)
      })
      .expect(400);

    assert.equal(response.body.message, "Revisa los campos marcados.");
    assert.ok(response.body.errors.length >= 4);
  });

  it("bloquea temporalmente tras varios intentos fallidos", async () => {
    const agent = request.agent(app);
    const captcha = await agent.get("/api/captcha").expect(200);

    await agent
      .post("/api/register")
      .send({
        name: "Luis Serrano",
        email: "luis@example.com",
        phone: "5559876543",
        address: "Calle Norte 456",
        password: "Seguro#123",
        captchaAnswer: solve(captcha.body.question)
      })
      .expect(201);

    for (let index = 0; index < 3; index += 1) {
      const loginCaptcha = await agent.get("/api/captcha").expect(200);
      await agent
        .post("/api/login")
        .send({
          email: "luis@example.com",
          password: "Incorrecta#123",
          captchaAnswer: solve(loginCaptcha.body.question)
        })
        .expect(401);
    }

    const goodCaptcha = await agent.get("/api/captcha").expect(200);
    await agent
      .post("/api/login")
      .send({
        email: "luis@example.com",
        password: "Seguro#123",
        captchaAnswer: solve(goodCaptcha.body.question)
      })
      .expect(401);
  });
});

function solve(question) {
  const [left, right] = question.match(/\d+/g).map(Number);
  return String(left + right);
}
