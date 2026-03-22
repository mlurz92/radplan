# RadPlan — Vollständige Anwendungsdokumentation

**Digitale Dienstplan-Engine für die Klinik für Radiologie & Nuklearmedizin, Klinikum St. Georg Leipzig.**
Clientseitige Single-Page-Application (SPA) ohne Backend, ohne Cloud, ohne externe Laufzeit-Abhängigkeiten. Alle Daten verbleiben lokal im Browser des Nutzers. Vollständige automatische Erkennung und separate Bedienoberfläche für iOS- und Android-Smartphones. Progressive Web App (PWA) mit Homescreen-Installation und eigenem App-Icon.

---

## Inhaltsverzeichnis

1. [Systemarchitektur](#1-systemarchitektur)
2. [Dateistruktur & Technologiestack](#2-dateistruktur--technologiestack)
3. [Progressive Web App & Icon-System](#3-progressive-web-app--icon-system)
4. [Datenbankmodell & Persistenz](#4-datenbankmodell--persistenz)
5. [Entitäten & Nomenklatur](#5-entitäten--nomenklatur)
6. [Mitarbeitende & Qualifikationsstufen](#6-mitarbeitende--qualifikationsstufen)
7. [Desktop-Benutzeroberfläche](#7-desktop-benutzeroberfläche)
8. [Mobile Benutzeroberfläche](#8-mobile-benutzeroberfläche)
9. [Planungsmodus](#9-planungsmodus)
10. [Zelleditor](#10-zelleditor)
11. [Dienstwunsch-System](#11-dienstwunsch-system)
12. [Mitarbeiterprofil-Modal](#12-mitarbeiterprofil-modal)
13. [Abteilungsübersicht](#13-abteilungsübersicht)
14. [Export & Import](#14-export--import)
15. [Sächsische Feiertags-Engine](#15-sächsische-feiertags-engine)
16. [Auto-Planung: Überblick & Pipeline](#16-auto-planung-überblick--pipeline)
17. [Auto-Planung: Harte Restriktionen (Hard Constraints)](#17-auto-planung-harte-restriktionen-hard-constraints)
18. [Auto-Planung: Scoring für Bereitschaftsdienst (D)](#18-auto-planung-scoring-für-bereitschaftsdienst-d)
19. [Auto-Planung: Scoring für Hintergrunddienst (HG)](#19-auto-planung-scoring-für-hintergrunddienst-hg)
20. [Auto-Planung: HG-Kopplung (Bundling)](#20-auto-planung-hg-kopplung-bundling)
21. [Auto-Planung: Swap-Optimierer](#21-auto-planung-swap-optimierer)
22. [Auto-Planung: Abschlussvalidierung & Ausgabe](#22-auto-planung-abschlussvalidierung--ausgabe)
23. [Personenspezifische Sonderregeln](#23-personenspezifische-sonderregeln)
24. [Historische Fairness-Statistik](#24-historische-fairness-statistik)
25. [Wochenend-Äquivalente: Block-basierte Zählung](#25-wochenend-äquivalente-block-basierte-zählung)
26. [Keyboard-Shortcuts & Tastatursteuerung](#26-keyboard-shortcuts--tastatursteuerung)
27. [Fehlerbehandlung & Reparaturmechanismen](#27-fehlerbehandlung--reparaturmechanismen)
28. [Technische Designentscheidungen](#28-technische-designentscheidungen)

---

## 1. Systemarchitektur

RadPlan ist eine vollständig clientseitige Single-Page-Application. Kein Server, keine API-Endpunkte, keine Cloud-Synchronisation, keine externen Laufzeit-Abhängigkeiten.

**Laufzeitumgebung:** Moderner Webbrowser mit ES6+-Unterstützung. Hardwarebeschleunigtes Rendering durch gezielten `translateZ(0)`- und `will-change`-Einsatz. `contain: layout paint` auf kritischen Elementen für Render-Performance.

**Persistenzschicht:** HTML5 `localStorage`. Produktionsdaten unter Schlüssel `radplan_v3`. Planungsentwürfe unter monatsspezifischen Schlüsseln `radplan_v3_plan_YYYY-M`.

**Mobile Erkennung:** User-Agent-Prüfung beim Initialisieren via regulärem Ausdruck `/iPhone|iPad|iPod|Android/i`. Bei positivem Match wird `IS_MOBILE = true` gesetzt — die globale Konstante steuert alle branching-Entscheidungen in JavaScript und CSS. `document.body` erhält sofort die Klasse `is-mobile`, wodurch das komplette CSS-Layout automatisch in den Mobile-Modus wechselt.

**Zero-Backend:** Maximale Datensicherheit, volle DSGVO-Konformität durch ausschließlich lokale Datenhaltung. Kein Datentransfer an externe Server.

**PWA-Fähigkeit:** Web App Manifest (`manifest.json`) ermöglicht die Installation als eigenständige App auf dem Homescreen. SVG-basiertes Vektorsymbol skaliert verlustfrei auf alle Displaygrößen und -auflösungen. `display: standalone` entfernt Browser-Chrome für ein natives App-Erlebnis.

**Fonts:** IBM Plex Sans (UI-Text) und IBM Plex Mono (Codes, Badges, Terminal-Ausgaben). Laden via Google Fonts mit `preconnect`-Optimierung. Systemschrift-Fallbacks für Offline-Nutzung.

---

## 2. Dateistruktur & Technologiestack

```
radplan/
├── index.html        — Vollständiges HTML mit allen Modal-Strukturen
├── app.css           — Gesamtes Styling + vollständiges Mobile-System
├── app.js            — Gesamte Applikationslogik, 86 Funktionen
├── manifest.json     — Web App Manifest für PWA-Installation
└── img/
    ├── icon.svg              — Statisches App-Icon (Favicon, Homescreen, Manifest)
    └── icon_animated.svg     — Animiertes App-Icon (Header-Branding)
```

Kein Build-Prozess. Keine npm-Pakete. Keine Abhängigkeiten zur Laufzeit. Alle Dateien werden direkt vom Browser geladen und ausgeführt. Alle Buttons tragen `type="button"` um unerwünschtes Form-Submit-Verhalten in allen Browser-Umgebungen — speziell iOS Safari — zuverlässig zu verhindern.

**JavaScript:** `"use strict"` am Dateianfang. Globale Konstanten und Variablen, keine Module, kein Bundling. Alle 86 Funktionen sind im globalen Scope.

**CSS:** Custom Properties (`--var`-System) für alle Farben, Abstände, Maße. Glassmorphism via `backdrop-filter`. Responsive via `@media`-Queries bei 1200px, 768px, 480px. Mobile-spezifisches System via `body.is-mobile`-Selektoren.

**HTML:** Semantisches HTML5 mit ARIA-Attributen für Barrierefreiheit. Alle Modals inline im DOM als Overlay-Container. Keine dynamische Template-Engine — alle Strukturen sind statisch im Markup, Inhalte werden via JavaScript befüllt.

---

## 3. Progressive Web App & Icon-System

### 3.1 Icon-Architektur

RadPlan verwendet ein duales SVG-Icon-System:

| Datei | Typ | Verwendung | Eigenschaften |
|-------|-----|-----------|---------------|
| `img/icon.svg` | Statisch | Favicon, Apple-Touch-Icon, Manifest-Icon, Homescreen | 1024×1024 Viewbox, Vektor, verlustfrei skalierbar |
| `img/icon_animated.svg` | Animiert | Header-Branding im App-Header | 1024×1024 Viewbox, CSS-Animationen via `stroke-dasharray`/`stroke-dashoffset` |

**Icon-Design:** Dunkler Hintergrund mit abgerundeten Ecken (rx="224"), konzentrische Ringe in Cyan-Gradienten, zentrale Karten-Darstellung eines Dienstplan-Rasters mit farbigen Zellen (Rot für BD, Blau für HG), Glassmorphism-Lichtreflexe, dezente Glow-Effekte in Cyan und Indigo.

**Animiertes Icon:** Verwendet Vivus-Instant-Stil CSS-Animationen. Jedes SVG-Path-Element hat eine individuelle `stroke-dasharray`/`stroke-dashoffset`-Animation über 5200ms Dauer mit gestaffelten Startzeiten. Die Animation zeichnet alle Pfade sequenziell nach und faded sie am Ende aus. Läuft als `infinite`-Loop.

### 3.2 Web App Manifest (`manifest.json`)

```json
{
  "name": "RadPlan — Klinik für Radiologie & Nuklearmedizin",
  "short_name": "RadPlan",
  "description": "Digitaler Dienstplan für die Klinik für Radiologie & Nuklearmedizin, Klinikum St. Georg Leipzig",
  "start_url": ".",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#060D16",
  "theme_color": "#0B1929",
  "icons": [
    { "src": "img/icon.svg", "type": "image/svg+xml", "sizes": "any", "purpose": "any" },
    { "src": "img/icon.svg", "type": "image/svg+xml", "sizes": "any", "purpose": "maskable" }
  ]
}
```

**Manifest-Felder im Detail:**

| Feld | Wert | Funktion |
|------|------|----------|
| `name` | Vollständiger Titel | Angezeigt im Installationsdialog und App-Info |
| `short_name` | „RadPlan" | Angezeigt unter dem Homescreen-Icon (max. ~12 Zeichen) |
| `start_url` | `"."` | Relative URL, ermöglicht Deployment in beliebigem Verzeichnis |
| `display` | `"standalone"` | Entfernt Browser-Adressleiste, natives App-Gefühl |
| `orientation` | `"any"` | Hoch- und Querformat erlaubt |
| `background_color` | `#060D16` | Splash-Screen-Hintergrund beim App-Start (Navy-900) |
| `theme_color` | `#0B1929` | Statusleisten-Farbe auf Android (abgestimmt auf Header) |

**Icon-Purpose `maskable`:** Ermöglicht adaptives Beschneiden auf Android (runde, quadratische oder Squircle-Masken je nach Launcher). Das SVG-Icon hat ausreichend Safe-Area durch die `rx="224"`-Abrundung und den 40px Innenabstand des Hintergrund-Rechtecks.

### 3.3 HTML-Integration

Im `<head>` von `index.html`:

| Element | Funktion |
|---------|----------|
| `<link rel="icon" type="image/svg+xml" href="img/icon.svg">` | Browser-Tab-Favicon (SVG-fähige Browser) |
| `<link rel="apple-touch-icon" href="img/icon.svg">` | iOS Homescreen-Icon beim „Zum Home-Bildschirm"-Dialog |
| `<link rel="manifest" href="manifest.json">` | PWA-Manifest-Verknüpfung |
| `<meta name="apple-mobile-web-app-title" content="RadPlan">` | iOS-spezifischer App-Titel unter dem Homescreen-Icon |
| `<meta name="apple-mobile-web-app-capable" content="yes">` | iOS Standalone-Modus aktivieren |
| `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` | Transparente iOS-Statusleiste |
| `<meta name="theme-color" content="#0B1929">` | Android-Statusleisten-Farbe |

### 3.4 Header-Brand-Icon

Im App-Header wird das animierte SVG als `<img>` eingebunden:

```html
<img class="brand-icon" src="img/icon_animated.svg" alt="RadPlan" aria-hidden="true" width="30" height="30">
```

**CSS-Styling (`.brand-icon`):**
- Feste Größe: 30×30px (Desktop), 28×28px (≤480px)
- `border-radius: var(--radius-sm)` (6px) — abgerundete Ecken passend zum Gesamt-Design
- `object-fit: contain` — SVG wird proportional eingepasst
- `box-shadow: 0 2px 10px rgba(14,165,233,.2)` — dezenter Cyan-Glow
- Hover-Effekt: `transform: scale(1.05)` mit verstärktem Glow
- `will-change: transform` für GPU-beschleunigte Animation
- `aria-hidden="true"` — rein dekoratives Element, kein Screenreader-Inhalt

---

## 4. Datenbankmodell & Persistenz

### 4.1 Haupt-Datenspeicher (`radplan_v3`)

Wurzelobjekt `DATA` — flaches Dictionary mit Monatsschlüsseln.

**Monatsschlüssel-Format:** `"YYYY-M"` — Jahr vierstellig, Monat nullbasiert (0 = Januar, 11 = Dezember). Beispiel: `"2026-2"` für März 2026.

**Monatsdaten-Struktur:**
```json
{
  "2026-2": {
    "employees": ["Dr. Lurz", "Dr. Polednia"],
    "assignments": {
      "Dr. Lurz": {
        "5":  { "assignment": "MR",    "duty": "D"  },
        "6":  { "assignment": "F"                   },
        "14": {                         "duty": "HG" }
      }
    }
  }
}
```

**Tages-Zell-Objekt** pro `assignments[empName][dayNumber]`:
- `assignment` (String, optional): Arbeitsplatz-Codes via `/` kombinierbar (`"MR/CT"`) oder ein einzelner Status-Code (`"U"`, `"F"`, …)
- `duty` (String, optional): `"D"` oder `"HG"`

Beide Felder sind vollständig unabhängig — ein Mitarbeiter kann gleichzeitig einen Arbeitsplatz und einen Dienst haben.

### 4.2 Planungsentwürfe (`radplan_v3_plan_YYYY-M`)

Isolierter localStorage-Eintrag pro Monat, erzeugt beim Aktivieren des Planungsmodus:
```json
{
  "employees": ["..."],
  "assignments": { "...": { "5": { "assignment": "MR" } } },
  "wishes": {
    "Dr. Lurz": { "5": "BD_WISH", "12": "NO_DUTY" }
  }
}
```

Das `wishes`-Objekt existiert ausschließlich in Planungsentwürfen und wird beim Übernehmen in den Hauptplan nicht mit übertragen. Wünsche dienen ausschließlich als Steuerungsinput für den Auto-Planungs-Algorithmus.

### 4.3 Export-Format

Vollständiger Export enthält Produktionsdaten und alle gespeicherten Planungsentwürfe:
```json
{
  "main":  { "2026-2": { ... } },
  "plans": { "2026-2": { ... } }
}
```

Beim Import: `Object.assign`-Merge (vorhandene Daten bleiben erhalten, neue Daten werden hinzugefügt). Anschließend automatische Reparatur fehlender F-Tage nach BD.

### 4.4 Datenzugriffsfunktionen

| Funktion | Beschreibung |
|---------|-------------|
| `getMonthData(y, m)` | Liefert Monatsdaten; erzeugt neuen Eintrag mit Vormonats-Mitarbeiterliste wenn fehlend |
| `getCell(y, m, emp, day)` | Liefert Zell-Objekt oder `{}` |
| `setCell(y, m, emp, day, patch)` | Merged Patch in Zell-Objekt; löscht leere Objekte |
| `clearCell(y, m, emp, day)` | Löscht gesamten Tageseintrag |
| `dutyOwner(y, m, day, dt)` | Name des D/HG-Inhabers oder `null` |
| `dayCodeCount(y, m, day, code)` | Zählt Einträge eines Codes an einem Tag |

---

## 5. Entitäten & Nomenklatur

### 5.1 Arbeitsplätze (Workplaces)

Acht Arbeitsplätze mit festen Farb-Tokens für konsistentes UI in Tabelle, Chips, Profil-Charts:

| Code | Bezeichnung | Hintergrund | Textfarbe |
|------|------------|-------------|-----------|
| `MR` | MRT | `#DBEAFE` | `#1D4ED8` |
| `CT` | CT | `#FFEDD5` | `#C2410C` |
| `US` | Sonographie | `#CCFBF1` | `#0F766E` |
| `AN` | Angiographie | `#F3E8FF` | `#7E22CE` |
| `MA` | Mammographie | `#FCE7F3` | `#BE185D` |
| `KUS` | Kinder-US | `#DCFCE7` | `#15803D` |
| `W` | Wermsdorf | `#FEF9C3` | `#854D0E` |
| `T` | Teleradiologie | `#E0E7FF` | `#3730A3` |

Mehrfachauswahl via `/`-Konkatenation möglich (z.B. `"MR/CT"`). Zellanzeige zeigt die kombinierten Codes und die Zellfarbe orientiert sich am ersten Code der Kombination.

### 5.2 Status-Codes

| Code | Bezeichnung | Kategorie | Urlaubscode | Hintergrund | Textfarbe |
|------|-------------|-----------|-------------|-------------|-----------|
| `F` | Frei | Ruhetag | nein | `#F1F5F9` | `#475569` |
| `U` | Urlaub | Urlaub | **ja** | `#EDE9FE` | `#5B21B6` |
| `ZU` | Zusatzurlaub | Urlaub | **ja** | `#EDE9FE` | `#5B21B6` |
| `SU` | Sonderurlaub | Urlaub | **ja** | `#EDE9FE` | `#5B21B6` |
| `FZA` | Freizeitausgleich | Ausgleich | nein | `#E0E7FF` | `#3730A3` |
| `K` | Krank | Abwesenheit | nein | `#FEE2E2` | `#991B1B` |
| `KK` | Kind Krank | Abwesenheit | nein | `#FEE2E2` | `#991B1B` |
| `§15c` | §15c ArbZG | Urlaub | **ja** | `#EDE9FE` | `#5B21B6` |
| `WB` | Weiterbildung | Abwesenheit | nein | `#FEF3C7` | `#92400E` |

`VACATION_CODES = ["U", "ZU", "SU", "§15c"]` triggern den Vor-Urlaubs-Bonus (+150) und die Becker-Martin-Konfliktprüfung.

`ABSENCE_CODES = ["U", "ZU", "SU", "FZA", "K", "KK", "§15c", "WB"]` führen zum Ausschluss aus der Dienstvergabe (Hard Constraint).

Status-Codes und Arbeitsplatz-Codes sind exklusiv: Setzen eines Status löscht alle Arbeitsplätze, Setzen eines Arbeitsplatzes löscht den Status.

### 5.3 Dienst-Codes

| Code | Bezeichnung | Träger | Farben (aktiv) | Farben (inaktiv) | Folgeeffekte |
|------|-------------|--------|----------------|------------------|-------------|
| `D` | Bereitschaftsdienst | FA und AA | `#EF4444` bg, `#fff` text | `#FEE2E2` bg, `#B91C1C` text | Erzwingt `F` am Folgetag. Samstag: nur FA |
| `HG` | Hintergrunddienst | Nur FA | `#0EA5E9` bg, `#fff` text | `#E0F2FE` bg, `#0369A1` text | Telefonische Bereitschaft. Bei AA-BD: Befundfreigabe-Pflicht |

---

## 6. Mitarbeitende & Qualifikationsstufen

### 6.1 Qualifikationshierarchie & Dienst-Berechtigung

| Kürzel | Bezeichnung | D-fähig | HG-fähig | Samstags-D |
|--------|-------------|---------|----------|-----------|
| `CA` | Chefarzt | nein (befreit) | nein | — |
| `LOA` | Leitender Oberarzt | ja | ja | ja |
| `OA` | Oberarzt | ja | ja | ja |
| `OÄ` | Oberärztin | ja | ja | ja |
| `FA` | Facharzt | ja | ja | ja |
| `FÄ` | Fachärztin | ja | ja | ja |
| `AA` | Assistenzarzt | ja | **nein** | nein |
| `AÄ` | Assistenzärztin | ja | **nein** | nein |

`isFacharzt()` = `true` für CA, LOA, OA, OÄ, FA, FÄ. `isAssistenzarzt()` = `true` für AA, AÄ. Für unbekannte Mitarbeitende: `isAssistenzarzt()` gibt sicherheitshalber `true` zurück.

**HG-Kontext:** Wenn AA im D ist, muss der HG-tragende FA telefonisch erreichbar sein und am Folgetag die Befunde freigeben. Wenn FA im D ist, ist kein HG für weitere Freigaben nötig — der HG ist damit entspannter.

### 6.2 Vordefinierte Mitarbeitende mit Stammdaten

| Name | Position | Bereich / Funktion | Sonderregeln |
|------|----------|--------------------|-------------|
| Prof. Schäfer | CA | Chefarzt | Dienst-befreit (`DUTY_EXEMPT`) |
| Dr. Lurz | LOA | Leitender Oberarzt, MRT · Röntgen KV | — |
| Dr. Polednia | OA | Leiter Kinderradiologie | KUS-Kollisionsschutz (§23.2) |
| Fr. Dalitz | OÄ | Leiterin Mammographie | — |
| Fr. Thaler | FÄ | Fachärztin | — |
| Dr. Becker | OÄ | CT-Leitung | Samstags-Sonderregel + CT-Paarung (§23.3) |
| Dr. Martin | FA | CT-Vertreter | CT-Paarung mit Dr. Becker (§23.4) |
| Hr. El Houba | AA | Assistenzarzt | — |
| Fr. Licenji | AÄ | Assistenzärztin | — |
| Hr. Torki | AA | Assistenzarzt | — |
| Hr. Sebastian | AA | Assistenzarzt | Reduziertes BD-Soll (3 statt 4) |

Jedes Metadaten-Objekt enthält: `fullName`, `position`, `posLabel`, `type`, `area`, `deputy`. Mitarbeitende ohne Eintrag in `EMP_META` erhalten generischen Fallback mit Position `"—"`.

### 6.3 Positionsfarben

| Position | Hintergrund | Text | Rahmen |
|----------|------------|------|--------|
| CA | `#F3E8FF` | `#7E22CE` | `#A855F7` |
| LOA | `#DBEAFE` | `#1D4ED8` | `#3B82F6` |
| OA/OÄ | `#CCFBF1` | `#0F766E` | `#14B8A6` |
| FA/FÄ | `#DCFCE7` | `#15803D` | `#22C55E` |
| AA/AÄ | `#F1F5F9` | `#475569` | `#94A3B8` |

---

## 7. Desktop-Benutzeroberfläche

Aktiv wenn `IS_MOBILE === false`. Horizontales Tabellenraster mit vollem Funktionsumfang.

### 7.1 Strukturlayout (von oben nach unten)

1. `#app-header` — Branding, Monatsnavigation, Aktions-Toolbar
2. `#plan-bar` — Kontextuelle Planungsleiste (nur Planungsmodus)
3. `#stats-bar` — Monatliche Code-Häufigkeits-Statistik
4. `main > #grid-wrapper` — Horizontale, scrollbare Dienstplan-Tabelle

### 7.2 Header

**Branding:** Animiertes SVG-Icon (`img/icon_animated.svg`) als `<img>`-Element mit 30×30px, abgerundeten Ecken und Cyan-Glow-Schatten + „RadPlan"-Schriftzug (14px, 700 Gewicht, weiß). Bei Hover skaliert das Icon auf 105% mit verstärktem Glow.

**Monatsnavigation:** Zurück/Vorwärts mit Alt+← / Alt+→. Monatsname als `aria-live`-Region. Glassmorphism-Container mit `backdrop-filter: blur(12px)`.

**Heute-Button:** Springt zum aktuellen Monat, scrollt heutigen Tag in den sichtbaren Bereich, zeigt akzentfarbene Hervorhebung wenn aktueller Monat angezeigt wird.

Im Planungsmodus: Vorwärts/Zurück-Buttons gesperrt (Opacity 0.2, `pointer-events: none`), Planung-Button goldfarben hervorgehoben.

**Toolbar-Buttons:** `btn-today`, `btn-dept`, `btn-plan`, `btn-employees`, `btn-export` (Strg+S), `btn-import`. Jeder mit SVG-Icon und optionalem Label (`.hbtn-lbl` — ausgeblendet bei ≤1200px).

### 7.3 Stats-Bar

Horizontale scrollbare Leiste mit `overflow-x: auto` und ausgeblendeter Scrollbar. Halbdurchsichtiger Hintergrund `rgba(248,250,252,.75)` mit `backdrop-filter: blur(16px)`. Rechter Fade-Gradient als Scroll-Indikator.

Zeigt MA-Zähler (mit Personen-SVG), dann für jeden Code mit mindestens einem Eintrag: farbiger Code-Badge + Zahlenwert. Anzeigereihenfolge: D, HG, U, K, F, MR, CT, US, WB, FZA, ZU, SU, KK, §15c, AN, MA, KUS, W, T.

Im Planungsmodus: goldener oberer Rand (`border-top: 2px solid rgba(245,158,11,.25)`).

### 7.4 Dienstplan-Tabelle

Horizontal scrollbarer Container (`overflow: auto`). Mausrad-Scroll: `deltaY` wird zu `scrollLeft` addiert wenn `|deltaX| < 10` (verhindert Konflikt mit echtem horizontalem Scrollen).

**Kopfzeile (thead):** Sticky oben (`position: sticky; top: 0`). KW-Anzeige am ersten Wochentag und am 1. des Monats via ISO-8601-Berechnung. Tagesnummer (14px Mono), Wochentagskürzel (9px Uppercase), Feiertagsname (7px, ellipsis bei Überlauf). WE/FT/Heute farblich hervorgehoben. Freitag-Spalten mit verstärktem rechten Rahmen.

**Namensspalte:** Sticky links (`position: sticky; left: 0; z-index: 20`). Name (12.5px) + Positions-Badge (8.5px Monospace). Profil-Icon und Löschen-Button erscheinen beim Hover (Opacity 0→1). Klick öffnet Profil-Modal. `box-shadow: 2px 0 8px rgba(0,0,0,.03)` für Tiefenwirkung bei Scroll.

**Datenzellen:** Hintergrundfarbe aus Code-Farbtabelle via `cellColor()`. Dienst-Badge (D/HG) als absolut positionierter Chip oben rechts (7px, 800 Gewicht). Wunsch-Indikator unten links (nur Planungsmodus, 6px). Automatisch gesetzte F-Tage nach BD: kursiv, 500 Gewicht, kleiner Unterstrich-Balken (`::after`-Pseudoelement). Leere Werktage: kleiner grauer Dot (5×5px, `border-radius: 50%`). Heute: Blauer Inset-Rahmen (`box-shadow: inset 0 0 0 1px rgba(14,165,233,.3)`). Hover: `filter: brightness(.9)` + Akzent-Inset-Rahmen.

**Fußzeile (tfoot):** 4 Statistikzeilen für MR, CT, D, HG. Mehrfachbelegung bei D/HG (> 1): rote Warnung (`.warn`-Klasse mit rotem Text und rotem Hintergrund).

### 7.5 Planungsmodus-Visuals

`body.plan-mode-active` aktiviert folgende CSS-Änderungen:
- Header-Unterstrich: Gold-Gradient (von Cyan auf Gold wechselnd)
- Tabelle: goldener 3px Inset-Rahmen
- Ecken-Zelle: brauner Gradient-Hintergrund mit „PLAN"-Label (7px, F59E0B)
- Leere Werktage: goldene Dots statt graue
- Editor-Modal: brauner Header-Gradient
- Import/Mitarbeitende-Buttons: gesperrt (Opacity 0.3)
- Monatsnavigation: goldener Rahmen

---

## 8. Mobile Benutzeroberfläche

Eigenständige Darstellung für Smartphones. Kein Fallback auf skalierte Desktop-Ansicht — vollständige UX-Neukonzeption für Touch.

### 8.1 Layout-Aktivierung

`IS_MOBILE === true` → `body.classList.add("is-mobile")` → CSS-Regelwerk `body.is-mobile *` aktiviert:
- `main` ausgeblendet (Desktop-Tabelle)
- `#stats-bar` ausgeblendet
- `#mobile-view` sichtbar (`display: flex; flex-direction: column; flex: 1`)
- Alle Modals als Bottom-Sheets (Ausrichtung unten, 92vh max, Einfahrt-Animation)
- Toast zentriert über der Nav-Bar
- Chip-Mindestgröße 48px (Touch-Target-Konformität)
- Input-Font-Size 16px (verhindert iOS-Auto-Zoom)
- Plan-Bar als horizontal scrollbare, einzeilige Leiste
- `-webkit-tap-highlight-color: transparent` auf allen Elementen

### 8.2 Header (Mobile)

Vereinfacht: Brand-Icon absolut links positioniert, Monatsnavigation zentriert, Header-Actions ausgeblendet. Brand-Text ausgeblendet bei ≤768px. Icon-Größe 28×28px bei ≤480px.

### 8.3 Monats-Zusammenfassungsleiste

Horizontal scrollbar, direkt unter dem Header. Halbdurchsichtiger Hintergrund mit Blur. Zeigt MA-Zähler + farbige Code-Chips mit Zählwerten. Identische Datenbasis wie Desktop-Stats-Bar, mobile Chip-Gestaltung mit `mms-item`-Klassen. Emp-Item mit Row-Layout (horizontale Anordnung).

### 8.4 Tagesliste

Vollständig scrollbarer Bereich mit `padding-bottom` gleich `var(--mnav-h) + 16px` damit der Inhalt nicht hinter der Nav-Bar verschwindet. `overscroll-behavior: contain` verhindert Bounce-Through.

**Wochentrenner:** Vor dem ersten Tag jeder ISO-KW: `mobile-week-sep` mit „KW N" + dekorativer Trennlinie (Monospace, 9px, rgba weiß).

**Tageskarte (`mobile-day-card`):**

Aufbau von links nach rechts:
- Datums-Bereich (42px breit): Tageszahl (24px, 800 Gewicht, Mono), Wochentagskürzel (9px, 700, Uppercase), KW-Anzeige (8px, Mono, am 1. Wochentag oder Tag 1)
- Vertikaler Trenner (1px, angepasst an Kartentyp)
- Inhaltsbereich (flex: 1): Feiertagsname (bei FT), Dienst-Badges mit kurzem Nachnamen (Pill-Form mit farbigem Buchstaben-Kreis), Arbeitsplatz-Chips (max. 5, Rest als „+N")
- Pfeil-Icon (chevron-right, Grau)
- Optional: Goldener Puls-Dot `mdc-plan-badge` (Planungsmodus, 5×5px, absolute top-right)

Kartentypen:
- Standard (`.mobile-day-card`): Weißer Hintergrund `rgba(255,255,255,.96)`
- Wochenende (`.mdc-we`): Gedimmter grau-blauer Hintergrund, gedämpfte Tageszahl
- Feiertag (`.mdc-hol`): Warmer Gelbton, bernsteinfarbene Typografie
- Heute (`.mdc-today`): Blauer Rahmen + blauer 2px-Balken oben (Gradient #0EA5E9→#67D4FF), blaue Tageszahl

Auto-Scroll: Heutiger Tag scrollt nach 120ms automatisch in den sichtbaren Bereich (`scrollIntoView({ behavior: "smooth", block: "center" })`).

Touch-Targets: Karten nutzen `transform: scale(.984)` bei `:active` für haptisches Feedback. Min-Height über natürlichen Inhalt.

### 8.5 Tages-Detailblatt (`#modal-mobile-day`)

Bottom-Sheet mit 90vh max-Höhe. Besteht aus:

**Handle:** Abgerundetes weißes Element (36×4px, `rgba(255,255,255,.25)`, 10px Margin-Top) für Bottom-Sheet-Semantik.

**Kopfzeile (dunkel, `.mday-hd`):** Wochentag + Datum + ggf. Feiertagsname (farbkodiert: blau für Heute, gold für FT). Duty-Pills: farbige Badges mit D/HG-Buchstaben-Kreis (16px) und Name des Inhabers.

**Body (scrollbar):** Zwei Abschnitte „Fachärzte" / „Assistenzärzte" mit Section-Headers (blaue Akzent-Leiste links, 8.5px, Uppercase). Pro Mitarbeiter eine Zeile (`.mday-emp-row`, min-height 52px) mit:
- Farbigem Positions-Dot (8×8px Kreis, Farbe aus `posColor`)
- Name (13px) und Positions-Bezeichnung (9px, subdued)
- Badges: farbige Arbeitsplatz-Chips, D/HG-Tags (Pill-Form), Wunsch-Tags (im Planungsmodus, mit bd/hg/no-Varianten)
- Edit-Pfeil-Icon (nur im editierbaren Modus, Cyan-getönt)

Tippen auf eine editierbare Zeile → schließt das Blatt → öffnet nach 200ms Zelleditor.

### 8.6 Alle Modals als Bottom-Sheets

Auf Mobile werden alle folgenden Modals als Bottom-Sheet gerendert: `modal-editor`, `modal-autoplan`, `modal-dept`, `modal-profile`, `modal-emps`, `modal-import`, `modal-ap-report`. CSS-Regeln via `body.is-mobile .overlay#modal-*`:
- Overlay: `align-items: flex-end`, kein Padding
- Modal: `border-radius: 20px 20px 0 0`, volle Breite, `max-height: 92vh`
- Öffnen: `slideUp`-Animation (0.28s, cubic-bezier)
- Schließen: `slideDown`-Animation (0.2s, ease)
- Modal-Bodies: `-webkit-overflow-scrolling: touch`, `flex: 1`, `min-height: 0`
- Footer: `padding-bottom: max(12px, env(safe-area-inset-bottom))` für Home-Indicator

### 8.7 Mobile Navigation

Fixierte Bottom-Nav (`position: fixed; bottom: 0`) mit drei Buttons plus Safe-Area-Inset (`var(--safe-bottom)`):
- **Abteilung** (links) → `openDeptOverview()`
- **Planung** (Mitte, prominent, goldener Rahmen-Container `.mnav-plan-icon`) → `enterPlanMode()` / `closePlanMode()`; aktiver Planungsmodus: orangefarbener Hintergrund (`#F59E0B`)
- **Menü** (rechts) → mobiles Action-Sheet

Mobiles Action-Sheet enthält: Mitarbeitende verwalten, Daten exportieren, Daten importieren. Jeder Button 14px mit SVG-Icon und 14px Padding.

---

## 9. Planungsmodus

Isolierte, non-destruktive Planung: Der Produktionsplan bleibt während der gesamten Planungsphase unberührt.

### 9.1 Aktivierung

`enterPlanMode()`: Tiefe JSON-Kopie des aktuellen Produktionsmonats in `planData`. Baseline-Snapshot für Änderungs-Erkennung in `planBaseline`. Undo-Stack mit initialem Zustand. `planMode = true`. `autoPlanTargets = {}` zurückgesetzt. `body.classList.add("plan-mode-active")`.

### 9.2 Deaktivierung

`closePlanMode()`: Prüft `JSON.stringify(planData.assignments) !== JSON.stringify(planBaseline)`. Bei Unterschied: Bestätigungs-Dialog (`confirm()`). Dann `exitPlanMode()`.

`exitPlanMode()`: Alle Planungs-Variablen zurückgesetzt (`planData = null`, `planMode = false`), `body.classList.remove("plan-mode-active")`, `render()` aufgerufen.

### 9.3 Undo/Redo-Stack

Jede Zellbearbeitung und jede Auto-Plan-Übernahme erzeugt zwei Snapshots (vor und nach der Änderung). `recordPlanHistory()` speichert `JSON.parse(JSON.stringify(planData.assignments))`. Stack wird bei jeder neuen Aktion auf `[0..planHistoryIdx]` gekürzt (Redo-Historie verworfen). Undo: `planHistoryIdx--`. Redo: `planHistoryIdx++`. Buttons deaktiviert wenn kein Verlauf/Ende des Verlaufs erreicht.

### 9.4 Planungsschritte

| Aktion | Tastatur | Effekt |
|--------|----------|--------|
| **Abbrechen** | — | Setzt auf `planBaseline` zurück. Stack auf initialen Zustand. `render()`. |
| **Speichern** | Strg+S | Entwurf in `radplan_v3_plan_YYYY-M` gesichert. `planBaseline` aktualisiert. Toast-Bestätigung. |
| **Schließen** | — | Prüft ungespeicherte Änderungen. Verlässt Planungsmodus ohne Übernahme. |
| **Übernehmen** | — | Bestätigungs-Dialog. Kopiert `planData.assignments` in `DATA[k].assignments`. `saveToStorage()`. `exitPlanMode()`. |

### 9.5 Plan-Bar

48px hohe Leiste mit dunkelbraunem Glassmorphism-Hintergrund. Gold-Gradient-Linien oben und unten. Enthält:
- Plan-Badge (animierter Pulse-Dot + „Planungsmodus aktiv")
- Monatsname
- Hinweis-Text (Desktop)
- Undo/Redo-Buttons (Historie-Pfeile)
- Auto-Plan-Button (Cyan-Gradient)
- Abbrechen/Speichern/Schließen/Übernehmen-Buttons

Auf Mobile: horizontal scrollbar, Labels ausgeblendet, kompaktere Padding-Werte.

---

## 10. Zelleditor

Öffnet via Klick/Touch auf Tabellenzelle (Desktop) oder Mitarbeiter-Zeile im Tages-Detailblatt (Mobile).

### 10.1 Aufbau

- **Kopfzeile:** Name, Datum, Day-Type-Label (Feiertag/Wochenende als Pill), PLANUNG-Badge (goldene Pill, nur im Planungsmodus)
- **Vorschau-Box:** Live-Rendering der Auswahl (Code-Text + Duty-Badges). Dunkler Glassmorphism-Hintergrund. Im Planungsmodus: brauner Gradient-Hintergrund.
- **Arbeitsplatz-Sektion:** 8 Chips mit Keyboard-Hint
- **Status-Sektion:** 9 Chips, exklusiv
- **Dienst-Sektion:** D- und HG-Chips mit Blocker-Logik
- **Wunsch-Sektion:** 3 Chips (nur Planungsmodus)
- **Footer:** Löschen (rot), Abbrechen (ghost), Speichern (primary)

### 10.2 Arbeitsplatz-Chips

8 Chips (`chip-wp`), Mehrfachauswahl. Farbkodiert nach Arbeitsplatz-Farbschema. Tastatur 1–8 (auf Mobile ausgeblendet). Bei aktivem Status: alle Arbeitsplatz-Chips gedimmt (`opacity: .3`) und deaktiviert (`pointer-events: none`). Aktiver Chip: 2px Border, Scale 1.06, Box-Shadow.

### 10.3 Status-Chips

9 Chips (`chip-st`), exklusiv (nur einer gleichzeitig). Setzen eines Status löscht alle Arbeitsplätze und dimmt die Arbeitsplatz-Chips.

### 10.4 Dienst-Chips

Chips für D (`duty-D-off/on`) und HG (`duty-HG-off/on`). Bereits von anderer Person belegt: `blocked`-Klasse (Opacity 0.3, Name des Inhabers als Subtext, `cursor: not-allowed`). Wenn Folgetag Urlaub: Warnhinweis `⚠ Folgetag (N.) ist Urlaub` in roter Box.

### 10.5 Speichern-Logik (`saveEditor`)

Patcht Zelle via `setCell()`. Wenn `duty === "D"`: `nextCalendarDay()` bestimmt Folgetag, F wird gesetzt wenn Folgetag leer ist (Toast „F automatisch gesetzt"). Handhabt Monatsübergänge korrekt.

---

## 11. Dienstwunsch-System

Drei Wunsch-Typen, nur im Planungsmodus:

| Code | Label | Icon | Hintergrund | Text | Rahmen | Algorithmus-Effekt |
|------|-------|------|-------------|------|--------|--------------------|
| `NO_DUTY` | Kein Dienst | ✗ | `#FEE2E2` | `#991B1B` | `#FCA5A5` | Hard Constraint: Ausschluss für D und HG |
| `BD_WISH` | BD Wunsch | D | `#FEE2E2` | `#B91C1C` | `#F87171` | Soft: +200 Punkte im D-Scoring |
| `HG_WISH` | HG Wunsch | H | `#E0F2FE` | `#0369A1` | `#7DD3FC` | Soft: +200 Punkte im HG-Scoring |

Gespeichert in `planData.wishes[empName][day]`. Sichtbar in Tabellenzellen (Desktop) als Micro-Badge unten links (`.cell-wish`, 6px, 900 Gewicht) und im Tages-Detailblatt (Mobile) als Wunsch-Tag (`.mday-wish-tag`).

Chip-Styling: `.chip-wish` mit `wish-icon`-Element (20×20px, abgerundeter Mono-Buchstabe). Aktiver Wunsch: `wish-on`-Klasse mit Box-Shadow und Scale 1.05. Touch-Target auf Mobile: 48px Mindesthöhe.

---

## 12. Mitarbeiterprofil-Modal

Vollständige, implementierte Profilansicht. Öffnet via Klick auf Mitarbeiternamen (Desktop) oder Profil-Eintrag.

### 12.1 Kopfbereich

**Avatar:** Initialen aus `empInitials()` (zwei Großbuchstaben aus Namenstokens), farblich nach Qualifikationsposition per Gradient `posColor.border → posColor.fg`. 46×46px, rund, Mono 14px.

**Titel:** Vollständiger Name aus `EMP_META.fullName`. Monat + Jahr + Werktage als Untertitel.

**Meta-Row:** Positions-Pill (farbkodiert, Mono 10px), Bereich-Chip (blau, `.pm-chip-area`), Stellvertreter-Chip (grau, `.pm-chip-deputy`).

### 12.2 KPI-Grid (8 Kennzahlen)

Desktop: `repeat(4, 1fr)`. Mobile: `repeat(3, 1fr)`.

| Kennzahl | Berechnung | Akzentfarbe (border-top) | Icon |
|----------|-----------|-------------------------|------|
| Werktage gesamt | Arbeitstage im Monat | `#3B82F6` (Blau) | Kalender |
| Nicht geplant | `totalWorkdays - coveredWorkdays` | `#F97316` wenn > 0, `#22C55E` sonst | Uhr/Check |
| D-Dienste | `dutyD.length`, Tagesliste als Subtext | `#EF4444` (Rot) | Mond |
| HG-Dienste | `dutyHG.length`, Tagesliste als Subtext | `#0EA5E9` (Cyan) | Telefon |
| Urlaub | U + ZU + SU + §15c | `#8B5CF6` (Violett) | Palme |
| Krank | K + KK | `#DC2626` (Dunkelrot) | Plus |
| FZA | Freizeitausgleich | `#6366F1` (Indigo) | Waage |
| Frei | F-Tage | `#94A3B8` (Grau) | Pause |

Kennzahl-Karten (`.kpi-card`): `border-top: 3px solid` in Akzentfarbe. Glassmorphism-Overlay. Optionaler Fortschrittsbalken (`.kpi-bar-wrap` / `.kpi-bar-fill`).

### 12.3 Arbeitsplatz-Verteilung

Horizontale Balkendiagramme (`.dist-chart`) per Arbeitsplatz-Code. Grid-Layout: Code-Badge (36px) | Balken (flex) | Anzahl (28px) | Prozent (34px). Maximaler Balken = 100% des Höchstwerts. Balkenfarbe aus Arbeitsplatz-Farbschema. Sektion ausgeblendet wenn leer.

### 12.4 Status-Übersicht

Analoge Balken für Status-Codes. Sektion ausgeblendet wenn leer.

### 12.5 Dienst-Detail

D-Gruppe mit rotem Label-Badge und Tages-Badges (`.duty-day-badge`, Mono 10px, Pill-Form). HG-Gruppe mit blauem Label-Badge. WE/FT-Tage erhalten kontrastierende Färbung. Sektion ausgeblendet wenn kein Dienst.

### 12.6 Monatskalender

7-Spalten-Grid (`.mcd-grid`). Wochentags-Kopf mit Sa/So in gedämpftem Grau. Jede Zelle (`.mcd`): aspect-ratio 1, min-height 38px (32px mobile). Tagesnummer (7px, oben-links absolute). Code-Text zentriert. Duty-Badge (6px, unten-rechts absolute). Heute: blauer Outline. WE/FT-Zellen: nicht klickbar. Werktage: klickbar → schließt Profil-Modal → öffnet nach 180ms Zelleditor. Hover: `brightness(.86)` + `scale(1.08)`.

### 12.7 Jahresauswertung

**KPI-Strip (`.yr-kpi-strip`):** 6 Gesamtwerte für das laufende Jahr: AP-Tage, Urlaub, Krank, FZA, D-Dienste, HG-Dienste. Flex-Layout mit Trennern. Responsive Wrap auf Mobile.

**12-Monats-Tabelle (`.yr-table`):** Spalten: Monat, AP, Urlaub, Krank, FZA, WB, D, HG. Aktueller Monat hervorgehoben (`.yr-row-current` mit Akzent-Hintergrund). Leere Monate gedimmt. Gesamtzeile am Ende (`.yr-total-row`). Farbkodierung: grün ≥ 80%, orange ≥ 60%, rot < 60%.

---

## 13. Abteilungsübersicht

Zwei-Tab-Modal mit „Aktueller Monat" und „Jahresübersicht". Tabs als Unterleiste im dunkel gehaltenen Header.

### 13.1 Monatsansicht

**Coverage-Strip:** Besetzungsquoten für MR, CT, D, HG (% Werktage mit Besetzung). Pro Code: farbiger Badge, Bruch-Anzeige (x/y), Prozent, Fortschrittsbalken (6px, Farbkodiert). Meta-Werte: Mitarbeitendenzahl und Werktage.

**Mitarbeiter-Tabelle (`.dept-table`):** Spalten: Name+Position, AP, MR, CT, Urlaub, Krank, FZA, D, HG, Frei, Offen (ungedeckte Werktage, orange hervorgehoben). Hover: hellgrauer Hintergrund. Team-Gesamtzeile (`.dept-total-row`) mit Summen.

### 13.2 Jahresansicht

**KPI-Strip (`.dept-yr-strip`):** Mitarbeitendenzahl, AP-Tage, Urlaub, Krank, D/HG-Verhältnis, Abdeckungsprozent. Horizontal scrollbar.

**Tabelle pro Mitarbeiter:** AP-Tage, Urlaub, Krank, FZA, WB, D, HG, Abdeckung. Farbkodierung: grün ≥ 80% (`.pct-good`), orange ≥ 60% (`.pct-mid`), rot < 60% (`.pct-low`). Gesamt-Reihe.

---

## 14. Export & Import

### 14.1 Export

`doExport()`: Iteriert `localStorage` nach `radplan_v3_plan_*`-Schlüsseln. Baut `{ main: DATA, plans }`. Blob-Download via `URL.createObjectURL`. Dateiname: `radplan_YYYY-MM-DD.json`. UTF-8-Encoding. Shortcut: Strg+S (außerhalb Planungsmodus).

### 14.2 Import

Drei Eingabewege:
1. **Drag & Drop:** `dragenter/dragover/drop`-Events auf `.dropzone`. Visuelles Feedback: `drag-over`-Klasse (blauer Rahmen, blaues Icon).
2. **Datei-Browser:** Klick auf Dropzone → `<input type="file">`. Accept: `.json,application/json`.
3. **Textarea-Paste:** Manuelles JSON in `.json-ta` (dunkles Terminal-Styling).

**Dropzone-Zustände:** Default → `drag-over` (aktiver Drop) → `has-file` (grüner Rahmen, Dateiname-Badge).

Verarbeitungslogik: JSON parsen, Strukturprüfung. Wenn `parsed.main` → in `DATA` mergen. Wenn `parsed.plans` → pro Eintrag in localStorage schreiben. Fallback: direkt in `DATA` mergen. Dann `ensurePostBDFreiDays()` + `render()`. Fehler: rote Fehlermeldung (`.import-err`) unterhalb des Feldes.

---

## 15. Sächsische Feiertags-Engine

### 15.1 Gaußsche Osterformel (`easterDate`)

Berechnet Ostersonntag via vollständigem Gaußschen Algorithmus (8 Zwischenvariablen a–l und m2). Liefert `Date`-Objekt. Alle beweglichen Feiertage werden durch Addition von `addDays(easter, offset)` berechnet.

### 15.2 Alle Sächsischen Feiertage (`getSaxonyHolidays`)

| Feiertag | Datum / Berechnung |
|---------|-------------------|
| Neujahr | 01.01. (fest) |
| Karfreitag | Ostersonntag − 2 Tage |
| Ostermontag | Ostersonntag + 1 Tag |
| Tag der Arbeit | 01.05. (fest) |
| Christi Himmelfahrt | Ostersonntag + 39 Tage |
| Pfingstmontag | Ostersonntag + 50 Tage |
| Tag der Deutschen Einheit | 03.10. (fest) |
| Reformationstag | 31.10. (fest) |
| Buß- und Bettag | Mittwoch vor 23. November (Rückwärts-Iteration) |
| 1. Weihnachtstag | 25.12. (fest) |
| 2. Weihnachtstag | 26.12. (fest) |

Rückgabe: Dictionary `{ "YYYY-MM-DD": "Feiertagsname" }`.

### 15.3 ISO-Kalenderwochennummer (`isoWeekNumber`)

ISO 8601-konform: Wochen beginnen Montag, KW1 enthält den ersten Donnerstag des Jahres. Formel: ISO-Donnerstag berechnen → Abstand zum 4. Januar → `1 + Math.round(diff / 604800000)`. Korrekt für alle Jahres- und Jahrhundertübergänge.

---

## 16. Auto-Planung: Überblick & Pipeline

Nur im Planungsmodus verfügbar. `computeAutoPlan(customTargets)` ist vollständig synchron — das Ergebnis ist sofort verfügbar. Die animierte Terminal-Darstellung ist ein asynchrones Replay des vorab vollständig berechneten Log-Arrays.

### 16.1 Voraussetzungen

`planMode === true` und `planData` vorhanden. Alle manuell gesetzten D/HG-Einträge werden vollständig beibehalten und nie überschrieben. Der Algorithmus füllt ausschließlich noch leere Tage.

### 16.2 BD-Standardziele

| Mitarbeiter | Standard-BD-Ziel/Monat | Begründung |
|-------------|----------------------|-----------|
| Prof. Schäfer | 0 | Dienst-befreit (DUTY_EXEMPT) |
| Dr. Polednia | 3 | KUS-bedingte Einschränkung |
| Dr. Becker | 3 | CT-Leitungs-bedingte Einschränkung |
| Hr. Sebastian | 3 | Reduziertes Soll |
| Alle anderen | 4 | Standard |

Ziele sind im Konfigurationsdialog auf 0–10 anpassbar via Number-Input (`.ap-target-input`). Die Summe aller Ziele wird live angezeigt und verglichen mit der Anzahl benötigter BD-Tage.

### 16.3 Pipeline

```
Phase 1  init          Historische Statistiken laden, F-Repair, Vormonat-Status
Phase 2  bd_weekend    WE/FT-BD vergeben (Priorisierung vor Werktagen)
Phase 3  bd_workday    Werktags-BD vergeben
Phase 4  bd_optimize   3 Swap-Passes für Fairness-Glättung
Phase 5  hg_bundle     Freitags/Sonntags/FT-HG logisch koppeln
Phase 6  hg_assign     Verbleibende HG-Tage via Scoring vergeben
Phase 7  validate      Doppel-D-Prüfung und Bereinigung
Phase 8  done          Zusammenfassung, Warnungen, Infos aufbauen
```

### 16.4 Konfigurationsdialog

Tabelle mit allen dienstfähigen Mitarbeitern. Pro Zeile: Name, Positions-Badge, aktuell manuell gesetzte BD-Anzahl, Ziel-Input, verbleibend. Dienst-befreite Personen in grauer Info-Zeile. Berechnen-Button mit Layer-Icon. Auf iOS: zusätzlicher `touchend`-Handler mit `preventDefault()`.

---

## 17. Auto-Planung: Harte Restriktionen (Hard Constraints)

Hard Constraints liefern Score `-Infinity` → Kandidat bedingungslos ausgeschlossen. Wer mit `-Infinity` bewertet wird, erhält den Dienst nicht, egal was der Rest des Felds liefert.

### 17.1 Shared Hard Constraints (D und HG)

| Constraint | Bedingung |
|------------|----------|
| Dienst-Befreiung | `isDutyExempt(emp)` |
| Abwesenheit | Jeder Code aus `ABSENCE_CODES` an diesem Tag |
| Doppelbelastung | `result[emp][d].duty` bereits vorhanden |
| F-Tag | `result[emp][d].assignment === "F"` (bei HG: F auf WE erlaubt) |
| Wunsch-Sperre | `wishes[emp][d] === "NO_DUTY"` |

### 17.2 Hard Constraints nur für D

| Constraint | Bedingung | Im Relaxed-Modus aufhebbar? |
|------------|----------|-----------------------------|
| Null-Ziel | `bdTarget[emp] === 0` | nein |
| Samstag-Qualifikation | `wd === 6 && !isFacharzt(emp)` | nein |
| Folgender D | `result[emp][d+1].duty === "D"` | nein |
| Vorheriger D | `result[emp][d-1].duty === "D"` | nein |
| Vor-Urlaub | `isNextDayVacation(emp, d)` | nein |
| HG-Ruhezeit | `result[emp][d-1].duty === "HG" && weekday(d-1) !== 5` | nein |
| Monatsübergang | `d === 1 && prevMonthLastDayBD[emp]` | nein |
| DFDF-Muster | `wouldCreateDFDF(emp, d)` | nein |
| Becker-Martin-Konflikt | `beckerMartinConflict(emp, d)` | nein |
| Polednia So/Di/Do | `emp === "Dr. Polednia" && wd ∈ {0, 2, 4}` | nein |
| Soll-Überschreitung | `currentBD[emp] >= bdTarget[emp]` | **ja** |
| WE-Limit | `countWeekendDuties(emp) >= 2` | **ja** |
| Becker Samstag | `emp === "Dr. Becker" && wd === 6` | **ja** |
| Mindestabstand D | Nächster/letzter D < 4 Tage entfernt | **ja** |

### 17.3 Hard Constraints nur für HG

| Constraint | Bedingung | Im Relaxed-Modus aufhebbar? |
|------------|----------|-----------------------------|
| Nicht-FA | `!isFacharzt(emp)` | nein |
| HG-vor-D | `result[emp][d+1].duty === "D" && wd !== 5` | nein |
| Polednia AA-HG | So/Di/Do + AA im D (Freigabe-Kollision) | **ja** |
| WE-Limit | `countWeekendDuties(emp) >= 2` | **ja** |
| HG-Mindestabstand | Nächster/letzter HG < 3 Tage | **ja** |

### 17.4 DFDF-Mustererkennung (`wouldCreateDFDF`)

Prüft bidirektional ob ein D an Tag `d` das Muster D-F-D-F erzeugen würde:
- **Rückwärts:** `result[emp][d-2].duty === "D" && result[emp][d-1].assignment === "F"`
- **Vorwärts:** `result[emp][d+2].duty === "D" && result[emp][d+1].assignment === "F"`

Dieses Muster ist unzulässig, da es eine Person in einen Rhythmus von Dienst → Frei → Dienst → Frei zwingt ohne echte Erholung.

### 17.5 Becker-Martin-Konflikt (`beckerMartinConflict`)

Für Dr. Becker und Dr. Martin: Ist der konkrete F-Folgetag (Tag `d+1`) im `assignments` des Partners ein Urlaubstag (`VACATION_CODES`)? Falls ja → Conflict. Berücksichtigt Monatsübergänge korrekt (liest aus `DATA[nextMonthKey]`). Verhindert CT-Leitungsausfall wenn eine Person D hat und der Partner an dem daraus resultierenden F-Tag Urlaub hat.

### 17.6 Relaxed-Modus

Wenn nach strikter Kandidatenprüfung kein einziger Kandidat verfügbar ist, werden die mit „ja" markierten Constraints deaktiviert und erneut nach Kandidaten gesucht. Anzahl relaxierter Zuteilungen wird in der Zusammenfassung und im Terminal-Log ausgewiesen.

---

## 18. Auto-Planung: Scoring für Bereitschaftsdienst (D)

**Basis-Score: 100 Punkte.** Höchster Score gewinnt. Alle Faktoren sind additiv.

| Faktor | Formel | Typischer Wertebereich | Erklärung |
|--------|--------|----------------------|-----------|
| **Basis** | Startwert | +100 | Grundwert für alle Kandidaten |
| **Soll-Unterschreitung** | `(bdTarget − currentBD) × 50` | +50 bis +200 | Personen unter ihrem Soll werden bevorzugt |
| **Soll-Überschreitung** | `(currentBD − bdTarget + 1) × 5000` | −5000 bis −∞ | Macht Überschreitung praktisch unmöglich |
| **BD-Wunsch** | Wunsch `BD_WISH` gesetzt | +200 | Dienstwunsch des Mitarbeiters |
| **Historische Fairness** | `(avgHistBD − histBD[emp]) × 3` | variabel | Ausgleich über Monate hinweg |
| **Donnerstag-Vor-Urlaub** | `wd === 4` und Folgewoche mit Urlaub | +150 | Praktisch: D Do → F Fr → Urlaub Mo |
| **WE-Belastung laufend** | `countWeekendDuties(emp) × 150` | −150 bis −600+ | WE-Balance im laufenden Monat |
| **Historische WE-Fairness** | `(avgHistWE − histWE[emp]) × 5` | variabel | Langfristiger WE-Ausgleich |
| **Konsekutive WE** | Vorwochenende hatte Dienst | −50 | Verhindert aufeinanderfolgende WE-Dienste |
| **Samstags-Fairness (nur FA)** | `(avgHistSatBD − histSatBD − currentSatBD) × 800` | sehr dominant | Samstags-D-Balance über FAs |
| **Becker-Notfall-Samstag** | Dr. Becker + wd=6 + relaxed | −2000 | Nur im äußersten Notfall |
| **Erholungs-Abstand** | `minDistD < 4 → (4 − minDistD) × 150` | −150 bis −450 | Mindestabstand zwischen Diensten |
| **Feiertags-Fairness** | `(avgHistHol − histHol[emp]) × 8` | variabel | Feiertagslast-Ausgleich |
| **Oster/Pfingst-Wechsel** | Hat Ostern gearbeitet → Pfingst-Penalty | −80 | Rotation zwischen Feiertagsblöcken |
| **Deterministischer Tiebreaker** | `(charCode(emp[0]) × 31 + d × 7) % 10 × 0.1` | 0 bis +0.9 | Reproduzierbarer Gleichstandsbrecher |

**Gewichtshierarchie:** Soll-Überschreitung (×5000) > Samstags-Fairness (×800) > WE-Belastung (×150) > Erholung (×150) > Soll-Unterschreitung (×50) > Feiertags-Fairness (×8) > WE-Fairness (×5) > Historische Fairness (×3).

---

## 19. Auto-Planung: Scoring für Hintergrunddienst (HG)

**Basis-Score: 100 Punkte.** Kandidatenpool: nur `hgFAs` (Fachärzte ohne Befreiung).

| Faktor | Formel | Typischer Wertebereich | Erklärung |
|--------|--------|----------------------|-----------|
| **Basis** | Startwert | +100 | Grundwert |
| **Laufende HG-Anzahl** | `currentHG[emp] × 120` | −120 pro HG | Verteilung der HG-Last |
| **BD-Ausgleich** | `(avgBD − currentBD[emp]) × 30` (nur bei BD-Defizit) | +30 pro fehlendem BD | Kompensation für fehlende BD |
| **AA-im-D Fairness** (hist+aktuell) | `devAA × |devAA| × 35` | quadratisch, variabel | Balance der aufwändigen HGs |
| **FA-im-D Fairness** (hist+aktuell) | `devFA × |devFA| × 20` | quadratisch, variabel | Balance der leichteren HGs |
| **HG-Wunsch** | Wunsch `HG_WISH` gesetzt | +200 | Dienstwunsch |
| **Vor-Urlaubs-Penalty** | Folgetag ist Urlaub | −20 | Vermeidet HG direkt vor Urlaub |
| **WE-Belastung Sa/So** | `countWeekendDuties(emp) × 100` | variabel | WE-Balance |
| **Konsekutive WE** | Vorwochenende hatte Dienst | −30 | Spread über Wochen |
| **Erholungs-Abstand** | `minDistHG < 4 → (4 − minDistHG) × 20` | −20 bis −60 | Mindestabstand |
| **Oster/Pfingst-Wechsel** | Analog D-Scoring | −80 | Feiertagsrotation |
| **Direkter Folge-HG** | `result[emp][d-1].duty === "HG"` | −15 | Vermeidet direkte Folge |
| **Deterministischer Tiebreaker** | `(charCode(emp[1 % len]) × 17 + d × 13) % 10 × 0.1` | 0 bis +0.9 | Anderer Seed als D-Scoring |

**Quadratische AA/FA-Balance:** `devAA × |devAA| × 35` bedeutet: kleine Ungleichgewichte (dev ≈ 1) kosten nur 35 Punkte, aber große Ungleichgewichte (dev ≈ 3) kosten 315 Punkte. Historische Werte fließen additiv ein — langfristige Fairness über Monate strukturell gesichert.

---

## 20. Auto-Planung: HG-Kopplung (Bundling)

Vor der freien HG-Vergabe werden bestimmte HG-Tage logisch gebunden. Ziel: zusammenhängende Wochenend-Last, minimale Anfahrten für Fachärzte.

### 20.1 Freitags-HG-Kopplung

**Bedingung:** `wd(d) === 5` UND AA hat D an Tag `d` UND Samstag `d+1` existiert UND FA hat D an `d+1` UND Samstags-FA ≠ Freitags-AA.

**Aktion:** Samstags-FA erhält automatisch HG für Freitag.

**Begründung:** Der Freitags-AA-BD-Inhaber braucht am Samstag Befundfreigabe. Da der Samstags-FA ohnehin in der Klinik ist, ist die Kopplung effizient.

### 20.2 Sonntags-HG-Kopplung

**Bedingung:** `wd(d) === 6` UND FA hat D am Samstag UND Sonntag `d+1` existiert UND jemand hat D am Sonntag UND dieser ≠ Samstags-FA.

**Aktion:** Samstags-FA erhält automatisch HG für Sonntag.

**Begründung:** Wochenendbündelung — ein FA deckt das gesamte Wochenende ab.

### 20.3 Feiertags-Vorab-HG-Kopplung

**Bedingung:** Tag `d` kein Feiertag UND `d+1` Feiertag UND AA hat D an `d` UND FA hat D an `d+1` UND Feiertags-FA ≠ Vorab-AA.

**Aktion:** Feiertags-FA erhält HG für Tag `d`.

**Begründung:** Kein extra FA-Einsatz für einzelnen HG-Tag vor Feiertag.

### 20.4 Validierung vor Kopplung

`assignBundledHG()` prüft: FA-Qualifikation, Nicht-Abwesend, kein bereits vorhandener Dienst, kein F-Tag (außer bei WE), HG noch nicht besetzt von jemand anderem, kein D am Folgetag (außer Freitag).

---

## 21. Auto-Planung: Swap-Optimierer

Nach der initialen BD-Vergabe: bis zu 3 Optimierungs-Passes über alle BD-Paare.

### 21.1 Algorithmus

Für jedes Paar `(d1, d2)` mit `d1 < d2` und verschiedenen D-Inhabern:
1. Tausch probeweise durchführen
2. Validität prüfen (`canDoBD` relaxed + WE-Limit ≤ 3)
3. Fairness-Score berechnen
4. Bei Verbesserung: Tausch behalten
5. Sonst: rückgängig
6. Bei mindestens einer Verbesserung in einem Pass: weiterer Pass

### 21.2 Fairness-Score-Funktion

Globale Summe über alle `dutyEmps`:

| Komponente | Formel | Gewicht |
|------------|--------|--------|
| Soll-Überschreitung | `diff × 5000` (wenn diff > 0) | sehr hoch |
| Soll-Unterschreitung | `diff² × 20` (wenn diff < 0) | mittel |
| WE-Belastung | `weCount² × 10` | niedrig |
| Samstags-Belastung (FA) | `(histSatBD + currentSatBD)² × 500` | hoch |

Quadratische Terme: kleine Ungleichgewichte toleriert, große stark bestraft. Globale Optimierung statt lokaler.

### 21.3 F-Tag-Management nach Swap

Alter Auto-F-Eintrag des getauschten Tages wird entfernt (wenn kein anderer Inhalt), neuer Auto-F-Eintrag für den neuen BD-Tag wird gesetzt. Monatsübergänge korrekt über `nextCalendarDay()` gehandhabt.

---

## 22. Auto-Planung: Abschlussvalidierung & Ausgabe

### 22.1 Doppel-D-Bereinigung

Alle aufeinanderfolgenden D-Paare bei gleicher Person werden entfernt (zweiter D gelöscht). Defensives Sicherheitsnetz nach der Swap-Phase. `currentBD`-Zähler wird anschließend neu berechnet.

### 22.2 Zusammenfassung

Pro Mitarbeiter: BD-Anzahl, Ziel, WE-Äquivalente (KW-Block-basiert), FT-Anzahl, Liste der BD-Tage (mit WE/FT-Markierung via `.ap-day-tag`-Varianten).

Pro FA: HG-Anzahl, Liste der HG-Tage (analog).

**Warnungen** (`.ap-warn-item`, gelb, linker orangener Balken): Unter-Soll, hohe WE-Belastung (> 2), unbesetzte Tage.

**Infos** (`.ap-info-item`, blau, linker blauer Balken): Relaxed-Einsätze, Logik-Erklärungen, Wunscherfüllungsquote.

### 22.3 Live-Terminal

`renderProgressAndThenResult()` ist async. Log-Array wird mit folgenden Delays replayed:

| Entry-Typ | Delay | CSS-Klasse |
|-----------|-------|-----------|
| Zuweisung (→) | 40–120ms (zufällig) | `.ap-log-assign` |
| Begründung (💡) | 80ms | `.ap-log-reason` |
| Warnung (⚠) | 100ms | `.ap-log-warn` |
| Urlaubsnotiz | 60ms | `.ap-log-vacation` |
| Bundle-Info | 80ms | `.ap-log-bundle` |
| Swap-Info | 80ms | `.ap-log-swap` |
| Regel-Info | 60ms | `.ap-log-rule` |
| Header-Einträge | 300ms | — |
| Abschluss (✅) | 600ms | `.ap-log-success` |

**Terminal-UI (`.ap-terminal`):** Dunkler Hintergrund mit macOS-ähnlicher Titelleiste (3 farbige Dots). Monospace-Schrift, Cyan-Farbtöne. Max-height 260px (200px mobile), scrollbar. Jeder Log-Eintrag mit Einblend-Animation (`apLogIn`).

**Pipeline-Phasen-Knoten (`.ap-phase-node`):** 8 Knoten mit Verbindungslinien. Zustände: wartend (grau) → aktiv (orangefarbener Pulsator mit `apNodePulse`-Animation) → fertig (grünes Häkchen mit Glow).

**Live-Zähler (`.ap-live-stats`):** BD, HG, Regeln, Swaps als große Mono-Zahlen auf dunklem Glassmorphism-Hintergrund.

**Fortschrittsbalken (`.ap-bar-wrap`):** Goldener Shimmer-Gradient (`apBarShimmer`-Animation), Glow-Effekt darunter.

### 22.4 Abschlussbericht-Modal

Separates Modal (`#modal-ap-report`) mit dunkelblauem Header. Listet alle algorithmischen Entscheidungen als Karten (`.ap-report-item`). Pro Entscheidung: Datum-Badge, Mitarbeiter-Name, Duty-Badge, Begründungstext, Tags.

### 22.5 Berechnen-Button iOS-Fix

`ap-compute` hat `type="button"`, `cursor:pointer`, `-webkit-appearance:none`. Ein `doCompute()`-Named-Function-Handler wird für `click` registriert. Auf Mobile zusätzlich `touchend`-Handler mit `e.preventDefault()`. `input`-Events auf Zahlenfeldern (zusätzlich zu `change`) für sofortige `autoPlanTargets`-Aktualisierung. Min-height 50px auf Mobile.

---

## 23. Personenspezifische Sonderregeln

### 23.1 Prof. Schäfer — Vollständige Dienst-Befreiung

`DUTY_EXEMPT = ["Prof. Schäfer"]`. Erscheint in keiner Kandidatenliste, BD-Ziel = 0. In allen Dienststatistiken übersprungen. Im Konfigurationsdialog als graue Info-Zeile. Im Ergebnisdialog nicht gelistet.

### 23.2 Dr. Polednia — KUS-Kollisionsschutz

**D-Sperre (Hard Constraint, nicht aufhebbar):** Kein D an Sonntag (0), Dienstag (2), Donnerstag (4). F nach D an diesen Tagen würde KUS-Ausfall am Folgetag erzeugen. Da Dr. Polednia der einzige KUS-fähige Arzt ist, ist diese Regel absolut.

**HG-Sperre mit AA im D (Soft Constraint, im Relaxed aufhebbar):** Kein HG an So/Di/Do wenn AA im D ist. HG bei AA-BD erfordert Befundfreigabe am Folgetag — dieser kollidiert mit KUS.

### 23.3 Dr. Becker — CT-Leitung & Samstags-Sonderregel

**Samstags-D-Sperre (Soft, im Relaxed aufhebbar):** Im Strict-Modus gesperrt. Im Relaxed: erlaubt, aber −2000 Punkte. Dr. Becker erhält Samstags-D nur wenn kein anderer FA verfügbar ist.

**FZA-Automatik:** Wenn Dr. Becker zwangsweise Samstags-D erhält: FZA für Montag wird automatisch gesetzt. Implementierung: `nextCalendarDay(y, m, d)` → Sonntag, dann `nextCalendarDay(...)` → Montag. Monatsübergang korrekt via direktem Schreiben in `DATA[nextMonthKey]`.

**Becker-Martin-Regel:** `beckerMartinConflict()` prüft den konkreten F-Folgetag auf Urlaubscode des Partners Dr. Martin.

### 23.4 Dr. Martin — CT-Leitungsschutz

Symmetrische Becker-Martin-Regel: Kein D wenn F-Folgetag mit Urlaubstag von Dr. Becker zusammenfällt.

### 23.5 Hr. Sebastian — Reduziertes Soll

BD-Standardziel: 3 statt 4 Dienste pro Monat.

---

## 24. Historische Fairness-Statistik

`collectHistoricalDutyStats(upToYear, upToMonth)` aggregiert aus allen Monaten in `DATA` die strikt vor dem Planungsmonat liegen.

### 24.1 Felder pro Mitarbeiter

| Feld | Bedeutung | Verwendet in |
|------|-----------|-------------|
| `bd` | Gesamt-Bereitschaftsdienste (historisch) | D-Scoring: `(avgHistBD − histBD[emp]) × 3` |
| `hg` | Gesamt-Hintergrunddienste (historisch) | HG-Scoring indirekt |
| `weDuty` | WE-Äquivalente KW-Block-basiert (§25) | D-Scoring: `(avgHistWE − histWE[emp]) × 5` |
| `holDuty` | D+HG-Dienste an Feiertagen | D-Scoring: `(avgHistHol − histHol[emp]) × 8` |
| `thuBd` | D-Dienste an Donnerstagen | Vor-Urlaubs-Bonus-Kontext |
| `hgForAA` | HG-Dienste bei AA im D (mit Freigabepflicht) | HG-Scoring: quadratisch |
| `hgForFA` | HG-Dienste bei FA im D (ohne Freigabepflicht) | HG-Scoring: quadratisch |
| `satBd` | D-Dienste an Samstagen | D-Scoring: `(avgHistSatBD − histSatBD) × 800` |

### 24.2 Verwendung im Scoring

Alle historischen Felder fließen als Fairness-Ausgleich ein. Mitarbeitende mit unterdurchschnittlichen historischen Werten erhalten positive Aufschläge; überdurchschnittlich belastete Personen erhalten negative Aufschläge. Langfristige Fairness über viele Monate ist dadurch strukturell verankert — nicht nur innerhalb eines Monats.

---

## 25. Wochenend-Äquivalente: Block-basierte Zählung

WE-Belastung wird **per ISO-Kalenderwochen-Block (Fr–Sa–So)** gezählt, nicht pro Einzeltag.

Für jeden Wochenend-Block einer Person:
- Enthält ≥ 1 D → **+1,0**
- Enthält nur HG, kein D → **+0,5**
- Enthält D und HG → **+1,0** (D dominiert)

Diese Logik gilt konsistent in:
- `countWeekendDuties()` (laufender Monat)
- `collectHistoricalDutyStats()` (historisch)
- Summary-Berechnung in `computeAutoPlan()`

Damit entspricht die Zählung exakt der Fairness-Regel: ein Wochenende mit D zählt als 1, ein Wochenende nur mit HG als 0,5 — unabhängig davon wie viele Einzeltage im Block belegt sind.

---

## 26. Keyboard-Shortcuts & Tastatursteuerung

### 26.1 Globale Shortcuts (Desktop)

| Shortcut | Aktion | Kontext |
|----------|--------|---------|
| Alt + ← | Vorheriger Monat | Außerhalb Planungsmodus |
| Alt + → | Nächster Monat | Außerhalb Planungsmodus |
| Strg+S | JSON-Export | Außerhalb Planungsmodus |
| Strg+S | Entwurf speichern | Im Planungsmodus |
| Strg+Z | Rückgängig | Im Planungsmodus |
| Strg+Y | Vorwärts | Im Planungsmodus |
| Strg+Shift+Z | Vorwärts | Im Planungsmodus |
| Escape | Aktives Modal schließen | Immer |

Escape schließt in Prioritätsreihenfolge: `modal-editor`, `modal-emps`, `modal-import`, `modal-profile`, `modal-dept`, `modal-autoplan`, `modal-ap-report`, `modal-mobile-menu`, `modal-mobile-day`.

### 26.2 Shortcuts im Zelleditor (Desktop)

| Taste | Aktion |
|-------|--------|
| `1`–`8` | Arbeitsplatz MR–T togglen (nur ohne aktiven Status) |
| `D` | Bereitschaftsdienst togglen |
| `H` | Hintergrunddienst togglen |
| `S` | Speichern |
| `Enter` | Speichern (wenn kein Button fokussiert oder `ed-save` fokussiert) |
| `Escape` | Schließen ohne Speichern |

### 26.3 Grid-Navigation

Alle Tabellenzellen: `tabindex="0"`. Fokus via Tab. Aktivieren via Enter oder Leertaste.

### 26.4 Accessibility

Alle interaktiven Elemente: `aria-label` oder sichtbare Beschriftung. Modals: `role="dialog" aria-modal="true"`. Live-Bereiche: `aria-live="polite"` für Monatslabel, Stats-Bar, Toast. Fokus-Management: erster fokussierbarer Inhalt nach 60ms beim Öffnen eines Modals. `button:focus-visible` mit 2px Outline in Akzentfarbe. Tabelle als `role="grid"`.

---

## 27. Fehlerbehandlung & Reparaturmechanismen

### 27.1 `ensurePostBDFreiDays()`

Läuft beim App-Start und nach jedem Import. Iteriert alle Monate in `DATA`. Für jeden D-Eintrag: prüft ob Folgetag leer ist, setzt `"F"` wenn ja. Berücksichtigt Monatsübergänge. Gibt Reparaturanzahl zurück. Bei > 0: Toast „N Ruhetage ergänzt".

### 27.2 Repair-Phase im Auto-Planer

Vor der BD-Vergabe prüft `computeAutoPlan()` den `planData.assignments`-Snapshot auf fehlende F-Folgetage nach vorhandenen BD und ergänzt sie. Anzahl im Terminal-Log ausgegeben.

### 27.3 Doppel-D-Bereinigung

Finaler Safety-Check nach Swap-Phase: aufeinanderfolgende D-Paare bereinigt. Zähler wird geloggt und angezeigt. Defensives Sicherheitsnetz.

### 27.4 Monatsdaten-Initialisierung

`getMonthData(y, m)` erzeugt bei fehlendem Eintrag automatisch einen neuen mit der Mitarbeiterliste des Vormonats. Fehlt der Vormonat: leere Liste.

### 27.5 EMP_META-Fallback

`getEmpMeta(name)` liefert für unbekannte Mitarbeitende generischen Datensatz mit Position `"—"`, Typ `"unknown"`. Alle UI-Funktionen sind dadurch robust gegen manuell hinzugefügte Mitarbeitende ohne Stammdaten.

### 27.6 localStorage-Fehlerbehandlung

`loadFromStorage()` und `saveToStorage()` in `try/catch`. Fehler werden still ignoriert — Anwendung startet mit leerem Datensatz wenn nötig. `setCell()` speichert im Produktionsmodus sofort, im Planungsmodus nicht.

---

## 28. Technische Designentscheidungen

### 28.1 Kein Framework, kein Build-Schritt

Vanilla JavaScript ES6+. Keine npm-Pakete, kein React/Vue/Svelte, kein Webpack/Vite. Vorteile: Null Build-Zeit, maximale Portabilität, funktioniert als lokale HTML-Datei ohne Webserver. Deploybar durch einfaches Kopieren der Dateien.

### 28.2 Synchroner Algorithmus, asynchrones UI

`computeAutoPlan()` läuft vollständig synchron und liefert sofort das Ergebnis inkl. vollständigem Log-Array. `renderProgressAndThenResult()` ist async und replayed das fertige Log. Dadurch bleibt der Algorithmus deterministisch, debugbar und testbar, während das UI trotzdem lebendig wirkt.

### 28.3 Immutable Assignment-Kopie

Der Algorithmus arbeitet auf einer tiefen JSON-Kopie (`JSON.parse(JSON.stringify(...))`). Produktionsdaten werden erst beim expliziten „In Planung übernehmen" überschrieben.

### 28.4 Deterministische Tiebreaker

- D-Scoring: `(charCode(name[0]) × 31 + d × 7) % 10 × 0.1`
- HG-Scoring: `(charCode(name[1 % len]) × 17 + d × 13) % 10 × 0.1`

Unterschiedliche Seeds pro Scoring-Typ. Reproduzierbar und stabil — beeinflusst das Ergebnis nur bei echtem Score-Gleichstand.

### 28.5 `IS_MOBILE` als globale Konstante

Einmal beim Laden berechnet: `const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)`. Verhindert wiederholte UA-Prüfungen im Render-Loop. Steuert via `body.is-mobile`-Klasse das gesamte CSS-System.

### 28.6 SVG-Icon-Architektur

Bewusste Entscheidung für SVG statt PNG/ICO:
- **Verlustfreie Skalierung:** Ein einziges SVG-Icon skaliert von 16×16 (Favicon) bis 1024×1024 (Homescreen) ohne Qualitätsverlust.
- **Dateigröße:** Ein SVG ersetzt multiple PNG-Dateien in verschiedenen Auflösungen (192px, 512px, 1024px).
- **Manifest `"sizes": "any"`:** SVG-Icons benötigen keine feste Größenangabe — der Browser skaliert nach Bedarf.
- **Dual-Purpose:** Das statische Icon (`any` + `maskable`) funktioniert sowohl als reguläres als auch als adaptives Icon.
- **Animiertes Brand-Icon:** Separate SVG-Datei mit eingebetteten CSS-Animationen, als `<img>` eingebunden. Browser rendert die Animation automatisch ohne JavaScript-Overhead.

### 28.7 iOS-spezifische Touch-Optimierungen

- `type="button"` auf allen Buttons (verhindert Form-Submit in Safari)
- `-webkit-tap-highlight-color: transparent` (entfernt Standard-Highlight)
- `touch-action: manipulation` (verhindert Double-Tap-Zoom)
- `font-size: 16px` auf Inputs (verhindert iOS-Auto-Zoom beim Fokus)
- `touchend`-Fallback auf kritischen Buttons
- `-webkit-overflow-scrolling: touch` auf scrollbaren Modal-Bodies
- `overscroll-behavior: contain` in Tagesliste (verhindert Bounce-Through)
- `apple-mobile-web-app-capable: yes` für Standalone-Modus
- `apple-mobile-web-app-status-bar-style: black-translucent` für immersive Statusleiste
- `apple-mobile-web-app-title: RadPlan` für Homescreen-Titel
- Safe-Area-Insets via `env(safe-area-inset-bottom)` für Home-Indicator

### 28.8 CSS-Architektur

**Custom Properties:** 65+ CSS-Variablen für Farben, Abstände, Maße, Schatten, Blur-Werte.

**Glassmorphism-System:** Vier Schichten:
- Dunkel (Header, Modals): `rgba(10,21,37,.6)` + `blur(24px)`
- Hell (Stats-Bar, Zellen): `rgba(255,255,255,.94)` + `blur(8px)`
- Toast: `rgba(15,23,42,.8)` + `blur(16px)`
- Planungs-Modus: `rgba(59,10,0,.45)` + `blur(24px)`

**Performance-Optimierungen:**
- `contain: layout paint` auf Header, Stats-Bar, Grid-Wrapper, Plan-Bar, Overlay
- `will-change: transform` auf Animationselementen
- `translateZ(0)` für Hardware-Beschleunigung
- `contain: strict` auf Overlay-Containern
- `contain: layout style paint` auf Modals

**Animationen:** `modalIn`, `modalOut`, `slideUp`, `slideDown`, `planPulse`, `apNodePulse`, `apBarShimmer`, `apLogIn`. `@media (prefers-reduced-motion: reduce)` deaktiviert alle Animationen auf 0.01ms.

### 28.9 Monatskey-Format

`"YYYY-M"` (nullbasierter Monat) entspricht JavaScript `Date`-Monatsindex und verhindert Off-by-One-Fehler. `monthKey(y, m)` und `prevMK(y, m)` als Helper-Konstanten.

### 28.10 Farbsystem

Drei Farbebenen:
1. **Navy-Palette** (Hintergründe): 900→400, von fast-schwarz bis mittelblau
2. **Gray-Palette** (Typografie, UI-Elemente): 50→900, Slate-Grautöne
3. **Akzent-Farben** (Interaktion, Status): Cyan (`#0EA5E9`), Rot (`#EF4444`), Grün (`#22C55E`), Orange (`#F97316`), Gold (Planungsmodus)

Alle Farben als CSS Custom Properties definiert. Konsistente Verwendung über alle Komponenten — Farb-Tokens aus dem `WORKPLACES`- und `STATUSES`-Array in JavaScript generiert und als Inline-Styles auf Elemente angewendet.
