# Privacidad — Scraper 404 Omniscient

## Modo web

El análisis se ejecuta en el navegador. Si la web objetivo bloquea CORS, la URL puede enviarse a AllOrigins, CodeTabs o al proxy configurado. El rescate SPA web usa r.jina.ai, Wayback consulta archive.org y la vista SERP puede pedir un favicon a Google. Estas funciones son opcionales.

## Motor local

El motor escucha en `127.0.0.1` y exige una clave aleatoria. Con Playwright puede ejecutar JavaScript, guardar capturas, PDF, cookies, perfiles e historial SQLite. Estos datos permanecen en el equipo dentro del directorio de datos del motor.

Las URL privadas y locales están bloqueadas por defecto. Activarlas permite que el motor acceda a servicios de la red interna; solo debe hacerse para destinos propios o de confianza.

## IA, OCR y multimedia

- Ollama solo se consulta en localhost.
- Tesseract procesa imágenes localmente; la primera ejecución puede descargar datos de idioma.
- FFprobe procesa temporalmente el archivo subido al motor y el temporal se elimina después.
- Scraper 404 no incluye telemetría ni analytics propios.

## Uso responsable

No intenta eludir CAPTCHA, Cloudflare, paywalls, autenticación, DRM ni controles de acceso. Utiliza la herramienta únicamente sobre contenido para el que tengas autorización o una base legítima, respetando privacidad, propiedad intelectual, robots.txt, términos de servicio y legislación aplicable.
