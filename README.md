# Scraper 404 Omniscient Web v4.0.1

Interfaz estática publicable en GitHub Pages. Funciona de forma autónoma como analizador web y puede vincularse con **Scraper 404 Local Engine** para ejecutar Playwright, capturas, PDF, sesiones, OCR, Ollama, FFmpeg, Git y SQLite.

## Solo web

Abre `index.html` mediante un servidor HTTP o publícalo en GitHub Pages. Las descargas remotas dependen de CORS o de los proxies configurados. En este modo no se ejecuta el JavaScript de la página objetivo.

## Web + motor local

1. Arranca la carpeta `local-engine` con `npm start`.
2. Copia la clave mostrada en el terminal.
3. Abre ⚙ → **Motor local**.
4. Pega la clave y pulsa **Probar conexión**.
5. Deja activada la opción **Preferir motor local Playwright**.

La clave y la dirección del motor se guardan en el almacenamiento del navegador. No instales scripts ajenos en el mismo origen ni compartas la clave.

## Despliegue

Sube a GitHub Pages `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js`, `.nojekyll`, `assets`, `icons`, `PRIVACY.md`, `LICENSE` y este README.

## Pruebas

```bash
npm install
npm test
```
