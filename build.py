#!/usr/bin/env python3
"""Build dist/artifact.html, the single-file page published to claude.ai.

The claude.ai viewer wraps the file in its own <html>/<head>/<body> skeleton and only
allows scripts from a few CDNs, so everything is inlined: the title, the font links,
the stylesheet, the page markup, the rate-card snapshot and the app. The standalone
site's browser-only runtime and example booking are left out, because on claude.ai
the viewer supplies the real shared database.

    python3 build.py                                  # with the public rate card in src/data.js
    python3 build.py --data path/to/data.private.js   # with the full, private rate card

The live claude.ai page is built with the full rate card, which is kept out of this repo.
"""
import argparse
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent


def block(html, name):
    m = re.search(r"<!-- build:%s -->\n(.*?)<!-- /build:%s -->" % (name, name), html, re.S)
    if not m:
        raise SystemExit("index.html is missing its build:%s markers" % name)
    return m.group(1)


def main():
    ap = argparse.ArgumentParser(description="Build dist/artifact.html for claude.ai")
    ap.add_argument("--data", type=pathlib.Path, default=ROOT / "src" / "data.js", help="rate card file (default: src/data.js)")
    args = ap.parse_args()
    index = (ROOT / "index.html").read_text()
    title = re.search(r"<title>.*?</title>", index).group(0)
    src = lambda name: args.data.read_text() if name == "data.js" else (ROOT / "src" / name).read_text()
    for name in ("data.js", "app.js"):
        if "</script" in src(name):
            raise SystemExit("%s contains </script, which would end the inline script early" % name)
    page = "\n".join([
        title,
        block(index, "head").rstrip(),
        "<style>\n" + src("app.css") + "</style>",
        block(index, "body").rstrip(),
        "<script>\n" + src("data.js") + "</script>",
        "<script>\n" + src("app.js") + "</script>",
        "",
    ])
    out = ROOT / "dist" / "artifact.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print("wrote %s (%d KB) with rate card %s" % (out.relative_to(ROOT), len(page.encode()) // 1024, args.data))


if __name__ == "__main__":
    main()
