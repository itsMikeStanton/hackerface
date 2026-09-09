// ── ART SECTION ───────────────────────────────────────────────────────────────
// Data-driven from JSON manifests (no item data baked in here):
//   art/index.json                 ← collection registry (landing grid)
//   art/<collection-id>/meta.json  ← that collection's item list (loaded on open)
//   art/<collection-id>/*.jpg      ← cover + works (filenames come from the manifests)
// See art/README.md for the manifest shapes.
export default {
  type: 'panel',
  index: 'art/index.json',
};
