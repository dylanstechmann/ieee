"""Build additive editable exterior/structure studies. Never edits old artifacts.

Run through uv with cadquery==2.8.0. Only registered local generators execute.
"""
import hashlib
import importlib.util
import json
import pathlib
import re

import cadquery as cq

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "derived" / "cad-v11"


def load(name):
    path = ROOT / "cad-v11" / "parts" / (name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    structure, drive = load("structure"), load("drivetrain")
    config_path = ROOT / "cad-v11" / "parts.json"
    config = json.loads(config_path.read_text())
    assets = []
    OUT.mkdir(parents=True, exist_ok=True)
    generators = {"deck": lambda s: {"body": structure.build_deck(s)},
                  "riser": lambda s: {"body": structure.build_riser(s)},
                  **{n: getattr(drive, n) for n in ("motor", "wheel", "hub", "bracket", "caster")}}
    for part in config["parts"]:
        for component, solid in generators[part["generator"]](part["parameters"]).items():
            if not solid.val().isValid() or solid.val().Volume() <= 0:
                raise ValueError(f"Invalid generated solid: {part['id']}/{component}")
            stem = part["id"] + "-" + component
            stl, step = OUT / (stem + ".stl"), OUT / (stem + ".step")
            cq.exporters.export(solid, str(stl), exportType="STL", tolerance=0.05, angularTolerance=0.15)
            cq.exporters.export(solid, str(step), exportType="STEP")
            text = step.read_text()
            text, count = re.subn(r"(FILE_NAME\('[^']*',')[^']*(')", r"\g<1>2026-11-05T00:00:00\g<2>", text, count=1)
            if count != 1:
                raise ValueError("STEP timestamp normalization failed")
            step.write_text(text)
            box = solid.val().BoundingBox()
            assets.append({"id": stem, "partId": part["id"], "component": component,
                           "stl": stl.name, "step": step.name, "sha256": digest(stl),
                           "stepSha256": digest(step), "volumeMm3": solid.val().Volume(),
                           "boundsMm": [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax]})
    inputs = [config_path, pathlib.Path(__file__), ROOT / "cad-v11/parts/structure.py", ROOT / "cad-v11/parts/drivetrain.py"]
    manifest = {"schema": "editable-cad-v11/1", "units": "mm", "cadquery": cq.__version__,
                "status": "proposed structure and approximate purchased-part exteriors; no physical validation",
                "inputHashes": {str(p.relative_to(ROOT)): digest(p) for p in inputs}, "assets": assets}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {len(assets)} valid solids, STEP/STL exports and provenance manifest")


if __name__ == "__main__":
    main()