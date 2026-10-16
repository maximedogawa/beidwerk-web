# beidwerk-web

The public website of **Beidwerk**, an art and software studio from Vienna with a design language of its own.
Four ways in, each its own section of the site:

| Section | What it shows |
| --- | --- |
| **Apps** | the family of apps: what each does, how far it is, its website when it is live |
| **Design** | the design language: seven principles, four red signs, the stage and the receipt, how we speak |
| **Make** | how to use the look (fonts, colours, kit) for your own site or app, and how Beidwerk itself is made |
| **Band** | ECHT, STAMM, BOGEN and SCHLAG: the album with its music videos and lyrics, the world of Neu-Wien |

Every page is in English and German. The work pages are light (*the receipt*) by default, the band's pages dark
(*the stage*); visitors can switch either.

---

## How this repository works

The pages are **made in beidwerk-studio**, Beidwerk's workshop, and copied here for each release. This repository
holds what the public site needs and nothing else:

```
public/              the finished pages and pictures (generated: never edit by hand, the next sync overwrites them)
site/                the look, shared with the studio's own site
  layout.html        the page frame (filled in by the studio when it writes the pages)
  site.css site.js   the site's styles and its small, dependency-free JavaScript
  beidwerk.css       the design tokens: colours, type, spacing, light and dark
  kit.css            the components (bw-button, bw-card, bw-table …)
  fonts/             Archivo and IBM Plex Mono as WOFF2, with their licences
media.json           the songs and music videos the pages play: path, size, checksum
build.py             puts the site together into dist/ and checks it (plain Python, nothing to install)
beidwerk_mcp/        the public MCP server: the design language for agents (data.json is written by the studio)
pyproject.toml       makes beidwerk_mcp installable (`beidwerk-mcp`)
Dockerfile           the site as an nginx image, without songs and videos
docker-entrypoint.d/ sets contact and imprint from the server's environment when the container starts
contact.env          the contact the pages were built with (for that script)
nginx.conf           serves the pages, and /audio/ and /video/ from the mounted media folder
docker-compose.yml   runs the image on a server, next to the media folder
.github/workflows/   release.yml: builds and publishes the image when a release is published
```

**Songs and videos are not in git and not in the image.** They are hundreds of megabytes, change with every new
cut, and belong on the server only. They travel as one zip, `beidwerk-web-media-1.zip` (more parts if it ever
grows past 1.9 GB), which `media.json` describes file by file.

---

## Look at the site locally

```sh
python3 build.py beidwerk-web-media-1.zip    # dist/ with songs and videos
python3 -m http.server 8000 -d dist          # http://localhost:8000
```

Without the zip, `python3 build.py` builds everything except the songs and videos, exactly as in the Docker image.
Every link and picture is checked; the build stops when one is missing or a song does not match `media.json`.

---

## A release

1. **In beidwerk-studio:** `make web`. It rebuilds the public pages, mirrors them into `public/`, updates
   `site/` and `media.json`, strips the metadata from every picture, packs the media zip into the studio's
   `dist/`, and stops if anything private would go public.
2. **Here:** look at the changes (`git status`, `git diff --stat`), commit and push.
3. **Publish a release** on GitHub, tagged like `v0.2.0`. The `release` workflow checks the site and pushes the
   image `ghcr.io/maximedogawa/beidwerk-web:v0.2.0` and `:latest`. It needs no secrets.
4. **On the server:** pull the new image, and unpack the new media zip if songs or videos changed (below).

After the first release, GitHub keeps the image private until it is made public under the repository's
*Packages*. Either make it public, or `docker login ghcr.io` on the server with a token that may read packages.

---

## Run it on a server with ONCE

[ONCE](https://github.com/basecamp/once) runs the image with HTTPS, updates and backups. The image answers ONCE's
health check (`/up`), and keeps the songs and videos in ONCE's volume (`/storage/media`).

1. **Install** on the server (a domain's DNS `A` record points at it): `curl https://get.once.com | sh`, then
   `once`, and give it the image `ghcr.io/maximedogawa/beidwerk-web:latest` and the domain. The site runs at once,
   without songs and videos; nothing else has to be set first.
2. **The songs and videos:** copy the media zip to the server, put it into the app's volume and unpack it there:

   ```sh
   scp beidwerk-web-media-1.zip server:
   docker cp beidwerk-web-media-1.zip $(docker ps -q --filter name=once-app-beidwerk-web):/storage/
   once exec <domain> beidwerk-media     # unpacks into /storage/media and removes the zip
   ```

   A zip left in `/storage` is also unpacked whenever the container starts. A damaged zip (copied only partly)
   is left alone, and the songs and videos before it stay.
3. **Contact and imprint, whenever you are ready:** in `once`, the app's settings → *Environment*, add
   `BEIDWERK_LEGAL_NAME`, `BEIDWERK_LEGAL_ADDRESS` (lines separated by `\n`) and, if they change,
   `BEIDWERK_CONTACT_EMAIL` and `BEIDWERK_CONTACT_X`. Or in one command:
   `once update <domain> --env BEIDWERK_LEGAL_NAME="…" --env BEIDWERK_LEGAL_ADDRESS="…"` (`--env` replaces the
   whole list: give every variable each time). ONCE starts the container anew and the values are in every page.

ONCE pulls the image anonymously: make the package public on GitHub (*Packages*), or give ONCE
`--registry-username` and `--registry-password` (a token that may read packages).

---

## Run it on a server with Docker Compose

On the server, one folder holds `docker-compose.yml` (from this repository) and the media:

```sh
mkdir -p ~/beidwerk-web && cd ~/beidwerk-web
curl -fsSLO https://raw.githubusercontent.com/maximedogawa/beidwerk-web/main/docker-compose.yml
# copy beidwerk-web-media-1.zip here (scp, rsync …), then:
unzip -o beidwerk-web-media-1.zip -d media    # → media/audio/*.m4a, media/video/*.mp4 (mounted at /storage/media)
docker compose pull && docker compose up -d   # the site on port 8080
```

| Setting | Default | What it does |
| --- | --- | --- |
| `BEIDWERK_WEB_PORT` | `8080` | the port on the server (put it behind your reverse proxy for HTTPS) |
| `BEIDWERK_WEB_TAG` | `latest` | which release to run, e.g. `v0.2.0` |
| `BEIDWERK_CONTACT_EMAIL` | as built (`leo@librem.one`) | the contact e-mail in every footer and on the legal page |
| `BEIDWERK_CONTACT_X` | as built (`https://x.com/maximedogawa`) | the X profile, as a full link |
| `BEIDWERK_LEGAL_NAME` | empty | the imprint's name (required for a public site in Austria) |
| `BEIDWERK_LEGAL_ADDRESS` | empty | the imprint's postal address, `\n` between lines |

Set them in a `.env` file next to `docker-compose.yml`, for example:

```sh
BEIDWERK_LEGAL_NAME="Anna Muster"
BEIDWERK_LEGAL_ADDRESS="Gasse 1\n1070 Wien\nAustria"
```

The contact and imprint values are written into the pages when the container starts
(`docker-entrypoint.d/40-beidwerk-contact.sh`); after changing them, `docker compose up -d` makes the container
anew. An empty value keeps what the pages were built with. The container only reads the media folder (`:ro`).

**Updating:** `docker compose pull && docker compose up -d` for new pages; for new songs or videos, unpack the new
zip over `media/` first. To check the media folder against the pages:
`python3 build.py --check-media ~/beidwerk-web/media` from a checkout of this repository.

---

## Use the look for your own work

The fonts, the design tokens and the kit in `site/` are free to use; the *Make* page on the site explains it in
three steps. In short:

```html
<link rel="stylesheet" href="beidwerk/fonts/fonts.css">
<link rel="stylesheet" href="beidwerk/beidwerk.css">
<link rel="stylesheet" href="beidwerk/kit.css">
<body class="bw" data-theme="light">   <!-- light = the receipt, dark = the stage -->
```

Give your product its own accent colour; keep the rules: one red per screen, no text in pictures, calm around
and play in the marks.

---

## For agents: the MCP server

The design language is also an MCP server: read-only, offline, no keys. With Claude Code:

```sh
claude mcp add beidwerk -- uvx --from git+https://github.com/maximedogawa/beidwerk-web beidwerk-mcp
```

Without uv: `pip install git+https://github.com/maximedogawa/beidwerk-web`, then `claude mcp add beidwerk -- beidwerk-mcp`.

| Tool | What it gives |
| --- | --- |
| `design_principles(lang)` | the seven principles, the test, the never-list; `en` or `de` |
| `design_tokens(mode)` | colours for `light` (the receipt) or `dark` (the stage), type, spacing, radius, lines |
| `kit(component)` | the stylesheets to link and the `bw-` components with HTML examples |
| `signs(lang)` | the four red signs: member, instrument, decade, meaning in the B, SVG |
| `build_prompt(subject, mode, accent)` | an image prompt in the Beidwerk style, `receipt` (light) or `stage` (night) |

The same data is on the site as `/api/beidwerk.json` and `/llms.txt`.

## Contributing

Changes to the pages are made in beidwerk-studio and synced here; a pull request against `public/` would be
overwritten. Changes to `build.py`, the Docker files, the workflow and this README are welcome here.

This repository is public. Nothing personal goes in: no keys, no tokens, no private paths, hosts or e-mail
addresses, no internal notes. The studio's sync checks for these before anything is copied here.

## Licence

The code (`build.py`, the Docker files, `site.css`, `site.js`, `kit.css`, `beidwerk.css`) is under the MIT licence
(`LICENSE`). The fonts are under the SIL Open Font Licence 1.1 (`site/fonts/LICENSES.md`).

The content is not: the songs, lyrics, pictures, videos, texts and characters of Beidwerk in `public/` and in the
media zip are © Beidwerk, all rights reserved; ask before you use them (see the legal page).
