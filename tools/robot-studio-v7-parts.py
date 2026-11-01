#!/usr/bin/env python3
"""Convert the Order A vendor CAD to render meshes and check the mule assembly.

  uv run --no-project --python 3.12 --with cascadio==0.1.1 --with trimesh==5.2.0 \
      --with numpy --with scipy --with networkx python -I tools/robot-studio-v7-parts.py

Inputs are Pololu STEP files archived with hashes (October 31 and November 1, 2026).
Outputs go to derived/robot-studio-v7/: one GLB per part (metres, vendor colors),
parts.json, and assembly.json, which measures the parts and compares the mule kit's
nominal stack (drivetrain-mule-v4.json) with the vendor geometry. Agent-run CAD
measurement; nothing here was checked on physical parts.
"""
from pathlib import Path
import hashlib
import importlib.metadata as md
import json

import cascadio
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'derived/robot-studio-v7'
KIT = json.loads((ROOT / 'drivetrain-mule-v4.json').read_text())
PARTS = [
    {'id': 'motor', 'sku': '4754', 'name': '70:1 37D 12 V gearmotor, 64 CPR encoder', 'tol': 0.01,
     'step': 'sources/hardware-2026-10-31/pololu/step/37d-gearmotor-50-70-encoder.step',
     'note': 'Pololu publishes one model for the 50:1 and 70:1 encoder gearmotors (same gearbox length, 24.0 mm).'},
    {'id': 'bracket', 'sku': '1995', 'name': 'Machined aluminum bracket for 37D gearmotors', 'tol': 0.01,
     'step': 'sources/hardware-2026-10-31/pololu/step/1995-machined-bracket.step'},
    {'id': 'hub', 'sku': '1083', 'name': 'Universal aluminum mounting hub, 6 mm shaft, #4-40 holes', 'tol': 0.01,
     'step': 'sources/hardware-2026-11-01/pololu/step/1083-hub-6mm-4-40.step'},
    {'id': 'wheel', 'sku': '1430', 'name': 'Pololu wheel 80 x 10 mm, black, silicone tire', 'tol': 0.02,
     'step': 'sources/hardware-2026-11-01/pololu/step/pololu-wheel-80x10mm-black.step'},
    {'id': 'caster', 'sku': '953', 'name': 'Ball caster with 1/2 in metal ball', 'tol': 0.01,
     'step': 'sources/hardware-2026-10-31/pololu/step/953-ball-caster.step'},
]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def mesh_mm(glb):
    scene = trimesh.load(glb)
    mesh = scene.to_geometry() if hasattr(scene, 'to_geometry') else scene.dump(concatenate=True)
    mesh.apply_scale(1000.0)
    return scene, mesh


def r2(x):
    return round(float(x), 2)


def measure(meshes):
    v = meshes['motor'].vertices
    tip = v[:, 2].max()
    shaft = v[v[:, 2] > tip - 8]
    box = v[(v[:, 2] > tip - 22 - 24.6) & (v[:, 2] < tip - 22 + 0.6)]  # gearbox span incl. both end rings
    gx, gy = (box[:, 0].max() + box[:, 0].min()) / 2, (box[:, 1].max() + box[:, 1].min()) / 2
    flat = shaft[:, 1].max() - shaft[:, 1].min()  # D-flat makes the box 5.4 mm across one axis
    sx = (shaft[:, 0].max() + shaft[:, 0].min()) / 2
    # The round side is 3.0 mm from the axis, the flat 2.4 mm: keep the candidate centre that
    # puts the most vertices on the 3.0 mm circle.
    cands = [shaft[:, 1].min() + 3.0, shaft[:, 1].max() - 3.0]
    sy = max(cands, key=lambda c: int(np.sum(np.abs(np.hypot(shaft[:, 0] - sx, shaft[:, 1] - c) - 3.0) < 0.05)))
    motor = {'shaft_tip_z': r2(tip), 'gearbox_face_z': r2(tip - 22.0), 'encoder_end_z': r2(v[:, 2].min()),
             'body_length_face_to_encoder_end': r2(tip - 22.0 - v[:, 2].min()),
             'gearbox_diameter': r2(box[:, 0].max() - box[:, 0].min()), 'gearbox_center_xy': [r2(gx), r2(gy)],
             'shaft_axis_xy': [r2(sx), r2(sy)], 'shaft_offset': r2(np.hypot(sx - gx, sy - gy)),
             'shaft_diameter_and_flat': [r2(shaft[:, 0].max() - shaft[:, 0].min()), r2(flat)]}
    b = meshes['bracket']
    bv = b.vertices
    corners = {f'{x},{y}': r2(np.hypot(bv[:, 0] - x, bv[:, 1] - y).min())
               for x in (bv[:, 0].min(), bv[:, 0].max()) for y in (bv[:, 1].min(), bv[:, 1].max())}
    sec = b.section(plane_origin=[0, 0, bv[:, 2].max() - 0.25], plane_normal=[0, 0, 1])
    loops = [np.asarray(d) for d in sec.discrete]
    slot = sorted(loops, key=lambda L: -(np.ptp(L[:, 0]) * np.ptp(L[:, 1])))[1]  # [0] is the outline
    face = bv[np.abs(bv[:, 1] - bv[:, 1].min()) < 0.01]  # flat mounting edge plane
    zlo, zhi = bv[:, 2].min(), bv[:, 2].max()
    rim = face[(face[:, 2] > zlo + 0.2) & (face[:, 2] < zhi - 0.2)]  # tapped-hole rims only
    cx0 = (bv[:, 0].min() + bv[:, 0].max()) / 2
    tapped = []
    for dx in (-14.8, 0.0, 14.8):
        pts = rim[np.abs(rim[:, 0] - (cx0 + dx)) < 2.5]
        if len(pts):
            tapped.append({'x': r2((pts[:, 0].min() + pts[:, 0].max()) / 2), 'z_center': r2((pts[:, 2].min() + pts[:, 2].max()) / 2),
                           'diameter': r2(np.ptp(pts[:, 2]))})
    bracket = {'x_range': [r2(bv[:, 0].min()), r2(bv[:, 0].max())], 'y_range': [r2(bv[:, 1].min()), r2(bv[:, 1].max())],
               'z_range': [r2(bv[:, 2].min()), r2(bv[:, 2].max())], 'nearest_vertex_to_bbox_corners': corners,
               'mount_face': 'plane y = min (square corners present there; the arc is on +y)',
               'gearbox_center_xy': [r2((bv[:, 0].min() + bv[:, 0].max()) / 2), r2((bv[:, 1].min() + bv[:, 1].max()) / 2)],
               'slot_x_range': [r2(slot[:, 0].min()), r2(slot[:, 0].max())], 'slot_y_range': [r2(slot[:, 1].min()), r2(slot[:, 1].max())],
               'tapped_mount_holes': tapped,
               'tapped_hole_depth_from_motor_side_face': r2(np.mean([t['z_center'] for t in tapped]) - zlo) if tapped else None}
    bracket['gearbox_center_above_mount_face'] = r2(bracket['gearbox_center_xy'][1] - bracket['y_range'][0])
    bracket['slot_runs_perpendicular_to_mount_face'] = bool(np.ptp(slot[:, 1]) > np.ptp(slot[:, 0]))
    h = meshes['hub'].vertices
    hr = np.hypot(h[:, 0], h[:, 1])
    hub = {'z_range': [r2(h[:, 2].min()), r2(h[:, 2].max())], 'flange_radius': r2(hr[h[:, 2] < 0.05].max()),
           'flange_thickness': r2(max(h[hr > 12.6][:, 2]) - min(h[hr > 12.6][:, 2])), 'collar_radius': r2(hr[h[:, 2] > 3.0].max()), 'bore_radius': r2(hr.min())}
    w = meshes['wheel'].vertices
    wr = np.hypot(w[:, 1], w[:, 2])
    wheel = {'x_range': [r2(w[:, 0].min()), r2(w[:, 0].max())], 'outer_diameter': r2(2 * wr.max()),
             'center_feature_max_radius_at_boss_end': r2(wr[w[:, 0] < w[:, 0].min() + 0.1].max())}
    c = meshes['caster'].vertices
    caster = {'height': r2(np.ptp(c[:, 2])), 'top_z': r2(c[:, 2].max()), 'ball_bottom_z': r2(c[:, 2].min())}
    return {'motor': motor, 'bracket': bracket, 'hub': hub, 'wheel': wheel, 'caster': caster}


def assemblies(m):
    d, kit_geom = KIT['drive'], None
    face = d['gearbox_face_y_mm']  # 74: motor body 70 mm + half of the 8 mm centre gap
    center_above_face = m['bracket']['gearbox_center_above_mount_face']  # 18.4
    off = m['motor']['shaft_offset']  # 7.0
    radius = m['wheel']['outer_diameter'] / 2
    thick = KIT['deck']['thickness_mm']
    shaft_tip = face + 22.0
    hub_face = shaft_tip  # flange's outer face flush with the shaft tip; collar points inboard
    wheel_center = hub_face + (m['wheel']['x_range'][1] - 0)  # flat face (x = +5) on the flange
    caster_h = m['caster']['height']
    spacer = KIT['caster']['selected_spacer_mm']
    kit_deck_top = d['wheel_radius_mm'] - KIT['bracket']['shaft_center_above_mount_face_mm']
    configs = []
    for cid, label, shaft_dir, deck_top, caster_mode in [
        ('kit-as-drawn', 'Kit as drawn: deck top 21.6 mm, shaft up', +1, kit_deck_top, 'under-deck-kit'),
        ('shaft-up', 'Shaft up: deck top 14.6 mm, casters through the deck', +1, radius - center_above_face - off, 'through-deck'),
        ('shaft-down', 'Shaft down: deck top 28.6 mm, printed caster risers', -1, radius - center_above_face + off, 'under-deck-riser'),
    ]:
        gearbox_center = deck_top + center_above_face
        axle = gearbox_center + shaft_dir * off
        if caster_mode == 'under-deck-kit':
            ball = deck_top - thick - spacer - caster_h
            riser = 0.0
        elif caster_mode == 'through-deck':
            ball = deck_top - caster_h  # caster flange on the deck top, ball through a hole
            riser = 0.0
        else:
            riser = round(deck_top - thick - spacer - caster_h, 2)
            ball = deck_top - thick - spacer - riser - caster_h
        wheel_bottom = axle - radius
        configs.append({'id': cid, 'label': label, 'shaft_direction': 'up' if shaft_dir > 0 else 'down',
                        'deck_top_mm': r2(deck_top), 'gearbox_center_height_mm': r2(gearbox_center), 'axle_height_mm': r2(axle),
                        'wheel_bottom_mm': r2(wheel_bottom), 'caster_ball_bottom_mm': r2(ball), 'caster_mode': caster_mode,
                        'caster_riser_mm': riser, 'caster_spacer_mm': spacer if caster_mode != 'through-deck' else 0.0,
                        'wheel_lift_above_casters_mm': r2(wheel_bottom - ball)})
    return {
        'lateral_stack_mm': {'gearbox_face': face, 'bracket_outer_face': face + 6.5, 'shaft_tip': shaft_tip,
                             'hub_collar_inner_end': r2(hub_face - np.ptp(m['hub']['z_range'])), 'hub_flange_face': hub_face,
                             'wheel_center': r2(wheel_center), 'track': r2(2 * wheel_center),
                             'overall_width': r2(2 * wheel_center + 10)},
        'kit_nominal_mm': {'wheel_center': d['wheel_center_y_mm'], 'track': 2 * d['wheel_center_y_mm'],
                           'deck_top': round(kit_deck_top, 2), 'drill_template_motor_hole_lateral': face,
                           'bracket_tapped_hole_lateral_from_cad': r2(face + m['bracket']['tapped_hole_depth_from_motor_side_face'])},
        'configurations': configs,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'parts').mkdir(exist_ok=True)
    meshes, parts = {}, []
    for p in PARTS:
        src = ROOT / p['step']
        glb = OUT / 'parts' / f"{p['id']}.glb"
        cascadio.step_to_glb(str(src), str(glb), tol_linear=p['tol'], tol_angular=0.5)
        scene, mesh = mesh_mm(glb)
        meshes[p['id']] = mesh
        parts.append({**{k: p[k] for k in ('id', 'sku', 'name', 'step')}, 'note': p.get('note'),
                      'step_sha256': sha256(src), 'glb': f"parts/{p['id']}.glb", 'glb_sha256': sha256(glb),
                      'triangles': int(sum(len(g.faces) for g in scene.geometry.values())),
                      'sub_meshes': len(scene.geometry), 'size_mm': [r2(x) for x in mesh.extents],
                      'tessellation_tolerance_mm': p['tol'], 'provenance': 'vendor CAD (Pololu STEP)'})
    m = measure(meshes)
    report = {'schema': 'robot-studio-v7-assembly/1',
              'status': 'agent-run CAD measurement; no physical parts measured',
              'environment': {'cascadio': md.version('cascadio'), 'trimesh': md.version('trimesh'), 'numpy': np.__version__},
              'measurements': m, 'assembly': assemblies(m)}
    (OUT / 'parts.json').write_text(json.dumps({'schema': 'robot-studio-v7-parts/1', 'parts': parts}, indent=1) + '\n')
    (OUT / 'assembly.json').write_text(json.dumps(report, indent=1) + '\n')
    a = report['assembly']
    print(json.dumps({'shaft_offset_mm': m['motor']['shaft_offset'],
                      'gearbox_center_above_mount_face_mm': m['bracket']['gearbox_center_above_mount_face'],
                      'slot_perpendicular_to_mount_face': m['bracket']['slot_runs_perpendicular_to_mount_face'],
                      'track_mm': a['lateral_stack_mm']['track'],
                      'configs': {c['id']: c['wheel_lift_above_casters_mm'] for c in a['configurations']}}, indent=1))


if __name__ == '__main__':
    main()
