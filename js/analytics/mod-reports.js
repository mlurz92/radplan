// Stub – wird vom Domänen-Modul-Agenten vollständig implementiert.
export default {
  id: 'reports',
  label: 'Berichte',
  usesRange: true,
  icon: '',
  render(root, ctx) {
    root.innerHTML = '<div class="ah-empty">Modul „Berichte" wird geladen…</div>';
  },
  dispose() {},
};
