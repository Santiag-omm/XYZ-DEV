import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import session from "express-session";

export class SqliteSessionStore extends session.Store {
  constructor({ dir, filename = "sessions.sqlite" }) {
    super();
    fs.mkdirSync(dir, { recursive: true });
    this.database = new DatabaseSync(path.join(dir, filename));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        expires INTEGER NOT NULL,
        data TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
    `);
  }

  get(sid, callback) {
    try {
      const row = this.database
        .prepare("SELECT data, expires FROM sessions WHERE sid = ?")
        .get(sid);

      if (!row) {
        return callback();
      }

      if (Number(row.expires) <= Date.now()) {
        this.destroy(sid, callback);
        return undefined;
      }

      return callback(null, JSON.parse(row.data));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sessionData, callback = () => {}) {
    try {
      const expires = getExpiry(sessionData);
      const data = JSON.stringify(sessionData);

      this.database
        .prepare(
          `INSERT INTO sessions (sid, expires, data)
           VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data`
        )
        .run(sid, expires, data);

      return callback();
    } catch (error) {
      return callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.database.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      return callback();
    } catch (error) {
      return callback(error);
    }
  }

  touch(sid, sessionData, callback = () => {}) {
    try {
      this.database
        .prepare("UPDATE sessions SET expires = ? WHERE sid = ?")
        .run(getExpiry(sessionData), sid);

      return callback();
    } catch (error) {
      return callback(error);
    }
  }

  close() {
    this.database.close();
  }
}

function getExpiry(sessionData) {
  const expires = sessionData.cookie?.expires;

  if (expires) {
    return new Date(expires).getTime();
  }

  return Date.now() + 15 * 60 * 1000;
}
