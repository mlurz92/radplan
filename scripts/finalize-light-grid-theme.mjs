import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOrFail(content, pattern, replacement, label) {
  const next = content.replace(pattern, replacement);
  if (next === content) throw new Error(`Kein Treffer für ${label}`);
  return next;
}

// 1) index.html: jeder echte App-Start beginnt synchron im Light Theme.
let index = read('index.html');
index = replaceOrFail(
  index,
  '<meta name="theme-color" content="#0B1929" id="meta-theme-color">',
  '<meta name="theme-color" content="#F4F1EA" id="meta-theme-color">',
  'meta theme-color'
);
const startupScript = `<script>\n    (function () {\n      var theme = 'light';\n      document.documentElement.setAttribute('data-theme', theme);\n      document.documentElement.style.backgroundColor = '#F4F1EA';\n      try { localStorage.setItem('radplan_v3_theme', theme); } catch (e) {}\n      try {\n        if (localStorage.getItem('radplan_v3_colorblind') === '1') {\n          document.documentElement.setAttribute('data-cb', '1');\n        }\n      } catch (e) {}\n      window.addEventListener('DOMContentLoaded', function() {\n        var favicon = document.querySelector('link[rel="icon"]');\n        if (favicon) favicon.setAttribute('href', 'img/icon.svg?v=grid-light-20260813');\n      });\n    })();\n  </script>`;
index = replaceOrFail(
  index,
  /<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/,
  startupScript,
  'Theme-Startup-Script'
);
index = index.replace(
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">'
);
write('index.html', index);

// 2) theme.js: keine automatische System-Theme-Umschaltung; manuelles Toggle bleibt erhalten.
let theme = read('js/theme.js');
theme = replaceOrFail(
  theme,
  /export function initTheme\(\) \{[\s\S]*?\n\}/,
  `export function initTheme() {\n  applyTheme("light");\n  try { localStorage.setItem(THEME_STORAGE_KEY, "light"); } catch {}\n}`,
  'initTheme'
);
write('js/theme.js', theme);

// 3) Header-Brand exakt mit der neuen animierten SVG-Datei synchronisieren.
let icons = read('js/icons.js');
const animated = read('img/icon_animated.svg').trim().replaceAll('`', '\\`').replaceAll('${', '\\${');
icons = replaceOrFail(
  icons,
  /export const ANIMATED_BRAND_ICON_SVG = `[\s\S]*?`;/,
  `export const ANIMATED_BRAND_ICON_SVG = \`${animated}\`;`,
  'ANIMATED_BRAND_ICON_SVG'
);
write('js/icons.js', icons);

// 4) README: Startverhalten an den tatsächlichen Code angleichen.
let readme = read('README.md');
const lines = readme.split(/\r?\n/);
const idx = lines.findIndex((line) => line.startsWith('* **Flicker-Schutz (FOUC-Prävention):**'));
if (idx === -1) throw new Error('README-Flicker-Schutz-Zeile nicht gefunden');
lines[idx] = '* **Flicker-Schutz & definierter Light-Start (FOUC-Prävention):** Ein Inline-`<script>` im `<head>` setzt noch vor dem ersten Rendering synchron `data-theme="light"`, die Light-Hintergrundfarbe `#F4F1EA` und den gespeicherten Theme-Wert auf `light`. RadPlan startet dadurch unabhängig von Betriebssystem-Theme oder einer früheren Dark-Mode-Sitzung immer im Hellmodus. Der Dark Mode bleibt anschließend über den Theme-Schalter manuell verfügbar; ein neuer App-Start beginnt wieder in Light.';
readme = lines.join('\n');
write('README.md', readme);

console.log('Light-Grid-Icon, Header-Brand und Light-Start konsistent aktualisiert.');
