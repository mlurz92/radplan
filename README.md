# RadPlan — Digitaler Dienstplan

RadPlan ist eine hochspezialisierte, vollständig im Browser laufende Single-Page-Application (SPA) zur digitalen Dienst- und Arbeitsplatzplanung für die Klinik für Radiologie & Nuklearmedizin. 

Die Anwendung zeichnet sich durch ein modernes, responsives Glassmorphism-UI aus und benötigt kein Backend. Alle Daten werden lokal im Browser (`localStorage`) gespeichert. Das Herzstück der Anwendung bildet der **RadPlan Neural Scheduler**, ein hochentwickelter, heuristischer Algorithmus zur vollautomatischen und extrem fairen Zuweisung von Bereitschafts- und Hintergrunddiensten.

---

## Inhaltsverzeichnis

1. [Architektur & Technologie](#architektur--technologie)
2. [Benutzeroberfläche (UI/UX)](#benutzeroberfläche-uiux)
3. [Kernfunktionen & Module](#kernfunktionen--module)
4. [Der RadPlan Neural Scheduler (Auto-Planung)](#der-radplan-neural-scheduler-auto-planung)
    - [Planungsphasen](#planungsphasen)
    - [Harte Nebenbedingungen (Hard Constraints)](#harte-nebenbedingungen-hard-constraints)
    - [Weiche Nebenbedingungen & Scoring (Soft Constraints)](#weiche-nebenbedingungen--scoring-soft-constraints)
    - [Sonderregeln](#sonderregeln)
    - [Metaheuristik & Global Objective Function](#metaheuristik--global-objective-function)
5. [Bedienung & Tastenkürzel](#bedienung--tastenkürzel)
6. [Datenmodell & Persistenz](#datenmodell--persistenz)

---

## 1. Architektur & Technologie

* **Frontend-Only:** Die gesamte Anwendung besteht aus reinem Vanilla HTML5, CSS3 und JavaScript (ES6+). Es werden keine externen Frameworks (wie React oder Vue) und keine Build-Tools (wie Webpack oder Vite) benötigt.
* **Persistenz:** Die Datenspeicherung erfolgt synchron im `localStorage` des Browsers unter dem Key `radplan_v3`. 
* **Performance:** DOM-Manipulationen sind optimiert (Vermeidung unnötiger Reflows, Nutzung von `requestAnimationFrame` für Layout-Updates). Komplexe Berechnungen (Auto-Planung) nutzen asynchrone `sleep()`-Pausen, um den Main-Thread nicht zu blockieren und flüssige UI-Animationen während der Laufzeit zu garantieren.
* **Responsive Design:** Die Anwendung passt sich nahtlos an Desktop-Monitore, Tablets und Smartphones an. Unterhalb von 768px Viewport-Breite wechselt die App in ein stark optimiertes Mobile-Layout mit Bottom-Navigation und Touch-freundlichen Tages-Karten.

---

## 2. Benutzeroberfläche (UI/UX)

Das Design nutzt eine dunkle "Navy"-Farbpalette kombiniert mit **Glassmorphism**-Elementen (halbtransparente Hintergründe, `backdrop-filter: blur`, subtile Ränder und Schatten).

* **Desktop-Ansicht:** Eine klassische, horizontal scrollbare Matrix-Tabelle. Zeilen repräsentieren Mitarbeiter, Spalten die Tage des Monats. Eine fixierte Kopfzeile (Tage/Wochentage) und eine fixierte linke Spalte (Namen) erleichtern die Navigation.
* **Mobile-Ansicht:** Die Matrix wird durch eine vertikale Liste von "Tages-Karten" ersetzt. Ein Klick auf einen Tag öffnet ein Bottom-Sheet, in dem alle Mitarbeiter für diesen Tag untereinander gelistet sind und bearbeitet werden können.
* **Modals:** Alle Dialoge (Editor, Dashboards, Import/Export) sind als zentrierte Overlays (bzw. auf mobilen Geräten als Bottom-Sheets) umgesetzt. Sie skalieren dynamisch und bieten eigene Scroll-Bereiche, ohne den Viewport zu sprengen.

---

## 3. Kernfunktionen & Module

### 3.1 Arbeitsplätze und Statuscodes
Jeder Zelle im Kalender kann ein Arbeitsplatz (auch Kombinationen, z. B. `MR/CT`) oder ein Abwesenheitsstatus zugewiesen werden.
* **Arbeitsplätze:** MRT (MR), CT (CT), Sonographie (US), Angiographie (AN), Mammographie (MA), Kinder-US (KUS), Wermsdorf (W), Teleradiologie (T).
* **Statuscodes:** Frei (F), Urlaub (U), Zusatzurlaub (ZU), Sonderurlaub (SU), Freizeitausgleich (FZA), Krank (K), Kind Krank (KK), §15c, Weiterbildung (WB).

### 3.2 Dienste und Hintergrund
Unabhängig vom Arbeitsplatz kann ein Dienst zugewiesen werden:
* **D:** Bereitschaftsdienst (Rot). Setzt automatisch am Folgetag den Status "F" (Frei/Ruhetag).
* **HG:** Hintergrunddienst (Blau). Nur für Fachärzte.

### 3.3 Planungsmodus (Sandkasten)
Über den Button "Planung" wird ein isolierter Modus gestartet. Der aktuelle Zustand des Monats wird in eine Session kopiert. Änderungen hier beeinflussen den Hauptplan nicht, bis sie explizit "übernommen" werden.
* Bietet eine **Undo/Redo**-Historie (Strg+Z / Strg+Y).
* Erlaubt das Eintragen von **Dienstwünschen** (Wunsch-D, Wunsch-HG, Kein Dienst).
* Schaltet das Auto-Plan-Modul frei.

### 3.4 Dashboards und Statistiken
* **Monats-Statistik-Leiste:** Zeigt live die Summen aller Zuweisungen des aktuell angezeigten Monats.
* **Mitarbeiter-Dashboard:** Zeigt Jahresstatistiken für ausgewählte Mitarbeiter (Dienste, Urlaub, Arbeitsplatzverteilung, Abdeckung in %).
* **Abteilungsübersicht:** Zeigt die Besetzungsquote (Coverage) für MR, CT, D und HG an Werktagen an und listet die Gesamtleistung des Teams auf.
* **Jahresübersicht:** Aggregiert alle AP-Tage, Urlaube und Dienste eines Jahres pro Mitarbeiter.

---

## 4. Der RadPlan Neural Scheduler (Auto-Planung)

Die automatische Diensteinteilung ist das komplexeste Modul der Anwendung. Sie berechnet auf Basis historischer Daten (bis zurück zum Jahresanfang) und einer Vielzahl von Regeln einen optimalen, fairen und regelkonformen Dienstplan für den aktuellen Monat.

### 4.1 Planungsphasen
Der Algorithmus arbeitet sequenziell in folgenden Phasen:
1. **Init (Datenanalyse):** Sammeln historischer Dienst-Zähler (BD, HG, Wochenenden, Feiertage, Samstage). Überprüfen manuell gesetzter Dienste.
2. **BD Wochenende:** Zuweisung der Bereitschaftsdienste an Wochenenden und Feiertagen (höchste Priorität, da schwerste Restriktionen).
3. **BD Werktage:** Auffüllen der verbleibenden Bereitschaftsdienste.
4. **BD Optimierung:** Iterative Swaps (Tausche) zur Glättung der Fairness-Verteilung.
5. **HG Bündelung (Kopplung):** Feste Zuweisung von HG-Diensten an Wochenenden basierend auf den gesetzten BDs (z. B. Freitags-AA koppelt an Samstags-FA).
6. **HG Verteilung:** Auffüllen der restlichen Hintergrunddienste.
7. **Metaheuristik (Deep Optimize):** Globale Überprüfung aller D- und HG-Dienste zur Minimierung der `Global Objective Function`.
8. **Validierung:** Letzter Sanity-Check (z. B. Entfernung illegaler Doppel-Dienste).

### 4.2 Harte Nebenbedingungen (Hard Constraints)
Diese Regeln dürfen **niemals** gebrochen werden (außer der Algorithmus findet keine Lösung und wechselt für einen spezifischen Tag in den "Relaxed Mode"):
* **Befreiung:** Mitarbeiter in der `DUTY_EXEMPT` Liste (Prof. Schäfer) erhalten keine Dienste.
* **Abwesenheit:** An Tagen mit Urlaub, Krank, FZA etc. ist kein Dienst möglich.
* **Wünsche:** Ein "NO_DUTY"-Wunsch verbietet den Dienst strikt.
* **Qualifikation:** Wochenend-BDs (Samstag/Sonntag) dürfen nur von Fachärzten besetzt werden. HGs dürfen generell nur von Fachärzten besetzt werden.
* **Vor/Nachlauf:** Am Tag vor und nach einem BD darf kein weiterer BD stattfinden.
* **Urlaubsschutz:** Ist der Folgetag ein Urlaubstag, darf kein Dienst absolviert werden.
* **Feiertagsblöcke:** Wer an Ostern arbeitet, darf nicht an Pfingsten arbeiten (und umgekehrt).
* **Ausnahmeregeln:** 
  * Dr. Polednia macht keine Dienste an Sonntagen, Dienstagen und Donnerstagen.
  * Dr. Becker und Dr. Martin dürfen nicht gleichzeitig abwesend/im Ruhetag sein.

### 4.3 Weiche Nebenbedingungen & Scoring (Soft Constraints)
Kandidaten für einen Dienst erhalten einen Basis-Score von `100`. Durch Boni und Mali wird der beste Kandidat ermittelt.

#### BD-Scoring:
* **Zielerfüllung:** `+220` Punkte pro fehlendem Dienst bis zum Soll. `-7000` Punkte pro Dienst über dem Soll.
* **Wünsche:** `+220` Punkte für einen "BD_WISH".
* **Vor Urlaub (Donnerstag):** `+150` Punkte, wenn der Arzt in der Folgewoche Urlaub hat (ermöglicht langen Übergang).
* **Wochenend-Soll:** Ziel ist genau 1 WE-Äquivalent (Fr/Sa/So/FT) pro Monat. Abweichung kostet `-220` Punkte pro Einheit. Übersteigt der Wert 1.5, kostet dies `-500` Punkte Strafe.
* **WE-Rhythmus:** Zwei Wochenenden in direkter Folge (ohne freies WE dazwischen) kosten `-900` Punkte.
* **Samstags-Ausgleich (nur FA):** Abweichung vom Durchschnitt der Samstags-Dienste aller FAs kostet `-700` Punkte.
* **Distanz:** Liegen weniger als 4 Tage zwischen zwei BDs, kostet das `-(4 - Distanz) * 120` Punkte.
* **D-F-D-F Vermeidung:** Ein Rhythmus von Dienst-Frei-Dienst-Frei kostet `-260` Punkte.
* **Feiertagsausgleich:** Differenz zum historischen Feiertags-Durchschnitt bringt `+6` Punkte pro fehlendem Feiertag.

#### HG-Scoring:
* **Monatsausgleich:** Abweichung vom HG-Durchschnitt aller FAs kostet `-240` Punkte.
* **Wünsche:** `+220` Punkte für "HG_WISH".
* **Wochenend-Soll:** Analog zum BD (`-150` für Abweichung, `-360` für Überschreitung von 1.5, `-700` für aufeinanderfolgende WEs).
* **Direktfolge:** Zwei HGs an aufeinanderfolgenden Tagen kosten `-220` Punkte.

### 4.4 Sonderregeln
* **HG Bündelung (Freitag bis Sonntag):**
  * Hat ein Assistenzarzt am Freitag BD, wird der HG zwingend an den Facharzt vergeben, der am Samstag BD hat (für kontinuierliche Befundfreigabe).
  * Hat ein Facharzt am Samstag BD, wird ihm zwingend auch der Sonntag als HG zugewiesen (HG-D-HG Kette aus einer Hand).
  * Vor Feiertagen gilt analog: AA hat BD -> HG geht an den FA des Feiertags.
* **Becker-Samstag:** Dr. Becker macht Samstags-BDs nur als absoluten Notnagel (`-2000` Punkte). Lässt es sich nicht vermeiden, trägt der Algorithmus zwingend für den nächsten Werktag einen **FZA** für sie ein. Ist dieser Tag blockiert, wird eine kritische rote Warnung generiert.
* **Neurorad (RBN):** Die RBN-Zeile wird von der Auto-Planung vollständig ignoriert. Fr. Thaler steht ab März 2026 nicht mehr für RBN zur Verfügung.

### 4.5 Metaheuristik & Global Objective Function
Nach der initialen Verteilung versucht der Algorithmus in bis zu 16 Durchläufen, die Gesamtqualität des Plans zu maximieren, indem er Dienste testweise zwischen Mitarbeitern tauscht (`SWAP_TEST`).
Die **Global Objective Function** berechnet "Strafpunkte" für den gesamten Plan (je niedriger, desto besser):
* Ungedeckter BD: `+20000`
* Ungedeckter HG: `+15000`
* BD-Abweichung vom Soll: `(Diff^2 * 3200) + (|Diff| * 1400)`
* WE-Abweichung vom Soll: `Diff^2 * 480`
* WE-Überlastung (>1.5): `+12000` pro Einheit
* Aufeinanderfolgende WEs: `+6000`
* Samstags-Ungleichgewicht (FA): `Diff^2 * 850`
* Illegale BD-Folge (Tag an Tag): `+40000`
* Zu geringe Distanz (<3 Tage): `+6000`
* HG-Abweichung vom Ideal: `Diff^2 * 520` (Idealwert berücksichtigt, dass FAs mit vielen BDs weniger HGs machen müssen).
* HG an aufeinanderfolgenden Tagen: `+1800`

Jeder Tausch, der diesen Gesamt-Score auch nur um 0.01 verbessert, wird permanent übernommen.

---

## 5. Bedienung & Tastenkürzel

Die UI ist auf maximale Effizienz ausgelegt. Im Editor-Modal (Klick auf eine Zelle) können folgende Kürzel verwendet werden:
* `1` bis `8`: Weist den entsprechenden Arbeitsplatz zu (1=MR, 2=CT, etc.). Mehrfachauswahl möglich.
* `D`: Schaltet den Bereitschaftsdienst um (Rot).
* `H`: Schaltet den Hintergrunddienst um (Blau).
* `S` oder `Enter`: Speichert die Eingabe und schließt den Editor.
* `Escape`: Schließt Modals ohne zu speichern.
* `Alt + Pfeil Links/Rechts`: Wechselt den Monat.
* `Strg + Z` / `Strg + Y`: Undo / Redo (nur im Planungsmodus).
* `Strg + S`: Speichert den Planungsentwurf bzw. exportiert die Daten im Hauptmodus.

---

## 6. Datenmodell & Persistenz

Alle Daten liegen im `localStorage` unter dem Key `radplan_v3`. Das JSON-Format sieht wie folgt aus:

```json
{
  "2026-0": {
    "employees": ["Prof. Schäfer", "Dr. Lurz", "..."],
    "assignments": {
      "Dr. Lurz": {
        "5": { "assignment": "MR/CT", "duty": "HG" },
        "12": { "assignment": "F" }
      }
    },
    "rbn": {
      "1": "Dr. Maybaum (NRAD)"
    }
  }
}
```
* Der Key setzt sich aus `Jahr-Monatsindex` zusammen (0 = Januar, 11 = Dezember).
* `employees` speichert die sortierte Liste der Mitarbeiter für diesen spezifischen Monat.
* `assignments` mappt Mitarbeiternamen auf Tage (1-31) und deren Inhalte.
* Entwürfe aus dem Planungsmodus werden temporär unter `radplan_v3_plan_YYYY-M` gespeichert und beim "Übernehmen" in das Hauptobjekt gemerged.

---
