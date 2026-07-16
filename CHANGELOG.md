# Changelog

## 4.0.1 — Omniscient Hybrid & Desktop

- Integración opcional con motor localhost protegido por clave.
- Playwright con Chromium, Chrome, Edge, Firefox y WebKit.
- DOM renderizado, scroll inteligente, capturas PNG, PDF, red y consola.
- Perfiles persistentes y sesión manual visible.
- SQLite, crawl del mismo origen, OCR Tesseract, Ollama local, FFprobe y Git.
- Protección SSRF, DNS privado, redirecciones, límites y rate limiting.
- Nueva vista premium “Motor local”.
- Base segura para la edición Electron.

## 3.3.0 — Identidad cósmica y hardening

### Identidad visual

- Sustituido el antiguo orbe S4 por el logotipo cósmico aportado por I. Roig.
- Logotipo aplicado al topbar, hero animado, favicon, Apple Touch Icon e iconos PWA.
- Recurso principal optimizado a WebP: 267 KB frente a 2,06 MB del PNG de origen.
- Nuevo icono maskable con zona segura para evitar recortes en Android/PWA.
- El logo animado permanece visible en móvil y respeta `prefers-reduced-motion` y el ajuste interno de movimiento.

### Seguridad y privacidad

- Las URL privadas/locales (`localhost`, RFC1918, link-local, mDNS, IPv6 local y IPv4 mapeada en IPv6) se fuerzan a descarga directa y nunca se reenvían a AllOrigins, CodeTabs ni al proxy personalizado.
- Corregido un posible falso positivo que habría tratado dominios públicos iniciados por `fc` o `fd` como IPv6 privadas.
- Ajustes persistidos saneados: modos, timeout, límite HTML y proxy personalizado se validan y vuelven a valores seguros si `localStorage` está corrupto o manipulado.
- Los proxies personalizados exigen plantilla `{url}`, protocolo HTTP/HTTPS y ausencia de credenciales embebidas.
- La descarga remota ahora lee el cuerpo en streaming y corta en cuanto supera el presupuesto, evitando cargar respuestas gigantes completas en memoria cuando no existe `Content-Length` fiable.

### Fiabilidad y mantenibilidad

- Límite local de 2.000 archivos convertido en error explícito: ya no se descartan archivos silenciosamente.
- Corregida la deriva de versión del footer.
- Reparadas las pruebas empaquetadas: ya no dependen de una carpeta `build/` inexistente ni comprueban la versión 3.1.0.
- Añadidos `package.json` y `package-lock.json` reproducibles, con `npm test` como entrada única.
- Añadidas suites de recursos/PWA y hardening de proxy, red privada, ajustes y streaming.
- 117 comprobaciones automatizadas superadas y smoke test en Chromium real para escritorio, móvil, demo, skins y reducción de movimiento.

## 3.2.0 — Extracción total de tablas

### Corregido

- **P0 — Pérdida silenciosa de datos en tablas.** `extractTables` recortaba a 30 tablas × 50 filas × 25 celdas, pero `rowCount` seguía informando el total real de la página. El informe decía "400 filas" y exportaba 50, sin avisar. Medido sobre un fixture de 60 tablas × 400 filas: **se extraía el 6,3 % del contenido** (1.500 de 24.000 filas). Ahora se extrae todo hasta un presupuesto global de 300.000 celdas.
- **P1 — colspan/rowspan ignorados.** Las celdas combinadas no se expandían, así que cualquier tabla con `colspan`/`rowspan` se exportaba desalineada y el CSV salía corrupto. Ahora se expanden a una rejilla rectangular real.
- **P1 — Inyección de fórmulas por TAB/CR.** `csvEscape` neutralizaba `=`, `+`, `-` y `@`, pero no los prefijos de tabulador y retorno de carro, que Excel y Google Sheets también interpretan como fórmula.

### Añadido

- **CSV por tabla**: botón de descarga en cada tabla de la vista Datos.
- **Carpeta `tablas/` en el ZIP**: cada tabla extraída como CSV independiente, con BOM UTF-8 y CRLF (RFC 4180).
- **Metadatos honestos por tabla**: `rowCount` (lo que hay en la página) frente a `extractedRows` (lo que se extrajo), más `truncated`, `headers`, `cellCount`, `id` y `className`. Si algo se recorta, la interfaz lo dice.
- Vista previa de **todas** las tablas detectadas (antes solo 8).

### Verificado

70 checks automatizados en 5 suites (jsdom + css-tree), todos en verde.

## 3.1.0 — Skin Engine

### Añadido

- **Motor de skins (6 temas)**: `Obsidian` (Universo 404, por defecto), `Cobalt`, `Viridian`, `Crimson`, `Mono` y `Paper` (claro real, no una inversión forzada). Los skins redefinen únicamente los tokens CSS de `:root`; el resto del CSS ya los consumía, así que el motor de análisis y los resultados no se ven afectados.
- **Selector visual de skins** con muestras de color reales, `aria-pressed` y aplicación instantánea.
- **Control de densidad**: compacta / normal / amplia, para ajustar cuántos datos caben por pantalla.
- **Control de movimiento**: desactiva animaciones manualmente. `prefers-reduced-motion` se sigue respetando de forma independiente.
- **Diálogo de configuración con pestañas**: separa Apariencia de Motor de descarga. El botón ◐ del topbar abre Apariencia; ⚙ abre Motor.
- Preferencias persistidas en `localStorage` bajo `scraper404_definitive_appearance`.

### Cambiado

- `theme-color` y `color-scheme` se actualizan al cambiar de skin, de modo que la PWA instalada y la barra del navegador coinciden con el tema activo.
- Tokens de acento generalizados (`--accent`, `--accent-2`, `--on-accent`); `--gold` se mantiene como alias para no romper el CSS existente.
- Superficies que estaban codificadas en oscuro (inputs, `workspace-nav`, `data-table th`, toast, progress, visores) ahora tienen override explícito en el skin `Paper`.

### Seguridad

- Las preferencias leídas de `localStorage` se sanean contra listas blancas antes de tocar `dataset` o el DOM. Un valor corrupto o malicioso cae al valor por defecto en lugar de propagarse.
- El script anti-FOUC es inline por necesidad (debe ejecutarse antes del primer pintado). En vez de abrir la CSP con `unsafe-inline`, se autoriza mediante hash `sha256-` concreto. Un test verifica que el hash coincide con el script real.

### Corregido

- Coherencia de versión: `README` declaraba 3.0.1 mientras el código iba por 3.0.2. Ahora `app.js`, `sw.js`, `manifest.json`, README y CHANGELOG dicen 3.1.0, verificado por test.

## 3.0.2 — Corrección de regresión

### Corregido

- **Alto (regresión propia)**: la CSP endurecida en 3.0.1 (`connect-src https:`) bloqueaba silenciosamente el análisis de cualquier web servida por `http://`, aunque `normalizeURL` las admite explícitamente y son un caso de uso real (intranets antiguas, dispositivos IoT, sitios legacy). Restaurado `connect-src https: http:`.

## 3.0.1 — Auditoría multidisciplinar

### Corregido

- **Crítico**: `TypeError` al renderizar la tabla del lote (`appendLinkCell` recibía un `td` en lugar del `tr`); habría roto el modo lote en su primer uso real. Cubierto con test de regresión.
- **Alto**: la fila del extractor regex usaba el grid de 3 columnas del selector CSS con 5 controles; ahora tiene su propio layout `.regex-row` con versión móvil.
- **Alto**: cancelar durante un análisis por lote era absorbido por el ejecutor concurrente y terminaba como "Lote completado"; ahora se propaga y muestra "Análisis cancelado".
- **Medio**: los elementos SVG (tagName en minúsculas) no se excluían del contenido legible; comparación normalizada.
- **Medio**: el botón de Wayback de un fallo anterior persistía al iniciar un análisis nuevo; se limpia al arrancar cualquier flujo.
- **Medio**: CSP endurecida (`connect-src https:` — `http:` era redundante con `upgrade-insecure-requests`).
- **Bajo**: el lote acepta URLs separadas por comas además de saltos de línea.

### Cambiado

- Diálogo de privacidad y PRIVACY.md documentan r.jina.ai, archive.org, el servicio de favicons de Google y el límite de 12 páginas del lote.
- Aviso honesto sobre patrones regex con retroceso catastrófico en la ayuda del extractor.

## 3.0.0 — Omniscient

### Añadido

- **Vista Contenido**: texto legible reconstruido del HTML (encabezados, párrafos, listas, citas, tablas, código) visible en la interfaz en tres modos (texto, Markdown, HTML original), con copia y descarga en TXT, MD, HTML y CSS combinado.
- **Análisis por lote**: hasta 12 URLs en modo ligero con tabla comparativa de puntuaciones, CSV y relleno automático desde el último sitemap.
- **Matriz de contraste WCAG** sobre los pares texto/fondo del CSS, resolviendo variables CSS una capa.
- **Vista previa SERP de Google y tarjeta social Open Graph** simuladas a partir de los metadatos, con contadores de longitud.
- **Extractor por expresión regular** (HTML o texto visible, grupos de captura, exportación TXT).
- **Comparador A/B** persistente: puntuaciones, hallazgos, peso, tecnologías y tokens lado a lado con deltas coloreados.
- **Expediente ZIP**: empaquetador ZIP nativo (método STORE + CRC32, cero dependencias) con todos los artefactos, el contenido legible y el snapshot HTML/CSS.
- **Paleta PNG** de colores dominantes generada con canvas.
- **Rescate SPA** opcional vía r.jina.ai para contenido renderizado en cliente.
- **Integración Wayback Machine**: si la descarga falla, busca y analiza la copia más reciente de archive.org.
- Detección de feeds RSS / Atom / JSON Feed.
- Exportación del texto renderizado del rescate SPA.

### Corregido

- Los colores declarados como `var(--x)` en `color` y `background` ahora se resuelven contra las variables del CSS, alimentando contraste y tokens.
- Patrón de detección de Magento afinado para eliminar falsos positivos (verificado empíricamente contra github.com).
- Validación de hostnames en el lote: se descartan entradas sin dominio válido.

### Verificado

- 23 comprobaciones automatizadas con jsdom (demo, contraste, previews, regex, selector, comparador, ZIP con verificación `unzip -t`, lote, contenido y descargas).
- Scraping real de extremo a extremo contra github.com: 576 KB de HTML, 106 enlaces, robots.txt, degradación limpia de CSS bloqueado y vista de contenido con 8.300+ caracteres.

## 2.0.0 — Definitive

### Añadido

- Arquitectura separada en `index.html`, `styles.css` y `app.js`.
- Entrada por URL pública, código pegado y proyecto local.
- Estrategia CORS configurable: directo, AllOrigins, CodeTabs y proxy personalizado.
- Cancelación, timeout y límites de tamaño.
- Descarga y análisis de CSS externo.
- Modo profundo con `@import` y Web App Manifest.
- Extracción de design system: tokens, paleta, tipografía, spacing, radios, sombras, gradientes, motion y breakpoints.
- Clasificación de estilo visual y mapa de componentes.
- Auditorías SEO, accesibilidad, rendimiento y seguridad observable.
- Detección de tecnologías y servicios.
- Inventario de enlaces, imágenes, recursos, formularios, tablas y datos estructurados.
- Selector CSS con salida de texto, HTML, URL y JSON de atributos.
- Nueve exportaciones profesionales más CSV específicos.
- Historial local, configuración persistente y aviso de privacidad.
- Interfaz responsive premium y navegación lateral adaptable a móvil.

### Corregido

- Eliminada la estructura duplicada de carpetas del paquete original.
- Canonical convertido a URL absoluta cuando es posible.
- Filtrado de protocolos peligrosos.
- Neutralización de CSV Injection.
- Validación del tamaño de respuestas.
- Mensajes de privacidad corregidos: el análisis es local, la descarga puede usar terceros.
- PWA con rutas correctas y caché exclusivo del shell.
- Manejo seguro cuando `localStorage` no está disponible.

### Cambiado

- Retirado `corsproxy.io` del modo automático porque su uso de producción puede requerir clave.
- El análisis ya no depende de un único `index.html` monolítico.
