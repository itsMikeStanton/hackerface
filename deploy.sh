#!/usr/bin/env bash
# Sync the site into itsMikeStanton/itsmikestanton.github.io (serves notquietly.com)
# and push. That repo also hosts unrelated pages at its root; only the paths
# listed here are touched.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${DEPLOY_DIR:-/tmp/itsmikestanton.github.io}"

if [ ! -d "$DEST/.git" ]; then
  gh repo clone itsMikeStanton/itsmikestanton.github.io "$DEST"
fi
git -C "$DEST" pull -q --ff-only

rsync -a --delete --exclude .DS_Store "$SRC/js/"    "$DEST/js/"
rsync -a --delete --exclude .DS_Store "$SRC/art/"   "$DEST/art/"
rsync -a --delete                     "$SRC/fonts/" "$DEST/fonts/"
cp "$SRC/index.html" "$SRC/style.css" "$SRC/reflect.png" "$DEST/"

git -C "$DEST" add -A js art fonts index.html style.css reflect.png
if git -C "$DEST" diff --cached --quiet; then
  echo "nothing to deploy"
  exit 0
fi

MSG="Deploy hackerface $(git -C "$SRC" rev-parse --short HEAD)"
git -C "$DEST" commit -q -m "$MSG"
git -C "$DEST" push -q
echo "deployed: $MSG"
