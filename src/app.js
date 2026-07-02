import express from "express";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { createCaptcha, verifyCaptcha } from "./captcha.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  registerFailedAttempt,
  resetFailedAttempts
} from "./db.js";
import {
  hashPassword,
  isLocked,
  lockDurationMsForAttempts,
  lockMinutesForAttempts,
  nextFailedLoginState,
  sanitizeText,
  verifyPassword
} from "./security.js";
import { SqliteSessionStore } from "./session-store.js";
import { loginSchema, registerSchema, validate } from "./validation.js";

const invalidLoginMessage = "Credenciales invalidas.";

export function createApp() {
  const app = express();
  fs.mkdirSync(config.dataDir, { recursive: true });
  const sessionStore = new SqliteSessionStore({ dir: config.dataDir });
  app.locals.sessionStore = sessionStore;

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          formAction: ["'self'"]
        }
      }
    })
  );

  app.use(express.json({ limit: "20kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      name: "autopartes.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: Boolean(config.httpsKeyPath && config.httpsCertPath),
        maxAge: config.sessionIdleMs
      },
      store: sessionStore
    })
  );

  app.use((req, res, next) => {
    if (!req.session.userId) {
      return next();
    }

    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;

    if (now - lastActivity > config.sessionIdleMs) {
      return req.session.destroy(() => {
        res.status(401).json({ message: "Sesion expirada por inactividad." });
      });
    }

    req.session.lastActivity = now;
    return next();
  });

  app.use(express.static(path.join(config.rootDir, "public")));

  const loginLimiter = rateLimit({
    windowMs: config.loginWindowMs,
    limit: config.ipLoginMaxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Demasiados intentos. Intenta de nuevo mas tarde." }
  });

  app.get("/api/captcha", (req, res) => {
    res.json(createCaptcha(req));
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const parsed = validate(registerSchema, req.body);
      if (!parsed.ok) {
        return res.status(400).json({ message: "Revisa los campos marcados.", errors: parsed.errors });
      }

      if (!verifyCaptcha(req, parsed.data.captchaAnswer)) {
        return res.status(400).json({ message: "No se pudo validar el CAPTCHA." });
      }

      const passwordHash = await hashPassword(parsed.data.password);
      createUser({
        name: sanitizeText(parsed.data.name),
        email: parsed.data.email,
        phone: sanitizeText(parsed.data.phone),
        address: sanitizeText(parsed.data.address),
        passwordHash
      });

      return res.status(201).json({ message: "Cuenta creada correctamente." });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ message: "No se pudo crear la cuenta con esos datos." });
      }

      return next(error);
    }
  });

  app.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      if (isSessionLoginLocked(req)) {
        return res
          .status(423)
          .json(lockPayload(req.session.loginLockedUntil, req.session.loginLockMinutes));
      }

      const parsed = validate(loginSchema, req.body);
      if (!parsed.ok) {
        return res.status(400).json({ message: invalidLoginMessage });
      }

      if (!verifyCaptcha(req, parsed.data.captchaAnswer)) {
        return res.status(400).json({ message: invalidLoginMessage });
      }

      const user = findUserByEmail(parsed.data.email);
      if (!user) {
        const lockState = lockSessionLogin(req);
        return res.status(423).json(lockPayload(lockState.lockedUntil, lockState.lockMinutes));
      }

      if (isLocked(user)) {
        req.session.loginLockedUntil = Number(user.locked_until);
        req.session.loginLockMinutes = lockMinutesForAttempts(user.failed_attempts);
        return res
          .status(423)
          .json(lockPayload(user.locked_until, req.session.loginLockMinutes));
      }

      const passwordOk = await verifyPassword(parsed.data.password, user.password_hash);
      if (!passwordOk) {
        const failedState = nextFailedLoginState(user.failed_attempts);
        registerFailedAttempt(user.id, failedState.failedAttempts, failedState.lockedUntil);
        req.session.loginFailures = failedState.failedAttempts;
        req.session.loginLockedUntil = failedState.lockedUntil;
        req.session.loginLockMinutes = failedState.lockMinutes;
        return res.status(423).json(lockPayload(failedState.lockedUntil, failedState.lockMinutes));
      }

      resetFailedAttempts(user.id);
      req.session.regenerate((error) => {
        if (error) {
          return next(error);
        }

        req.session.userId = user.id;
        req.session.lastActivity = Date.now();
        return res.json({
          message: "Sesion iniciada.",
          user: publicUser(user)
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "No autenticado." });
    }

    const user = findUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "No autenticado." });
    }

    return res.json({ user: publicUser(user) });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("autopartes.sid");
      res.json({ message: "Sesion cerrada." });
    });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: "Ocurrio un error interno." });
  });

  return app;
}

function isSessionLoginLocked(req) {
  return Boolean(req.session.loginLockedUntil && Number(req.session.loginLockedUntil) > Date.now());
}

function lockSessionLogin(req) {
  const loginFailures = Number(req.session.loginFailures || 0) + 1;
  const lockMinutes = lockMinutesForAttempts(loginFailures);
  const lockedUntil = Date.now() + lockDurationMsForAttempts(loginFailures);

  req.session.loginFailures = loginFailures;
  req.session.loginLockedUntil = lockedUntil;
  req.session.loginLockMinutes = lockMinutes;

  return { lockedUntil, lockMinutes };
}

function lockPayload(lockedUntil, lockMinutes) {
  const retryAfterMs = Math.max(Number(lockedUntil) - Date.now(), 1000);

  return {
    message: `Acceso bloqueado temporalmente. Intenta de nuevo en ${formatDuration(retryAfterMs)}.`,
    retryAfterMs,
    lockMinutes: Math.min(Math.max(Number(lockMinutes) || 1, 1), config.loginMaxLockMinutes)
  };
}

function formatDuration(durationMs) {
  if (durationMs >= 60 * 1000) {
    const minutes = Math.ceil(durationMs / (60 * 1000));
    return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  }

  const seconds = Math.ceil(durationMs / 1000);
  return seconds === 1 ? "1 segundo" : `${seconds} segundos`;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address
  };
}
