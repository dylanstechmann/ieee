#!/usr/bin/env python3
"""Send an image (optionally downscaled) to an OpenRouter vision model and print its transcription.

Usage:
    OPENROUTER_API_KEY=... python vision-transcribe.py IMAGE_PATH "PROMPT" [MODEL]

Requires Pillow (e.g. `uv run --no-project --with pillow python vision-transcribe.py ...`).
The API key is read from the environment and never stored. Default model:
google/gemini-2.5-flash. Images larger than 1600 px on the long side are downscaled
with LANCZOS and re-encoded as JPEG quality 92 before upload.

Provenance: the raw outputs produced with this tool on 2026-10-29 are archived in
derived/vision-transcripts/2026-10-29/ together with the prompts used.
"""
import sys
import os
import base64
import json
import io
import urllib.request
import urllib.error

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    img, prompt = sys.argv[1], sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else 'google/gemini-2.5-flash'
    key = os.environ.get('OPENROUTER_API_KEY')
    if not key:
        print('OPENROUTER_API_KEY is not set', file=sys.stderr)
        sys.exit(1)
    from PIL import Image
    im = Image.open(img).convert('RGB')
    if max(im.size) > 1600:
        s = 1600 / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=92)
    b64 = base64.b64encode(buf.getvalue()).decode()
    payload = {
        'model': model,
        'messages': [{
            'role': 'user',
            'content': [
                {'type': 'text', 'text': prompt},
                {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + b64}},
            ],
        }],
    }
    req = urllib.request.Request(
        'https://openrouter.ai/api/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            d = json.load(r)
            print(d['choices'][0]['message']['content'])
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:800], file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
