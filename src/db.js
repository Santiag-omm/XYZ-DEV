import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(config.dataDir, { recursive: true });
    db = new DatabaseSync(config.databasePath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    migrate(db);
  }

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

export function createUser({ name, email, phone, address, passwordHash }) {
  const statement = getDb().prepare(`
    INSERT INTO users (name, email, phone, address, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  return statement.run(name, email, phone, address, passwordHash);
}

export function findUserByEmail(email) {
  const statement = getDb().prepare(`
    SELECT id, name, email, phone, address, password_hash, failed_attempts, locked_until
    FROM users
    WHERE email = ?
  `);

  return statement.get(email);
}

export function findUserById(id) {
  const statement = getDb().prepare(`
    SELECT id, name, email, phone, address
    FROM users
    WHERE id = ?
  `);

  return statement.get(id);
}

export function resetFailedAttempts(userId) {
  const statement = getDb().prepare(`
    UPDATE users
    SET failed_attempts = 0, locked_until = NULL
    WHERE id = ?
  `);

  statement.run(userId);
}

export function registerFailedAttempt(userId, failedAttempts, lockedUntil) {
  const statement = getDb().prepare(`
    UPDATE users
    SET failed_attempts = ?, locked_until = ?
    WHERE id = ?
  `);

  statement.run(failedAttempts, lockedUntil, userId);
}
