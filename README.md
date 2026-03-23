# RadPlan

RadPlan ist eine webbasierte, lokale Dienstplan- und Analyseanwendung für die Klinik für Radiologie & Nuklearmedizin. Die Anwendung kombiniert einen stark visualisierten Monatsplan mit einem eigenständigen Planungsmodus, einer algorithmischen Auto-Planung, einer Abteilungsübersicht, Profilanalysen pro Mitarbeitenden und – im aktuellen Stand – einem umfangreichen **Jahres-Dashboard für Mitarbeitende** inklusive umschaltbarer Detailansichten und globaler Zeitraumsteuerung.

---

## Inhaltsverzeichnis
1. [Produktüberblick](#produktüberblick)
2. [Kernfunktionen](#kernfunktionen)
3. [Benutzeroberfläche im Detail](#benutzeroberfläche-im-detail)
4. [Globale Zeitraumsteuerung](#globale-zeitraumsteuerung)
5. [Monatsplan und Bearbeitung](#monatsplan-und-bearbeitung)
6. [Mitarbeitenden-Jahresdashboard](#mitarbeitenden-jahresdashboard)
7. [Abteilungsübersicht](#abteilungsübersicht)
8. [Profilansicht Mitarbeitende](#profilansicht-mitarbeitende)
9. [Planungsmodus](#planungsmodus)
10. [Auto-Planung Engine](#auto-planung-engine)
11. [Datenhaltung, Import und Export](#datenhaltung-import-und-export)
12. [Responsivität und Bedienbarkeit](#responsivität-und-bedienbarkeit)
13. [Algorithmische Regeln – Kurzüberblick](#algorithmische-regeln--kurzüberblick)
14. [Projektdateien](#projektdateien)
15. [Betriebs- und Nutzungshinweise](#betriebs--und-nutzungshinweise)
16. [Ausblick](#ausblick)

---

## Produktüberblick

RadPlan ist als Single-Page-Anwendung ohne Build-Prozess ausgelegt. Die gesamte Laufzeitlogik liegt in statischen Dateien:
- `index.html`
- `app.css`
- `app.js`

Die Anwendung ist bewusst so gebaut, dass sie lokal im Browser nutzbar ist und ihre Daten im `localStorage` speichert. Dadurch eignet sie sich für schnelle operative Planung, fachliche Abstimmungen, Simulationen im Entwurfsmodus und die Nachkontrolle vergangener oder aktueller Monate.

### Leitidee
RadPlan verbindet vier Dinge in einer Oberfläche:
1. **schnelle manuelle Monatsplanung**,
2. **kontrollierte Entwurfsplanung**,
3. **algorithmische Diensteinteilung**,
4. **hohe Sichtbarkeit und Transparenz der Regelwirkungen**.

---

## Kernfunktionen

### 1. Monatsbezogener Dienstplan
- tabellarische Darstellung aller Mitarbeitenden,
- tägliche Darstellung von Arbeitsplätzen, Statuscodes und Diensten,
- Statistikleisten für Monatsübersichten,
- visuelle Kennzeichnung von Wochenenden, Feiertagen und dem heutigen Tag.

### 2. Bearbeitbarer Zelleneditor
- Auswahl mehrerer Arbeitsplatzcodes pro Tag,
- Auswahl eines Statuscodes,
- Vergabe von `D` und `HG`,
- Warnhinweise bei Konflikten,
- Wunschvergabe im Planungsmodus,
- automatische Setzung des freien Folgetags nach `D`.

### 3. Planungsmodus
- Entwurfsbearbeitung ohne direkten Eingriff in den Hauptplan,
- Undo/Redo-Historie,
- Draft-Speicherung,
- Auto-Planung,
- Übernahme in den Hauptplan erst nach expliziter Bestätigung.

### 4. Globales Mitarbeitenden-Dashboard
- Jahresübersicht aller im Kalenderjahr auftretenden Mitarbeitenden,
- Such- und Rollenfilter,
- obere KPI-Übersicht,
- untere, umschaltbare Detailansicht pro Person,
- Verwaltung des aktuellen Monatsbestands direkt aus dem Dashboard.

### 5. Abteilungsübersicht
- Monatsauswertung mit Abdeckungs- und Summenkennzahlen,
- Jahresauswertung auf Teamniveau,
- Kennzahlen zu Urlaub, Krankheit, FZA, D/HG und Abdeckung.

### 6. Profil- und Jahresauswertungen pro Person
- Monatsprofil mit KPI-Karten,
- Verteilungsdiagramme für Arbeitsplätze und Statuscodes,
- Dienstdetailanzeige,
- Jahreskumulierung nach Monaten.

### 7. Import/Export
- JSON-Export aller Haupt- und Planungsdaten,
- JSON-Import per Textfeld, Dateiauswahl oder Drag & Drop,
- Datenreparaturlauf für fehlende Ruhetage nach BD.

---

## Benutzeroberfläche im Detail

## Kopfbereich
Der Kopfbereich enthält:
- Markenbereich mit Logo,
- Monatsnavigation,
- heutiger Tag/Monat,
- Abteilung,
- Planung,
- Mitarbeitende,
- Export/Import.

### Monatsnavigation
Die Standardnavigation erlaubt weiterhin schnelles Blättern um je einen Monat. Zusätzlich ist die Monatsanzeige nun selbst interaktiv und öffnet die neue globale Zeitraumsteuerung.

---

## Globale Zeitraumsteuerung

Eine der wichtigsten Erweiterungen des aktuellen Stands ist die **globale Zeitraumsteuerung**.

### Ziele der Zeitraumsteuerung
Sie erlaubt:
- Monat und Jahr **unabhängig voneinander** umzuschalten,
- schnelles Springen um Monat oder Jahr,
- direkte numerische Jahreingabe,
- Nutzung **auch bei geöffneten Modals**,
- Nutzung **auch im aktiven Planungsmodus**.

### Bedienung
Die Zeitraumsteuerung kann geöffnet werden über:
- den klickbaren Monatslabel-Button im Header,
- die Zeitraum-Schaltfläche im Mitarbeitenden-Dashboard.

### Inhalt
Die Steuerung bietet:
- Monats-Select,
- Jahr als Zahleneingabe,
- Vor/Zurück für Monat,
- Vor/Zurück für Jahr,
- „Zeitraum anwenden“,
- „Heute“.

### Verhalten im Planungsmodus
Wenn der Planungsmodus aktiv ist, bleibt die Zeitraumsteuerung nutzbar. Entwürfe werden dabei monatsspezifisch im Arbeitsspeicher verwaltet, sodass der Kontext beim Monatswechsel nicht sofort verloren geht.

### Verhalten bei offenen Modals
Die Steuerung liegt bewusst über den Overlays und bleibt damit erreichbar, selbst wenn bereits ein Dialog geöffnet ist.

---

## Monatsplan und Bearbeitung

## Tabellenansicht Desktop
Die Desktop-Ansicht zeigt:
- sticky Kopfspalte mit Mitarbeitendennamen,
- sticky Tagesköpfe,
- visuelle Differenzierung von Werktag, Wochenende und Feiertag,
- Tageszellen mit Arbeitsplatz-/Statuscodes und Dienstbadges,
- Footer mit Tagessummen.

### Interaktion
- Klick auf Mitarbeitendennamen: Profil öffnen.
- Klick auf bearbeitbare Tageszelle: Editor öffnen.
- Scrollverhalten: horizontale Feinsteuerung via Scrollbereich.

## Mobile Ansicht
Auf mobilen Geräten wird die Tabellenansicht durch eine mobile Tageskartenansicht ersetzt.

### Mobile Komponenten
- Monatszusammenfassung,
- Tageskarten mit D/HG-Anzeige,
- Tagesdetailsheet,
- mobile Aktionsnavigation.

---

## Mitarbeitenden-Jahresdashboard

Der Mitarbeitenden-Button öffnet nun **nicht mehr nur eine schlichte Monatsliste**, sondern ein umfassendes Jahres-Dashboard.

### Oberer Bereich: Gesamtübersicht
Im oberen Teil werden zusammenfassende Kennzahlen für das gewählte Kalenderjahr angezeigt, z. B.:
- Anzahl Mitarbeitende im Jahr,
- aktueller Monatsbestand,
- kumulierte Dienstanzahl,
- Rollenmix.

### Mittlerer Bereich: Gesamtübersicht aller Mitarbeitenden
Dieser Bereich bündelt alle im gewählten Kalenderjahr vorkommenden Mitarbeitenden in einer Kartenansicht.

#### Funktionen der Kartenansicht
- Filter nach Suchtext,
- Filter nach Rollenklassen,
- direkte Auswahl einer Person,
- Sichtbarkeit von AP, D, HG, Abdeckung, Aktivitätsmonaten, Urlaub/Krank.

### Unterer Bereich: umschaltbare Detailansicht
Die Detailansicht ist explizit umschaltbar und bietet drei Perspektiven:

#### 1. Monatsverlauf
Tabellarische Jahresübersicht der gewählten Person:
- AP pro Monat,
- Urlaub,
- Krankheit,
- FZA,
- Weiterbildung,
- D,
- HG,
- Abdeckung,
- Gesamtsummen.

#### 2. Jahreskalender
Zwölf Monatskarten mit kompakten Jahressignalen:
- Top-Arbeitsplätze,
- D/HG,
- Urlaub,
- Krankheit,
- Abdeckungsgrad.

#### 3. Verwaltung
Administrative Monatsansicht für den aktuell ausgewählten Monat:
- prüfen, ob die Person im aktuellen Monat enthalten ist,
- hinzufügen/entfernen,
- komplette Monatsliste sehen,
- neue Person direkt hinzufügen,
- Monatsbestand ohne Modalwechsel pflegen.

### Nutzen des Dashboards
Das Dashboard dient gleichzeitig als:
- Jahrescontrolling,
- Stammdaten- und Besetzungsübersicht,
- Einstieg in Monatsverwaltung,
- Qualitätskontrolle der Planung.

---

## Abteilungsübersicht

Die Abteilungsübersicht bleibt weiterhin ein eigener Analysebereich.

### Monatsmodus
Der Monatsmodus zeigt u. a.:
- Werktage im Monat,
- Mitarbeitendenzahl,
- MR-/CT-/D-/HG-Abdeckungsbalken,
- je Mitarbeitenden AP, Urlaub, Krank, FZA, D, HG, Frei, Offen.

### Jahresmodus
Der Jahresmodus zeigt teamweit:
- AP-Tage,
- Urlaub,
- Krank,
- FZA,
- WB,
- D/HG,
- Abdeckung.

Diese Ansicht ist eher team- und betriebsbezogen, während das neue Mitarbeitenden-Dashboard stärker personenzentriert arbeitet.

---

## Profilansicht Mitarbeitende

Zusätzlich zum Jahresdashboard existiert die Profilansicht einzelner Mitarbeitender durch Klick auf die Namenszelle.

### Inhalte
- Avatar und Stammdaten,
- Monats-KPI-Karten,
- Arbeitsplatzverteilung,
- Statusverteilung,
- Dienstdetails für D/HG,
- Monatskalender,
- Jahreszusammenfassung pro Monat.

### Besondere Stärke
Die Profilansicht verbindet Monats- und Jahresperspektive direkt aus der Planungsoberfläche heraus und ist damit ein wichtiges Prüfwerkzeug für Einzelfälle.

---

## Planungsmodus

Der Planungsmodus ist ein getrennter Entwurfsraum.

### Merkmale
- optisch klar hervorgehoben,
- Hauptplan bleibt unangetastet,
- Undo/Redo verfügbar,
- Auto-Planung verfügbar,
- Wünsche pro Person/Tag verfügbar,
- Speicherung als Entwurf möglich,
- Übernahme in Hauptplan erst nach Bestätigung.

### Erweiterung im aktuellen Stand
Planung ist nicht mehr an eine starre Monatsansicht gebunden. Die Zeitraumsteuerung bleibt verwendbar, auch wenn der Planungsmodus aktiv ist. Monatsentwürfe werden dabei kontextbezogen geladen oder neu aufgebaut.

### Hinweis
Das schützt vor ungewollter Datenveröffentlichung, setzt aber bewusst auf aktives Übernehmen oder Speichern.

---

## Auto-Planung Engine

Die Auto-Planung ist auf D/HG fokussiert.

### Ziele
- D/HG vollständig besetzen,
- harte Konflikte vermeiden,
- historische Last fairer verteilen,
- Wochenenden und Feiertage ausgleichen,
- Wünsche möglichst berücksichtigen.

### Eingaben
- Mitarbeitendenliste des Monats,
- historische Daten vorheriger Monate,
- Feiertagskalender,
- personenspezifische Zielwerte,
- Wunschdaten im Planungsmodus.

### Ergebnisdarstellung
- Fortschritts- und Phasenanzeige,
- Verteilungsübersicht,
- Warnhinweise,
- Abschlussbericht mit Gründen und Tags pro Vergabe.

Für die formale Detailanalyse siehe:
- `Algorithm_check.md`
- `Algorithmus-Kriterien.txt`

---

## Datenhaltung, Import und Export

## Speicherung
Die Hauptdaten werden im Browser gespeichert. Zusätzlich können Planungsentwürfe separat abgelegt werden.

### Vorteile
- keine Serverabhängigkeit,
- schneller Start,
- einfacher Betrieb,
- niedrige technische Einstiegshürde.

### Nachteile
- browsergebundene Datenhaltung,
- kein Mehrbenutzerbetrieb,
- keine serverseitige Revisionsführung.

## Export
Exportiert wird JSON mit:
- Hauptplan,
- vorhandenen Planungsentwürfen.

## Import
Import unterstützt:
- JSON-Text,
- Datei-Upload,
- Drag & Drop.

Nach dem Import wird eine Reparaturroutine ausgeführt, die fehlende freie Folgetage nach BD ergänzt.

---

## Responsivität und Bedienbarkeit

Die Anwendung wurde auf gute Sichtbarkeit über unterschiedliche Viewportgrößen ausgelegt.

### Sichtbarkeitsprinzipien
- klare Sticky-Strukturen im Desktop-Grid,
- mobile Karten statt unlesbarer Mini-Tabellen,
- kontrastreiche Badges und KPI-Karten,
- dialogübergreifend erreichbare Zeitraumsteuerung,
- große Touch-Ziele auf Mobile,
- Dashboard-Layouts mit Breakpoints und Umbau von Mehrspalten auf Einspalten-Layouts.

### Bedienprinzipien
- konsistente Buttons und Badges,
- Fokusfähigkeit relevanter Elemente,
- Tastaturkürzel an zentralen Stellen,
- schnelle Sprünge zwischen Übersicht und Detail.

---

## Algorithmische Regeln – Kurzüberblick

Die Planungslogik berücksichtigt u. a.:
- Feiertage in Sachsen,
- Folgetagsruhe nach D,
- historische Dienstlast,
- Wochenendäquivalente,
- Feiertagsrotation,
- Rollenrestriktionen,
- Wunschlogik,
- personenspezifische Sonderregeln,
- Eskalationsstufen bei Kandidatenmangel.

Eine vollständige Bewertung steht in `Algorithm_check.md`.

---

## Projektdateien

### Laufzeitdateien
- `index.html` – DOM-Struktur, Modals, globale Zeitraumsteuerung, Dashboard-Container.
- `app.css` – komplettes visuelles System, Responsive Design, Dashboard- und Flyout-Styling.
- `app.js` – Datenmodell, Renderlogik, Interaktionen, Planungsmodus, Auto-Planung, Analysefunktionen.

### Dokumentation
- `README.md` – diese ausführliche Anwendungsbeschreibung.
- `Algorithm_check.md` – detaillierte Bewertung der implementierten Algorithmuslogik.
- `Algorithmus-Kriterien.txt` – kompakter Kriterien- und Vergabekatalog.

---

## Betriebs- und Nutzungshinweise

### Empfohlene Nutzung
- Monatsplanung im Standardmodus prüfen,
- für Experimente in den Planungsmodus wechseln,
- Auto-Planung nur im Planungsmodus starten,
- Ergebnisse im Abteilungs- und Mitarbeitenden-Dashboard kontrollieren,
- erst danach in Hauptplan übernehmen,
- regelmäßig JSON exportieren.

### Besonders sinnvoll bei
- Monatswechseln,
- Feiertagsmonaten,
- Abstimmung zwischen Urlaubs- und Dienstlast,
- Transparenzgesprächen auf Team- oder Leitungsniveau.

---

## Ausblick

Fachlich sinnvolle nächste Ausbaustufen wären:
- konfigurierbare Regeln statt harter Personennamen im Code,
- Beschäftigungsgrad-/Sollzeitmodell,
- servergestützte Mehrbenutzerfähigkeit,
- zentrale Stammdatenpflege,
- differenziertere Rollen- und Qualifikationsprofile,
- Sammelübernahme mehrerer Monatsentwürfe.

---

## Kurzfazit

RadPlan ist im aktuellen Stand weit mehr als ein Monatsraster. Die Anwendung ist jetzt eine kombinierte Planungs-, Analyse- und Steuerungsoberfläche mit:
- monatsgenauer Tagesbearbeitung,
- planungsgetrennten Entwürfen,
- algorithmischer D/HG-Verteilung,
- Jahresanalyse auf Team- und Personenebene,
- global verfügbarer Zeitraumsteuerung,
- deutlich verbesserter Übersichtlichkeit über unterschiedliche Viewports hinweg.
