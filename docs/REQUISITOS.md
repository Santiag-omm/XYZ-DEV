# Evidencia de controles adicionales

## Sanitizacion contra inyeccion SQL / XSS

- SQL: `src/db.js` usa consultas preparadas con marcadores `?`, evitando concatenar entradas del usuario.
- XSS: `src/security.js` limpia texto con `sanitize-html` antes de almacenar nombre, telefono y direccion.
- Render: `public/app.js` escribe datos del perfil con `textContent`, no con `innerHTML`.
- Telefono: el formulario y el backend aceptan exactamente 10 digitos.

## Politica de contrasenas

- Longitud permitida: 9 a 72 caracteres.
- Requiere mayuscula, minuscula, numero y simbolo.
- La misma regla existe en frontend (`public/app.js`) y backend (`src/validation.js`).
- El formulario muestra una barra que calcula el avance de seguridad segun los requisitos cumplidos.

## Manejo seguro de errores

- El login responde `Correo o contrasena incorrectos.` para correo inexistente, contrasena incorrecta, cuenta bloqueada o CAPTCHA fallido.
- En el frontend se marcan correo y contrasena juntos para no revelar cual dato fallo.
- Las respuestas no revelan si existe una cuenta asociada al correo.
- Los errores internos se responden con un mensaje generico y el detalle queda solo en consola del servidor.
