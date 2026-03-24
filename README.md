# RadPlan

RadPlan ist eine lokal im Browser laufende Dienstplan-Anwendung für radiologische Teams mit Monatsplanung, Planungsmodus, Auto-Planung (D/HG), Auswertungen, Import/Export und einer interaktiven Visualisierung des Planungsalgorithmus.

---

## 1) Zweck und Einsatzbereich

Die Anwendung dient der strukturierten Erstellung und Pflege monatlicher Dienstpläne inklusive:

- Arbeitsplatzzuweisungen (z. B. MR, CT, Sonographie, Angiographie, Mammographie, Kinder-US, Wermsdorf, Teleradiologie)
- Statuscodes (z. B. Urlaub, Krankheit, FZA, Weiterbildung)
- Diensten (Bereitschaft `D`, Hintergrund `HG`)
- Planungsentwürfen mit Undo/Redo, Entwurfsspeicherung und Übernahme in den Hauptplan
- Auto-Planung mit Regeltelemetrie und Ergebnisbericht
- Import/Export aller Daten als JSON

RadPlan ist vollständig clientseitig (kein Server erforderlich).

---

## 2) Datenmodell

Die Daten sind monatsbasiert strukturiert (`YYYY-M`):

- `employees`: Liste der Mitarbeitenden im Monat
- `assignments`: Zuordnungen pro Mitarbeiter:in und Tag
- `rbn`: manuelle Einträge der Spezialzeile **RD Neurorad (RBN)** pro Tag

Im Planungsmodus gibt es zusätzlich Entwurfsdaten (`wishes`, Historie, Baseline).

### 2.1 Zellenstruktur in `assignments`

Pro Tag können enthalten sein:

- `assignment`: Arbeitsplatz-/Statuscode (auch Mehrfachcode als `MR/CT` möglich)
- `duty`: `D` oder `HG`

### 2.2 RBN-Sonderzeile

Ab **Juni 2025 (01.06.2025)** wird unterhalb der letzten Mitarbeiterzeile eine zusätzliche Zeile angezeigt:

- **Label:** `RD Neurorad (RBN)`
- **Bearbeitung:** ausschließlich manuell durch Nutzer:innen
- **Auto-Planung:** liest/ändert diese Zeile nicht
- **Persistenz:** wird in `main` und Planungsentwürfen gespeichert, importiert und exportiert

Mögliche Einträge pro Tag:

- Prof. Schob (NRAD)
- Dr. Maybaum (NRAD)
- Dr. Bailis (NRAD)
- Dr. Schüngel (NRAD)
- Fr. Dalitz (RAD)
- Fr. Thaler (RAD) **nur bis einschließlich März 2026** auswählbar

---

## 3) Kernansichten

### 3.1 Monatsraster

- Kopfzeile mit Tag, Wochentag, KW, Feiertagsmarkierung
- Mitarbeiterzeilen mit klickbaren Tageszellen
- Zusatzzeile `RD Neurorad (RBN)` (ab 06/2025)
- Fußzeilenstatistik für MR/CT/D/HG

### 3.2 Editor

Standard-Modus:

- Arbeitsplätze (Mehrfachauswahl)
- Status (exklusiv)
- Dienste D/HG (Exklusivprüfung je Tag)
- optional Dienstwünsche im Planungsmodus

RBN-Modus:

- nur Namensauswahl aus vordefinierter Liste
- keine Status-/Dienst-/Wunschfelder

### 3.3 Mobile Tagesansicht

- gruppierte Darstellung nach Fach-/Assistenzärzt:innen
- schnelles Öffnen des Editors pro Person und Tag

### 3.4 Auswertungen

- Abteilungsübersicht (Monat/Jahr)
- Mitarbeitenden-Dashboard mit Rollenfiltern, KPIs und Jahresverläufen

---

## 4) Planungsmodus

Planungsmodus trennt Entwurf und Hauptdaten:

- Entwürfe pro Monat
- Undo/Redo-Historie
- Entwurf speichern/laden
- Entwurf übernehmen oder verwerfen

Verwaltete Entwurfsfelder:

- `employees`
- `assignments`
- `rbn`
- `wishes`

---

## 5) Auto-Planung

Die Auto-Planung arbeitet im Entwurf und verteilt `D` und `HG` anhand von Regeln und Zielwerten.

### 5.1 Ziele und Restriktionen (fachlich)

- Tagesabdeckung für `D`/`HG`
- Fairnessverteilung (z. B. Streuung)
- Berücksichtigung von Abwesenheiten/Feiertagen/Wochenenden
- Wunscherfüllung als Qualitätsanteil
- Optimierungspässe (inkl. Swap-/Deep-Optimierung)

### 5.2 Ergebnis

- Verteilungstabellen für `D` und `HG`
- Qualitätsmetriken (Score, Streuung, Lücken, Wunscherfüllung)
- Warnungen/Infos
- Abschlussbericht pro zugeteiltem Dienst

### 5.3 Visualisierung (Modal)

Die Auto-Plan-Engine zeigt:

- kompakte Live-Statusleisten mit flüssiger Fortschrittsanzeige
- Phasenpipeline (Analyse, BD, Optimize, HG, Finish)
- Constraint-Ansicht mit aktueller Phase/Regelanwendung
- Quantum Trace Console mit fortlaufendem Auto-Scroll auf den neuesten Eintrag
- hochgranulare Logeinträge inkl. Phase und Zeitstempel

Nicht mehr Teil der Beschriftung sind Marketing-/Platzhaltertexte wie „30s Präsentationslauf“, „finaler Deep Optimize Pass“, „cineastische Regelverschiebung“ etc.

---

## 6) Regeln und Besonderheiten

- Nach `D` wird ein Folgetag `F` automatisch ergänzt, wenn leer.
- `D`/`HG` sind pro Tag jeweils exklusiv besetzbar.
- `RBN`-Zeile ist strikt manuell, vom Auto-Plan ausgeschlossen.
- Feiertage (Sachsen) werden dynamisch für das jeweilige Jahr berechnet.

---

## 7) Import / Export

### 7.1 Export

Exportiert wird eine JSON-Datei mit:

- `main`: Hauptdaten aller Monate
- `plans`: gespeicherte Planungsentwürfe

Enthält damit ebenfalls:

- reguläre Zuweisungen
- Wünsche
- **RBN-Einträge**

### 7.2 Import

- akzeptiert Exportstruktur (`{ main, plans }`) oder direkte Monatsdaten
- übernimmt Entwürfe in den lokalen Speicher
- normalisiert Datenstrukturen (inkl. `rbn`-Container)
- führt Reparaturlauf für Folgetag-`F` nach `D` aus

---

## 8) Bedienung und UX

- Tastaturkürzel (u. a. Speichern, Undo/Redo, schnelle Zuweisungen im Editor)
- Responsive Verhalten für Desktop und Mobile
- Modals mit angepasster maximaler Höhe je Viewport
- visuelles Feedback über Badges, Warnungen, Chips und Toasts
- Performance-Optimierungen durch Holiday-Caching, effizientere Auto-Plan-Historienberechnung und GPU-freundliche Rendering-Hints in der Auto-Plan-Visualisierung

---

## 9) Technische Struktur

- `index.html`: vollständige UI-Struktur
- `app.css`: Designsystem, Tabellen, Modals, Auto-Plan-Visualisierung, responsive Regeln
- `app.js`: Zustand, Rendering, Editorlogik, Persistenz, Import/Export, Auto-Planung

---

## 10) Betrieb

- Anwendung lokal öffnen (z. B. `index.html` im Browser)
- Daten verbleiben im Browser-Storage
- regelmäßiger JSON-Export als Backup empfohlen
