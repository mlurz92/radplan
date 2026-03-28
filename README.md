# RadPlan – Systemarchitektur & Algorithmische Spezifikation

Dieses Dokument definiert die vollständige Systemarchitektur, die deterministischen Regelwerke und die algorithmischen Entscheidungsschritte der RadPlan-Anwendung. Es dient als absolute Source of Truth für Infrastruktur, Datenmodellierung und den Auto-Plan-Algorithmus (Neural Scheduler).

## 1. Infrastruktur & Umgebungsvariablen

Die Anwendung operiert serverless über Cloudflare Pages mit direkter Anbindung an den Cloudflare KV-Store. Die Trennung von Frontend (Client-seitiges DOM-Rendering) und Backend (Edge-Functions) ist strikt.

### 1.1 Cloudflare KV Binding & Environment Variables
Die Laufzeitumgebung erfordert exakt eine definierte Umgebungsvariable (Environment Variable) für die asynchrone Persistenz:

* **Variable:** `RADPLAN_KV`
* **Typ:** KV Namespace Binding
* **Funktion:** Verknüpft die Edge-Function (`functions/api/data.js`) mit dem global verteilten Key-Value-Store.
* **Primärer Key:** `radplan_state`
* **Negative Befunde:** Keine relationalen Datenbanken im Einsatz. Keine lokalen Fallbacks bei Netzwerkausfall (`localStorage` ist vollständig deprecared und entfernt). Keine weiteren Umgebungsvariablen (wie API-Keys externer Dienste) erforderlich.

### 1.2 Daten-Schema (`radplan_state`)
Das unter `radplan_state` serialisierte JSON-Dokument ist das globale Singleton-Objekt der Anwendung. Es erzwingt folgende Struktur:

```json
{
  "main": {
    "YYYY-MM": {
      "employees": ["String", "..."],
      "assignments": {
        "MitarbeiterName": {
          "TagAlsInteger": {
            "assignment": "String (z.B. MR/CT oder U)",
            "duty": "String (D oder HG)"
          }
        }
      },
      "rbn": {
        "TagAlsInteger": "String (MitarbeiterName für Neurorad)"
      }
    }
  },
  "drafts": {
    "YYYY-MM": { /* Identische Struktur wie main, inkl. 'wishes' Dictionary */ }
  }
}
```

## 2. Kriterien & Regelwerk der Diensteinteilung

Die Kernlogik der Anwendung stützt sich auf ein medizinisches und arbeitsrechtliches Regelwerk. Der Algorithmus unterscheidet strikt zwischen **Hard Constraints** (unverhandelbare Ausschlusskriterien) und **Soft Constraints** (weiche Ziele für maximale NFI-Scores).

### 2.1 Qualifikations- und Rollen-Matrix
* **Bereitschaftsdienst (D):**
  * **Zugelassen:** Assistenzärzte (AA), Fachärzte (FA).
  * **Ausgeschlossen:** Chefärzte (CA), Oberärzte (OA, LOA, OÄ), sowie explizit via `isDutyExempt` befreite Personen (Rotationsärzte, Schwangere, etc.).
* **Hintergrunddienst (HG):**
  * **Zugelassen:** Fachärzte (FA), Oberärzte (OA, LOA, OÄ), Chefärzte (CA).
  * **Ausgeschlossen:** Assistenzärzte (AA).

### 2.2 Hard Constraints (Ausschlusskriterien - Rule Failures)
Jede algorithmische Permutation oder manuelle Zuweisung, die einen dieser Parameter verletzt, ist invalid.

1.  **Status-Interferenz:** Kein Dienst ("D" oder "HG") an Tagen mit den Status: `U` (Urlaub), `K` / `KK` (Krankheit), `WB` (Weiterbildung), `FZA` (Freizeitausgleich), `F` (Frei).
2.  **Dienst-Exklusivität (Anti-Kollision):** Ein Mitarbeiter kann an Tag `d` **niemals** zeitgleich "D" und "HG" besetzen.
3.  **Gesetzliche Ruhezeiten (Post-BD-Frei):** Auf einen "D"-Dienst an Tag `d` muss zwingend ein arbeitsfreier Tag an `d+1` folgen (Status `F` oder `U`/`FZA`). Der Algorithmus schreibt das "F" automatisch prospektiv in den Folgetag (auch monatsübergreifend).
4.  **Sequentielle Dienst-Sperre:** Zwei "D"-Dienste an aufeinanderfolgenden Tagen (`d` und `d+1`) für dieselbe Person sind hart blockiert.
5.  **Fixierte Vorbelegungen (Locked State):** Manuell im Editor gesetzte Dienste ("D" oder "HG") vor Ausführung des Auto-Plans gelten als "Fixed". Der Algorithmus darf diese modifizieren, **nur** wenn Hard Constraints verletzt sind, ansonsten umgeht er sie.

### 2.3 Zielwerte & Gewichtungen (Targets)
* **Standard-BD-Soll:** 4 Bereitschaftsdienste pro Monat.
* **Individuelle Ausnahmen (Hardcoded basierend auf Vertragsmodellen):**
  * Dr. Polednia: 3
  * Dr. Becker: 3
  * Hr. Sebastian: 3
* **HG-Verteilung:** Kein hartes Soll, wird als Gleichverteilung (Spread-Minimierung) über den Pool der berechtigten FA/OA kalkuliert.

## 3. Algorithmische Entscheidungsschritte (Neural Scheduler)

Der Auto-Plan-Algorithmus nutzt ein heuristisches **Backtracking-Verfahren kombiniert mit einer Deep-Move-Swapping-Phase**. Er evaluiert prospektiv und retrospektiv.

### Phase 1: Historien-Analyse & Telemetrie
* **Lookback:** Der Algorithmus lädt die Daten des Vormonats.
* **Post-BD-Check:** Wer am letzten Tag des Vormonats "D" hatte, wird am 1. des aktuellen Monats hart für "D" und "HG" gesperrt.
* **Historische Last:** Das historische Wochenend-Soll (`satBd`, `weDuty`) wird akkumuliert, um Ausgleiche im Zielmonat zu erzwingen.

### Phase 2: Heuristische Zuteilung Bereitschaftsdienst (D)
Iteration über alle Tage (`d = 1` bis `daysInMonth`).
1.  **Kandidaten-Identifikation:** Filterung aller AA und FA, die an Tag `d` keine Hard Constraints verletzen.
2.  **Scoring-Matrix (Sortierung der Kandidaten):** Jeder valide Kandidat erhält einen Score. Niedrigster Score = höchste Zuteilungspriorität.
    * *Target-Delta:* (Bisherige Dienste in diesem Durchlauf + 1) - Individuelles Ziel. Hohe Prio für Ärzte unter Soll.
    * *Cluster-Penalty:* Hatte der Kandidat in den letzten 3 Tagen Dienst? Wenn ja, starker Malus (Vermeidung von D-D-D Clustern mit nur einem Tag Pause).
    * *Wochenend-Ausgleich:* Ist Tag `d` ein Wochenende/Feiertag? Kandidaten mit historisch hohem WE-Dienst-Konto erhalten einen massiven Malus (+1000 Penalty-Punkte).
    * *Wunsch-Bonus:* "D-Wunsch" im Planungsmodus senkt den Score (-500 Punkte). "Kein D"-Wunsch erhöht den Score maximal (+5000 Punkte).
3.  **Zuweisung:** Der Top-Kandidat erhält "D". Das System markiert Tag `d+1` sofort als blockiert für diesen Kandidaten.
4.  **Backtracking:** Ist an Tag `d` **kein** Kandidat verfügbar (Leere Liste), erfolgt ein Rollback (`d-1`), der vorherige Tag wird mit dem zweitbesten Kandidaten besetzt und der Baum neu evaluiert.

### Phase 3: Heuristische Zuteilung Hintergrunddienst (HG)
Iteration über alle Tage.
1.  **Kandidaten-Identifikation:** Filterung aller FA, OA, CA. Striktes Ausschlusskriterium: Der Kandidat darf an Tag `d` nicht bereits in Phase 2 für "D" eingeteilt worden sein.
2.  **Scoring-Matrix:** Fokus liegt auf absoluter Gleichverteilung (Spread). Der Kandidat mit der aktuell niedrigsten HG-Zahl im Monat wird priorisiert. Urlaubs- und Wunsch-Constraints greifen analog zu Phase 2.

### Phase 4: Deep-Move-Optimierung (Spread Minimization)
Der Algorithmus begnügt sich nicht mit der Erstlösung. Er führt eine stochastische Tiefensuche nach Tauschpaaren (Swaps) durch.
* **Ziel:** Reduktion der Standardabweichung (Spread) zwischen den Dienstkonten der Ärzte.
* **Logik:** Das System identifiziert den Arzt mit den meisten BDs (Max-D) und den Arzt mit den wenigsten BDs (Min-D). Es sucht einen Tag, an dem Max-D eingeteilt ist und Min-D regelkonform übernehmen könnte. Ist ein Tausch möglich, ohne Post-BD-Frei-Konflikte bei Min-D auszulösen, wird getauscht.
* **Iteration:** Dieser Prozess wiederholt sich, bis keine legalen Tausche mehr möglich sind oder das Iterationslimit (Deep-Moves) erreicht ist.

### Phase 5: Kalkulation des Neural Fitness Index (NFI)
Der NFI ist die finale Qualitätsmetrik des generierten Plans.
* **Base Score:** 100.0
* **Gap Penalty:** -15.0 Punkte für jeden Tag ohne zugewiesenen "D" oder "HG".
* **Spread Penalty:** -2.5 Punkte für jede Einheit Varianz im D-Dienst und HG-Dienst (Streuung zwischen den Ärzten).
* **Weekend Spread Penalty:** -5.0 Punkte für hohe Ungerechtigkeit bei der Wochenendverteilung.
* **Wish Penalty:** -2.0 Punkte für jeden nicht erfüllten Mitarbeiter-Wunsch.

Ein Score über 85.0 gilt als exzellent. Unter 70.0 deutet auf massive Personalengpässe (z.B. hohe Urlaubsquote) hin.

## 4. State Management & Planungs-Sandbox
Der Planungsmodus operiert auf einem isolierten `state`-Zweig.
* **Baseline (`planBaseline`):** Der unmodifizierte Zustand beim Start. Dient der Deltaberechnung beim Abbrechen (Verhinderung von "Unsaved Changes" Warnungen, wenn nichts geändert wurde).
* **History-Stack (`planHistory` & `planHistoryIdx`):** Jeder Schreibzugriff auf das Plan-Grid (Manuell oder Auto-Plan) pusht einen Deep-Clone der aktuellen Assignments in ein Array. Undo/Redo navigiert lediglich den Index dieses Arrays.
* **Merge-Commit:** "In Planung übernehmen" führt einen destruktiven Überschreibvorgang (`Object.assign`) des Plan-States in den `DATA`-Main-State des aktuellen Monats aus und triggert den `saveToStorage` API-Call an Cloudflare.

## 5. Negative Befunde (Design-Entscheidungen)
* **Keine automatische Zuweisung von regulären Arbeitsplätzen (MR/CT/Röntgen):** Der Auto-Plan fokussiert sich **ausschließlich** auf D und HG. Tagesarbeitsplätze müssen manuell disponiert werden.
* **Kein Server-Side-Rendering (SSR):** Die Cloudflare Function liefert nur JSON. Das vollständige UI-Rendering passiert Client-seitig in `app.js` via Vanilla JS DOM-Manipulation.
* **Keine externen Libraries:** Chart.js, Moment.js oder Lodash sind nicht integriert. Datumskalkulationen (`isWorkday`, `daysInMonth`) und Diagramme (`#pm-wp-chart`) sind nativ via ES6 und CSS-Grid/Flexbox gelöst. Dies garantiert absolute Wartbarkeitskontrolle und Zero-Dependency.
