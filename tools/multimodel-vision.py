#!/usr/bin/env python
"""Multi-model vision consensus tool (OpenRouter).

Sends one image plus a prompt to each named vision model in sequence and
prints every response, tagged by model. Used for the 2026-10-29 consensus
passes over the GM2 drawings and tire photos (transcripts 17-32 in
derived/vision-transcripts/2026-10-29/); the model panel was google/gemini-2.5-flash,
qwen/qwen3-vl-235b-a22b-instruct, nvidia/nemotron-3.5-super-vl,
anthropic/claude-sonnet-5.5, and openai/gpt-5.2 on 4x-8x zoom crops.

Usage:
    OPENROUTER_API_KEY=... uv run --no-project --with pillow \
        python tools/multimodel-vision.py IMAGE.png "PROMPT" "model1,model2,..."

Notes:
- Images larger than 1600 px on the long side are downscaled (LANCZOS) before
  upload; pre-zoom crops with PIL to keep small text legible under that cap.
- Reads the key only from the environment; never put credentials in this file.
"""
import sys, os, base64, json, io, time, urllib.request, urllib.error
img, prompt = sys.argv[1], sys.argv[2]
models = sys.argv[3].split(',')
key = os.environ['OPENROUTER_API_KEY']
from PIL import Image
im = Image.open(img).convert('RGB')
if max(im.size) > 1600:
    s = 1600 / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=94)
b64 = base64.b64encode(buf.getvalue()).decode()
for model in models:
    print(f"\n===== MODEL: {model} =====")
    payload = {"model": model, "messages": [{"role": "user", "content": [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}}
    ]}]}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    ok = False
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                d = json.load(r)
                print(d['choices'][0]['message']['content'])
            ok = True
            break
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:400]
            print('HTTP', e.code, body)
            if e.code in (429, 502, 503):
                time.sleep(5)
                continue
            break
        except Exception as e:
            print('ERROR', type(e).__name__, str(e)[:200])
            time.sleep(3)
    if not ok:
        print('(failed after retries)')