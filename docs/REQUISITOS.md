# Evidencia de controles adicionales

## Sanitizacion contra inyeccion SQL / XSS

- SQL: `src/db.js` usa consultas preparadas con marcadores `?`, evitando concatenar entradas del usuario.
- XSS: `src/security.js` limpia texto con `sanitize-html` antes de almacenar nombre, telefono y direccion.
- Render: `public/app.js` escribe datos del perfil con `textContent`, no con `innerHTML`.

## Politica de contrasenas

- Longitud permitida: 8 a 72 caracteres.
- Requiere mayuscula, minuscula, numero y simbolo.
- La misma regla existe en frontend (`public/app.js`) y backend (`src/validation.js`).

## Manejo seguro de errores

- El login responde `Credenciales invalidas.` para correo inexistente, contrasena incorrecta, cuenta bloqueada o CAPTCHA fallido.
- Las respuestas no revelan si existe una cuenta asociada al correo.
- Los errores internos se responden con un mensaje generico y el detalle queda solo en consola del servidor.
