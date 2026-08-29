/**
 * @file Zentrale JSDoc-Typdefinitionen für das RadPlan-Datenmodell.
 * Reine Typ-Deklarationen ohne Laufzeitcode (leeres Modul) — andere Dateien
 * importieren die Typen per `@typedef {import('./types.js').X} X` und nutzen
 * sie in `@type`/`@param`/`@returns`-Annotationen, damit `tsc --noEmit`
 * (siehe tsconfig.json, `npm run typecheck`) auch ohne Build-Schritt echte
 * Strukturfehler im tief verschachtelten Planungszustand erkennen kann.
 */

/**
 * @typedef {Object} DayCell
 * @property {string} [assignment] Arbeitsplatz-Code(s), z.B. "CT" oder "MR/US".
 * @property {string} [duty] Dienst-Code: "D" (Bereitschaftsdienst) oder "HG" (Hintergrunddienst).
 * @property {string} [wish] Wunsch-Markierung für den Autoplan.
 * @property {boolean} [fix] Manuell fixierte Zuweisung — vom Autoplan nicht veränderbar.
 * @property {boolean} [locked] Zelle gegen manuelle Bearbeitung gesperrt.
 */

/**
 * @typedef {Object} MonthData
 * @property {string[]} employees Namen aller im Monat aktiven Mitarbeitenden.
 * @property {Object<string, Object<string, DayCell>>} assignments Mitarbeiter -> Tag (1-basiert, als String) -> Zelle.
 */

/**
 * @typedef {Object<string, MonthData>} RadPlanData
 * Schlüssel im Format "YYYY-M" (Monat 0-basiert), siehe README §3.1.
 */

/**
 * @typedef {Object} DutyFairnessRow
 * @property {string} emp
 * @property {Object} meta
 * @property {number} bd
 * @property {number} hg
 * @property {number} weBd
 * @property {number} weHg
 * @property {number} holBd
 * @property {number} holHg
 * @property {number} activeMonths
 * @property {number} bdTargetSum Summe der Monats-BD-Ziele über die aktiven Monate
 * @property {number} fte
 * @property {number} total
 * @property {number} weekendDuties
 * @property {number} holidayDuties
 * @property {number} [fairBd]
 * @property {number} [fairHg]
 * @property {number} [fairWeekend]
 * @property {number} [fairTotal]
 * @property {number} [bdDev]
 * @property {number} [hgDev]
 * @property {number} [weekendDev]
 * @property {number} [totalDev]
 * @property {number} [bdTarget]
 * @property {number} [bdDelta]
 * @property {number} [bdTargetPct]
 * @property {"over"|"under"|"balanced"} [status]
 * @property {"over"|"under"|"balanced"} [weekendStatus]
 * @property {boolean} [canFacharzt]
 * @property {number} [rankTotal]
 * @property {number} [rankWeekend]
 * @property {number} [rankHoliday]
 */

/**
 * @typedef {Object} DutyFairnessTeam
 * @property {number} count
 * @property {number} totalBd
 * @property {number} totalHg
 * @property {number} totalWeekend
 * @property {number} totalHoliday
 * @property {number} totalDuties
 * @property {number} meanBd
 * @property {number} meanHg
 * @property {number} meanWeekend
 * @property {number} meanTotal
 * @property {number} equityBd
 * @property {number} equityHg
 * @property {number} equityWeekend
 * @property {number} equityTotal
 * @property {number} cvTotal
 * @property {number} cvWeekend
 * @property {number} minTotal
 * @property {number} maxTotal
 * @property {number} minWeekend
 * @property {number} maxWeekend
 * @property {number} [spreadTotal]
 * @property {number} [spreadWeekend]
 */

/**
 * @typedef {Object} DutyFairnessReport
 * @property {number} year
 * @property {number} uptoMonth
 * @property {DutyFairnessRow[]} rows
 * @property {DutyFairnessTeam} team
 */

export {};
