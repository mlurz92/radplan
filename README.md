# RadPlan

RadPlan ist eine lokal laufende, browserbasierte Dienstplan-Anwendung für die Klinik für Radiologie & Nuklearmedizin. Die Anwendung kombiniert einen editierbaren Monatsplan, einen strikt getrennten Planungsmodus, eine Auto-Planungs-Engine für D/HG, detaillierte Monats- und Jahresauswertungen sowie eine visuell stark ausgestaltete Präsentationsoberfläche für Planungsentscheidungen.

Dieses README beschreibt den **aktuellen vollständigen Funktionsstand** der Anwendung. Es ist ausdrücklich **keine** reine Änderungsübersicht, sondern eine umfassende Anwendungsbeschreibung mit Fokus auf Verhalten, Regeln, Grenzen, Vergabekriterien und Bedienlogik.

---

## Inhaltsverzeichnis

1. [Produktzweck](#produktzweck)
2. [Technischer Zuschnitt](#technischer-zuschnitt)
3. [Dateistruktur](#dateistruktur)
4. [Start und Betrieb](#start-und-betrieb)
5. [Datenmodell](#datenmodell)
6. [Monatsplan](#monatsplan)
7. [Zellenbearbeitung](#zellenbearbeitung)
8. [Planungsmodus](#planungsmodus)
9. [Auto-Planungs-Engine](#auto-planungs-engine)
10. [Algorithmische Entscheidungsregeln](#algorithmische-entscheidungsregeln)
11. [Sonderregeln pro Person](#sonderregeln-pro-person)
12. [Wochenend-, Feiertags- und FZA-Logik](#wochenend--feiertags--und-fza-logik)
13. [Mitarbeitenden-Dashboard](#mitarbeitenden-dashboard)
14. [Profil- und Jahresauswertungen](#profil--und-jahresauswertungen)
15. [Abteilungsübersicht](#abteilungsübersicht)
16. [Import, Export und Persistenz](#import-export-und-persistenz)
17. [UI-, Performance- und Animationskonzept](#ui-performance--und-animationskonzept)
18. [Einschränkungen des aktuellen Stands](#einschränkungen-des-aktuellen-stands)
19. [Praktische Nutzungsempfehlungen](#praktische-nutzungsempfehlungen)

---

## Produktzweck

RadPlan ist für drei eng zusammenhängende Aufgaben ausgelegt:

1. **Operative Monatsplanung**
   - tägliche Zuweisung von Arbeitsplätzen,
   - Setzen von Abwesenheiten,
   - manuelle Vergabe von D und HG,
   - Plausibilitätsprüfung direkt im Bearbeitungsdialog.

2. **Simulations- und Entwurfsplanung**
   - Planungsmodus als isolierter Arbeitsbereich,
   - Undo/Redo,
   - Wünsche,
   - algorithmische Probeplanung,
   - bewusste Übernahme in den Hauptplan erst nach Bestätigung.

3. **Analyse und Transparenz**
   - Monats- und Jahreskennzahlen,
   - Mitarbeitenden-Dashboard,
   - Profilansichten,
   - Abteilungsübersichten,
   - ausführliche Ergebnisdarstellung der Auto-Planung.

Die Anwendung ist bewusst so gestaltet, dass sie sowohl praktisch im Alltag nutzbar als auch vor Kolleginnen und Kollegen gut demonstrierbar ist.

---

## Technischer Zuschnitt

RadPlan ist eine klassische statische Single-Page-Anwendung ohne Build-Toolchain.

### Eigenschaften
- keine Abhängigkeit von Node-, Python- oder Backend-Servern für den Regelbetrieb,
- alle Kernlogiken liegen in statischen Dateien,
- Datenhaltung im Browser per `localStorage`,
- vollständige Nutzbarkeit direkt über `index.html` oder einen simplen statischen Webserver.

### Zentrale Dateien
- `index.html` – Markup und Modals,
- `app.css` – gesamtes visuelles System,
- `app.js` – gesamte Interaktions-, Planungs- und Algorithmuslogik.

---

## Dateistruktur

Wichtige Dateien im Projekt:

- `index.html` – Einstiegspunkt der Anwendung.
- `app.css` – visuelle Gestaltung, responsive Regeln, Modal-Designs, Animationen.
- `app.js` – komplette Laufzeitlogik.
- `README.md` – diese Gesamtbeschreibung.
- `Algorithmusregeln.txt` – fachlich formulierte Regelsammlung der Auto-Planung.
- `Algorithm_check.md` – fachlich-technische Prüfbeschreibung des aktuellen Algorithmus.
- `Algorithmus-Kriterien.txt` – ergänzender Kriterienkatalog.
- `manifest.json` – PWA-nahe Metadaten.
- `img/` – Icons und grafische Assets.

---

## Start und Betrieb

### Minimal
Die Anwendung kann direkt im Browser geöffnet werden:
- `index.html` doppelklicken oder
- über einen simplen lokalen HTTP-Server bereitstellen.

### Empfohlener Betrieb
Für konsistente Browser-Sicherheits- und Import-/Export-Workflows empfiehlt sich ein lokaler statischer Server, z. B.:
- Python `http.server`,
- VS-Code Live Server,
- jeder beliebige statische Dateiserver.

### Persistenz
Gespeichert wird lokal im Browser über `localStorage`. Das bedeutet:
- Daten sind browserlokal,
- kein automatischer Mehrbenutzerabgleich,
- Wechsel des Browsers oder Löschen der Browserdaten entfernt den lokalen Bestand,
- für Sicherung und Transport ist der JSON-Export vorgesehen.

---

## Datenmodell

### Mitarbeitende
Für jede Person existieren Metadaten wie:
- Vollname,
- Positionskürzel,
- Rollenbezeichnung,
- fachlicher Status (FA/AA),
- Bereich/Schwerpunkt,
- Stellvertretungshinweise.

Diese Metadaten wirken nicht nur optisch, sondern beeinflussen direkt die Auto-Planung.

### Zellinhalt
Eine Tageszelle kann aus mehreren semantischen Ebenen bestehen:

1. **Arbeitsplatzcode**
   - `MR`, `CT`, `US`, `AN`, `MA`, `KUS`, `W`, `T`

2. **Statuscode**
   - `F`, `U`, `ZU`, `SU`, `FZA`, `K`, `KK`, `§15c`, `WB`

3. **Dienstcode**
   - `D`, `HG`

### Wünsche im Planungsmodus
- `NO_DUTY`
- `BD_WISH`
- `HG_WISH`

Diese Wünsche gelten ausschließlich im Planungsmodus und beeinflussen die Auto-Planung.

---

## Monatsplan

Der Monatsplan ist die zentrale Tabellenansicht der Anwendung.

### Eigenschaften
- sticky Kopfspalte für Mitarbeitendennamen,
- sticky Tageskopf,
- visuelle Kennzeichnung von Werktagen, Wochenenden, Feiertagen und dem heutigen Tag,
- Darstellung von Belegung, Dienst und Wunschhinweisen pro Zelle,
- Monatsstatistiken im Headerbereich,
- Footer-Summen je Tag.

### Interaktionen
- Klick auf eine Namenszelle öffnet das Profil.
- Klick auf eine Tageszelle öffnet den Bearbeitungsdialog.
- Wechsel des Monats über Navigation oder Zeitraumsteuerung.

### Zeitraumsteuerung
Die Zeitraumsteuerung erlaubt:
- freien Wechsel von Monat und Jahr,
- Nutzung auch bei geöffneten Modals,
- Nutzung auch im Planungsmodus,
- schnelles Springen um Monat oder Jahr.

---

## Zellenbearbeitung

Der Bearbeitungsdialog dient der manuellen Pflege einzelner Zellen.

### Funktionen
- Arbeitsplatz setzen,
- Status setzen,
- D/HG setzen oder entfernen,
- Konfliktwarnungen sehen,
- im Planungsmodus zusätzlich Wünsche setzen.

### Direkte Plausibilisierung
Die Anwendung warnt unmittelbar bei typischen Konflikten, z. B.:
- Dienst bereits vergeben,
- Folgetag Urlaub,
- unpassende Kombinationen aus Status und Dienst.

### Automatische Folgetagslogik
Wenn manuell ein D gesetzt wird, wird automatisch ein `F` am Folgetag ergänzt, sofern dort noch nichts anderes steht.

---

## Planungsmodus

Der Planungsmodus ist ein bewusst separater Entwurfsraum.

### Ziel
Er soll erlauben, mit Regeln, Wünschen und automatischer Verteilung zu arbeiten, ohne den Hauptplan sofort zu verändern.

### Eigenschaften
- eigener Entwurfsdatensatz,
- Undo/Redo-Historie,
- Speichern des Entwurfs,
- explizites Abbrechen oder Übernehmen,
- Wünsche pro Zelle,
- Auto-Planung nur im Planungsmodus verfügbar.

### Wichtige Konsequenz
Die Auto-Planung arbeitet **nicht** direkt auf dem Hauptplan, sondern auf dem aktiven Planungsentwurf.

---

## Auto-Planungs-Engine

Die Auto-Planung verteilt D und HG auf Basis fester Regeln, Soft-Constraints, Historie und Optimierungsschritten.

### Phasen
1. Initialisierung und Reparatur fehlender F-Tage nach D.
2. Verteilung von BD an Wochenenden und Feiertagen.
3. Verteilung von BD an Werktagen.
4. Iterative BD-Optimierung.
5. HG-Bündelung für gekoppelte Konstellationen.
6. Verteilung verbleibender HG.
7. Iterative HG-Optimierung.
8. Validierung und Ergebnisaufbereitung.

### Ergebnisdarstellung
Nach der Berechnung zeigt die Anwendung:
- D-Verteilung,
- HG-Verteilung,
- Detailhinweise,
- Warnungen,
- kritische Warnungen,
- Abschlussbericht einzelner Entscheidungen.

---

## Algorithmische Entscheidungsregeln

### Oberste Prioritäten
1. Vollständige Besetzung.
2. Vermeidung unzulässiger Vergaben.
3. Erhalt bereits fixierter Dienste.
4. Berücksichtigung von Wünschen und Sonderregeln.
5. Faire Monatsverteilung.

### Harte Regeln für D
Ein D wird blockiert bei:
- Dienstbefreiung,
- Abwesenheit,
- bereits vorhandenem Dienst,
- `NO_DUTY`,
- Samstag bei Nicht-FA,
- Polednia-Sperrtagen,
- Becker/Martin-Konflikt,
- `F` am Zieltag,
- Urlaub am Folgetag,
- D an Vor- oder Folgetag,
- unzulässiger HG→D-Folge,
- Oster-/Pfingst-Blockkonflikt,
- im strengen Modus außerdem Zielüberschreitung, Wochenendlimit, Becker-Samstag und zu geringer D-Abstand.

### Harte Regeln für HG
Ein HG wird blockiert bei:
- Nicht-FA,
- Dienstbefreiung,
- Abwesenheit,
- bereits vorhandenem Dienst,
- `NO_DUTY`,
- `F` am normalen Werktag,
- Konflikt mit Folgetags-D,
- Feiertagsblockkonflikt,
- bestimmten Polednia-AA-Konstellationen,
- Überschreitung des Wochenendlimits im strengen Modus.

### Soft-Constraints
Die Engine versucht zusätzlich:
- D nahe am Soll zu halten,
- HG monatlich fair zu verteilen,
- Wochenendäquivalente zu glätten,
- Samstagsdienste über FA auszugleichen,
- Feiertagslast historisch zu rotieren,
- D-F-D-F zu vermeiden,
- direkt aufeinanderfolgende HG zu vermeiden,
- Donnerstag vor Urlaub positiv zu bewerten,
- Wünsche möglichst zu erfüllen.

### Historische Kennzahlen
Die Historie vor dem Zielmonat enthält u. a.:
- Anzahl D,
- Anzahl HG,
- Wochenendlast,
- Feiertagslast,
- Donnerstag-D,
- HG für AA,
- HG für FA,
- Samstags-D.

Diese Werte dienen als Fairnesskorrektiv.

---

## Sonderregeln pro Person

### Prof. Schäfer
- dienstbefreit.

### Dr. Polednia
- reduziertes Standardziel für D,
- keine D an Sonntag, Dienstag und Donnerstag,
- HG für AA an Sonntag, Dienstag und Donnerstag möglichst bzw. im strengen Modus nicht.

### Dr. Becker
- reduziertes Standardziel für D,
- Samstags-D nur als Notlösung,
- bei Samstags-D spezielle FZA-Regel am nächsten Werktag,
- wenn dieser Werktag durch Urlaub/F eines anderen FA oder durch eigene Belegung blockiert ist, wird statt einer stillen Automatikeintragung eine **kritische Warnung** in der Auto-Planungs-Modal angezeigt.

### Dr. Martin
- Becker/Martin-Vertretungskonflikt verhindert bestimmte D-Konstellationen mit Urlaubsvertretung.

### Hr. Sebastian
- reduziertes Standardziel für D.

---

## Wochenend-, Feiertags- und FZA-Logik

### Wochenendäquivalent
Ein Wochenende zählt je Person als:
- `1,0` bei mindestens einem D,
- `0,5` bei HG ohne D.

Relevant sind Freitag, Samstag, Sonntag.

### HG-D-HG-Kette am Wochenende
Die Anwendung bildet eine feste Koppelung:
- Hat ein AA am Freitag D, soll der FA des Samstags-D den Freitags-HG übernehmen.
- Hat ein FA am Samstag D, soll derselbe FA den Sonntags-HG übernehmen.
- Diese gekoppelte Wochenendkette wird **vor** der allgemeinen HG-Verteilung gesetzt.
- Spätere HG-Optimierung darf diese gekoppelten Zuweisungen nicht mehr verschieben.

### Feiertage
Die Anwendung berechnet sächsische Feiertage algorithmisch. Feiertage wirken auf:
- Kennzeichnung im Plan,
- Statistik,
- Fairness,
- Feiertagsrotation,
- Oster-/Pfingst-Blockregel.

### Oster-/Pfingst-Regel
Wer im Osterblock Dienst hat, soll nicht im Pfingstblock Dienst erhalten und umgekehrt.

### FZA für Dr. Becker nach Samstags-D
Das Verhalten ist aktuell präzise definiert:
- gesucht wird der **nächste Werktag** nach dem Samstag,
- dort wird `FZA` nur gesetzt, wenn kein anderer FA bereits `U`, `ZU`, `SU`, `§15c` oder `F` hat,
- und wenn Dr. Becker dort selbst noch keine Belegung hat,
- andernfalls entsteht eine hervorgehobene kritische Warnung in der Ergebnisansicht der Planungsmodal.

---

## Mitarbeitenden-Dashboard

Das Mitarbeitenden-Dashboard ist eine Jahresübersicht über alle im Kalenderjahr vorkommenden Personen.

### Inhalte
- KPI-Zusammenfassung,
- Liste bzw. Kartenansicht aller Mitarbeitenden,
- Such- und Rollenfilter,
- Detailbereich mit mehreren Perspektiven.

### Perspektiven
1. Monatsverlauf.
2. Jahreskalender.
3. Verwaltung des aktuellen Monatsbestands.

### Nutzen
Das Dashboard ist zugleich:
- personenzentrierte Auswertung,
- Jahresübersicht,
- Stammdatenzugang,
- Einstieg in Monatsverwaltung.

---

## Profil- und Jahresauswertungen

Per Klick auf einen Namen öffnet sich ein Profil mit:
- Stammdaten,
- Monats-KPIs,
- Verteilung der Arbeitsplätze,
- D/HG-Details,
- Jahresaufsummierung je Monat.

Diese Sicht ist stärker individualanalytisch als die Abteilungsübersicht.

---

## Abteilungsübersicht

Die Abteilungsübersicht bietet eine teambezogene Perspektive.

### Monatsmodus
Typische Inhalte:
- AP-Tage,
- MR/CT-Verteilung,
- Urlaub,
- Krankheit,
- FZA,
- D,
- HG,
- Frei,
- offene Abdeckung.

### Jahresmodus
Jahressummen auf Teamebene, u. a.:
- AP,
- Urlaub,
- Krankheit,
- FZA,
- WB,
- D/HG,
- Abdeckung.

---

## Import, Export und Persistenz

### Export
Alle relevanten Daten lassen sich als JSON exportieren.

### Import
Import ist möglich über:
- Dateiauswahl,
- Drag & Drop,
- Einfügen von JSON.

### Persistenzlogik
- Hauptdaten werden lokal gespeichert.
- Entwurfsdaten des Planungsmodus werden getrennt behandelt.
- Folgemonatsbelegungen, etwa automatische F- oder FZA-Einträge, können bei der Übernahme der Auto-Planung ebenfalls persistiert werden.

---

## UI-, Performance- und Animationskonzept

### Gestalterische Ziele
Die Oberfläche soll:
- in der täglichen Nutzung ruhig und effizient sein,
- in der Auto-Planungs-Modal aber auch demonstrativ stark wirken.

### Auto-Planungs-Modal
Die Modal visualisiert den Lauf als High-Tech-HUD mit:
- Live-Telemetrie,
- Pipeline-Anzeige,
- Fortschrittsbalken,
- Terminal-Konsole,
- Radar-/Sweep-/Grid-Effekten,
- klar hervorgehobenen kritischen Warnungen.

### Performanceprinzipien
Die Animationen sind auf performante Browserpfade ausgelegt:
- primär `transform`, `opacity`, `filter` und Gradients,
- begrenzte Anzahl parallel animierter Elemente,
- Vermeidung layoutintensiver Daueranimationen,
- `translateZ(0)`/GPU-freundliche Darstellungen an zentralen Stellen,
- `prefers-reduced-motion`-Kompatibilität über das bestehende CSS-Reduktionsmuster.

### Praktische Konsequenz
Die Anwendung soll sich flüssig anfühlen, ohne dabei den Algorithmus selbst unnötig zu verlangsamen. Die Auto-Planung wird zuerst berechnet; die Darstellung des Durchlaufs dient der nachvollziehbaren und beeindruckenden Visualisierung dieser bereits erzeugten Entscheidungsfolge.

---

## Einschränkungen des aktuellen Stands

1. Mehrere Sonderregeln sind namentlich im Code verankert und noch nicht administrativ konfigurierbar.
2. Die Zielwerte für D basieren auf festen Standardvorgaben, nicht auf Teilzeit-/Vollzeitfaktoren.
3. Die Anwendung ist lokal und browsergebunden; es gibt keinen eingebauten Mehrbenutzerabgleich.
4. Die Becker-FZA-Sonderregel sucht bewusst **nicht** automatisch weitere Ausweichwerktage, sondern eskaliert am ersten blockierten Werktag mit Warnung.
5. Historische Fairness basiert auf gespeicherten Monatsdaten; nicht gespeicherte fremde Entwürfe sind kein globaler Wahrheitsbestand.

---

## Praktische Nutzungsempfehlungen

### Für die tägliche Planung
- Hauptplan für manuelle Pflege verwenden.
- Kritische Einzeltage direkt im Editor prüfen.

### Für algorithmische Verteilung
- Planungsmodus aktivieren.
- Wünsche eintragen.
- Auto-Planung starten.
- Ergebniswarnungen und Abschlussbericht lesen.
- Erst danach in den Hauptplan übernehmen.

### Für Samstagskonstellationen
- Samstags-D von Dr. Becker immer bewusst prüfen.
- Kritische Warnungen in der Auto-Planungs-Modal nicht ignorieren.

### Für Präsentationen
- Auto-Planungs-Modal mit laufender Telemetrie eignet sich bewusst als demonstrativer Präsentationsmodus.
- Abschlussbericht nutzen, um Einzelentscheidungen transparent zu erläutern.

---

## Zusammenfassung

RadPlan ist im aktuellen Stand keine reine Tabelle, sondern ein umfassendes lokales Planungssystem mit:
- bearbeitbarem Monatsplan,
- isoliertem Entwurfsmodus,
- regelbasierter D/HG-Auto-Planung,
- personenbezogenen Sonderregeln,
- Wochenend- und Feiertagslogik,
- sichtbar eskalierenden Warnmechanismen,
- umfangreichen Monats- und Jahresanalysen,
- und einer bewusst eindrucksvoll gestalteten Auto-Planungs-Modal für nachvollziehbare Demonstrationen.

