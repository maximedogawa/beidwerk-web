#!/usr/bin/env python3
"""Build the Beidwerk website into dist/. Plain Python, nothing to install.

    python build.py                       the site without songs and videos (the Docker image; the server mounts them)
    python build.py media.zip [...]       the whole site, songs and videos unpacked from the media zip(s)
    python build.py --check-media DIR     check a folder of songs and videos (audio/, video/) against media.json

public/       the pages and pictures, written by beidwerk-studio (scripts/sync-web); not edited here
site/         the look: CSS, JavaScript, fonts (layout.html is the page frame the studio fills)
media.json    the songs and music videos the pages play, with sizes and checksums; too big for git, they come as a
              zip (beidwerk-web-media-*.zip) that is unpacked on the server

Every page link and picture is checked; the build fails when one is missing."""
import base64, hashlib, json, re, shutil, sys, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIST = HERE / "dist"
MEDIA_DIRS = ("audio/", "video/")


def sha256(f: Path) -> str:
    """The file's sha256, read in pieces (a music video is hundreds of megabytes)."""
    h = hashlib.sha256()
    with f.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def check_media(root: Path) -> int:
    """The songs and videos under root, against media.json. Returns the number of problems."""
    bad = 0
    for rel, want in json.loads((HERE / "media.json").read_text(encoding="utf-8"))["files"].items():
        f = root / rel
        if not f.exists():
            print(f"media: {rel} is missing", file=sys.stderr)
            bad += 1
        elif f.stat().st_size != want["bytes"] or sha256(f) != want["sha256"]:
            print(f"media: {rel} is not the file the pages were made with", file=sys.stderr)
            bad += 1
    return bad


def main(args: list[str]) -> int:
    if args[:1] == ["--check-media"]:
        bad = check_media(Path(args[1]) if len(args) > 1 else Path("media"))
        print("media: all songs and videos are there" if not bad else f"media: {bad} problem(s)")
        return 1 if bad else 0
    shutil.rmtree(DIST, ignore_errors=True)
    shutil.copytree(HERE / "public", DIST)
    shutil.copytree(HERE / "site", DIST / "assets", ignore=shutil.ignore_patterns("layout.html"))
    for z in args:
        with zipfile.ZipFile(z) as f:
            for name in f.namelist():
                if name.startswith("/") or ".." in Path(name).parts or not name.startswith(MEDIA_DIRS):
                    raise SystemExit(f"build: {z} holds an unexpected file: {name}")
            f.extractall(DIST)
    bad = check_media(DIST) if args else 0
    top = DIST.resolve()
    csp = (HERE / "nginx.conf").read_text(encoding="utf-8")
    for page in DIST.rglob("*.html"):
        html = page.read_text(encoding="utf-8")
        for script in re.findall(r"<script>(.*?)</script>", html, re.S):  # the security policy allows inline scripts by hash
            h = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
            if f"'sha256-{h}'" not in csp:
                print(f"build: {page.relative_to(DIST)} has an inline script nginx.conf does not allow (sha256-{h})", file=sys.stderr)
                bad += 1
        for ref in re.findall(r'(?:href|src|poster|data-src|data-video)="([^"#?]+)', html):
            if re.match(r"[a-z]+:|//", ref):
                continue  # another site
            target = ((DIST / ref.lstrip("/")) if ref.startswith("/") else (page.parent / ref)).resolve()  # /… from the site's root
            if not target.is_relative_to(top):
                print(f"build: {page.relative_to(DIST)} → {ref} points outside the site", file=sys.stderr)
                bad += 1
                continue
            if not args and target.relative_to(top).as_posix().startswith(MEDIA_DIRS):
                continue  # without the zips, the songs and videos (the server has them)
            if not target.exists():
                print(f"build: {page.relative_to(DIST)} → {ref} is missing", file=sys.stderr)
                bad += 1
    pages = sum(1 for _ in DIST.rglob("*.html"))
    print(f"build: {pages} pages → dist/" + ("" if args else " (songs and videos not included)") + (f", {bad} problem(s)" if bad else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
