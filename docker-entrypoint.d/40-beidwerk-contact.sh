#!/bin/sh
# Contact and imprint from the server's environment (docker-compose.yml / .env), written into the pages when the
# container starts; nginx runs every script in /docker-entrypoint.d/ first. A variable not set leaves the pages as
# built. After changing a value: docker compose up -d (the container is made new, from the image's pages).
#   BEIDWERK_CONTACT_EMAIL   e.g. hello@example.org
#   BEIDWERK_CONTACT_X       e.g. https://x.com/handle
#   BEIDWERK_LEGAL_NAME      the imprint's name
#   BEIDWERK_LEGAL_ADDRESS   the imprint's postal address; \n between lines
set -eu
HTML=/usr/share/nginx/html
. /etc/beidwerk/contact.env  # BEIDWERK_BUILT_EMAIL, BEIDWERK_BUILT_X: what the pages were built with

# a value as HTML (escaped; \n and line breaks become <br>), then safe inside a sed replacement
val() { printf '%s' "$1" | sed -e 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g' -e 's/\\n/<br>/g' \
        | sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/<br>/g' | sed -e 's/[\\|&]/\\&/g'; }
# a fixed string as a sed pattern
pat() { printf '%s' "$1" | sed -e 's/[]\\|.*^$[]/\\&/g'; }
edit() { find "$HTML" -name '*.html' -exec sed -i "$1" {} +; }

if [ -n "${BEIDWERK_CONTACT_EMAIL:-}" ] && [ "$BEIDWERK_CONTACT_EMAIL" != "$BEIDWERK_BUILT_EMAIL" ]; then
  edit "s|$(pat "$BEIDWERK_BUILT_EMAIL")|$(val "$BEIDWERK_CONTACT_EMAIL")|g"
fi
if [ -n "${BEIDWERK_CONTACT_X:-}" ] && [ "$BEIDWERK_CONTACT_X" != "$BEIDWERK_BUILT_X" ]; then
  old_short=${BEIDWERK_BUILT_X#*//}; new_short=${BEIDWERK_CONTACT_X#*//}
  old_handle=${BEIDWERK_BUILT_X%/}; old_handle=${old_handle##*/}
  new_handle=${BEIDWERK_CONTACT_X%/}; new_handle=${new_handle##*/}
  edit "s|$(pat "$BEIDWERK_BUILT_X")|$(val "$BEIDWERK_CONTACT_X")|g; s|$(pat "$old_short")|$(val "$new_short")|g; s|@$(pat "$old_handle")|@$(val "$new_handle")|g"
fi
for key in NAME ADDRESS; do
  eval "v=\${BEIDWERK_LEGAL_$key:-}"
  if [ -n "$v" ]; then
    k=$(echo "$key" | tr 'A-Z' 'a-z')
    edit "s|@@BEIDWERK_LEGAL_$key@@|$(val "$v")|g; s|<tr data-imprint=\"$k\" hidden>|<tr data-imprint=\"$k\">|g"
  fi
done
if [ -z "${BEIDWERK_LEGAL_NAME:-}" ] || [ -z "${BEIDWERK_LEGAL_ADDRESS:-}" ]; then
  if grep -q '@@BEIDWERK_LEGAL_' "$HTML/legal.html" 2>/dev/null; then
    echo "beidwerk: WARNING the imprint has no name or address: set BEIDWERK_LEGAL_NAME and BEIDWERK_LEGAL_ADDRESS" \
         "(a public site in Austria needs both)" >&2
  fi
fi
echo "beidwerk: contact and imprint taken from the environment where set"
