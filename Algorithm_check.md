# Algorithmus-Check – RadPlan Auto-Planung

## Zweck dieses Dokuments
Dieses Dokument beschreibt den **aktuell tatsächlich umgesetzten** Zustand der Auto-Planung in RadPlan. Es ist als fachlich-technische Prüfdokumentation gedacht: Was plant der Algorithmus, welche Restriktionen gelten, wie werden Konflikte behandelt, welche Fairnessmetriken fließen ein und welche sichtbaren Ergebnisse erzeugt die Anwendung in der Planungs-Modal.

---

## 1. Systemgrenzen und Anwendungsrahmen

RadPlan ist eine browserbasierte Single-Page-Anwendung ohne Build-Prozess. Die gesamte Auto-Planung lebt direkt in `app.js` und arbeitet innerhalb des Planungsmodus auf einer Kopie der Monatsdaten.

Die Auto-Planung:
- liest den aktuellen Entwurfsmonat,
- respektiert bereits gesetzte D/HG,
- berücksichtigt Wünsche,
- verarbeitet historische Monatsdaten aus dem Hauptbestand,
- kann bei Bedarf Folgetagsbelegungen in den nächsten Monat schreiben,
- liefert danach eine Ergebnisübersicht, Warnungen, Detailbericht und übernehmbare Zuweisungen.

---

## 2. Eingangsgrößen der Auto-Planung

### 2.1 Personenstammdaten
Die Anwendung nutzt fest verdrahtete Metadaten je Person:
- Name,
- Rolle/Positionskürzel,
- Facharzt- vs. Assistenzarzt-Status,
- einzelne namensbezogene Sonderregeln.

### 2.2 Monatliche Plandaten
Für den Zielmonat werden verwendet:
- Mitarbeitendenliste,
- Zellbelegungen,
- Statuscodes,
- bereits gesetzte D/HG,
- Wünsche im Planungsmodus.

### 2.3 Historische Daten
Aus bereits gespeicherten Vormonaten werden historische Kennzahlen abgeleitet, insbesondere:
- D-Gesamtzahl,
- HG-Gesamtzahl,
- Wochenendäquivalente,
- Feiertagslast,
- Donnerstag-D,
- HG für AA,
- HG für FA,
- Samstags-D.

---

## 3. Grundprinzipien der Engine

Die Engine arbeitet in klaren Phasen:
1. Initialisierung und Reparatur fehlender F-Tage nach bestehenden D.
2. Verteilung der Wochenend-/Feiertags-BD.
3. Verteilung der Werktags-BD.
4. Iterative BD-Optimierung.
5. HG-Bündelung für gekoppelte Konstellationen.
6. Verteilung verbleibender HG.
7. Iterative HG-Optimierung.
8. Validierung und Ergebniserstellung.

Diese Phasen werden in der Modal live visualisiert.

---

## 4. Rollenlogik

### 4.1 Bereitschaftsdienst (D)
- Grundsätzlich für alle nicht dienstbefreiten Personen möglich.
- Samstags-D jedoch nur für FA.
- Einige Personen erhalten reduzierte Standardziele.

### 4.2 Hintergrunddienst (HG)
- Ausschließlich für FA.
- HG wird immer nach der D-Planung verteilt.
- HG kann qualitativ unterschiedlich gewertet werden, je nachdem ob der D von einem AA oder einem FA besetzt ist.

---

## 5. Harte Regeln für D

Eine Person fällt als D-Kandidat sofort aus, wenn mindestens eine der folgenden Bedingungen erfüllt ist:

- Dienstbefreiung.
- Abwesenheit am Zieltag.
- Bereits gesetzter D/HG an diesem Tag.
- NO_DUTY-Wunsch.
- Samstagsdienst bei Nicht-FA.
- Dr. Polednia an Sonntag, Dienstag oder Donnerstag.
- Becker/Martin-Vertretungskonflikt.
- F am Zieltag.
- Urlaub/urlaubsähnliche Abwesenheit am Folgetag.
- D am Vortag oder Folgetag.
- Unzulässige Vortags-HG-Konstellation.
- Oster-/Pfingst-Blockkonflikt.
- Im strengen Modus zusätzlich Zielüberschreitung, Wochenendlimit, Samstagssperre Becker, zu geringer D-Abstand.

### Bewertung
Diese Regeln sind im aktuellen Stand robust und klinisch nachvollziehbar. Besonders wichtig ist die Kombination aus Folgetagslogik, Wochenendgrenzen und personenbezogenen Ausschlüssen.

---

## 6. Harte Regeln für HG

Ein HG ist unzulässig bei:
- Nicht-FA,
- Dienstbefreiung,
- Abwesenheit,
- bereits gesetztem Dienst,
- NO_DUTY,
- F am normalen Werktag,
- Konflikt mit Folgetags-D,
- Oster-/Pfingst-Blockkonflikt,
- Dr.-Polednia-AA-Freigabekonflikt an Sonntag, Dienstag, Donnerstag im strengen Modus,
- Überschreitung des Wochenendlimits im strengen Modus.

### Bewertung
Die HG-Regeln sind weniger hart als die D-Regeln, aber ausreichend streng, um klinisch problematische Kombinationen weitgehend zu vermeiden.

---

## 7. Folgetagsregel nach D

Nach jedem D wird automatisch ein F am nächsten Kalendertag ergänzt, sofern dort noch keine andere Belegung steht.

Das gilt für:
- bereits vorhandene D beim Start der Auto-Planung,
- neue D der Auto-Planung,
- Monatsgrenzen mittels externer Folgemonats-Zuweisung.

### Bewertung
Diese Regel ist ein zentrales Sicherheitsnetz der Anwendung. Sie verhindert unplausible Belastungsketten und reduziert manuelle Nacharbeit erheblich.

---

## 8. Wochenendbewertung

RadPlan bewertet Wochenendlast über ein eigenes Äquivalenzmodell:
- 1,0 pro Kalenderwochenende mit mindestens einem D,
- 0,5 pro Kalenderwochenende mit HG, aber ohne D.

Wochenendrelevant sind Freitag, Samstag und Sonntag.

Diese Kennzahl fließt ein in:
- Zulässigkeitsprüfungen,
- Kandidatenscoring,
- Monatsfairness,
- Optimierungsobjektive,
- Ergebniswarnungen.

### Bewertung
Das Modell ist einfach, aber fachlich nützlich. Es bildet Belastung besser ab als eine reine Zählung einzelner Dienste.

---

## 9. Samstagslogik

### 9.1 Allgemein
- Samstag-D nur durch FA.
- Samstagsdienste sollen innerhalb der FA möglichst gleichverteilt werden.

### 9.2 Dr. Becker
- Samstags-D nur als Notlösung.
- Wenn Dr. Becker trotzdem samstags D erhält, prüft die Anwendung den **nächsten Werktag**.
- Automatisches FZA wird nur gesetzt, wenn:
  - dieser Tag arbeitsrechtlich/kalendermäßig ein Werktag ist,
  - dort kein anderer FA bereits Urlaub oder F hat,
  - Dr. Becker dort noch keine Belegung besitzt.
- Ist der Tag blockiert, erzeugt die Engine eine **kritische Warnung** in der Auto-Planungs-Modal anstelle einer stillen FZA-Setzung.

### Bewertung
Diese Umsetzung ist deutlich präziser als ein pauschales „Montag FZA“. Sie vermeidet Folgekonflikte in der CT-Vertretung und macht problematische Samstagskonstellationen sichtbar.

---

## 10. HG-D-HG-Wochenendkette

Dies ist eine der aktuell wichtigsten Spezialregeln.

### 10.1 Freitag → Samstag
Wenn ein AA am Freitag D hat, soll der FA mit dem Samstags-D auch den Freitags-HG übernehmen.

### 10.2 Samstag → Sonntag
Wenn ein FA am Samstag D hat, soll derselbe FA auch den HG des Sonntags übernehmen.

### 10.3 Technische Besonderheit
Diese gekoppelten HG werden:
- vor der allgemeinen HG-Verteilung gesetzt,
- als gekoppelte HG markiert,
- in der späteren HG-Optimierung **nicht mehr verschoben**.

### Bewertung
Damit ist die HG-D-HG-Kette nicht nur als Präferenz, sondern praktisch als stabile Wochenendlogik implementiert. Genau dieser Schutz vor späterem Wegoptimieren war für die fachliche Korrektheit entscheidend.

---

## 11. Feiertags- und Blocklogik

Die Anwendung berechnet sächsische Feiertage algorithmisch, inklusive beweglicher Feiertage und Buß- und Bettag.

Zusätzlich existiert eine Blockregel:
- Wer im Osterblock Dienst hat, soll im Pfingstblock ausgeschlossen werden.
- Wer im Pfingstblock Dienst hat, soll im Osterblock ausgeschlossen werden.

Die Prüfung berücksichtigt bei Bedarf auch relevante Daten außerhalb des aktuellen Monats.

### Bewertung
Das ist ein starkes Qualitätsmerkmal der Engine. Die Planung denkt dadurch nicht nur tagesbezogen, sondern blockbezogen und monatsübergreifend.

---

## 12. Wunschlogik

Wünsche wirken auf zwei Arten:
- `NO_DUTY` als harter Ausschluss.
- `BD_WISH` und `HG_WISH` als positiver Score-Bonus.

Erfüllte Wünsche werden am Ende zusätzlich gezählt und in den Informationen des Ergebnisbereichs ausgewiesen.

### Bewertung
Die Wunschlogik ist pragmatisch umgesetzt und kollidiert nicht mit den harten Sicherheitsregeln.

---

## 13. D-Scoring

Das D-Scoring bevorzugt unter anderem:
- Personen unter Ziel,
- Wunschdienste,
- Donnerstag vor Urlaub,
- geringe Wochenendlast,
- samstags ausgewogene FA-Belastung,
- historisch geringere Feiertagslast,
- ausreichenden Abstand zu anderen D,
- Vermeidung von D-F-D-F.

### Bewertung
Das Scoring balanciert Fairness und klinische Praktikabilität gut. Es ist nicht rein mathematisch „gleich“, sondern nutzt sinnvolle fachliche Prioritäten.

---

## 14. HG-Scoring

Das HG-Scoring bevorzugt unter anderem:
- gleichmäßige Monatsverteilung,
- Wunschdienste,
- kontrollierte Wochenendlast,
- Vermeidung direkt benachbarter HG,
- Ausgleich HG für AA / HG für FA,
- leichte Kompensation bei FA mit weniger D.

### Bewertung
Die HG-Verteilung ist spürbar differenzierter als eine einfache Round-Robin-Zuteilung. Besonders wertvoll ist die Trennung HG für AA vs. HG für FA als Qualitätsmerkmal.

---

## 15. Iterative Optimierung

Nach der Erstvergabe wird optimiert:

### 15.1 BD-Optimierung
Nicht fixierte Auto-Plan-BD können durch andere geeignete Personen ersetzt werden, wenn sich das Fairnessziel verbessert.

### 15.2 HG-Optimierung
Nicht fixierte Auto-Plan-HG können ebenfalls neu zugewiesen werden. Gekoppelte Wochenend-HG bleiben davon ausgenommen.

### Bewertung
Die Optimierung verbessert die Monatsfairness, ohne bereits manuell fixierte Dienste zu beschädigen.

---

## 16. Ergebnisaufbereitung in der Modal

Die Auto-Planungs-Modal zeigt nach der Berechnung:
- BD-Verteilung,
- HG-Verteilung,
- Informationen über Relaxierungen und Fairness,
- Warnhinweise,
- kritische Warnungen,
- Abschlussbericht mit Einzelentscheidungen.

Während des Laufs zeigt die Modal außerdem:
- eine visuelle Pipeline,
- Live-Telemetrie,
- Fortschrittsbalken,
- Terminal-Trace,
- auffällige High-Tech-HUD-Animationen.

### Bewertung
Die Darstellung ist nicht nur kosmetisch, sondern verbessert die Demonstrierbarkeit des Algorithmus gegenüber Kolleginnen und Kollegen sowie die Nachvollziehbarkeit kritischer Sonderfälle.

---

## 17. Warnungen und Validierung

Warnungen werden erzeugt bei:
- fehlendem BD an einem Tag,
- fehlendem HG an einem Tag,
- Unterschreitung individueller D-Ziele,
- Überschreitung der tolerierten Wochenendlast,
- kritischen Becker-Samstags-FZA-Konflikten.

Zusätzlich bereinigt die Validierung unzulässige D-D-Folgen.

### Bewertung
Die Warnlogik ist ausreichend sichtbar und mit den aktuellen Sonderregeln fachlich konsistent.

---

## 18. Lockerungen bei Engpässen

Wenn unter strengen Regeln keine vollständige Besetzung möglich ist, lockert die Engine kontrolliert einzelne Beschränkungen. Diese Relaxierungen werden im Ergebnis ausgewiesen.

### Bewertung
Für einen realen Klinikplaner ist das sinnvoll: Vollbesetzung bleibt oberstes Ziel, ohne dass Fairness vollständig aufgegeben wird.

---

## 19. Aktuelle Stärken

1. Gute Kombination aus harten Regeln, Scoring und Optimierung.
2. Verlässliche automatische F-Logik nach D.
3. Historische Fairness statt rein monatslokaler Betrachtung.
4. Stabile HG-D-HG-Wochenendkette.
5. Präzisere Becker-Samstagsbehandlung mit sichtbarer Konfliktwarnung.
6. Hohe Transparenz durch Ergebnis- und Report-Modal.

---

## 20. Aktuelle Grenzen

1. Mehrere Sonderregeln sind noch namentlich codiert.
2. Standardziele basieren nicht auf Stellenanteilen.
3. Die Becker-FZA-Regel prüft bewusst nur den nächsten Werktag und eskaliert dann per Warnung statt automatisch weiterzusuchen.
4. Historische Daten berücksichtigen gespeicherte Monatsdaten, nicht beliebige fremde unübernommene Entwürfe.

---

## 21. Fazit

Der aktuelle Stand der Auto-Planung ist für den vorhandenen Einsatzzweck fachlich belastbar und gegenüber früheren Ständen insbesondere in drei Punkten verbessert:

- Die Wochenend-HG-D-HG-Regel bleibt nun stabil erhalten.
- Die Dr.-Becker-Samstagsregel behandelt FZA fachlich sauberer und meldet Konflikte sichtbar.
- Die Auto-Planungs-Modal präsentiert den Lauf deutlich eindrucksvoller und nachvollziehbarer, ohne die technische Logik von der Ergebnisdarstellung zu entkoppeln.

