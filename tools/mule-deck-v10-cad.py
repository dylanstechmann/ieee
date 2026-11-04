"""Build STEP and STL files for the v10 mule deck and one caster riser from geometry.json.

Agent-run CAD (CadQuery 2.8.0) for the owner's hobby/learning project: a proposal, not a
fabrication release. STEP header timestamps are normalized so rebuilds compare byte for byte.

Usage: python mule-deck-v10-cad.py GEOMETRY_JSON OUT_DIR
"""
import json
import pathlib
import re
import sys

import cadquery as cq

FIXED_TIMESTAMP = "2026-11-03T00:00:00"


def deck(geometry):
    d = geometry["deck"]
    wp = cq.Workplane("XY").box(d["length_mm"], d["width_mm"], d["thickness_mm"], centered=(True, True, False))
    wp = wp.edges("|Z").fillet(d["corner_radius_mm"])
    for group in ("motor", "caster"):
        holes = geometry["holes"][group]
        wp = (wp.faces(">Z").workplane(origin=(0, 0, d["thickness_mm"]))
              .pushPoints([(h["x"], h["y"]) for h in holes]).hole(holes[0]["diameter"]))
    return wp


def riser(geometry):
    r = geometry["riser"]
    fx, fy = r["footprint_mm"]
    half = r["hole_spacing_mm"] / 2
    wp = cq.Workplane("XY").box(fx, fy, r["height_mm"], centered=(True, True, False))
    return (wp.faces(">Z").workplane(origin=(0, 0, r["height_mm"]))
            .pushPoints([(0, -half), (0, half)]).hole(r["hole_diameter_mm"]))


def normalize_step(path):
    text = path.read_text()
    text, count = re.subn(r"(FILE_NAME\('[^']*',')[^']*(')", r"\g<1>" + FIXED_TIMESTAMP + r"\g<2>", text, count=1)
    if count != 1:
        raise SystemExit(f"could not normalize the STEP header in {path}")
    path.write_text(text)


def main():
    geometry = json.loads(pathlib.Path(sys.argv[1]).read_text())
    out = pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for name, wp in (("mule-deck-v10", deck(geometry)), ("caster-riser-v10", riser(geometry))):
        step = out / f"{name}.step"
        cq.exporters.export(wp, str(step), exportType="STEP")
        normalize_step(step)
        cq.exporters.export(wp, str(out / f"{name}.stl"), exportType="STL", tolerance=0.02, angularTolerance=0.1)
        print(f"{name}: volume {wp.val().Volume():.3f} mm^3")


if __name__ == "__main__":
    main()
