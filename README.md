# RadPlan – Vollständige Anwendungsbeschreibung (Stand: 26.03.2026)

RadPlan ist eine vollständig clientseitige Dienstplan-Anwendung für die Klinik für Radiologie & Nuklearmedizin. Sie kombiniert manuelle Monatsplanung mit einem isolierten Planungsmodus, einem regelbasierten Auto-Plan-Algorithmus ("RadPlan Neural Scheduler"), einer Live-Telemetrie-Oberfläche, einem Ergebnis-Review mit Kapitelstruktur sowie einem begründeten Abschlussbericht jeder automatischen Planungsrunde.

Diese Dokumentation beschreibt **nicht** nur Änderungen, sondern den funktionalen Ist-Zustand der Anwendung mit Datenmodell, Regeln, Einschränkungen, Prioritäten, Entscheidungslogik und Bedienabläufen.

---

## 1) Architektur, Laufzeitmodell und Datenhaltung

## 1.1 Technische Grundstruktur

RadPlan besteht aus drei Kernartefakten:

- `index.html` – UI-Struktur (Header, Tabellenbereich, mobile Ansicht, Modal-Container).  
- `app.css` – visuelles Design, Responsiveness, Modal-Layout, Engine-Visualisierung.  
- `app.js` – komplette Applikationslogik (State, Renderpfade, Interaktionen, Persistenz, Auto-Plan).

Es existiert keine serverseitige Logik. Alle Berechnungen laufen lokal im Browser.

## 1.2 Zustandsprinzip

Die Anwendung verwaltet monatsbezogene Daten in einer Schlüsselstruktur (Monat/Jahr), inklusive:

- Mitarbeitendenliste,
- Tageszuweisungen (`assignments`),
- Sonderzeile RBN,
- Planungsmodus-Entwürfe,
- Dienstwünsche (`wishes`) im Entwurfsmodus.

## 1.3 Persistenz- und Sicherheitsmodell

- Speicherung erfolgt im Browser (Local Storage).
- Import/Export als JSON ist vollständig vorhanden.
- Planungsmodus trennt produktiven Hauptplan und Entwurf strikt.
- Übernahme in den Hauptplan erfolgt ausschließlich explizit.

---

## 2) Fachmodell der Planung

## 2.1 Primäre Planobjekte

### 2.1.1 Mitarbeitende

Jede Person ist pro Monat in der Planstruktur vorhanden und kann fachliche Metadaten besitzen (z. B. Position/Funktionsgruppe). Diese Metadaten steuern Algorithmusberechtigungen und Bewertungsgewichte.

### 2.1.2 Tageszuweisung

Eine Tageszelle enthält:

- einen Arbeitsplatz-/Statuscode (z. B. `MR`, `CT`, Kombis),
- optional Dienstmarker `D` (Bereitschaftsdienst) oder `HG` (Hintergrunddienst).

### 2.1.3 Diensttypen

- **D**: primärer Bereitschaftsdienst, pro Tag genau eine Zuordnung.
- **HG**: Hintergrunddienst, pro Tag genau eine Zuordnung.

## 2.2 Zusatzobjekte

### 2.2.1 Wünsche

Im Planungsmodus werden Dienstwünsche geführt (u. a. positive Wünsche und Ausschlusswünsche). Diese fließen in Kandidatenfilter und Score-Berechnung ein.

### 2.2.2 RBN-Zeile

`RD Neurorad (RBN)` ist bewusst manuell geführt und wird nicht vom Auto-Planer überschrieben.

---

## 3) Bedienung und Ansichtslogik

## 3.1 Kopfbereich

- Monatsnavigation (vor/zurück/heute),
- Zeitraum-Flyout (Monat/Jahr direkt),
- Aktionen für Abteilung, Planung, Mitarbeitende, Import, Export.

## 3.2 Desktop-Monatsraster

- Tabellenzentrierte Monatsansicht,
- direkte Bearbeitung von Tageszellen,
- aggregierte Monatsinformationen.

## 3.3 Mobile Darstellung

- Kartenorientierte Tageslisten statt großer Tabelle,
- priorisierte Touch-Interaktion,
- eigene Mobile-Modal-Strategie mit Bottom-Sheet-Verhalten.

## 3.4 Modal-System

Ein konsistentes Overlay- und Modalprinzip:

- feste Kopf-/Fußbereiche,
- flexibel skalierbarer Body,
- mobile Anpassung über `dvh`, Safe-Area und Scrollcontainment.

---

## 4) Planungsmodus (Entwurfsbetrieb)

## 4.1 Ziel

Der Planungsmodus erlaubt risikofreie Änderungsschritte außerhalb des Hauptplans.

## 4.2 Eigenschaften

- dedizierter Entwurfszustand,
- Undo/Redo-Historie,
- Speichern/Verwerfen,
- explizites "Übernehmen" in den Hauptplan.

## 4.3 Eingriffstiefe

Folgende Bereiche werden im Entwurf geführt:

- Mitarbeitende,
- Assignments,
- Wünsche,
- RBN-Zeile.

---

## 5) Auto-Planer: Pipeline, Regeln, Optimierung

## 5.1 Gesamtablauf

Die Auto-Planung läuft in Phasen, die auch im Live-UI sichtbar sind:

1. Initialisierung/Datenanalyse,
2. BD-Wochenenden/Feiertage,
3. BD-Werktage,
4. BD-Optimierung,
5. HG-Bündelung,
6. HG-Verteilung,
7. tiefe Reoptimierung,
8. Validierung,
9. Abschluss.

## 5.2 Harte Regeln (Kandidatenfilter)

Typische harte Ausschlussgründe:

- Personen sind dienstbefreit,
- Abwesenheit/Urlaub/Krank,
- Tageskollision (bereits konfliktbehaftete Belegung),
- harte Mindestabstände,
- unzulässige Wochenend-/Feiertagsfolgen,
- fachliche Mindestanforderungen (z. B. HG nur qualifizierte Gruppen).

## 5.3 Weiche Regeln (Scoring)

Wenn mehrere Kandidierende zulässig sind, entscheidet ein gewichtetes Scoring. Berücksichtigte Dimensionen:

- Fairness der Gesamtverteilung,
- Fairness von Wochenend- und Feiertagslast,
- Vermeidung ungünstiger Dienstcluster,
- Berücksichtigung von Wünschen,
- Verteilungsstabilität gegenüber historischen Mustern,
- Qualität der Restlösbarkeit (Folgetage nicht blockieren).

## 5.4 Relaxed-Fallback

Wenn harte Regeln keine Vollabdeckung erlauben, lockert der Algorithmus gezielt Nebenbedingungen, priorisiert aber weiterhin medizinisch/fachlich kritische Regeln. Jede Lockerung wird im Log und in Warn-/Info-Kanälen sichtbar gemacht.

## 5.5 Optimierungsphase

Nach initialer Verteilung werden Tausch-/Reassignments durchgeführt:

- lokale Swaps,
- Lastreduktion extremer Ausreißer,
- Verbesserung von Streuungsmetriken,
- Konfliktbereinigung.

---

## 6) Live-Telemetrie während der Berechnung

Während des Laufes zeigt der Scheduler:

- Fortschrittsstatus,
- Live-Kennzahlen (D/HG/Regeln/Moves),
- Trace-Console,
- Constraint Flux Matrix.

### 6.1 Granulare Flux-Matrix

Der obere Fokusbereich visualisiert jetzt laufend:

- aktive Regel/Regelgruppe,
- aktuelle Entscheidungsklasse,
- Kontextbegründung/Detailtext.

Damit ist in Echtzeit erkennbar, **welche konkrete Regel oder Entscheidungsart** aktuell wirkt.

---

## 7) Ergebnisansicht und Abschlussbericht

## 7.1 Übersichtsansicht (Auto-Plan-Resultat)

Die Ergebnisansicht zeigt:

- Solution Fitness,
- Qualitätsindikatoren (Streuung, Wünsche, Lücken, Moves),
- vier auf-/zuklappbare Berichtskapitel.

### 7.1.1 Vier-Kapitel-Struktur

Der Bericht ist in vier zusammenhängende Kapitel gegliedert:

1. Bereitschaftsdienst-Verteilung,
2. Hintergrunddienst-Verteilung,
3. Verteilungs-Details,
4. Hinweise & Validierung.

Kapitel können einzeln geöffnet/geschlossen werden; geöffnete Inhalte bleiben vollständig sichtbar, ohne Überlagerungen des übergeordneten Containers.

### 7.1.2 Scrollprinzip

In der **Übersichtsansicht** darf und soll der Body des Auto-Plan-Modals scrollen. Das ist absichtlich so umgesetzt, damit auch bei kleiner Viewporthöhe alle Kapitel vollständig erreichbar sind.

### 7.1.3 KPI-Reihe

Die KPI-Kacheln sind als **dauerhaft einzeilige Reihe** ausgelegt. Bei schmalen Viewports skalieren Typografie/Innenabstände nach unten statt in mehrere Reihen umzubrechen.

## 7.2 Detaillierter Abschlussbericht

Der separate Report listet dienstbezogene Entscheidungen chronologisch mit:

- Tag/Datum,
- Diensttyp,
- Person,
- Begründung,
- optionalen Tags.

---

## 8) Qualitätsmodell und Kennzahlen

## 8.1 Metrikgruppen

Die Quality-Ausgabe umfasst u. a.:

- Gesamt-Score (Fitness),
- BD-/HG-Streuung,
- Wochenendstreuung,
- Optimierungsbewegungen,
- Wunscherfüllungsrate,
- Deckungslücken.

## 8.2 Interpretation

- Hoher Score bedeutet gute Balance aus Abdeckung, Fairness und Regelkonformität.
- Niedrige Streuungen deuten auf gleichmäßigere Last hin.
- Warnings kennzeichnen Unschärfen, nicht zwingend unbrauchbare Pläne.

---

## 9) Import/Export und Datenkompatibilität

## 9.1 Export

Exportiert werden Hauptplan und Entwürfe mit relevanten Unterstrukturen.

## 9.2 Import

Import unterstützt vollständige Exporte und Monatsdaten. Eingänge werden normalisiert; strukturelle Inkonsistenzen werden soweit möglich automatisch repariert.

---

## 10) UX-/A11y-/Responsive-Grundsätze

- klare semantische Dialog-/Statusstrukturen,
- robuste Bedienbarkeit bei kleinen Viewports,
- keine visuellen Überlagerungen in kritischen Berichtsbereichen,
- mobile optimierte Touchziele,
- reduzierte Animation bei `prefers-reduced-motion`.

---

## 11) Einschränkungen und bewusste Designentscheidungen

- Kein globales Optimum garantiert (heuristischer Optimierer).
- In Engpasslagen sind Regel-Lockerungen möglich, werden aber protokolliert.
- RBN bleibt manuell (fachlicher Schutzbereich).
- Browserseitige Speicherung erfordert organisatorische Backup-Disziplin (regelmäßiger JSON-Export).

---

## 12) Praktischer Betriebsablauf (empfohlen)

1. Monat wählen, Stammdaten/Wünsche prüfen.
2. Planungsmodus starten.
3. Auto-Plan Ziele validieren, Berechnung starten.
4. Live-Telemetrie auf Konflikthinweise beobachten.
5. Ergebnis in den vier Kapiteln prüfen.
6. Abschlussbericht lesen.
7. Entwurf übernehmen oder nachjustieren.
8. Danach Export als Backup.

---

## 13) Kurzfazit

RadPlan ist als transparentes, kliniktaugliches Planungssystem aufgebaut: manuelle Steuerbarkeit, sicherer Entwurfsbetrieb, nachvollziehbare Auto-Plan-Entscheidungen, klar strukturierte Ergebnisprüfung und vollständige browserseitige Betriebsfähigkeit ohne Serverabhängigkeit.
