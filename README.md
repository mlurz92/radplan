# RadPlan — Digitale Klinik-Dienstplanarchitektur

**Systemspezifikation und algorithmische Referenz** der digitalen Dienstplan-Engine für die **Klinik für Radiologie & Nuklearmedizin**. Ausführung als isolierte, clientseitige **Single-Page-Application (SPA)**. **Zero-Backend-Konzeption** zur Gewährleistung maximaler Datenintegrität, DSGVO-Konformität und autonomer lokaler Persistenz.

---

## 1. BEFUND: SYSTEMARCHITEKTUR & UI-TOPOLOGIE

**Laufzeitumgebung:** Lokaler Webbrowser (ES6+). Hardwarebeschleunigtes UI-Rendering (`translateZ(0)`).
**Persistenzschicht:** **HTML5 LocalStorage** (`radplan_v3`). Strukturierte **JSON-Trees** für Produktionsdaten und isolierte Sandbox-Entwürfe (`radplan_v3_plan_YYYY-MM`).
**Mobile-First Integration:** Dedizierte Touch-Logik (`touch-action: manipulation`) zur Prävention des iOS-Double-Tap-Bugs. Asynchrone Event-Delegation für dynamische DOM-Elemente. Mobile Bottom-Navigation.
**Sachsen-Feiertags-Engine:** Integrierte Gaußsche Osterformel zur exakten Prädiktion aller beweglichen Feiertage (inkl. Buß- und Bettag).

### 1.1 Entitäten & Nomenklatur
* **Arbeitsplätze (Workplaces):** MR (MRT), CT (CT), US (Sonographie), AN (Angiographie), MA (Mammographie), KUS (Kinder-US), W (Wermsdorf), T (Teleradiologie).
* **Abwesenheiten/Status:** F (Frei), U (Urlaub), ZU (Zusatzurlaub), SU (Sonderurlaub), FZA (Freizeitausgleich), K (Krank), KK (Kind Krank), §15c, WB (Weiterbildung).
* **Dienste:** D (Bereitschaftsdienst), HG (Hintergrunddienst).
* **Qualifikationsstufen:** CA (Chefarzt), LOA (Leitender Oberarzt), OA/OÄ (Oberarzt), FA/FÄ (Facharzt), AA/AÄ (Assistenzarzt).

---

## 2. BEFUND: ALGORITHMISCHE AUTO-PLAN-ENGINE (KERNSTÜCK)

Der **Auto-Scheduler** ist ein deterministischer, mehrstufiger Algorithmus zur fairen, regelbasierten Dienstverteilung. Er operiert in einer asynchronen Pipeline (UI-Thread-schonend).

### 2.1 Harte Restriktionen (Hard Constraints)
Ausschlusskriterien – führt zu sofortigem Ausschluss (`-Infinity` Score) für Dienst `D` oder `HG`:
* **Befreiung:** Expliziter Ausschluss via `DUTY_EXEMPT` (Prof. Schäfer). Null-Ziel-Vorgabe.
* **Abwesenheit:** Krankheit, Urlaub oder geplanter Ausgleich (F, FZA) am selben Tag.
* **Doppelbelastung:** Maximale Belegung von 1 Dienst pro Tag pro Person.
* **Wunsch-Sperre:** Expliziter `NO_DUTY` Wunsch im Planungsmodus.
* **Ruhezeiten:** Am Tag nach einem Bereitschaftsdienst (`D`) zwingend `F` (automatische Injektion).
* **Vorbelastung:** Kein `D`, wenn am Vortag `D` (Verbot konsekutiver Bereitschaft).
* **Hintergrund-Regel:** Kein `HG` am Vortag eines `D`, es sei denn, der Vortag ist ein Freitag.
* **Qualifikations-Sperre:** Samstags-`D` ausschließlich für **Fachärzte** (FA/OA/LOA).
* **Teilzeit/Sonderregelungen:** Dr. Polednia gesperrt an So, Di, Do. (Ausnahme: HG möglich, wenn FA den BD hat).
* **Sektoren-Coverage:** Wechselseitige Dienst-Sperre zwischen Dr. Becker und Dr. Martin bei Urlaub des Partners zur Sicherstellung der CT-Besetzung.
* **Erschöpfungs-Sperre:** Verbot des "DFDF"-Musters (zwei Dienste mit nur einem Ruhetag dazwischen).
* **Monatsübergang:** Kein `D` am 1. des Monats, falls am letzten Tag des Vormonats bereits `D` geleistet wurde.

### 2.2 Heuristische Scoring-Metrik (Soft Constraints)
Basis-Score: **100 Punkte**. Die Kandidaten mit dem höchsten Score erhalten den Zuschlag.

**Gewichte für Bereitschaftsdienst (`D`):**
* **Zielvorgabe (Target):** * Überschreitung des individuellen Solls: **-5000 Punkte** pro Dienst über Soll.
    * Unterschreitung des Solls: **+50 Punkte** pro fehlendem Dienst.
* **Dienstwunsch (`BD_WISH`):** **+200 Punkte**.
* **Historische Fairness (Gesamt-BD):** Abweichung vom Abteilungsdurchschnitt * **+3 Punkte**.
* **Vor-Urlaubs-Bonus:** Donnerstags-BD vor einer Urlaubswoche: **+150 Punkte**.
* **Wochenend-Limitierung (WE/FT):**
    * Genereller WE-Penalty: **-150 Punkte** pro bereits verplantem WE-Tag im aktuellen Monat.
    * Historischer WE-Ausgleich: Abweichung vom historischen Abteilungs-WE-Schnitt * **+5 Punkte**.
    * Konsekutive Wochenenden: Hatte MA das Vorwochenende Dienst: **-50 Punkte**.
* **Samstags-Ausgleich (nur FA):** Spezifischer Ausgleich der historisch höchsten Belastung (`satBd`). Abweichung vom FA-Durchschnitt * **+800 Punkte**.
* **Notlösung Samstags-BD (Dr. Becker):** Falls kein anderer FA verfügbar, starke Penalty (**-2000 Punkte**), Injektion von `FZA` am folgenden Montag.
* **Erholungs-Distanz:** Distanz zum letzten/nächsten BD < 4 Tage: **-(4 - Distanz) * 150 Punkte**.
* **Feiertags-Ausgleich:** Abweichung vom historischen Feiertags-Schnitt * **+8 Punkte**.
* **Oster/Pfingst-Wechsel:** Hat MA an Ostern gearbeitet, Penalty für Pfingsten (**-80 Punkte**) und umgekehrt.

**Gewichte für Hintergrunddienst (`HG`):**
* **Basis-Penalty:** Laufende HG-Anzahl im Monat * **-120 Punkte**.
* **BD-Ausgleich:** Hat ein FA weniger BD als der Durchschnitt: **+30 Punkte** pro fehlendem BD (Kompensation durch HG).
* **Resilienz (HG für AA):** Exponentielle Bestrafung für Abweichungen im "HG für Assistenzärzte"-Konto: **-35 * (Abweichung²)**.
* **Dienstwunsch (`HG_WISH`):** **+200 Punkte**.
* **Vor-Urlaubs-Sperre:** HG am Tag vor Urlaub: **-20 Punkte**.
* **Wochenend-Belastung:** Laufende WE-Dienste * **-100 Punkte**. Vorwochenende belegt: **-30 Punkte**.
* **Erholungs-Distanz:** Distanz zum nächsten HG < 4 Tage: **-(4 - Distanz) * 20 Punkte**.
* **Konsekutiver HG:** Direkter Folgetag-HG: **-15 Punkte**.

### 2.3 Swap-Optimierer (Fairness-Glättung)
Nach der initialen Zuweisung iteriert der Algorithmus über alle verteilten BDs und prüft Tauschgeschäfte (Swaps) zur Minimierung des globalen `fairnessScore` (kleiner = besser).
* **Über-Soll Penalty:** Differenz * **+5000**.
* **Unter-Soll Penalty:** Differenz² * **+20**.
* **WE-Belastung:** WE-Dienste² * **+10**.
* **Samstags-Belastung (FA):** Gesamte historische & aktuelle Samstags-Dienste² * **+500**.

### 2.4 Hintergrund-Kopplung (Bundling)
Vor der algorithmischen HG-Verteilung greift eine strikte logische Bündelung zur Vermeidung zersplitterter Wochenenden für Fachärzte:
* **Freitags-HG:** Automatisch an den FA gekoppelt, der den Samstags-BD übernimmt (sofern Freitags ein AA im BD ist).
* **Sonntags-HG:** Automatisch an den FA gekoppelt, der den Samstags-BD innehat.
* **Feiertags-Vorab-HG:** Automatisch an den FA des Feiertags-BD gekoppelt.

---

## 3. BEFUND: REPORTING & ANALYTIK

Das System übersetzt die rohen Array-Daten in klinisch verwertbare Dashboards:
* **Live-Terminal:** Echtzeit-Rendering der Entscheidungsbäume ("Warum Tag X an Person Y?").
* **Abteilungs-Coverage:** Tracking von Werktags-Besetzungsquoten (Target: >80% für grüne Indikation).
* **Jahresauswertung:** Summative Darstellung von Urlaubs-Salden, Krankentagen, `satBd`-Verteilung und Ausfallzeiten pro Mitarbeiter.

---

## 4. BEURTEILUNG

**Hochgradig deterministisches, datengetriebenes Ressourcen-Management-System.** Die Trennung von Hard- und Soft-Constraints ermöglicht eine vollständige Automatisierung der Dienstplanung unter strikter Einhaltung arbeitsrechtlicher und abteilungsspezifischer Vorgaben. Die neu implementierte **Samstags-Fairness-Metrik (quadratische Penalty)** behebt historische Unwuchten in der Facharzt-Belastung vollständig.

**Explizite negative Befunde:**
* **Kein Server-Backend** integriert (Betrieb voll autark).
* **Keine Cloud-Synchronisation** (maximale Datensicherheit durch lokale Sandbox-Isolation).
