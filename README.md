# AutoPartes XYZ - Login y registro seguro

Practica de modulo de autenticacion para una refaccionaria. Incluye frontend, backend, base SQLite local y controles alineados con OWASP: validacion, hash de contrasenas, CAPTCHA, limite de intentos, expiracion de sesion, sanitizacion y mensajes genericos.

## Ejecutar

```powershell
npm install
npm start
```

Abre `http://localhost:3000`.

## Probar

```powershell
npm test
```

## Mapeo de requisitos

| Control | Donde se demuestra |
| --- | --- |
| Validacion frontend + backend | `public/app.js`, atributos HTML de `public/index.html`, `src/validation.js` |
| Hash de contrasenas con salt por usuario | `src/security.js` usa `bcryptjs` con salt propio por hash |
| HTTPS/TLS | `src/server.js`, `docs/HTTPS-TLS.md` |
| CAPTCHA con validacion en servidor | `src/captcha.js`, rutas `/api/captcha`, `/api/register`, `/api/login` |
| Limite de intentos y bloqueo temporal | `express-rate-limit` por IP y `failed_attempts/locked_until` por usuario en `src/app.js` |
| Expiracion de sesion por inactividad | `express-session` con `cookie.maxAge` y middleware `lastActivity` |
| Consultas parametrizadas + sanitizacion XSS | `src/db.js` usa statements con `?`; `src/security.js` limpia textos |
| Politica de contrasenas | `src/validation.js`, `public/app.js`, barra visual en `public/index.html` |
| Mensajes de error genericos | Login responde `Correo o contrasena incorrectos.` sin revelar cual campo fallo |

## Variables utiles

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP/HTTPS. Default `3000` |
| `SESSION_SECRET` | Secreto de cookies de sesion |
| `SESSION_IDLE_MS` | Tiempo maximo de inactividad. Default 15 min |
| `LOGIN_MAX_ATTEMPTS` | Intentos permitidos. Default 5 |
| `IP_LOGIN_MAX_ATTEMPTS` | Intentos por IP dentro de la ventana. Default igual a `LOGIN_MAX_ATTEMPTS` |
| `ACCOUNT_LOCK_MS` | Bloqueo temporal por cuenta. Default 5 min |
| `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH` | Activa HTTPS local |
