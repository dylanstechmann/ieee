#!/usr/bin/env python3
"""AprilTag tagStandard41h12 readability check for the 2027 Stock Car Race field.

Run from /workspace/ieee/ieee (uv-managed CPython; the container's system python3
is stripped):

  uv run --no-project --python 3.12 --with pupil-apriltags==1.0.4.post11 \
      --with opencv-python-headless --with numpy python -I tools/apriltag-41h12-v7.py

Agent-run synthetic experiment. It decodes the organizer's archived tag artwork with
a real AprilTag 3 detector, then renders the recovered bit patterns through four
hypothetical pinhole cameras. No physical camera, printed tag, lamination, lens
distortion, motion or venue lighting is tested; results are a screening aid only.
"""
from pathlib import Path
import hashlib
import importlib.metadata as md
import json
import math
import os
import platform
import sys

import cv2
import numpy as np
import pupil_apriltags as pa

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / 'derived/GM2-V3.1/media/image5.jpg'
SHEET_SHA256 = 'f1fa53afa205b11fecb90f386beef9721c23241feba2766fbfedeafa6a0316fa'
MANUAL = ROOT / 'sources/organizer-2026-10-29/Game-Manual-2027-2-V3-1.docx'
MANUAL_SHA256 = '90e4061310f81d4b42027ecb3b2c9a0ad9167dc8adf9c917c0b25017560039b8'
OUT = ROOT / 'derived/apriltag-41h12-v7'

FAMILY = 'tagStandard41h12'
TOTAL_CELLS = 9    # full printed pattern, including the outer data ring
BORDER_CELLS = 5   # detected quad = inner edge of the black ring
PRINTED_WIDTH_M = 0.068  # organizer label "68mm"; ASSUMED to be the 9-cell width
CELL_M = PRINTED_WIDTH_M / TOTAL_CELLS
MARGIN_CELLS = 1   # white paper margin left after cutting (assumption)

# Scene radiance on a 0-255 scale (assumed matte paper under even indoor light).
PAPER, INK, WALL = 215.0, 35.0, 105.0
BLUR_SIGMA_PX = 0.7
NOISE_SIGMA = 4.0
SUPERSAMPLE = 3
SEEDS = 10

CAMERAS = [  # hypothetical profiles, not product claims
    {'id': 'VGA-60', 'width': 640, 'height': 480, 'hfov_deg': 60.0},
    {'id': 'HD-70', 'width': 1280, 'height': 720, 'hfov_deg': 70.0},
    {'id': 'FHD-70', 'width': 1920, 'height': 1080, 'hfov_deg': 70.0},
    {'id': 'HD-100', 'width': 1280, 'height': 720, 'hfov_deg': 100.0},
]
for cam in CAMERAS:
    cam['fx'] = (cam['width'] / 2) / math.tan(math.radians(cam['hfov_deg'] / 2))
YAWS = [0, 30, 45, 60]
DECIMATES = [1.0, 2.0]
DISTANCES = [round(0.15 * (4.0 / 0.15) ** (i / 21), 3) for i in range(22)]

FIELD_REFERENCES_M = {  # nominal GM2 V3 dimensions, for interpreting ranges only
    'start_box_reading_band': [0.15, 0.6],
    'pit_area_depth_28in': 0.7112,
    'field_width_48in': 1.2192,
    'field_diagonal_96x48in': round(math.hypot(2.4384, 1.2192), 4),
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


_DETECTORS = {}


def detector(decimate, family=FAMILY):
    # pupil-apriltags 1.0.4.post11 segfaulted in Detector.__del__ during this
    # experiment, so detectors live for the whole process and main() leaves via
    # os._exit after flushing its outputs.
    key = (family, decimate)
    if key not in _DETECTORS:
        _DETECTORS[key] = pa.Detector(families=family, nthreads=1, quad_decimate=decimate,
                                      quad_sigma=0.0, refine_edges=1, decode_sharpening=0.25)
    return _DETECTORS[key]


def apply_h(h, x, y):
    p = h @ np.array([x, y, 1.0])
    return p[0] / p[2], p[1] / p[2]


def decode_sheet():
    img = cv2.imread(str(SHEET), cv2.IMREAD_GRAYSCALE)
    families = ['tagStandard41h12', 'tag36h11', 'tag25h9', 'tag16h5', 'tagCircle21h7',
                'tagCircle49h12', 'tagCustom48h12', 'tagStandard52h13']
    by_family = {f: sorted(int(d.tag_id) for d in detector(1.0, f).detect(img)) for f in families}
    step = 2.0 / BORDER_CELLS
    centres = [(i - (TOTAL_CELLS - 1) / 2) * step for i in range(TOTAL_CELLS)]
    tags = []
    for d in sorted(detector(1.0).detect(img), key=lambda d: d.tag_id):
        h = d.homography
        vals = np.zeros((TOTAL_CELLS, TOTAL_CELLS))
        for r, y in enumerate(centres):
            for c, x in enumerate(centres):
                u, v = apply_h(h, x, y)
                u, v = int(round(u)), int(round(v))
                vals[r, c] = img[v - 4:v + 5, u - 4:u + 5].mean()
        bits = (vals < (vals.min() + vals.max()) / 2).astype(int)
        quad = [float(np.linalg.norm(d.corners[i] - d.corners[(i + 1) % 4])) for i in range(4)]
        half = TOTAL_CELLS / BORDER_CELLS  # full pattern spans [-1.8, 1.8] in quad units
        full_pts = [np.array(apply_h(h, sx * half, sy * half))
                    for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
        full = [float(np.linalg.norm(full_pts[i] - full_pts[(i + 1) % 4])) for i in range(4)]
        ring1 = [bits[i, j] for i in range(1, 8) for j in range(1, 8) if i in (1, 7) or j in (1, 7)]
        tags.append({
            'id': int(d.tag_id), 'hamming': int(d.hamming),
            'decision_margin': round(float(d.decision_margin), 3),
            'quad_edge_px_mean': round(sum(quad) / 4, 3),
            'inferred_full_edge_px_mean': round(sum(full) / 4, 3),
            'quad_to_full_ratio': round(sum(quad) / sum(full), 5),
            'black_ring_cells_black': int(sum(ring1)), 'black_ring_cells_total': len(ring1),
            'bits_black_is_1': bits.tolist(),
            'corners_px': [[round(float(a), 2) for a in pt] for pt in d.corners],
            'full_corners_px': [[round(float(a), 2) for a in pt] for pt in full_pts],
        })
    return img, by_family, tags


TEXTURES = {}


def texture(bits, cell_px):
    key = (tuple(map(tuple, bits)), cell_px)
    if key not in TEXTURES:
        n = TOTAL_CELLS + 2 * MARGIN_CELLS
        tex = np.full((n * cell_px, n * cell_px), PAPER, np.float32)
        for r in range(TOTAL_CELLS):
            for c in range(TOTAL_CELLS):
                if bits[r][c]:
                    y0, x0 = (r + MARGIN_CELLS) * cell_px, (c + MARGIN_CELLS) * cell_px
                    tex[y0:y0 + cell_px, x0:x0 + cell_px] = INK
        TEXTURES[key] = tex
    return TEXTURES[key]


def rot(yaw_deg, roll_deg):
    a, b = math.radians(yaw_deg), math.radians(roll_deg)
    ry = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
    rz = np.array([[math.cos(b), -math.sin(b), 0], [math.sin(b), math.cos(b), 0], [0, 0, 1]])
    return ry @ rz


def render(bits, cam, dist, yaw, rng, blur=BLUR_SIGMA_PX, glare=None):
    """Render a crop of the camera image around the tag. Returns (img, info)."""
    fx, w_img, h_img = cam['fx'], cam['width'], cam['height']
    cx, cy = (w_img - 1) / 2, (h_img - 1) / 2
    ppc = fx * CELL_M / dist
    cell_px = int(min(64, max(4, round(ppc * SUPERSAMPLE))))
    tex = texture(bits, cell_px)
    n_px = tex.shape[0]
    s = CELL_M / cell_px
    c0 = (n_px - 1) / 2
    a = np.array([[s, 0, -c0 * s], [0, s, -c0 * s], [0, 0, 1]])
    shift = rng.uniform(-0.5, 0.5, 2)
    roll = rng.uniform(-3, 3)
    r = rot(yaw, roll)
    t = np.array([shift[0] * dist / fx, shift[1] * dist / fx, dist])
    k = np.array([[fx, 0, cx], [0, fx, cy], [0, 0, 1]])
    h = k @ np.column_stack([r[:, 0], r[:, 1], t]) @ a
    pts = np.array([apply_h(h, x, y) for x, y in [(0, 0), (n_px, 0), (n_px, n_px), (0, n_px)]])
    in_frame = bool(pts[:, 0].min() >= 0 and pts[:, 1].min() >= 0
                    and pts[:, 0].max() <= w_img - 1 and pts[:, 1].max() <= h_img - 1)
    pad = 48
    x0 = max(0, int(math.floor(pts[:, 0].min())) - pad)
    y0 = max(0, int(math.floor(pts[:, 1].min())) - pad)
    x1 = min(w_img, int(math.ceil(pts[:, 0].max())) + pad)
    y1 = min(h_img, int(math.ceil(pts[:, 1].max())) + pad)
    cw, ch = x1 - x0, y1 - y0
    ss = SUPERSAMPLE
    tmat = np.array([[ss, 0, 0.5 * ss - 0.5 - ss * x0], [0, ss, 0.5 * ss - 0.5 - ss * y0], [0, 0, 1]])
    big = cv2.warpPerspective(tex, tmat @ h, (cw * ss, ch * ss), flags=cv2.INTER_LINEAR,
                              borderMode=cv2.BORDER_CONSTANT, borderValue=WALL)
    img = cv2.resize(big, (cw, ch), interpolation=cv2.INTER_AREA)
    if glare is not None:
        frac, gx, gy = glare  # glare disc area as a fraction of the 9-cell tag area
        side = ppc * TOTAL_CELLS
        radius = max(1.0, math.sqrt(frac * side * side / math.pi))
        u, v = apply_h(h, (MARGIN_CELLS + gx * TOTAL_CELLS) * cell_px,
                       (MARGIN_CELLS + gy * TOTAL_CELLS) * cell_px)
        mask = np.zeros_like(img)
        cv2.circle(mask, (int(round(u - x0)), int(round(v - y0))), int(round(radius)), 1.0, -1)
        mask = cv2.GaussianBlur(mask, (0, 0), max(0.5, radius * 0.15))
        img = np.maximum(img, 255.0 * np.clip(mask * 1.2, 0, 1))
    if blur > 0:
        img = cv2.GaussianBlur(img, (0, 0), blur)
    img = img + rng.normal(0, NOISE_SIGMA, img.shape)
    img = np.clip(np.round(img), 0, 255).astype(np.uint8)
    return img, {'crop_origin': (x0, y0), 'in_frame': in_frame, 'ppc': ppc,
                 'fx': fx, 'cx': cx - x0, 'cy': cy - y0}


def detect(det, img, info=None, tag_size=None):
    if tag_size is None:
        return det.detect(img)
    return det.detect(img, estimate_tag_pose=True,
                      camera_params=(info['fx'], info['fx'], info['cx'], info['cy']),
                      tag_size=tag_size)


def main_sweep(tags):
    dets = {q: detector(q) for q in DECIMATES}
    rows = []
    for cam in CAMERAS:
        for yaw in YAWS:
            for dist in DISTANCES:
                ok = {q: 0 for q in DECIMATES}
                wrong = {q: 0 for q in DECIMATES}
                frames_in = 0
                seed_base = hash_seed(cam['id'], yaw, dist)
                for seed in range(SEEDS):
                    tag = tags[seed % len(tags)]
                    rng = np.random.default_rng(seed_base + seed)
                    img, info = render(tag['bits_black_is_1'], cam, dist, yaw, rng)
                    frames_in += info['in_frame']
                    for q in DECIMATES:
                        found = detect(dets[q], img)
                        ok[q] += any(d.tag_id == tag['id'] for d in found)
                        wrong[q] += sum(d.tag_id != tag['id'] for d in found)
                ppc = cam['fx'] * CELL_M / dist
                for q in DECIMATES:
                    rows.append({'camera': cam['id'], 'yaw_deg': yaw, 'quad_decimate': q,
                                 'distance_m': dist, 'pixels_per_cell_on_axis': round(ppc, 3),
                                 'pixels_per_cell_horizontal': round(ppc * math.cos(math.radians(yaw)), 3),
                                 'attempts': SEEDS, 'correct_id': ok[q], 'wrong_id_detections': wrong[q],
                                 'tag_fully_in_frame': frames_in})
    return rows


def hash_seed(*parts):
    return int(hashlib.sha256(repr(parts).encode()).hexdigest()[:8], 16)


def summarise(rows):
    out = []
    keys = sorted({(r['camera'], r['yaw_deg'], r['quad_decimate']) for r in rows},
                  key=lambda k: ([c['id'] for c in CAMERAS].index(k[0]), k[1], k[2]))
    for cam_id, yaw, q in keys:
        sel = sorted((r for r in rows if r['camera'] == cam_id and r['yaw_deg'] == yaw
                      and r['quad_decimate'] == q), key=lambda r: r['distance_m'])
        best, run = None, None
        for r in sel:  # longest contiguous run of 100% correct detections
            if r['correct_id'] == r['attempts']:
                run = [r, r] if run is None else [run[0], r]
                if best is None or (run[1]['distance_m'] - run[0]['distance_m']
                                    > best[1]['distance_m'] - best[0]['distance_m']):
                    best = list(run)
            else:
                run = None
        out.append({'camera': cam_id, 'yaw_deg': yaw, 'quad_decimate': q,
                    'reliable_from_m': best[0]['distance_m'] if best else None,
                    'reliable_to_m': best[1]['distance_m'] if best else None,
                    'pixels_per_cell_horizontal_at_limit': best[1]['pixels_per_cell_horizontal'] if best else None})
    return out


def pose_check(tags):
    cam = next(c for c in CAMERAS if c['id'] == 'HD-70')
    det = detector(1.0)
    sizes = {'inner_5_cell_edge': PRINTED_WIDTH_M * 5 / 9, 'black_ring_outer_7_cell_edge': PRINTED_WIDTH_M * 7 / 9,
             'printed_9_cell_width': PRINTED_WIDTH_M}
    rows = []
    for dist in [0.3, 0.6, 1.0]:
        for yaw in [0, 30]:
            rng = np.random.default_rng(hash_seed('pose', dist, yaw))
            tag = tags[0]
            img, info = render(tag['bits_black_is_1'], cam, dist, yaw, rng)
            row = {'distance_m': dist, 'yaw_deg': yaw}
            for name, size in sizes.items():
                found = [d for d in detect(det, img, info, size) if d.tag_id == tag['id']]
                row[name] = round(float(found[0].pose_t[2][0]) / dist, 4) if found else None
            rows.append(row)
    return {'camera': cam['id'], 'metric': 'estimated z / true z', 'tag_size_m': sizes, 'rows': rows}


def glare_check(tags):
    cam = next(c for c in CAMERAS if c['id'] == 'HD-70')
    det = detector(1.0)
    rows = []
    for frac in [0.0, 0.05, 0.1, 0.2, 0.3]:
        ok = 0
        n = 24
        for seed in range(n):
            rng = np.random.default_rng(hash_seed('glare', frac, seed))
            gx, gy = rng.uniform(0.1, 0.9, 2)
            tag = tags[seed % len(tags)]
            img, _ = render(tag['bits_black_is_1'], cam, 0.4, 20, rng,
                            glare=(frac, gx, gy) if frac > 0 else None)
            ok += any(d.tag_id == tag['id'] for d in detect(det, img))
        rows.append({'glare_area_fraction_of_tag': frac, 'attempts': n, 'correct_id': ok})
    return {'camera': cam['id'], 'distance_m': 0.4, 'yaw_deg': 20,
            'model': 'saturated soft disc at a random position inside the tag; crude stand-in for a laminate reflection',
            'rows': rows}


def defocus_check(tags):
    cam = next(c for c in CAMERAS if c['id'] == 'HD-70')
    det = detector(1.0)
    rows = []
    for dist in [0.1, 0.15, 0.2, 0.3]:
        for blur in [0.7, 1.5, 3.0, 5.0]:
            ok = 0
            for seed in range(SEEDS):
                rng = np.random.default_rng(hash_seed('defocus', dist, blur, seed))
                tag = tags[seed % len(tags)]
                img, _ = render(tag['bits_black_is_1'], cam, dist, 0, rng, blur=blur)
                ok += any(d.tag_id == tag['id'] for d in detect(det, img))
            rows.append({'distance_m': dist, 'gaussian_blur_sigma_px': blur, 'attempts': SEEDS, 'correct_id': ok})
    return {'camera': cam['id'], 'model': 'Gaussian blur as a crude defocus stand-in', 'rows': rows}


def overlay(img, tags):
    vis = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    for t in tags:
        q = np.array(t['corners_px'], np.int32)
        f = np.array(t['full_corners_px'], np.int32)
        cv2.polylines(vis, [f], True, (200, 0, 200), 3)
        cv2.polylines(vis, [q], True, (0, 170, 0), 3)
        cx, cy = np.mean(q, axis=0).astype(int)
        cv2.putText(vis, f"id {t['id']}", (int(cx) - 40, int(cy) + 10), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 220), 3)
    cv2.putText(vis, 'green: detected quad (5 cells)  magenta: printed pattern (9 cells)', (10, 728),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    return vis


def examples(tags, summary):
    cam = next(c for c in CAMERAS if c['id'] == 'HD-70')
    lim = next(s for s in summary if s['camera'] == 'HD-70' and s['yaw_deg'] == 0 and s['quad_decimate'] == 1.0)
    beyond = next((d for d in DISTANCES if d > lim['reliable_to_m']), DISTANCES[-1])
    cases = [('0.30 m, 0 deg', 0.3, 0, None, BLUR_SIGMA_PX), ('1.00 m, 45 deg', 1.0, 45, None, BLUR_SIGMA_PX),
             (f"{lim['reliable_to_m']:.2f} m (limit)", lim['reliable_to_m'], 0, None, BLUR_SIGMA_PX),
             (f'{beyond:.2f} m (beyond)', beyond, 0, None, BLUR_SIGMA_PX),
             ('0.40 m, glare 20%', 0.4, 20, (0.2, 0.3, 0.3), BLUR_SIGMA_PX), ('0.15 m, blur 3 px', 0.15, 0, None, 3.0)]
    det = detector(1.0)
    tiles = []
    for label, dist, yaw, glare, blur in cases:
        rng = np.random.default_rng(hash_seed('example', label))
        img, _ = render(tags[0]['bits_black_is_1'], cam, dist, yaw, rng, blur=blur, glare=glare)
        ok = any(d.tag_id == tags[0]['id'] for d in detect(det, img))
        fit = 220 / max(img.shape)
        if fit >= 1:  # enlarge small crops without smoothing so pixels stay visible
            k = int(fit)
            big = cv2.resize(img, (img.shape[1] * k, img.shape[0] * k), interpolation=cv2.INTER_NEAREST)
        else:
            big = cv2.resize(img, (max(1, int(img.shape[1] * fit)), max(1, int(img.shape[0] * fit))),
                             interpolation=cv2.INTER_AREA)
        tile = np.full((260, 260), 255, np.uint8)
        bh, bw = min(220, big.shape[0]), min(260, big.shape[1])
        oy, ox = (220 - bh) // 2, (260 - bw) // 2
        tile[oy:oy + bh, ox:ox + bw] = big[:bh, :bw]
        tile = cv2.cvtColor(tile, cv2.COLOR_GRAY2BGR)
        cv2.putText(tile, label, (6, 238), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
        cv2.putText(tile, 'decoded' if ok else 'not decoded', (6, 254), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                    (0, 140, 0) if ok else (0, 0, 200), 1)
        tiles.append(tile)
    return np.vstack([np.hstack(tiles[:3]), np.hstack(tiles[3:])])


def main():
    if sha256(SHEET) != SHEET_SHA256 or sha256(MANUAL) != MANUAL_SHA256:
        raise SystemExit('Input hash differs from the archived organizer source; refusing to run.')
    OUT.mkdir(parents=True, exist_ok=True)
    aruco = sorted(n for n in dir(cv2.aruco) if n.startswith('DICT_'))
    img, by_family, tags = decode_sheet()
    checks = []

    def check(name, cond):
        checks.append({'check': name, 'passed': bool(cond)})

    check('organizer sheet decodes as tagStandard41h12 ids 1-3 with zero bit errors',
          [t['id'] for t in tags] == [1, 2, 3] and all(t['hamming'] == 0 for t in tags))
    check('no other bundled AprilTag family decodes the sheet',
          all(not v for f, v in by_family.items() if f != FAMILY))
    check('OpenCV ArUco predefined dictionaries contain no 41h12 family', not any('41' in n for n in aruco))
    check('detected quad is 5/9 of the printed pattern (+/-0.01)',
          all(abs(t['quad_to_full_ratio'] - 5 / 9) < 0.01 for t in tags))
    check('black ring cells are all black', all(t['black_ring_cells_black'] == t['black_ring_cells_total'] for t in tags))
    clean = []
    for t in tags:
        tex = texture(t['bits_black_is_1'], 20).astype(np.uint8)
        clean.append(sorted(int(d.tag_id) for d in detector(1.0).detect(tex)))
    check('re-rendered recovered bit patterns decode to the same ids', clean == [[1], [2], [3]])

    rows = main_sweep(tags)
    summary = summarise(rows)
    check('no wrong-id detections anywhere in the sweep', sum(r['wrong_id_detections'] for r in rows) == 0)
    pose = pose_check(tags)
    check('pose with the 5-cell quad edge as tag_size is within 3% of true range at 0 deg',
          all(abs(r['inner_5_cell_edge'] - 1) < 0.03 for r in pose['rows'] if r['yaw_deg'] == 0))
    glare = glare_check(tags)
    defocus = defocus_check(tags)

    cv2.imwrite(str(OUT / 'organizer-sheet-detections.png'), overlay(img, tags))
    cv2.imwrite(str(OUT / 'synthetic-examples.png'), examples(tags, summary))

    report = {
        'schema': 'apriltag-41h12-v7/1',
        'status': 'agent-run synthetic screening; no physical camera, print, lamination or venue test',
        'environment': {'python': platform.python_version(), 'opencv': cv2.__version__,
                        'numpy': np.__version__, 'pupil_apriltags': md.version('pupil-apriltags')},
        'inputs': {'sheet': str(SHEET.relative_to(ROOT)), 'sheet_sha256': SHEET_SHA256,
                   'manual': str(MANUAL.relative_to(ROOT)), 'manual_sha256': MANUAL_SHA256,
                   'sheet_provenance': 'byte-identical to word/media/image5.jpg inside the archived GM2 V3 docx'},
        'library_support': {'opencv_aruco_dictionaries': aruco,
                            'opencv_aruco_has_41h12': any('41' in n for n in aruco),
                            'pupil_apriltags_family_used': FAMILY},
        'organizer_sheet': {'families_tried': by_family, 'tags': tags},
        'assumptions': {
            'printed_width_m': PRINTED_WIDTH_M,
            'printed_width_basis': 'organizer sheet label "68mm", assumed to be the full 9-cell pattern; measure the real print',
            'cell_m': CELL_M, 'white_margin_cells': MARGIN_CELLS,
            'radiance_paper_ink_wall': [PAPER, INK, WALL], 'blur_sigma_px': BLUR_SIGMA_PX,
            'noise_sigma': NOISE_SIGMA, 'supersample': SUPERSAMPLE, 'seeds_per_cell': SEEDS,
            'camera_model': 'ideal pinhole, tag centred on the optical axis, no lens distortion or motion blur',
            'cameras': CAMERAS, 'yaws_deg': YAWS, 'quad_decimate': DECIMATES, 'distances_m': DISTANCES,
            'detector': {'nthreads': 1, 'quad_sigma': 0.0, 'refine_edges': 1, 'decode_sharpening': 0.25},
        },
        'field_reference_m': FIELD_REFERENCES_M,
        'sweep_summary': summary,
        'pose_check': pose,
        'glare_check': glare,
        'defocus_check': defocus,
        'checks': checks,
        'sweep_rows': rows,
    }
    (OUT / 'report.json').write_text(json.dumps(report, indent=1) + '\n')
    failed = [c['check'] for c in checks if not c['passed']]
    print(json.dumps({'checks_passed': len(checks) - len(failed), 'checks_failed': failed,
                      'rows': len(rows)}, indent=1))
    sys.stdout.flush()
    os._exit(1 if failed else 0)  # skip Detector.__del__ (see detector())


if __name__ == '__main__':
    main()
