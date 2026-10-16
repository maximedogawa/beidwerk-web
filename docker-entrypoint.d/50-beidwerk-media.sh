#!/bin/sh
# The songs and videos: a media zip (beidwerk-web-media-<n>.zip) put into /storage is unpacked into /storage/media
# and then removed, when the container starts or at once with `beidwerk-media` (e.g. `once exec <host> beidwerk-media`).
# The zip is checked before anything is unpacked; a broken one stays where it is and the old media too.
set -eu
STORE=/storage
found=0
for zip in "$STORE"/beidwerk-web-media-*.zip; do
  [ -f "$zip" ] || continue
  found=1
  if ! [ -w "$STORE" ]; then
    echo "beidwerk: $zip found, but $STORE is read-only: unpack it on the server instead" >&2
    continue
  fi
  if ! unzip -tq "$zip" >/dev/null 2>&1; then
    echo "beidwerk: WARNING $zip is damaged (copied only partly?): left as it is, the media unchanged" >&2
    continue
  fi
  mkdir -p "$STORE/media"
  unzip -oq "$zip" -d "$STORE/media"
  rm -f "$zip"
  echo "beidwerk: $(basename "$zip") unpacked into $STORE/media"
done
if [ "$found" = 0 ] && ! [ -d "$STORE/media/audio" ]; then
  echo "beidwerk: no songs or videos yet: copy beidwerk-web-media-1.zip into $STORE (README.md)" >&2
fi
exit 0
