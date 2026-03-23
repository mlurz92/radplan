# RadPlan

RadPlan ist eine lokal laufende, browserbasierte Dienstplan-Anwendung für die Klinik für Radiologie & Nuklearmedizin. Die Anwendung vereint Monatsplanung, Planungsentwürfe, Wunschverwaltung, Auto-Planung für Bereitschaftsdienst (`D`) und Hintergrunddienst (`HG`), Monats- und Jahresauswertungen, mobile Ansichten sowie eine sehr ausführliche Visualisierung algorithmischer Entscheidungswege.

Dieses Dokument beschreibt **den aktuellen Ist-Zustand der Anwendung**. Es ist ausdrücklich **keine Änderungsübersicht** und **kein Changelog**, sondern eine vollständige Produkt-, Funktions-, Regel- und Bedienbeschreibung auf Basis des implementierten Stands in `index.html`, `app.css`, `app.js` und den beigefügten Algorithmus-Dokumenten.

---

## Inhaltsverzeichnis

1. [Produktziel und Einsatzbereich](#produktziel-und-einsatzbereich)
2. [Technische Architektur](#technische-architektur)
3. [Dateistruktur des Projekts](#dateistruktur-des-projekts)
4. [Start, Betrieb und Persistenz](#start-betrieb-und-persistenz)
5. [Zentrales Datenmodell](#zentrales-datenmodell)
6. [Mitarbeitenden-Stammdaten und Rollenlogik](#mitarbeitenden-stammdaten-und-rollenlogik)
7. [Kalender- und Tageslogik](#kalender--und-tageslogik)
8. [Dienst- und Statuscodes](#dienst--und-statuscodes)
9. [Monatsansicht und Tabellenlogik](#monatsansicht-und-tabellenlogik)
10. [Responsive Bedienung und Mobile View](#responsive-bedienung-und-mobile-view)
11. [Globale Zeitraumsteuerung](#globale-zeitraumsteuerung)
12. [Bearbeitung einzelner Zellen](#bearbeitung-einzelner-zellen)
13. [Planungsmodus](#planungsmodus)
14. [Wunschsystem im Planungsmodus](#wunschsystem-im-planungsmodus)
15. [Undo, Redo, Speichern, Übernehmen und Verwerfen](#undo-redo-speichern-übernehmen-und-verwerfen)
16. [Auto-Planung: Zielbild und Ablauf](#auto-planung-zielbild-und-ablauf)
17. [Historische Kennzahlen und Fairnessbasis](#historische-kennzahlen-und-fairnessbasis)
18. [Harte Regeln für Bereitschaftsdienst (`D`)](#harte-regeln-für-bereitschaftsdienst-d)
19. [Harte Regeln für Hintergrunddienst (`HG`)](#harte-regeln-für-hintergrunddienst-hg)
20. [Ruhetags-, Folge- und Nachbarschaftsregeln](#ruhetags--folge--und-nachbarschaftsregeln)
21. [Wochenend-, Feiertags- und Blockregeln](#wochenend--feiertags--und-blockregeln)
22. [Personenspezifische Sonderregeln](#personenspezifische-sonderregeln)
23. [Scoring für `D`](#scoring-für-d)
24. [Scoring für `HG`](#scoring-für-hg)
25. [Optimierungsschritte nach der Erstverteilung](#optimierungsschritte-nach-der-erstverteilung)
26. [Qualitätsmetriken und Gesamtscore](#qualitätsmetriken-und-gesamtscore)
27. [Auto-Plan-Modals: Konfiguration, Live-Lauf, Ergebnis, Bericht](#auto-plan-modals-konfiguration-live-lauf-ergebnis-bericht)
28. [Abteilungsübersicht](#abteilungsübersicht)
29. [Mitarbeitenden-Dashboard](#mitarbeitenden-dashboard)
30. [Profilansicht einzelner Personen](#profilansicht-einzelner-personen)
31. [Import, Export und Datenmigration](#import-export-und-datenmigration)
32. [Bedien- und Darstellungskonzept der Modals](#bedien--und-darstellungskonzept-der-modals)
33. [Sichtbare Warnungen, Informationen und Grenzen](#sichtbare-warnungen-informationen-und-grenzen)
34. [Empfohlene Arbeitsweise im Alltag](#empfohlene-arbeitsweise-im-alltag)
35. [Weiterentwicklungspotenziale](#weiterentwicklungspotenziale)

---

## Produktziel und Einsatzbereich

RadPlan adressiert drei eng verknüpfte Aufgaben:

### 1. Operative Monatsplanung
- manuelle Eintragung von Arbeitsplätzen,
- Verwaltung von Frei-, Urlaubs- und Abwesenheitsstatus,
- manuelle Vergabe von `D` und `HG`,
- direkte Sichtbarkeit von Konflikten und Folgeregeln.

### 2. Simulations- und Entwurfsplanung
- isolierter Planungsmodus ohne sofortige Änderung des Hauptplans,
- Wunschmarkierungen für Dienste,
- algorithmische Probeplanung,
- Rücknahme und Wiederherstellung von Änderungen,
- bewusste Übernahme eines Entwurfs in den Hauptbestand.

### 3. Analyse und Transparenz
- Monatskennzahlen pro Person,
- Jahres-Dashboard über alle Mitarbeitenden,
- Profilansichten mit Kalender- und Verteilungsdaten,
- Abteilungsübersicht für Monat und Jahr,
- nachvollziehbarer Auto-Plan-Abschlussbericht mit Begründungen und Tags.

Die Anwendung ist bewusst so gestaltet, dass sie sowohl als praktisches Alltagswerkzeug als auch als präsentationsfähige Demonstrationsoberfläche funktioniert.

---

## Technische Architektur

RadPlan ist eine klassische statische Single-Page-Anwendung ohne Build-Pipeline.

### Kerneigenschaften
- kein Backend erforderlich,
- keine Node-/Webpack-/Vite-Pflicht,
- Ausführung direkt im Browser,
- Speicherung der Hauptdaten im Browser über `localStorage`,
- Planungsentwürfe ebenfalls browserlokal,
- PWA-nahe Metadaten über `manifest.json`.

### Technischer Zuschnitt
- `index.html` enthält die vollständige Struktur, inklusive aller Modals.
- `app.css` enthält das gesamte visuelle System, responsive Regeln, Animationen, Modal-Layouts und Mobile-Oberflächen.
- `app.js` enthält die komplette Zustandsverwaltung, Rendering-Logik, Datenhaltung, Import/Export-Funktionen sowie die Auto-Planungs-Engine.

Es gibt damit keine Trennung zwischen Frontend- und Backend-Domäne; sämtliche Regeln sind direkt im Client implementiert.

---

## Dateistruktur des Projekts

Wichtige Dateien im Projektwurzelverzeichnis:

- `index.html` – Einstiegspunkt und Struktur aller Bereiche.
- `app.css` – komplettes Designsystem, Tabellenlayout, Mobile UI, Modals, Auto-Plan-Visualisierung.
- `app.js` – Zustandslogik, Rendering, Persistenz, Modals, Auto-Plan-Engine, Reports.
- `README.md` – diese umfassende Funktionsbeschreibung.
- `Algorithmusregeln.txt` – fachlicher Regeltext für die aktuelle Auto-Planung.
- `Algorithmus-Kriterien.txt` – Kriterienkatalog für Vergabe- und Qualitätslogik.
- `Algorithm_check.md` – fachlich-technische Prüf- und Beschreibungsunterlage des Algorithmus.
- `manifest.json` – App-Metadaten für installierbare Browserumgebungen.
- `img/` – Logos, Icons und grafische Assets.

Zusätzliche Archiv- und Referenzdateien im Projektverzeichnis dienen der Dokumentation oder Sicherung, sind aber nicht Teil des Kernlaufzeitpfads.

---

## Start, Betrieb und Persistenz

### Direktstart
Die Anwendung kann direkt geöffnet werden:
- per Doppelklick auf `index.html`,
- oder über einen simplen statischen Webserver.

### Empfohlener lokaler Betrieb
Für stabilere Datei- und Browser-Workflows empfiehlt sich ein lokaler HTTP-Server, z. B.:
- `python -m http.server`,
- VS-Code Live Server,
- jeder andere statische Dateiserver.

### Persistenzmodell
Die Anwendung speichert den Datenbestand lokal im Browser.

Das bedeutet konkret:
- Daten sind an den jeweiligen Browser bzw. das jeweilige Profil gebunden,
- es gibt keinen automatischen Mehrbenutzerabgleich,
- Browserdaten löschen entfernt lokale Planstände,
- für Sicherung, Transport oder Gerätewechsel ist der JSON-Export vorgesehen.

### Speicherebenen
1. **Hauptbestand**
   - persistiert im Standard-Storage-Key,
   - enthält Monatsdaten über mehrere Monate und Jahre.

2. **Planungsentwürfe**
   - werden monatsbezogen separat gespeichert,
   - bleiben bewusst vom Hauptbestand getrennt,
   - können geladen, fortgeführt oder verworfen werden.

---

## Zentrales Datenmodell

### Monatsdaten
Ein Monat wird logisch über Jahr und Monat adressiert.

Ein Monatsdatensatz enthält mindestens:
- `employees` – Liste der Mitarbeitenden des Monats,
- `assignments` – Zuweisungen pro Person und Tag,
- `wishes` – Wunschmarkierungen im Planungsmodus.

### Zellmodell
Eine Zelle kann mehrere semantische Ebenen tragen:
- **Arbeitsplatzbelegung** (`MR`, `CT`, `US`, ...),
- **Status** (`F`, `U`, `FZA`, `K`, ...),
- **Dienst** (`D` oder `HG`),
- **Wunschinformation** im Planungsmodus.

### Leere und partielle Zellen
Eine Zelle muss nicht vollständig befüllt sein.
Möglich sind z. B.:
- nur Arbeitsplatz,
- nur Status,
- Arbeitsplatz plus Dienst,
- Status ohne Arbeitsplatz,
- Wunsch ohne Dienst.

Die Anwendung bereinigt leere Teilobjekte automatisch, damit keine inhaltslosen Zellobjekte im Datensatz verbleiben.

---

## Mitarbeitenden-Stammdaten und Rollenlogik

Die Anwendung nutzt fest verdrahtete Metadaten pro Person.

### Stammdatenfelder
Je Person können unter anderem hinterlegt sein:
- Vollname,
- Positionskürzel,
- Rollenbezeichnung,
- fachlicher Status,
- Schwerpunkt/Bereich,
- Stellvertretungshinweise.

### Rollenklassen
Für die Logik sind insbesondere zwei Gruppen wichtig:

#### Fachärztlich geeignete Personen
`CA`, `LOA`, `OA`, `OÄ`, `FA`, `FÄ`

Diese Gruppe:
- darf `HG` übernehmen,
- darf Samstags-`D` übernehmen,
- wird bei bestimmten Fairnessmetriken separat betrachtet.

#### Assistenzärztliche Personen
`AA`, `AÄ`

Diese Gruppe:
- kann regulär `D` erhalten,
- kann **kein** `HG` erhalten,
- beeinflusst die HG-Bewertung fachärztlicher Personen, weil `HG für AA` getrennt gezählt wird.

### Dienstbefreiung
Einzelne Personen können vollständig von Diensten ausgenommen sein.
Aktuell ist `Prof. Schäfer` als dienstbefreit hinterlegt.

---

## Kalender- und Tageslogik

### Kalendergrundlagen
Die Anwendung berechnet:
- Tagesanzahl pro Monat,
- Wochentag pro Datum,
- ISO-Kalenderwoche,
- Monatsgrenzen in beide Richtungen,
- den jeweils nächsten bzw. vorigen Kalendertag.

### Feiertagslogik
Sächsische Feiertage werden algorithmisch berechnet, inklusive:
- Neujahr,
- Karfreitag,
- Ostermontag,
- Tag der Arbeit,
- Christi Himmelfahrt,
- Pfingstmontag,
- Tag der Deutschen Einheit,
- Reformationstag,
- Buß- und Bettag,
- 1. und 2. Weihnachtstag.

### Tagesklassen
Ein Tag kann in der UI und Logik zugleich bewertet werden als:
- Werktag,
- Freitag,
- Samstag,
- Sonntag,
- Feiertag,
- heutiger Tag.

Diese Klassifizierung beeinflusst sowohl Darstellung als auch Auto-Plan-Regeln.

---

## Dienst- und Statuscodes

### Arbeitsplatzcodes
Aktuell vorhanden:
- `MR` – MRT,
- `CT` – CT,
- `US` – Sonographie,
- `AN` – Angiographie,
- `MA` – Mammographie,
- `KUS` – Kinder-US,
- `W` – Wermsdorf,
- `T` – Teleradiologie.

### Statuscodes
Aktuell vorhanden:
- `F` – Frei,
- `U` – Urlaub,
- `ZU` – Zusatzurlaub,
- `SU` – Sonderurlaub,
- `FZA` – Freizeitausgleich,
- `K` – Krank,
- `KK` – Kind krank,
- `§15c`,
- `WB` – Weiterbildung.

### Dienstcodes
- `D` – Bereitschaftsdienst,
- `HG` – Hintergrunddienst.

### Abwesenheits- und Urlaubsgruppen
Die Engine unterscheidet intern zwischen:
- **Abwesenheit allgemein** – für harte Ausschlüsse,
- **urlaubsähnlichen Codes** – für Folgetags- und Nachbarschaftsregeln.

Das ist relevant, weil nicht jede Abwesenheit gleich gewichtet wird.

---

## Monatsansicht und Tabellenlogik

Die Hauptansicht ist eine horizontale Monatsmatrix.

### Struktur
- linke Sticky-Spalte mit Mitarbeitendennamen,
- obere Sticky-Zeile mit Tagen,
- Zellen für jede Person/Tag-Kombination,
- Fußzeile mit Tagesaggregation,
- darüber Monatsstatistikleiste.

### Sichtbare Kennzeichnungen
- Wochenenden und Feiertage farblich markiert,
- heutiger Tag hervorgehoben,
- Positionsbadges an Mitarbeitenden,
- Zellfarben nach Arbeitsplatz/Status,
- Dienst- und Wunschhinweise.

### Interaktionen
- Klick auf einen Namen öffnet das Profil,
- Klick auf eine Zelle öffnet den Editor,
- Monat kann unabhängig von geöffneten Modals gewechselt werden.

### Scroll- und Sticky-Verhalten
Die Tabelle ist für horizontale und vertikale Überläufe ausgelegt.
Sticky-Elemente halten Kopf und Namensspalte im Sichtbereich, damit große Monate mit vielen Mitarbeitenden bearbeitbar bleiben.

---

## Responsive Bedienung und Mobile View

Die Anwendung besitzt eine eigene Mobile-Oberfläche statt nur geschrumpfter Desktop-Tabelle.

### Mobile-Umschaltung
Die mobile Darstellung wird abhängig von Viewportbreite und Touch-/Pointer-Merkmalen aktiviert.

### Mobile-Komponenten
- eigene Monatszusammenfassung,
- eigene Tageskartenliste,
- mobile Bottom-Navigation,
- mobile Sheets für Aktionen und Tagesdetails,
- modalartige Full-Width-Sheets für zentrale Dialoge.

### Mobile-Tageskarte
Eine Tageskarte zeigt u. a.:
- Datum,
- Wochentag,
- Feiertagslabel,
- `D`/`HG`-Badges,
- Arbeitsplatz-Chips,
- Planungsindikatoren.

### Mobile-Tagesdetail
Das Tagesdetail zeigt:
- Tageskopf,
- Dienstbadges,
- Mitarbeitendenliste mit Belegungen,
- Wunschhinweise,
- direkten Einstieg in den Editor.

---

## Globale Zeitraumsteuerung

Die Zeitraumsteuerung ist ein globales Flyout und bewusst nicht an einen einzelnen Anwendungsbereich gebunden.

### Eigenschaften
- Monat und Jahr getrennt auswählbar,
- Sprünge um Monat oder Jahr,
- auch bei geöffnetem Modal nutzbar,
- auch im Planungsmodus nutzbar,
- Kontextanzeige des aktuell gewählten Zielzeitraums.

### Ziel
Die Anwendung soll keine Navigationssackgassen erzeugen. Monat/Jahr müssen jederzeit umgestellt werden können, ohne erst Modals oder den Planungsmodus zu verlassen.

---

## Bearbeitung einzelner Zellen

Der Zelleditor dient der manuellen Einzelpflege.

### Bearbeitbare Aspekte
- Arbeitsplatz (Mehrfachkombinationen wie `MR/CT` möglich),
- Status (exklusiv gedacht),
- `D`/`HG`,
- Wünsche im Planungsmodus.

### Vorschau
Ein Vorschaufeld zeigt die aktuelle Auswahl visuell verdichtet an.

### Plausibilisierung
Die Anwendung warnt direkt bei typischen Konflikten, etwa:
- bereits besetztem Dienst,
- unzulässiger Status-/Dienstkombination,
- problematischer Folgetagskonstellation.

### Automatische Folgeregel nach manuellem `D`
Wird manuell ein `D` gesetzt, ergänzt die Anwendung am Folgetag automatisch ein `F`, sofern dort noch keine andere Belegung steht.
Diese Logik gilt auch über Monatsgrenzen hinweg.

---

## Planungsmodus

Der Planungsmodus ist ein separater Entwurfsraum.

### Grundidee
Die Hauptdaten sollen nicht während des Experimentierens verändert werden.
Deshalb arbeitet der Planungsmodus auf einem isolierten Monatsentwurf.

### Sichtbare Kennzeichen
- eigene Planungsleiste,
- deutliche farbliche Hervorhebung,
- getrennte Aktionen für Auto-Planung, Speichern, Übernehmen, Verwerfen.

### Zentrale Eigenschaften
- monatsbezogener Entwurf,
- Undo/Redo-Historie,
- Wunschverwaltung,
- Auto-Plan nur hier verfügbar,
- explizite Übernahme in den Hauptplan notwendig.

### Konsequenz
Die Auto-Planungs-Engine arbeitet **nicht direkt** auf dem Hauptbestand, sondern auf dem aktiven Planungsentwurf des aktuellen Monats.

---

## Wunschsystem im Planungsmodus

Wünsche existieren ausschließlich im Planungsmodus.

### Verfügbare Wunschtypen
- `NO_DUTY` – harter Ausschluss für Dienstvergabe,
- `BD_WISH` – positive Präferenz für `D`,
- `HG_WISH` – positive Präferenz für `HG`.

### Wirkungsweise
- `NO_DUTY` blockiert die Vergabe.
- `BD_WISH` und `HG_WISH` sind Score-Booster, keine absoluten Garantien.
- erfüllte Wünsche werden im Auto-Plan-Ergebnis quantifiziert.

### Zweck
Die Wunschlogik erlaubt eine regelkonforme Berücksichtigung individueller Präferenzen, ohne die Sicherheitsregeln aufzuheben.

---

## Undo, Redo, Speichern, Übernehmen und Verwerfen

### Undo / Redo
Der Planungsmodus führt eine eigene Historie.
Damit können Bearbeitungsschritte schrittweise zurückgenommen oder erneut angewendet werden.

### Speichern
Speichern legt den Entwurf browserlokal ab, ohne ihn in den Hauptplan zu übernehmen.

### Übernehmen
Übernehmen schreibt den aktiven Entwurf in den Hauptbestand und beendet den Planungsmodus.

### Verwerfen / Abbrechen
Damit werden nicht übernommene Änderungen verworfen und der letzte gesicherte Stand wiederhergestellt.

---

## Auto-Planung: Zielbild und Ablauf

Die Auto-Planung hat eine klare Zielhierarchie.

### Zielhierarchie
1. vollständige Besetzung aller notwendigen `D`- und `HG`-Dienste,
2. Vermeidung fachlich oder organisatorisch unzulässiger Vergaben,
3. Erhalt bereits manuell gesetzter Dienste,
4. Berücksichtigung von Wünschen und personenbezogenen Regeln,
5. faire Monatsverteilung,
6. klinisch ruhige und nachvollziehbare Dienstmuster.

### Ablaufphasen
Die Engine arbeitet in mehreren Schritten:
1. Initialisierung und Reparatur fehlender `F`-Folgetage nach bestehendem `D`,
2. Verteilung von Wochenend-/Feiertags-`D`,
3. Verteilung von Werktags-`D`,
4. iterative `D`-Optimierung,
5. HG-Bündelung für gekoppelte Wochenend-/Feiertagskonstellationen,
6. Verteilung verbleibender `HG`,
7. iterative `HG`-Optimierung,
8. finale Metaheuristik über `D` und `HG`,
9. Validierung,
10. Ergebnis- und Berichtserstellung.

### Fixierte Dienste
Bereits gesetzte Dienste werden respektiert und in der Regel nicht überschrieben. Nur nicht fixierte algorithmische Zuweisungen dürfen innerhalb der Optimierung neu verteilt werden.

---

## Historische Kennzahlen und Fairnessbasis

Vor dem Zielmonat gespeicherte Monate werden für Fairness und Rotationen ausgewertet.

### Erfasste Kennzahlen
- Anzahl `D`,
- Anzahl `HG`,
- Wochenendäquivalente,
- Feiertagslast,
- Donnerstag-`D`,
- `HG` für Assistenzärzte,
- `HG` für Fachärzte,
- Samstags-`D`.

### Wofür diese Werte verwendet werden
- Zielvorgaben und Ausgleich,
- Feiertagsverteilung,
- Samstagsbalance,
- Wochenendlast,
- Verhältnis `HG` zu `D`,
- Verhältnis `HG für AA` zu `HG für FA`.

Damit bewertet die Engine nicht nur den aktuellen Monat isoliert, sondern berücksichtigt Vorbelastung.

---

## Harte Regeln für Bereitschaftsdienst (`D`)

Eine Person scheidet als `D`-Kandidat aus, wenn mindestens eine harte Sperre greift.

### Allgemeine Ausschlüsse
- Person ist dienstbefreit.
- Individuelles `D`-Ziel ist `0`.
- Person ist am Tag abwesend.
- Am Tag ist bereits ein Dienst gesetzt.
- Für den Tag liegt `NO_DUTY` vor.

### Tages- und Rollenlogik
- Samstag-`D` nur für fachärztlich geeignete Personen.
- Dr. Polednia erhält keinen `D` an Sonntag, Dienstag oder Donnerstag.
- Becker/Martin-Vertretungskonflikte blockieren bestimmte Konstellationen.

### Nachbarschafts- und Folgekonflikte
- `F` am Zieltag blockiert `D`.
- Urlaub/urlaubsähnliche Abwesenheit am Folgetag blockiert `D`.
- `D` am Vortag oder Folgetag blockiert `D`.
- unzulässige Übergänge von `HG` zu `D` werden verhindert.
- Oster-/Pfingst-Blockregeln können `D` verbieten.

### Zusätzliche Sperren im strengen Modus
- Zielüberschreitung,
- zu hohe projizierte Wochenendlast,
- Samstagssperre für Dr. Becker,
- zu geringe Abstände zwischen Diensten.

---

## Harte Regeln für Hintergrunddienst (`HG`)

`HG` ist restriktiver als normale Arbeitsplatzplanung und an die Facharztrolle gebunden.

### Grundsperren
- Person ist dienstbefreit.
- Person ist kein Facharzt / keine Fachärztin.
- Person ist am Tag abwesend.
- Am Tag ist bereits ein Dienst gesetzt.
- `NO_DUTY` liegt vor.

### Werktags- und Folgekonflikte
- an normalen Werktagen blockiert ein eingetragener `F` den `HG`,
- ein Folgetags-`D` blockiert `HG`, außer in ausdrücklich erlaubten Kopplungsfällen,
- Oster-/Pfingst-Blockkonflikte blockieren `HG`.

### Zusätzliche Fachregeln
- Dr. Polednia soll in bestimmten Konstellationen keinen `HG` zur AA-Freigabe an Sonntag, Dienstag oder Donnerstag erhalten,
- im strengen Modus blockiert eine zu hohe projizierte Wochenendlast zusätzlich.

---

## Ruhetags-, Folge- und Nachbarschaftsregeln

Diese Regeln sind zentral für die klinische Plausibilität.

### Automatischer freier Folgetag nach `D`
- Nach jedem `D` wird automatisch ein `F` am nächsten Kalendertag ergänzt,
- sofern dort noch keine andere Belegung steht,
- auch über Monatsgrenzen hinweg.

### Doppel-`D`-Verhinderung
Direkt aufeinanderfolgende `D` derselben Person werden verhindert bzw. in der Validierung bereinigt.

### D-F-D-F
Dieses Muster wird nicht absolut verboten, aber weich bestraft.
Es handelt sich um einen Soft-Constraint.

### Direkt aufeinanderfolgende `HG`
Direkte `HG`-Ketten werden weich bestraft, nicht absolut ausgeschlossen.
Ein freier Tag zwischen zwei `HG` ist ausdrücklich zulässig.

---

## Wochenend-, Feiertags- und Blockregeln

### Wochenendmodell
Wochenendrelevante Tage sind Freitag, Samstag und Sonntag.

### Wochenendäquivalent
Pro Kalenderwoche zählt je Person:
- `1,0`, wenn an Freitag/Samstag/Sonntag mindestens ein `D` liegt,
- `0,5`, wenn kein `D`, aber mindestens ein `HG` in diesem Wochenendblock liegt.

### Zielwert
Die Engine optimiert auf ein Ziel von ungefähr `1,0` Wochenendäquivalent pro Kopf.
Eine gelockerte Toleranzgrenze ist ebenfalls implementiert.

### Feiertagslogik
Feiertagsdienste werden explizit gezählt und in die Fairnessbewertung aufgenommen.

### Oster-/Pfingst-Blockregel
Wer im Osterblock Dienste übernimmt, soll aus dem Pfingstblock ausgeschlossen werden und umgekehrt.
Die Prüfung kann monatsübergreifend auf vorhandene Daten zugreifen.

---

## Personenspezifische Sonderregeln

Aktuell existieren mehrere namentlich codierte Regeln.

### Prof. Schäfer
- vollständig dienstbefreit.

### Dr. Polednia
- reduziertes Standardziel für `D`,
- kein `D` an Sonntag, Dienstag und Donnerstag,
- bestimmte `HG`-AA-Konstellationen an Sonntag, Dienstag und Donnerstag im strengen Modus gesperrt.

### Dr. Becker
- reduziertes Standardziel für `D`,
- Samstags-`D` nur als Notlösung,
- bei Samstags-`D` gilt eine spezielle FZA-Folgeregel.

### Dr. Becker – FZA-Spezialregel nach Samstags-`D`
Wenn Dr. Becker samstags `D` erhält, versucht die Anwendung ein `FZA` am nächsten geeigneten Werktag zu setzen.
Das passiert nur, wenn:
- der Tag ein Werktag ist,
- dort kein anderer Facharzt bereits Urlaub oder `F` hat,
- Dr. Becker dort noch keine andere Belegung besitzt.

Kann diese Regel nicht konfliktfrei erfüllt werden, erzeugt die Anwendung **keine stille Ersatzlogik**, sondern eine sichtbare kritische Warnung.

### Dr. Martin / Dr. Becker Konfliktregel
Bestimmte Folgetags- und Vertretungskonstellationen werden verhindert, wenn der jeweils andere an kritischen Folgetagen im Urlaub ist.

### Hr. Sebastian
- reduziertes Standardziel für `D`.

---

## Scoring für `D`

Wenn mehrere Kandidaten zulässig sind, bewertet die Engine `D`-Kandidaten anhand einer gewichteten Score-Logik.

### Bevorzugte Kriterien
- Nähe zum individuellen Ziel,
- `BD_WISH`,
- günstige Donnerstag-vor-Urlaub-Konstellationen,
- geringe Wochenendlast,
- Samstagsausgleich unter Fachärzten,
- historisch geringere Feiertagslast,
- ausreichender Abstand zu anderen `D`,
- Vermeidung von D-F-D-F,
- deterministischer Tie-Break zur stabilen Reproduzierbarkeit.

### Ziel des `D`-Scorings
Nicht nur Vollbesetzung, sondern eine nachvollziehbare, faire und klinisch praktikable Verteilung.

---

## Scoring für `HG`

Auch für `HG` werden zulässige Kandidaten differenziert bewertet.

### Wesentliche Kriterien
- gleichmäßige HG-Verteilung im Monat,
- `HG_WISH`,
- Wochenendlast,
- Vermeidung direkt benachbarter `HG`,
- Ausgleich `HG für AA` vs. `HG für FA`,
- leichte Bevorzugung fachärztlicher Personen mit geringerer `D`-Last.

### Klinischer Zweck
Die `HG`-Verteilung soll nicht mechanisch rotieren, sondern die Gesamtlast des Monats mitbetrachten.

---

## Optimierungsschritte nach der Erstverteilung

Nach der ersten Verteilung endet die Auto-Planung nicht.

### `D`-Optimierung
Nicht fixierte Auto-Plan-`D` können umgehängt werden, wenn sich dadurch die Zielerfüllung oder Fairness verbessert.

### `HG`-Optimierung
Nicht fixierte `HG` können ebenfalls neu verteilt werden, wenn dadurch die HG-Qualität steigt.

### Geschützte gekoppelte `HG`
`HG`, die aus der speziellen Wochenendkopplung stammen, sind vor späterem Wegoptimieren geschützt.

### Finale Metaheuristik
Abschließend betrachtet die Engine `D` und `HG` gemeinsam und versucht zusätzliche Qualitätsverbesserungen durch globale Reassignments.

---

## Qualitätsmetriken und Gesamtscore

Am Ende berechnet die Anwendung strukturierte Qualitätsmetriken.

### Erhobene Kennzahlen
- Versorgungslücken bei `D`,
- Versorgungslücken bei `HG`,
- Streuung von `D`,
- Streuung von `HG`,
- Streuung der Wochenendäquivalente,
- Wunscherfüllungsrate,
- Anzahl tiefer Optimierungsbewegungen,
- Anzahl `D`-Optimierungsschritte,
- Anzahl `HG`-Optimierungsschritte.

### Quality Score
Aus diesen Werten wird ein Gesamtscore von `0` bis `100` abgeleitet.
Er gewichtet insbesondere:
- Besetzungsgrad,
- Fairness,
- Wunschberücksichtigung,
- Warnungsdichte.

Dieser Score ist kein medizinisches Gütesiegel, sondern eine interne Planungskennzahl der Anwendung.

---

## Auto-Plan-Modals: Konfiguration, Live-Lauf, Ergebnis, Bericht

Die Auto-Planung ist als mehrstufiger Modal-Workflow umgesetzt.

### 1. Konfigurationsansicht
Hier können `D`-Ziele pro Person angepasst werden.
Gezeigt werden:
- Person,
- Position,
- historische `D`,
- historische Samstags-`D`,
- aktuelles Ziel,
- Gesamtsumme der Ziele.

### 2. Live-Lauf
Der Berechnungslauf visualisiert:
- Phasenpipeline,
- Live-Statistiken (`BD`, `HG`, Regeln, Moves),
- Fortschrittsbalken,
- Regel-Telemetrie,
- Logkonsole.

Ziel ist Transparenz: Die Engine soll nicht wie eine Black Box wirken.

### 3. Ergebnisansicht
Die Resultatansicht zeigt:
- Quality Score,
- Verteilungsmetriken,
- tabellarische `D`-Verteilung,
- tabellarische `HG`-Verteilung,
- Informationstexte,
- Warnhinweise,
- Rücksprung zum Ziel-Setup.

### 4. Abschlussbericht
Der Bericht listet einzelne algorithmische Entscheidungen mit:
- Tag,
- Diensttyp,
- zugewiesener Person,
- Begründung,
- Tags wie Wunsch, Optimiert, Gekoppelt oder Relaxierung.

---

## Abteilungsübersicht

Die Abteilungsübersicht ist eine übergreifende Statistikansicht.

### Bereiche
- aktueller Monat,
- Jahresübersicht.

### Typische Inhalte
- Abdeckungskennzahlen,
- offene Bedarfe,
- Statussummen,
- Dienstsummen,
- Tabellen je Mitarbeitender,
- Jahres-KPIs.

### Ziel
Statt nur personenzentrierter Auswertung liefert diese Ansicht einen departmentweiten Blick auf Versorgung, Ausfall und Dienstlast.

---

## Mitarbeitenden-Dashboard

Das Jahres-Dashboard bündelt Auswertungen über alle Mitarbeitenden.

### Bestandteile
- Summary-KPIs,
- Suchfeld,
- Rollenfilter,
- Kachelübersicht aller Personen,
- Detailbereich mit umschaltbaren Ansichten.

### Detailansichten
- Monatsverlauf,
- Jahreskalender,
- Verwaltungsansicht.

### Zweck
Schneller Vergleich von Lasten, Abwesenheiten und Dienstmustern über ein ganzes Kalenderjahr.

---

## Profilansicht einzelner Personen

Das Profilmodal zeigt eine monats- und jahresbezogene Einzelperspektive.

### Inhalte
- Avatar und Metadaten,
- Monats-KPIs,
- Arbeitsplatzverteilung,
- Statusübersicht,
- Dienstdetails,
- Monatskalender,
- Jahresauswertung.

### Navigation
Von hier aus kann der Monatskalender wieder in den Editor verzweigen.
Damit bleibt Analyse und Bearbeitung eng verzahnt.

---

## Import, Export und Datenmigration

### Export
Die Anwendung kann den gesamten Datenbestand als JSON exportieren.
Der Export dient:
- Backup,
- Gerätewechsel,
- Nachvollziehbarkeit,
- externer Versionssicherung.

### Import
Import ist möglich per:
- Datei,
- Drag & Drop,
- Einfügen von JSON-Text.

### Importverhalten
Vorhandene Daten werden zusammengeführt, nicht stumpf ersetzt.
Dabei validiert die Anwendung das JSON und zeigt Fehlermeldungen im Importmodal sichtbar an.

---

## Bedien- und Darstellungskonzept der Modals

Die Anwendung nutzt zahlreiche Modals bzw. Sheets.

### Grundprinzipien
- eigene Header- und Footer-Bereiche,
- scrollbarer Body,
- responsive Maximalhöhen,
- mobile Bottom-Sheets,
- Schutz vor Überläufen,
- Safe-Area-Berücksichtigung auf mobilen Geräten.

### Ziel
Kein Modal soll Inhalte unzugänglich machen, Bedienelemente überdecken oder über den Viewportrand hinausdrängen.
Die CSS-Struktur ist deshalb auf flexible Höhe, Body-Scrolling und Wrap-Verhalten ausgelegt.

---

## Sichtbare Warnungen, Informationen und Grenzen

### Warnungen
Die Anwendung zeigt Warnungen u. a. für:
- nicht besetzte `D`/`HG`,
- Zielunterschreitungen,
- zu hohe Wochenendlast,
- kritische Becker-Samstags-FZA-Konflikte.

### Informationen
Die Anwendung ergänzt erläuternde Informationen, z. B.:
- Anzahl gelockerter Regeln,
- Anzahl gekoppelter `HG`,
- Wochenendverteilungsziel,
- Wunsch-Erfüllungsquote,
- Fairness- und Pattern-Hinweise.

### Aktuelle Grenzen
- mehrere Regeln sind namentlich im Code verdrahtet,
- keine frei administrierbare Regeloberfläche,
- keine Mehrbenutzer- oder Serverlogik,
- keine externe Rechteverwaltung,
- kein konfigurierbares Rollen-/Sollzeitmodell.

---

## Empfohlene Arbeitsweise im Alltag

1. Monat laden oder über Zeitraumsteuerung wählen.
2. Hauptplan prüfen und manuelle Fixpunkte setzen.
3. In den Planungsmodus wechseln.
4. Wünsche und kritische Abwesenheiten nachpflegen.
5. Auto-Plan-Ziele prüfen bzw. anpassen.
6. Auto-Planung laufen lassen.
7. Ergebnis, Warnungen und Bericht kontrollieren.
8. Manuelle Nachjustierung im Entwurf vornehmen.
9. Entwurf speichern oder in den Hauptplan übernehmen.
10. JSON exportieren, wenn ein Sicherungspunkt gewünscht ist.

---

## Weiterentwicklungspotenziale

Fachlich und technisch sinnvoll wären insbesondere:
- konfigurierbare Stammdaten statt harter Namensregeln,
- pflegbare Regelmatrix im UI,
- Berücksichtigung von Beschäftigungsgrad/Sollzeitanteil,
- monatübergreifende Entwurfsverwaltung,
- Vergleich mehrerer Auto-Plan-Varianten,
- optionales servergestütztes Speichermodell,
- feinere Audit-Historie.

---

## Zusammenfassung

RadPlan ist im aktuellen Stand eine vollständig lokal lauffähige Dienstplan-Anwendung mit:
- editierbarer Monatsmatrix,
- isoliertem Planungsmodus,
- Wunschsystem,
- Auto-Planung für `D` und `HG`,
- historischer Fairnessbewertung,
- personen- und blockbezogenen Sonderregeln,
- Jahres- und Abteilungsanalysen,
- durchgängig responsiver Modal- und Mobile-Oberfläche,
- ausführlicher Ergebnis- und Berichtstransparenz.

Dieses README bildet den aktuellen funktionalen Stand der Anwendung möglichst vollständig ab.
