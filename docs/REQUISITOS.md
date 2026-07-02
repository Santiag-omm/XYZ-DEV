# Evidencia de controles adicionales

## Sanitizacion contra inyeccion SQL / XSS

- SQL: `src/db.js` usa consultas preparadas con marcadores `?`, evitando concatenar entradas del usuario.
- XSS: `src/security.js` limpia texto con `sanitize-html` antes de almacenar nombre, telefono y direccion.
- Render: `public/app.js` escribe datos del perfil con `textContent`, no con `innerHTML`.

## Politica de contrasenas

- Longitud permitida: 8 a 72 caracteres.
- Requiere mayuscula, minuscula, numero y simbolo.
- La misma regla existe en frontend (`public/app.js`) y backend (`src/validation.js`).
