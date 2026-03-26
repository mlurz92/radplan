# RadPlan — Digitaler Dienstplan

RadPlan ist eine hochspezialisierte, vollständig im Browser laufende Single-Page-Application (SPA) zur digitalen Dienst- und Arbeitsplatzplanung für die Klinik für Radiologie & Nuklearmedizin. 

Die Anwendung zeichnet sich durch ein modernes, responsives Glassmorphism-UI aus und benötigt kein Backend. Alle Daten werden lokal im Browser (`localStorage`) gespeichert. Das Herzstück der Anwendung bildet der **RadPlan Neural Scheduler**, ein hochentwickelter, heuristischer Algorithmus zur vollautomatischen, hochkomplexen und extrem fairen Zuweisung von Bereitschafts- und Hintergrunddiensten.

---

## Inhaltsverzeichnis

1. [Systemarchitektur & Technologie](#1-systemarchitektur--technologie)
2. [Datenmodell & Stammdaten](#2-datenmodell--stammdaten)
3. [Benutzeroberfläche (UI) & Navigation](#3-benutzeroberfläche-ui--navigation)
4. [Module & Dashboards](#4-module--dashboards)
5. [Planungsmodus (Sandbox)](#5-planungsmodus-sandbox)
6. [Der "RadPlan Neural Scheduler" (Auto-Planung)](#6-der-radplan-neural-scheduler-auto-planung)
    - [6.1 Phasen der Berechnung](#61-phasen-der-berechnung)
    - [6.2 Harte Nebenbedingungen (Hard Constraints)](#62-harte-nebenbedingungen-hard-constraints)
    - [6.3 Weiche Nebenbedingungen & Scoring (Soft Constraints)](#63-weiche-nebenbedingungen--scoring-soft-constraints)
    - [6.4 Sonder- und Koppelregeln](#64-sonder--und-koppelregeln)
    - [6.5 Metaheuristik & Global Objective Function](#65-metaheuristik--global-objective-function)
    - [6.6 Live-Visualisierung (Flux Matrix)](#66-live-visualisierung-flux-matrix)
7. [Bedienung & Tastenkürzel](#7-bedienung--tastenkürzel)
8. [Import & Export](#8-import--export)

---

## 1. Systemarchitektur & Technologie

* **Frontend-Only:** Die gesamte Anwendung besteht aus reinem Vanilla HTML5, CSS3 und JavaScript (ES6+). Es werden keine externen Frameworks (wie React oder Vue) und keine Build-Tools (wie Webpack oder Vite) benötigt.
* **Persistenz:** Die Datenspeicherung erfolgt synchron im `localStorage` des Browsers unter dem Key `radplan_v3`. 
* **Performance:** DOM-Manipulationen sind optimiert (Vermeidung unnötiger Reflows, Nutzung von `requestAnimationFrame` für Layout-Updates). Komplexe Berechnungen (Auto-Planung) nutzen asynchrone `sleep()`-Pausen, um den Main-Thread nicht zu blockieren und flüssige UI-Animationen während der Laufzeit zu garantieren.
* **Responsive Design:** Die Anwendung passt sich nahtlos an Desktop-Monitore, Tablets und Smartphones an. Unterhalb von 768px Viewport-Breite wechselt die App in ein stark optimiertes Mobile-Layout mit Bottom-Navigation und Touch-freundlichen Tages-Karten.

---

## 2. Datenmodell & Stammdaten

### 2.1 JSON-Struktur (`localStorage`)
Alle Daten werden in einem flachen JSON-Objekt gespeichert. Der Key ist das Jahr und der nullbasierte Monat (z.B. `2026-0` für Januar 2026).
Jeder Monat enthält:
* `employees`: Ein Array der in diesem Monat aktiven Mitarbeiternamen.
* `assignments`: Ein verschachteltes Objekt `[MitarbeiterName][Tag]`, welches die Zuweisungen (`assignment`) und Dienste (`duty`) enthält.
* `rbn`: Ein Objekt für die manuellen Einträge der Neuroradiologie-Reihe (RD Neurorad).

### 2.2 Arbeitsplätze und Statuscodes
Jeder Zelle im Kalender kann ein Arbeitsplatz (auch Kombinationen, z.B. `MR/CT`) oder ein Abwesenheitsstatus zugewiesen werden.
* **Arbeitsplätze:** MRT (MR), CT (CT), Sonographie (US), Angiographie (AN), Mammographie (MA), Kinder-US (KUS), Wermsdorf (W), Teleradiologie (T).
* **Statuscodes:** Frei (F), Urlaub (U), Zusatzurlaub (ZU), Sonderurlaub (SU), Freizeitausgleich (FZA), Krank (K), Kind Krank (KK), §15c, Weiterbildung (WB).

### 2.3 Dienste und Hintergrund
Unabhängig vom Arbeitsplatz kann ein Dienst zugewiesen werden:
* **D (Bereitschaftsdienst):** Rot markiert. Setzt automatisch am Folgetag den Status "F" (Frei/Ruhetag), sofern der Folgetag ein Werktag ist.
* **HG (Hintergrunddienst):** Blau markiert. Darf ausschließlich von Fachärzten besetzt werden.

### 2.4 Mitarbeiter-Metadaten
Mitarbeiter werden über feste Metadaten typisiert:
* **Fachärzte (FA):** CA, LOA, OA, OÄ, FA, FÄ. Sie dürfen HG-Dienste und Samstags-BDs übernehmen.
* **Assistenzärzte (AA):** AA, AÄ. Sie dürfen Werktags- und Sonntags-BDs übernehmen, jedoch keine HGs und keine Samstags-BDs.

---

## 3. Benutzeroberfläche (UI) & Navigation

Das Design nutzt eine dunkle "Navy"-Farbpalette kombiniert mit **Glassmorphism**-Elementen (halbtransparente Hintergründe, `backdrop-filter: blur`, subtile Ränder und Schatten).

* **Desktop-Ansicht:** Eine klassische, horizontal scrollbare Matrix-Tabelle. Zeilen repräsentieren Mitarbeiter, Spalten die Tage des Monats. Eine fixierte Kopfzeile (Tage/Wochentage) und eine fixierte linke Spalte (Namen) erleichtern die Navigation. Feiertage und Wochenenden sind farblich hervorgehoben.
* **Mobile-Ansicht:** Die Matrix wird durch eine vertikale Liste von "Tages-Karten" ersetzt. Ein Klick auf einen Tag öffnet ein Bottom-Sheet, in dem alle Mitarbeiter für diesen Tag untereinander gelistet sind und einzeln bearbeitet werden können.
* **Zeitraumsteuerung:** Über einen Klick auf den Monatsnamen öffnet sich ein Flyout. Hier kann unabhängig vom Scroll-Zustand oder Planungsmodus präzise in beliebige Monate und Jahre gesprungen werden.
* **Modals:** Alle Dialoge (Editor, Dashboards, Import/Export) sind als zentrierte Overlays (bzw. auf mobilen Geräten als Bottom-Sheets) umgesetzt. Sie skalieren dynamisch und bieten eigene Scroll-Bereiche, ohne den Viewport zu sprengen.

---

## 4. Module & Dashboards

### 4.1 Monats-Statistik-Leiste (Stats Bar)
Befindet sich unterhalb des Headers und zeigt live die Summen aller Zuweisungen des aktuell angezeigten Monats (z.B. Anzahl der vergebenen MR-Schichten, vergebene BDs, Urlaubstage).

### 4.2 Mitarbeiter-Dashboard
Wird über den Button "Mitarbeitende" aufgerufen.
* **Jahresübersicht:** Zeigt für das aktuell gewählte Jahr eine Liste aller Mitarbeiter.
* **Filter:** Mitarbeiter lassen sich nach Rollen (CA, OA, FA, AA) filtern oder über ein Textfeld durchsuchen.
* **Detailansicht (Monatsverlauf):** Zeigt eine Tabelle mit der monatlichen Arbeitsplatz-Abdeckung, Urlaubs- und Krankheitstagen sowie Diensten.
* **Detailansicht (Jahreskalender):** Rendert kleine Monats-Kacheln mit den wichtigsten Kennzahlen.
* **Verwaltung:** Hier können Mitarbeiter zum aktuellen Monat hinzugefügt oder aus ihm entfernt werden.

### 4.3 Profil-Modal (Mitarbeiter-Details)
Wird durch Klick auf den Namen eines Mitarbeiters in der Matrix geöffnet.
* **KPIs:** Zeigt die Anzahl der Werktage, ungedeckte Tage, Dienste, Urlaub und Krankheit für den aktuellen Monat.
* **Verteilungs-Charts:** Balkendiagramme visualisieren die prozentuale Verteilung der Arbeitsplätze (z.B. 60% MR, 40% CT) und Statuscodes.
* **Monatskalender:** Eine visuelle Grid-Darstellung des Monats für diesen spezifischen Mitarbeiter. Klicks auf Tage öffnen direkt den Editor.
* **Jahresauswertung:** Ein horizontal scrollbarer Strip zeigt die kumulierten Werte des gesamten Jahres.

### 4.4 Abteilungsübersicht
* **Aktueller Monat:** Zeigt die Besetzungsquote (Coverage) für MR, CT, D und HG an Werktagen an. Eine Tabelle listet die Gesamtleistung jedes Mitarbeiters im Monat auf.
* **Jahresübersicht:** Aggregiert alle AP-Tage, Urlaube und Dienste eines Jahres pro Mitarbeiter und berechnet die prozentuale Gesamtabdeckung der Abteilung.

---

## 5. Planungsmodus (Sandbox)

Über den Button "Planung" wird ein isolierter Modus gestartet. Der aktuelle Zustand des Monats wird in eine Session kopiert. Die UI färbt sich gelb/orange, um den Sandbox-Status zu verdeutlichen.
* **Isolation:** Änderungen hier beeinflussen den Hauptplan nicht, bis sie explizit über "Übernehmen" gemerged werden.
* **Undo/Redo:** Jeder Bearbeitungsschritt wird in einer Historie gespeichert und kann über Buttons oder Tastenkürzel (`Strg+Z` / `Strg+Y`) vor- und zurückgespult werden.
* **Dienstwünsche:** Nur im Planungsmodus erscheint im Editor eine zusätzliche Zeile für Dienstwünsche (`NO_DUTY`, `BD_WISH`, `HG_WISH`), die von der Auto-Planung verarbeitet werden.
* **Auto-Planung:** Der Button "Auto-Plan" startet den RadPlan Neural Scheduler.

---

## 6. Der "RadPlan Neural Scheduler" (Auto-Planung)

Der Algorithmus ist das Herzstück der Anwendung. Er verteilt Bereitschafts- und Hintergrunddienste vollautomatisch. Dabei sammelt er historische Daten (bis zum 1. Januar des Betrachtungsjahres), um eine übersaisonale Fairness zu garantieren.

### 6.1 Phasen der Berechnung
Der Scheduler durchläuft strikt folgende Phasen:
1. **Init (Datenanalyse):** Historische Dienst-Zähler (BD, HG, Wochenenden, Feiertage, Samstage) werden aggregiert. Fehlende "F"-Tage nach bereits manuell gesetzten BDs werden repariert.
2. **BD Wochenende:** Zuweisung der Bereitschaftsdienste an Wochenenden und Feiertagen. Dies hat höchste Priorität, da hier die Restriktionen am härtesten sind (nur FAs an Samstagen etc.).
3. **BD Werktage:** Auffüllen der verbleibenden Bereitschaftsdienste von Montag bis Freitag.
4. **BD Optimierung:** Iterative Swaps (Tausche) zur Glättung der Fairness-Verteilung. Der Algorithmus versucht, Dienste zwischen Personen zu tauschen, um die mathematische Standardabweichung zu minimieren.
5. **HG Bündelung (Kopplung):** Feste Zuweisung von HG-Diensten an Wochenenden basierend auf den gesetzten BDs (Details siehe 6.4).
6. **HG Verteilung:** Auffüllen der restlichen Hintergrunddienste.
7. **Metaheuristik (Deep Optimize):** Globale Überprüfung aller D- und HG-Dienste zur Minimierung der `Global Objective Function`. Hier werden cross-funktionale Swaps geprüft.
8. **Validierung:** Letzter Sanity-Check (Entfernung illegaler Doppel-Dienste).
9. **Abschluss:** Generierung des Abschlussberichts und der Metriken.

### 6.2 Harte Nebenbedingungen (Hard Constraints)
Diese Regeln dürfen **niemals** gebrochen werden. Findet der Algorithmus keine Lösung, markiert er den Tag im Bericht als "ungelöst" (Lücke), anstatt eine harte Regel zu verletzen.
* **Befreiung:** Mitarbeiter in der `DUTY_EXEMPT` Liste (Prof. Schäfer) erhalten keine Dienste.
* **Abwesenheit:** An Tagen mit Urlaub, Krank, FZA, Weiterbildung etc. ist kein Dienst möglich.
* **Wünsche:** Ein `NO_DUTY` Wunsch verbietet den Dienst strikt.
* **Qualifikation:** Wochenend-BDs an Samstagen dürfen nur von Fachärzten besetzt werden. HGs dürfen generell nur von Fachärzten besetzt werden.
* **Vor/Nachlauf:** Am Tag vor und nach einem BD darf kein weiterer BD stattfinden.
* **Urlaubsschutz:** Ist der Folgetag ein Urlaubstag (U, ZU, SU, §15c), darf kein Dienst absolviert werden.
* **Feiertagsblöcke:** Wer an Ostern arbeitet, darf nicht an Pfingsten arbeiten (und umgekehrt).
* **Ausnahmeregeln Personal:** 
  * *Dr. Polednia* macht keine Dienste an Sonntagen, Dienstagen und Donnerstagen.
  * *Dr. Becker* und *Dr. Martin* dürfen nicht gleichzeitig abwesend (oder im Ruhetag "F") sein.

*(Hinweis: Kann ein Dienst aufgrund harter Restriktionen nicht besetzt werden, wechselt die Engine für diesen spezifischen Tag in einen "Relaxed Mode", in dem weiche Abstandsregeln gelockert werden. Harte Regeln bleiben jedoch bestehen).*

### 6.3 Weiche Nebenbedingungen & Scoring (Soft Constraints)
Jeder Kandidat für einen Dienst startet mit einem Basis-Score von `100`. Durch Boni und Mali wird der beste Kandidat ermittelt:

#### BD-Scoring:
* **Zielerfüllung:** `+220` Punkte pro fehlendem Dienst bis zum individuellen Monatssoll. `-7000` Punkte pro Dienst über dem Soll.
* **Wünsche:** `+220` Punkte für einen `BD_WISH`.
* **Vor Urlaub (Donnerstag):** `+150` Punkte, wenn der Arzt in der Folgewoche Urlaub hat.
* **Wochenend-Soll:** Ziel ist genau 1 WE-Äquivalent (Fr/Sa/So/FT) pro Monat. Abweichung kostet `-220` Punkte pro Einheit. Übersteigt der projizierte Wert 1.5, kostet dies `-500` Punkte Strafe.
* **WE-Rhythmus:** Zwei Wochenenden in direkter Folge (ohne freies WE dazwischen) kosten `-900` Punkte. Liegt das letzte Wochenende nur eine KW zurück, kostet dies `-40` Punkte.
* **Samstags-Ausgleich (nur FA):** Die Abweichung vom Durchschnitt der Samstags-Dienste aller FAs kostet `-700` Punkte.
* **Distanz:** Liegen weniger als 4 Tage zwischen zwei BDs, kostet das `-(4 - Distanz) * 120` Punkte.
* **D-F-D-F Vermeidung:** Ein Rhythmus von Dienst-Frei-Dienst-Frei kostet `-260` Punkte.
* **Feiertagsausgleich:** Differenz zum historischen Feiertags-Durchschnitt bringt `+6` Punkte pro fehlendem Feiertag.

#### HG-Scoring:
* **Monatsausgleich:** Abweichung vom HG-Durchschnitt aller FAs kostet `-240` Punkte.
* **Wünsche:** `+220` Punkte für `HG_WISH`.
* **Wochenend-Soll:** Analog zum BD (`-150` für Abweichung, `-360` für Überschreitung von 1.5, `-700` für aufeinanderfolgende WEs).
* **Direktfolge:** Zwei HGs an aufeinanderfolgenden Tagen kosten `-220` Punkte.
* **Urlaubsvorlauf:** Ist der nächste Tag Urlaub, kostet dies `-20` Punkte.

### 6.4 Sonder- und Koppelregeln

* **HG Bündelung (Kopplungslogik Wochenende):**
  * Hat ein **Assistenzarzt am Freitag** Bereitschaftsdienst, wird der Hintergrunddienst zwingend an den Facharzt vergeben, der am **Samstag** Bereitschaftsdienst hat. Dies garantiert, dass derselbe Facharzt die Befundfreigabe für den AA vom Freitag übernimmt.
  * Hat ein **Facharzt am Samstag** Bereitschaftsdienst, wird ihm zwingend auch der **Sonntag als Hintergrunddienst** zugewiesen. Somit wird das Wochenende als HG-D-HG-Kette aus einer Hand betreut.
  * Vor Feiertagen gilt analog: Hat ein AA den BD, geht der HG an den FA des Feiertags-BDs.
* **Becker-Samstag (Notnagel-Regel):**
  * Dr. Becker macht Samstags-BDs nur als absoluten Notnagel (Score-Strafe `-2000` Punkte).
  * Lässt sich ein Einsatz nicht vermeiden, trägt der Algorithmus zwingend für den **nächsten regulären Werktag** einen **FZA** für sie ein.
  * Ist dieser Werktag durch andere FAs blockiert (sodass die Abteilung unterbesetzt wäre), wird eine **kritische rote Warnung** generiert, und der FZA muss manuell geprüft werden.

### 6.5 Metaheuristik & Global Objective Function
Nach der initialen Verteilung versucht der Algorithmus in bis zu 16 Durchläufen (Deep Optimize), die Gesamtqualität des Plans zu maximieren, indem er Dienste testweise zwischen Mitarbeitern tauscht (`META_SWAP_TEST`).
Die **Global Objective Function** berechnet "Strafpunkte" für den gesamten Plan. Jeder Tausch, der diesen Gesamt-Score auch nur um 0.01 verbessert, wird permanent übernommen.
Die mathematische Gewichtung:
* Ungedeckter BD: `+25000`
* Ungedeckter HG: `+18000`
* BD-Abweichung vom Soll: `(Diff^2 * 3200) + (|Diff| * 1400)`
* WE-Abweichung vom Soll: `Diff^2 * 480`
* WE-Überlastung (>1.5): `+12000` pro Einheit
* Aufeinanderfolgende WEs: `+6000`
* Samstags-Ungleichgewicht (FA): `Diff^2 * 850`
* Illegale BD-Folge (Tag an Tag): `+40000`
* Zu geringe Distanz (<3 Tage): `+6000`
* HG-Abweichung vom Ideal: `Diff^2 * 520` (Idealwert berücksichtigt, dass FAs mit vielen BDs weniger HGs machen müssen).
* HG an aufeinanderfolgenden Tagen: `+1800`

### 6.6 Live-Visualisierung (Flux Matrix)
Während der Algorithmus läuft (künstlich gestreckt auf 30 Sekunden für visuelles Feedback), zeigt das UI ein immersives Terminal.
* **Trace Console:** Zeigt Zuweisungen, Warnungen und Optimierungs-Swaps (`→`, `🔀`, `🚨`).
* **Constraint Flux Matrix:** Ein hochgranularer Live-Stream der internen Berechnungen. Hier fließen in Echtzeit die `EVAL`-Scores der Kandidaten, die `SWAP_TEST`-Deltas und die Evaluationen der `OBJ_FUNC_META` durch. Die Matrix stoppt exakt synchron mit dem Erreichen von 100% des Fortschrittsbalkens.

---

## 7. Bedienung & Tastenkürzel

Die UI ist auf maximale Effizienz ausgelegt. Im Editor-Modal (Klick auf eine Zelle) können folgende Kürzel verwendet werden:
* `1` bis `8`: Weist den entsprechenden Arbeitsplatz zu (1=MR, 2=CT, 3=US, 4=AN, 5=MA, 6=KUS, 7=W, 8=T). Mehrfachauswahl möglich.
* `D`: Schaltet den Bereitschaftsdienst um (Rot).
* `H`: Schaltet den Hintergrunddienst um (Blau).
* `S` oder `Enter`: Speichert die Eingabe und schließt den Editor.
* `Escape`: Schließt Modals ohne zu speichern.
* `Alt + Pfeil Links/Rechts`: Wechselt den Monat (Global).
* `Strg + Z` / `Strg + Y`: Undo / Redo (nur im Planungsmodus).
* `Strg + S`: Speichert den Planungsentwurf bzw. exportiert die Daten im Hauptmodus.

---

## 8. Import & Export

Die Anwendung speichert alle Daten lokal. Um Daten zu sichern oder auf andere Geräte zu übertragen, steht das Import/Export-Modul zur Verfügung.
* **Export:** Lädt eine JSON-Datei herunter, die den gesamten `localStorage` inklusive aller Monatsdaten und gespeicherter Planungsentwürfe enthält.
* **Import:** JSON-Dateien können per Drag & Drop abgelegt oder der Text direkt eingefügt werden. Beim Import werden bestehende Daten intelligent gemerged. Nach dem Import führt die Applikation automatisch einen Reparatur-Lauf durch, um fehlende "F"-Tage nach Bereitschaftsdiensten zu ergänzen.

---
