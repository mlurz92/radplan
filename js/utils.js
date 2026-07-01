// Gemeinsame, sicherheitsrelevante Hilfsfunktionen.
// esc(): HTML-Escaping für alle Stellen, an denen nutzergesteuerte Werte
// (z. B. frei eingegebene Mitarbeiternamen) in innerHTML eingefügt werden.
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
