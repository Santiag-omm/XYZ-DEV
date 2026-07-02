import bcrypt from "bcryptjs";
import sanitizeHtml from "sanitize-html";
import { config } from "./config.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, config.bcryptRounds);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function sanitizeText(value) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();
}

export function isLocked(user) {
  return Boolean(user.locked_until && Number(user.locked_until) > Date.now());
}

export function nextFailedLoginState(currentAttempts) {
  const failedAttempts = currentAttempts + 1;
  const lockedUntil =
    failedAttempts >= config.loginMaxAttempts ? Date.now() + config.accountLockMs : null;

  return { failedAttempts, lockedUntil };
}
