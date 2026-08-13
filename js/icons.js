export const ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
  columns: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
  density: '<path d="M4 5v14M9 5v14M14 5v14M19 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
  'calendar-today': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/>',
  'calendar-check': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
  pencil: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  'more-vertical': '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  'contrast': '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 9a3 3 0 0 1 0 6z" fill="currentColor" stroke="none"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'alert-triangle': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  star: '<path d="M11.5 3.2a.5.5 0 0 1 .9 0l2.2 4.6 5 .7a.5.5 0 0 1 .3.9l-3.6 3.5.9 5a.5.5 0 0 1-.8.5L12 16.6 7.4 19a.5.5 0 0 1-.8-.5l.9-5L3.9 9.9a.5.5 0 0 1 .3-.9l5-.7z"/>',
};
export const ANIMATED_BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="radplan-brand-icon" viewBox="0 0 512 512" width="100%" height="100%" role="img" aria-label="RadPlan Planungsrad animiert">
<defs>
  <style>
    .arc{fill:none;stroke-linecap:round;animation-duration:5.4s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.4,0,.2,1)}
    .arc-a{animation-name:arcA}.arc-b{animation-name:arcB}.arc-c{animation-name:arcC}
    .node{transform-box:fill-box;transform-origin:center;animation-duration:5.4s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.34,1.2,.64,1)}
    .node-a{animation-name:nodeA}.node-b{animation-name:nodeB}.node-c{animation-name:nodeC}
    .hub{transform-box:fill-box;transform-origin:center;animation:hubPulse 5.4s ease-in-out infinite}
    .sweep{transform-origin:256px 256px;animation:sweep 5.4s linear infinite}
    .halo{animation:halo 5.4s ease-in-out infinite}
    @keyframes arcA{0%,6%,100%{opacity:.72;stroke-width:30}14%,27%{opacity:1;stroke-width:38}36%{opacity:.72;stroke-width:30}}
    @keyframes arcB{0%,30%,100%{opacity:.72;stroke-width:30}39%,52%{opacity:1;stroke-width:38}61%{opacity:.72;stroke-width:30}}
    @keyframes arcC{0%,55%,100%{opacity:.72;stroke-width:30}64%,77%{opacity:1;stroke-width:38}86%{opacity:.72;stroke-width:30}}
    @keyframes nodeA{0%,6%,100%{transform:scale(1)}18%{transform:scale(1.18)}31%{transform:scale(1)}}
    @keyframes nodeB{0%,31%,100%{transform:scale(1)}43%{transform:scale(1.18)}56%{transform:scale(1)}}
    @keyframes nodeC{0%,56%,100%{transform:scale(1)}68%{transform:scale(1.18)}81%{transform:scale(1)}}
    @keyframes hubPulse{0%,100%{transform:scale(1)}45%{transform:scale(1.035)}72%{transform:scale(.985)}}
    @keyframes sweep{0%{transform:rotate(0deg);opacity:.08}20%{opacity:.20}80%{opacity:.20}100%{transform:rotate(360deg);opacity:.08}}
    @keyframes halo{0%,100%{opacity:.65}50%{opacity:1}}
    @media (prefers-reduced-motion:reduce){.arc,.node,.hub,.sweep,.halo{animation:none!important;transform:none!important}}
  </style>
  <linearGradient id="bg" x1="70" y1="46" x2="446" y2="470" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#18283F"/>
    <stop offset=".52" stop-color="#111C2E"/>
    <stop offset="1" stop-color="#0B131F"/>
  </linearGradient>
  <linearGradient id="hubGrad" x1="214" y1="210" x2="306" y2="308" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#38BDF8"/>
    <stop offset=".52" stop-color="#0EA5E9"/>
    <stop offset="1" stop-color="#6366F1"/>
  </linearGradient>
  <radialGradient id="aura" cx="0" cy="0" r="1" gradientTransform="translate(256 246) rotate(90) scale(214)" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#0EA5E9" stop-opacity=".18"/>
    <stop offset=".66" stop-color="#6366F1" stop-opacity=".055"/>
    <stop offset="1" stop-color="#6366F1" stop-opacity="0"/>
  </radialGradient>
  <filter id="shadow" x="40" y="40" width="432" height="432" color-interpolation-filters="sRGB">
    <feDropShadow dx="0" dy="12" stdDeviation="15" flood-color="#000" flood-opacity=".34"/>
  </filter>
</defs>

<rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="url(#bg)" stroke="#FFFFFF" stroke-opacity=".10" stroke-width="3"/>
<rect x="7" y="7" width="498" height="498" rx="105" fill="none" stroke="#FFFFFF" stroke-opacity=".055" stroke-width="2"/>
<circle cx="256" cy="246" r="214" fill="url(#aura)"/>

<g filter="url(#shadow)">
  <circle cx="256" cy="256" r="142" fill="#101B2C" stroke="#D9E7F5" stroke-opacity=".92" stroke-width="20"/>
  <circle cx="256" cy="256" r="112" fill="#0B131F" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="3"/>
</g>

<path class="sweep" d="M256 256 L256 148 A108 108 0 0 1 349.53 202 Z" fill="#67D4FF" opacity=".13"/>

<path class="arc arc-a" d="M113.53 166.97 A168 168 0 0 1 345.03 113.53" stroke="#0EA5E9" stroke-width="30"/>
<path class="arc arc-b" d="M404.34 177.13 A168 168 0 0 1 334.87 404.34" stroke="#6366F1" stroke-width="30"/>
<path class="arc arc-c" d="M250.14 423.90 A168 168 0 0 1 88.10 250.14" stroke="#F97316" stroke-width="30"/>

<g stroke="#DCE8F5" stroke-opacity=".42" stroke-width="12" stroke-linecap="round">
  <path d="M256 256 L232.61 154.67"/>
  <path d="M256 256 L355.46 286.41"/>
  <path d="M256 256 L179.94 326.93"/>
</g>

<g class="node node-a"><circle cx="232.61" cy="154.67" r="23" fill="#0EA5E9" stroke="#E0F2FE" stroke-width="6"/></g>
<g class="node node-b"><circle cx="355.46" cy="286.41" r="23" fill="#6366F1" stroke="#EEF2FF" stroke-width="6"/></g>
<g class="node node-c"><circle cx="179.94" cy="326.93" r="23" fill="#F97316" stroke="#FFF7ED" stroke-width="6"/></g>

<circle class="halo" cx="256" cy="256" r="64" fill="none" stroke="#67D4FF" stroke-opacity=".18" stroke-width="5"/>
<g class="hub">
  <circle cx="256" cy="256" r="53" fill="url(#hubGrad)" stroke="#E0F2FE" stroke-opacity=".92" stroke-width="7"/>
  <circle cx="256" cy="256" r="20" fill="#0B131F"/>
  <circle cx="249" cy="249" r="6" fill="#FFFFFF" fill-opacity=".78"/>
</g>
</svg>`;

export function icon(name, opts = {}) {
  const body = ICON_PATHS[name];
  if (!body) return '';
  const size = opts.size ?? 16;
  const stroke = opts.stroke ?? 2;
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function setIcon(el, name, opts) {
  if (el) el.innerHTML = icon(name, opts);
}

export function injectBrandIcon() {
  const container = document.getElementById('brand-icon-container');
  if (container) {
    container.innerHTML = ANIMATED_BRAND_ICON_SVG;
  }
}
