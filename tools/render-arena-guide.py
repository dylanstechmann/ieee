#!/usr/bin/env python3
"""Render the archived guide; run with uv --with pypdfium2 --with pillow."""
from pathlib import Path
import hashlib
import pypdfium2

root = Path(__file__).resolve().parent.parent
source = root / 'sources/SEC-2027-Arena-Build-Guide.pdf'
expected = '82cd41b28fe6ba3f0bae452ea37491fcd551eb922263cef5649a77bec6dc5e4a'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('Guide hash differs from archived manifest; refusing to render.')
out = root / 'derived/arena-guide-pages'
out.mkdir(parents=True, exist_ok=True)
document = pypdfium2.PdfDocument(source)
for i in range(len(document)):
    page = document[i]
    page.render(scale=2).to_pil().save(out / f'page-{i + 1:02}.png')
    page.close()
print(f'Rendered {len(document)} pages to {out}')