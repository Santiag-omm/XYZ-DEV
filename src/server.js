import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

if (config.httpsKeyPath && config.httpsCertPath) {
  const server = https.createServer(
    {
      key: fs.readFileSync(config.httpsKeyPath),
      cert: fs.readFileSync(config.httpsCertPath)
    },
    app
  );

  server.listen(config.port, () => {
    console.log(`AutoPartes XYZ escuchando en https://localhost:${config.port}`);
  });
} else {
  http.createServer(app).listen(config.port, () => {
    console.log(`AutoPartes XYZ escuchando en http://localhost:${config.port}`);
    console.log("Para HTTPS local, configura HTTPS_KEY_PATH y HTTPS_CERT_PATH.");
  });
}
