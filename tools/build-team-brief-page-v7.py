#!/usr/bin/env python3
"""Build the shareable HTML page for derived/team-brief-v7/TEAM-BRIEF.md.

  uv run --no-project --python 3.12 --with markdown python -I tools/build-team-brief-page-v7.py

Writes derived/team-brief-v7/page/index.html plus copies of the two figures, ready to
publish as a multi-file page. The Markdown file stays the source of truth.
"""
from pathlib import Path
import re
import shutil

import markdown

ROOT = Path(__file__).resolve().parent.parent
BRIEF = ROOT / 'derived/team-brief-v7'
PAGE = BRIEF / 'page'
FIGURES = {
    '../apriltag-41h12-v7/organizer-sheet-detections.png': ROOT / 'derived/apriltag-41h12-v7/organizer-sheet-detections.png',
    'sensor-planes.png': BRIEF / 'sensor-planes.png',
}
TITLE = 'Stock Car Race Concept Input'

STYLE = """
:root {
  /* Layout: one reading column for a team memo; wide tables scroll in their own frame. */
  --bg: #f3f4f2;
  --paper: #fbfbfa;
  --ink: #161917;
  --ink-2: #4b524e;
  --rule: #d3d8d4;
  --accent: #1d6b40;
  --accent-soft: #e2eee6;
  --display: "Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif;
  --body: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111412; --paper: #171b18; --ink: #e6ebe8; --ink-2: #a8b2ac;
    --rule: #2d3530; --accent: #5cc08a; --accent-soft: #1b2c22; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #111412; --paper: #171b18; --ink: #e6ebe8; --ink-2: #a8b2ac;
  --rule: #2d3530; --accent: #5cc08a; --accent-soft: #1b2c22; color-scheme: dark;
}
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 17px/1.6 var(--body); }
main { max-width: 46rem; margin: 0 auto; padding: 2.5rem max(16px, 4vw) 4rem; background: var(--paper);
  border-left: 1px solid var(--rule); border-right: 1px solid var(--rule); min-height: 100%; }
h1, h2 { font-family: var(--display); font-weight: 600; letter-spacing: 0.01em; text-wrap: balance; line-height: 1.1; }
h1 { font-size: 2.5rem; margin: 0 0 1rem; }
h2 { font-size: 1.65rem; margin: 2.6rem 0 0.8rem; padding-top: 1rem; border-top: 3px solid var(--accent); }
h3 { font-size: 1.08rem; font-weight: 600; margin: 2rem 0 0.4rem; text-wrap: balance; }
p, li { max-width: 68ch; }
p { margin: 0.6rem 0; }
ul, ol { padding-left: 1.3rem; display: grid; gap: 0.35rem; }
em { color: var(--ink-2); }
strong { font-weight: 600; }
a { color: var(--accent); text-underline-offset: 2px; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }
code { font-family: var(--mono); font-size: 0.88em; background: var(--accent-soft); padding: 0.05em 0.3em; border-radius: 3px; }
.table-wrap { overflow-x: auto; margin: 1rem 0; border: 1px solid var(--rule); border-radius: 6px; }
table { border-collapse: collapse; width: 100%; font-size: 0.92rem; font-variant-numeric: tabular-nums; }
th, td { text-align: left; vertical-align: top; padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--rule); min-width: 9rem; }
th { background: var(--accent-soft); font-weight: 600; }
tr:last-child td { border-bottom: none; }
figure { margin: 1.4rem 0; }
figure img { display: block; max-width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 6px; background: #fcfcfb; }
figcaption { font-size: 0.88rem; color: var(--ink-2); margin-top: 0.4rem; max-width: 68ch; }
main > p:first-of-type, main > p:nth-of-type(2) { font-size: 0.95rem; color: var(--ink-2); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
@media (max-width: 420px) { body { font-size: 16px; } h1 { font-size: 2rem; } }
"""


def main():
    PAGE.mkdir(parents=True, exist_ok=True)
    source = (BRIEF / 'TEAM-BRIEF.md').read_text()
    body = markdown.markdown(source, extensions=['tables', 'sane_lists'])
    for ref, path in FIGURES.items():
        shutil.copyfile(path, PAGE / path.name)
        body = body.replace(f'src="{ref}"', f'src="{path.name}"')
    body = re.sub(r'<p><img alt="([^"]*)" src="([^"]+)" /></p>',
                  r'<figure><img alt="\1" src="\2" loading="lazy" /><figcaption>\1</figcaption></figure>', body)
    body = re.sub(r'<table>', '<div class="table-wrap"><table>', body)
    body = re.sub(r'</table>', '</table></div>', body)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600&amp;family=IBM+Plex+Mono&amp;family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&amp;display=swap" rel="stylesheet" />
<style>{STYLE}</style>
</head>
<body>
<main>
{body}
</main>
</body>
</html>
"""
    (PAGE / 'index.html').write_text(html)
    print(f'wrote {PAGE / "index.html"} and {len(FIGURES)} figures')


if __name__ == '__main__':
    main()
