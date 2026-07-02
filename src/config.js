import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export const config = {
  get rootDir() {
    return rootDir;
  },
  get dataDir() {
    return process.env.DATA_DIR || path.join(rootDir, "data");
  },
  get databasePath() {
    return process.env.DATABASE_PATH || path.join(this.dataDir, "autopartes.sqlite");
  },
  get port() {
    return Number(process.env.PORT || 3000);
  },
  get trustProxy() {
    return process.env.TRUST_PROXY === "true";
  },
  get sessionSecret() {
    return (
      process.env.SESSION_SECRET ||
      "solo-para-desarrollo-cambia-esta-clave-en-produccion-32-caracteres"
    );
  },
  get sessionIdleMs() {
    return Number(process.env.SESSION_IDLE_MS || 15 * 60 * 1000);
  },
  get loginWindowMs() {
    return Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
  },
  get loginMaxAttempts() {
    return Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
  },
  get ipLoginMaxAttempts() {
    return Number(process.env.IP_LOGIN_MAX_ATTEMPTS || this.loginMaxAttempts);
  },
  get accountLockMs() {
    return Number(process.env.ACCOUNT_LOCK_MS || 5 * 60 * 1000);
  },
  get bcryptRounds() {
    return Number(process.env.BCRYPT_ROUNDS || 12);
  },
  get httpsKeyPath() {
    return process.env.HTTPS_KEY_PATH;
  },
  get httpsCertPath() {
    return process.env.HTTPS_CERT_PATH;
  }
};
