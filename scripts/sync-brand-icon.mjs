import fs from "node:fs";

const svgPath = "img/icon_animated.svg";
const iconsPath = "js/icons.js";

let svg = fs.readFileSync(svgPath, "utf8").trim();
svg = svg.replace(
  '<svg xmlns="http://www.w3.org/2000/svg"',
  '<svg xmlns="http://www.w3.org/2000/svg" class="radplan-brand-icon"',
);

const escapedSvg = svg
  .replaceAll("\\", "\\\\")
  .replaceAll("`", "\\`")
  .replaceAll("${", "\\${");

const source = fs.readFileSync(iconsPath, "utf8");
const pattern = /export const ANIMATED_BRAND_ICON_SVG = `[\s\S]*?`;\r?\n\r?\nexport function icon/;
if (!pattern.test(source)) {
  throw new Error("ANIMATED_BRAND_ICON_SVG konnte nicht eindeutig gefunden werden.");
}

const replacement = `export const ANIMATED_BRAND_ICON_SVG = \`${escapedSvg}\`;\n\nexport function icon`;
const updated = source.replace(pattern, () => replacement);
fs.writeFileSync(iconsPath, updated, "utf8");

console.log("Inline-Brand-Icon mit img/icon_animated.svg synchronisiert.");
