# art/ — image storage + manifests

The gallery is data-driven. Two kinds of JSON drive it; drop images alongside.

## 1. `art/index.json` — the collection registry (landing grid)

One entry per collection. Loaded when ART opens. This is the single source of
truth for a collection's `label` and `desc`.

```json
{
  "title": "[ ART ]",
  "sub": "Visual work exploring systems, noise...",
  "collections": [
    { "id": "IWABL", "label": "i will always be lost",
      "desc": "portraits · 2010–2023", "path": "art/IWABL",
      "cover": "alwaysbelost1200.jpg", "count": 15 }
  ]
}
```

- `path` — folder for this collection's images + its `meta.json`
- `cover` — filename (inside `path`) shown on the collection card (optional)
- `count` — works count shown on the card; items aren't loaded until the
  collection opens, so keep this in step with `meta.json` (optional)

## 2. `art/<id>/meta.json` — that collection's works

Loaded only when the collection is opened (lazy). `file` is relative to the
collection folder and can be any filename; grid order follows array order.

```json
{
  "items": [
    { "file": "jack_800.jpg", "label": "jack", "tag": "portrait", "year": "2023" }
  ]
}
```

## Images

Thumbnails reveal on scroll with a pixel-resolve effect; the detail view streams
the full image with a live progress bar. Missing files degrade gracefully
(`[ ? ]` / `[ NO SIGNAL ]`), and a collection with no `meta.json` shows
`[ collection unavailable ]`.

To add a collection: create the folder with a `meta.json`, drop the images in,
then add an entry to `index.json`. Only list collections that actually exist —
an entry without a folder renders as a broken card.
