# HTTPS/TLS

La aplicacion puede ejecutarse en HTTP para pruebas locales rapidas, pero en produccion debe publicarse solo sobre HTTPS.

## Desarrollo local con certificado propio

1. Genera o consigue un certificado local.
2. Define estas variables de entorno:

```powershell
$env:HTTPS_KEY_PATH="C:\ruta\localhost-key.pem"
$env:HTTPS_CERT_PATH="C:\ruta\localhost-cert.pem"
$env:SESSION_SECRET="cambia-esta-clave-larga-en-produccion"
npm start
```

Cuando ambas variables existen, `src/server.js` levanta `https://localhost:3000` y marca la cookie de sesion como `secure`.

## Produccion

- Usar un proxy o plataforma con TLS 1.2+ y redireccion permanente de HTTP a HTTPS.
- Activar HSTS. `helmet` ya agrega cabeceras seguras y puede configurarse en el proxy.
- Definir `TRUST_PROXY=true` si la aplicacion esta detras de un proxy confiable.
- Guardar `SESSION_SECRET` fuera del codigo fuente.
