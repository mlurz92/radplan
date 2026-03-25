# RadPlan

RadPlan ist eine vollständig clientseitige Web-Anwendung zur Erstellung, Simulation und Qualitätssicherung von Dienstplänen für die Klinik für Radiologie & Nuklearmedizin. Die Anwendung kombiniert klassische Kalenderplanung, einen sicheren Planungsmodus mit Entwurfslogik, umfangreiche Auswertungen sowie eine Auto-Plan-Engine mit Live-Telemetrie und regelbasierter Optimierung.

---

## 1) Produktziel und Nutzungskontext

RadPlan adressiert die tägliche Praxis der klinischen Dienstplanung:

- Monatsplanung pro Mitarbeitenden-Zeile und Kalendertag.
- Trennung von **Hauptplan** und **Entwurfsplan** (Planungsmodus), damit Planungsvarianten risikofrei ausprobiert werden können.
- Automatisierte Verteilung von Bereitschafts- (`D`) und Hintergrunddiensten (`HG`) mit Nebenbedingungen.
- Nachvollziehbare Entscheidungsdokumentation über Telemetrie, Report und Qualitätskennzahlen.
- Persistenz im Browser (Local Storage) plus vollständiger JSON-Import/Export.

Die Anwendung benötigt keinen Server und läuft direkt im Browser aus statischen Dateien (`index.html`, `app.css`, `app.js`).

---

## 2) Fachdomäne und Planungsobjekte

### 2.1 Mitarbeitende

- Mitarbeitende sind monatsbezogen definiert.
- Positionen (z. B. Facharzt/Assistenzarzt) steuern fachliche Regeln im Algorithmus.
- Duty-Exempt-Personen werden von der Auto-Plan-Dienstverteilung ausgeschlossen.

### 2.2 Tageszelle

Jede Zelle kann zwei Informationsarten tragen:

1. **assignment** (Arbeitsplatz-/Statuscode, auch kombiniert wie `MR/CT`),
2. **duty** (`D` oder `HG`).

### 2.3 Dienste

- **D (Bereitschaftsdienst)**: genau eine Person pro Tag.
- **HG (Hintergrunddienst)**: genau eine Person pro Tag.
- Zuweisung ist je Tag exklusiv und wird algorithmisch sowie bei manueller Eingabe validiert.

### 2.4 Sonderzeile RD Neurorad (RBN)

Ab **Juni 2025** gibt es eine dedizierte Zeile `RD Neurorad (RBN)`:

- rein manuelle Pflege,
- keine Auto-Plan-Manipulation,
- Import/Export-fähig,
- mit definierter Personenauswahl.

---

## 3) Bedienoberfläche

## 3.1 Kopfbereich

- Monatsnavigation (vor/zurück, Heute, selektierbarer Zeitraum-Flyout).
- Aktionsbuttons für Abteilung, Planung, Mitarbeitendenverwaltung, Import/Export.
- Tastatur-/Workflow-freundliche Toolbar-Struktur.

### 3.2 Monatsraster (Desktop)

- Tabellenlayout mit Tageskopf, KW-/Feiertagskontext und Mitarbeitendenzeilen.
- Direktes Öffnen des Editors aus einer Tageszelle.
- Footer-Zusammenfassungen (u. a. Dienststatistiken).

### 3.3 Mobile Ansicht

- Tageskarten statt großer Tabelle.
- Fokus auf schnelle Zellenbearbeitung pro Tag und Person.
- Bottom-Navigation für Kernaktionen.

### 3.4 Modals

- Einheitliches Overlay-/Modal-System mit responsiven Höhenbegrenzungen.
- Auto-Plan-Modal mit:
  - Konfigurationsansicht,
  - Engine-Liveansicht,
  - Ergebnis-/Qualitätsansicht,
  - Abschlussbericht.

---

## 4) Planungsmodus (Entwurfssicherheit)

Der Planungsmodus ist ein isolierter Arbeitsbereich:

- Änderungen wirken zunächst nur im Entwurf.
- Undo/Redo-Historie ist separat verfügbar.
- Entwurf kann gespeichert, verworfen oder in den Hauptplan übernommen werden.
- Wünsche (`wishes`) werden nur im Planungsmodus gepflegt und ausgewertet.

Technisch verwaltete Entwurfsbereiche:

- `employees`
- `assignments`
- `rbn`
- `wishes`

---

## 5) Auto-Plan-Engine (Regelwerk + Optimierung)

## 5.1 Pipeline-Phasen

Die Engine läuft mehrstufig:

1. **Initialisierung / Datenanalyse**
2. **BD-Wochenenden & Feiertage**
3. **BD-Werktage**
4. **BD-Optimierung (Reassignments)**
5. **HG-Bündelung (Wochenend-/Kopplungsregeln)**
6. **HG-Verteilung + HG-Optimierung**
7. **Finale Metaheuristik über D/HG**
8. **Validierung**
9. **Abschluss**

### 5.2 Hauptrestriktionen (Auszug)

- Keine Doppelbelegung gleicher Dienstart am selben Tag.
- Abwesenheiten/Urlaub/Krankheit sperren Kandidaturen.
- No-Duty-Wünsche werden respektiert.
- Distanzregeln zwischen Diensten.
- Feiertags-/Wochenendlast wird ausgeglichen.
- HG-/BD-spezifische Kopplungsregeln (z. B. WE-Ketten, Freitags-/Samstagskopplung).
- Becker-spezifische Samstags-/FZA-Sonderlogik inkl. Warnpfad.

### 5.3 Neue Wochenend-Abstandslogik

Die aktuelle Version priorisiert explizit:

- Wenn eine Person an zwei Wochenenden arbeiten muss, wird **ein freies Wochenende dazwischen** bevorzugt.
- Direkte Wochenend-Folgen (aufeinanderfolgende Kalenderwochen mit WE-Dienst) werden in der harten Kandidatenauswahl blockiert und nur im Relaxed-Fallback zugelassen.
- Zusätzlich fließt diese Bedingung in Scoring und Optimierungsziel ein.

### 5.4 Soft-Constraints und Relaxed-Fallback

Falls keine harte Lösung verfügbar ist, kann die Engine einzelne Sperren lockern, um Vollabdeckung zu erreichen. Diese Fälle werden:

- in Telemetrie/Log markiert,
- in Summary-Infos dokumentiert,
- über Warn-/Info-Kanäle transparent gemacht.

---

## 6) Live-Visualisierung der Engine

Die Fortschrittsansicht zeigt in Echtzeit:

- Pipeline-Status mit aktiver Phase,
- Live-Metriken (BD, HG, Regel-Events, Moves),
- Constraint-Flux-Bereich mit Algorithmus-Animation,
- Entscheidungsbox mit laufenden Regeln und aktuellen Detailentscheidungen,
- Quantum-Trace-Konsole mit chronologischem Event-Stream.

Layout und Skalierung sind so ausgelegt, dass die verfügbaren Modalflächen auf unterschiedlichen Viewportgrößen effektiv genutzt werden und alle Hauptbereiche sichtbar bleiben.

---

## 7) Ergebnis- und Qualitätsmodell

Nach Abschluss erzeugt die Engine:

- konkrete `assignments` (D/HG),
- `summary` je Mitarbeitenden (Soll/Ist, Tage, WE-/FT-Anteile),
- `warnings` (kritische oder unvollständige Situationen),
- `infos` (angewandte Strategiehinweise),
- `quality` mit Score und Teilmetriken,
- `report` mit Entscheidungsbegründungen pro Dienst,
- `ruleTelemetry` als Event-Historie.

Kennzahlen umfassen u. a.:

- Versorgungsabdeckung (D/HG-Lücken),
- Streuung BD/HG/WE,
- Wunscherfüllungsrate,
- Anzahl Optimierungsbewegungen,
- aggregierten Quality-Score (0–100).

---

## 8) Datenhaltung und Dateiformate

### 8.1 Browserpersistenz

- Monatsdaten werden lokal gespeichert.
- Historische Monate fließen in bestimmte Fairness-/Kontextentscheidungen ein.

### 8.2 Export

JSON-Export enthält:

- `main` (Hauptplandaten)
- `plans` (Planungsentwürfe)

inklusive `assignments`, `wishes`, `rbn`.

### 8.3 Import

Unterstützt:

- vollständige Exportstruktur,
- direkte Monatsdaten.

Beim Import werden Daten normalisiert und inkonsistente Folgetags-Ruhetage nach `D` repariert.

---

## 9) UX-, Accessibility- und Responsiveness-Prinzipien

- Semantische Rollen/Labels für zentrale Bereiche (Dialoge, Toolbars, Status).
- Visuelles Feedback über Chips, Badges, Toasters, Farbcodierung.
- Mobile-spezifische Modal- und Touch-Anpassungen.
- Kompakte Skalen (Typography/Spacing) in dichten Informationsbereichen.
- Scroll-Verhalten so begrenzt, dass Interaktion stabil und nachvollziehbar bleibt.

---

## 10) Code-Struktur

- `index.html` – komplette Struktur und Modalgerüst.
- `app.css` – Designsystem, Responsiveness, Tabellen, Modal- und Engine-Styling.
- `app.js` – Zustand, Rendering, Editor-Workflows, Persistenz, Import/Export, Auto-Plan-Algorithmus.

Begleitdokumente im Repository:

- `Algorithmusregeln*.txt`, `Algorithm_check*.md`, `Algorithmus-Kriterien.txt` für fachliche Regelhinweise/Prüfnotizen.

---

## 11) Betriebs- und Deploymenthinweise

- Lokaler Start: `index.html` im Browser öffnen.
- Keine Build-Pipeline zwingend erforderlich.
- Empfehlung im Betrieb: regelmäßiger JSON-Export als Backup.
- Für produktive Kliniknutzung sollte zusätzlich ein organisatorischer Review-Prozess für Warnfälle bestehen.

---

## 12) Grenzen und bewusste Designentscheidungen

- Die Engine optimiert unter Nebenbedingungen, garantiert jedoch nicht in jedem Randfall ein globales Optimum.
- Relaxed-Fallback priorisiert Vollabdeckung, kann aber weiche Regeln temporär schwächen.
- RBN bleibt absichtlich manuell, damit fachlich sensible Neurorad-Absprachen nicht durch Automatik überschrieben werden.

---

## 13) Kurzfazit

RadPlan verbindet praktische Planungsoberflächen mit nachvollziehbarer algorithmischer Verteilung. Die Anwendung ist auf Transparenz, sichere Entwurfsarbeit und robuste klinische Planungsabläufe ausgelegt und dokumentiert Entscheidungen bis auf Regel-/Eventebene.
