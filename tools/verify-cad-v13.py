#!/usr/bin/env python3
"""Read-only v13 source, asset and fit verification; never rebuilds artifacts."""
from pathlib import Path
import hashlib
import importlib.util
import json

import cadquery as cq

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"derived"/"cad-v13"


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_fit():
    spec=importlib.util.spec_from_file_location("check_fit_v13",ROOT/"tools/check-fit-v13.py")
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module


def main():
    manifest=json.loads((OUT/"manifest.json").read_text())
    for relative,expected in manifest["inputHashes"].items():
        path=ROOT/relative
        if not path.is_file() or sha(path)!=expected: raise ValueError(f"Stale input: {relative}")
    for source in manifest["sources"]:
        if sha(ROOT/source["path"])!=source["sha256"]: raise ValueError(f"Stale source: {source['id']}")
    for asset in manifest["assets"]:
        if sha(OUT/"parts"/asset["glb"])!=asset["glbSha256"]: raise ValueError(f"Stale GLB: {asset['id']}")
        step=asset.get("sourceStep") or ("derived/cad-v13/parts/"+asset["step"] if "step" in asset else None)
        if step and not cq.importers.importStep(str(ROOT/step)).val().isValid(): raise ValueError(f"Invalid solid: {asset['id']}")
    fit=load_fit(); expected=[]
    for name in ("assembly-spec.json","assembly-vendor-22mm.json"):
        spec=json.loads((OUT/name).read_text()); expected.extend(fit.analytic_results(spec)); expected.append(fit.evaluate_gate_travel(spec))
    recorded=json.loads((OUT/"fit-results.json").read_text())["results"]
    normalize=lambda rows:[(r["id"],r["variant"],r["status"]) for r in rows]
    if normalize(expected)!=normalize(recorded): raise ValueError("Fit report is stale or inconsistent")
    print(f"Verified {len(manifest['assets'])} assets, {len(manifest['sources'])} sources and 2 assemblies; fit report fresh")


if __name__=="__main__": main()
