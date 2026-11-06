#!/usr/bin/env python3
"""Build source-evidenced v13 parts and datum-driven assembly studies.

Run with CadQuery 2.8.0, cascadio 0.1.1 and trimesh 5.2.0. No proprietary CAD
application, network access, purchased-part scaling or historical-output edits.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import re

import cadquery as cq
import cascadio
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "derived" / "cad-v13"
PARTS_OUT = OUT / "parts"


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")


def load_module(name):
    path = ROOT / "cad-v13" / "parts" / (name + ".py")
    spec = importlib.util.spec_from_file_location("cad_v13_" + name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_evidence(bom_path=ROOT / "cad-v13/bom-evidence.json",
                  procurement_path=ROOT / "order-a-procurement-v4.json"):
    evidence = json.loads(Path(bom_path).read_text())
    procurement = json.loads(Path(procurement_path).read_text())
    bom = {p["id"]: p for p in procurement["bom"]}
    required = {"A-MOTOR", "A-BRACKET", "A-HUB", "A-WHEEL", "A-CASTER", "A-WHEEL-SCREWS"}
    if not required.issubset(bom):
        raise ValueError("Selected procurement baseline is incomplete")
    sources = {s["id"]: s for s in evidence["sources"]}
    for source in sources.values():
        path = ROOT / source["path"]
        if not path.is_file() or digest(path) != source["sha256"]:
            raise ValueError(f"Missing or stale source evidence: {source['id']}")
    if {p["bomId"] for p in evidence["parts"]} != required:
        raise ValueError("Evidence must cover exactly the selected purchased-part lines")
    for part in evidence["parts"]:
        if part["bomId"] not in bom or str(bom[part["bomId"]]["sku"]) != part["sku"]:
            raise ValueError(f"BOM/SKU mismatch: {part['id']}")
        for source_id in part["sourceIds"]:
            if source_id not in sources:
                raise ValueError(f"Unknown source {source_id}")
    return evidence, sources, procurement


def bounds_mm(shape):
    b = shape.BoundingBox()
    return [b.xmin, b.ymin, b.zmin, b.xmax, b.ymax, b.zmax]


def normalize_step_timestamp(path):
    text = path.read_text()
    text, count = re.subn(r"(FILE_NAME\('[^']*',')[^']*(')",
                          r"\g<1>2026-11-05T00:00:00\g<2>", text, count=1)
    if count != 1:
        raise ValueError(f"STEP timestamp normalization failed: {path}")
    path.write_text(text)


def export_solid(asset_id, solid, geometry_mode, qualification):
    if not solid.val().isValid() or solid.val().Volume() <= 0:
        raise ValueError(f"Invalid generated solid: {asset_id}")
    step, stl, glb = [PARTS_OUT / (asset_id + ext) for ext in (".step", ".stl", ".glb")]
    cq.exporters.export(solid, str(step), exportType="STEP")
    normalize_step_timestamp(step)
    cq.exporters.export(solid, str(stl), exportType="STL", tolerance=0.02, angularTolerance=0.1)
    cascadio.step_to_glb(str(step), str(glb), tol_linear=0.02, tol_angular=0.5)
    return {"id":asset_id,"geometryMode":geometry_mode,"qualification":qualification,
            "step":step.name,"stepSha256":digest(step),"stl":stl.name,"stlSha256":digest(stl),
            "glb":glb.name,"glbSha256":digest(glb),"boundsMm":bounds_mm(solid.val()),
            "volumeMm3":solid.val().Volume()}


def convert_vendor_part(part, sources):
    source = sources[part["stepSourceId"]]
    step = ROOT / source["path"]
    shape = cq.importers.importStep(str(step)).val()
    if not shape.isValid() or shape.Volume() <= 0:
        raise ValueError(f"Invalid vendor STEP: {part['id']}")
    glb, stl = PARTS_OUT / (part["id"] + ".glb"), PARTS_OUT / (part["id"] + ".stl")
    cascadio.step_to_glb(str(step), str(glb), tol_linear=0.01, tol_angular=0.5)
    cq.exporters.export(cq.Workplane(obj=shape), str(stl), exportType="STL",
                        tolerance=0.02, angularTolerance=0.1)
    scene = trimesh.load(glb)
    if not scene.geometry:
        raise ValueError(f"Empty converted scene: {part['id']}")
    return {"id":part["id"],"geometryMode":"vendor-step","qualification":"unscaled manufacturer reference CAD",
            "sourceStep":source["path"],"sourceStepSha256":source["sha256"],
            "glb":glb.name,"glbSha256":digest(glb),"stl":stl.name,"stlSha256":digest(stl),
            "boundsMm":bounds_mm(shape),"volumeMm3":shape.Volume(),"subMeshes":len(scene.geometry),
            "triangles":int(sum(len(g.faces) for g in scene.geometry.values()))}, shape

def _bom_shaft_solid(length_mm=16):
    shaft = cq.Workplane("XY").circle(3).extrude(length_mm)
    cutter = cq.Workplane("XY", origin=(0, 7.4, -1)).box(20, 10, length_mm + 2)
    return shaft.cut(cutter)


def derive_bom_motor(source_asset, source_glb, shaft_length_mm=16):
    """Replace only the isolated shaft region; retain detailed vendor body meshes."""
    if shaft_length_mm != 16:
        raise ValueError("Only the documented 16 mm BOM-nominal derivative is supported")
    axis_x, axis_y, face_z, old_tip = 0.01993, -0.007, 0.01992, 0.04192
    scene = trimesh.load(source_glb)
    removed = 0
    for mesh in scene.geometry.values():
        v = np.asarray(mesh.vertices)
        radial = np.hypot(v[:, 0] - axis_x, v[:, 1] - axis_y)
        zone = (v[:, 2] >= face_z - 1e-7) & (radial <= 0.00306)
        remove = np.all(zone[mesh.faces], axis=1)
        removed += int(np.count_nonzero(remove))
        mesh.update_faces(~remove)
        mesh.remove_unreferenced_vertices()
        mesh.process(validate=True)
    if removed < 20:
        raise ValueError("Motor shaft isolation was ambiguous; refusing arbitrary body edits")
    shaft = _bom_shaft_solid(shaft_length_mm)
    shaft_step = PARTS_OUT / "motor-shaft-16mm.step"
    shaft_stl = PARTS_OUT / "motor-shaft-16mm.stl"
    cq.exporters.export(shaft, str(shaft_step), exportType="STEP")
    normalize_step_timestamp(shaft_step)
    cq.exporters.export(shaft, str(shaft_stl), exportType="STL", tolerance=0.01, angularTolerance=0.1)
    shaft_mesh = trimesh.load(shaft_stl, force="mesh")
    shaft_mesh.apply_scale(0.001)
    shaft_mesh.apply_translation((axis_x, axis_y, face_z))
    shaft_mesh.visual = trimesh.visual.TextureVisuals(
        material=trimesh.visual.material.PBRMaterial(
            baseColorFactor=[0.72,0.73,0.70,1.0],metallicFactor=0.9,roughnessFactor=0.3))
    scene.add_geometry(shaft_mesh,geom_name="bom-nominal-16mm-d-shaft",
                       node_name="bom-nominal-16mm-d-shaft")
    glb = PARTS_OUT / "motor-16mm.glb"
    glb.write_bytes(scene.export(file_type="glb"))
    bounds = list(source_asset["boundsMm"])
    bounds[5] = round(face_z * 1000 + shaft_length_mm,3)
    return {"id":"motor-16mm","geometryMode":"bom-nominal-derived",
            "qualification":"detailed vendor body plus replacement 16 mm D-shaft; not unmodified vendor CAD",
            "derivativeOf":"motor","removedSourceShaftTriangles":removed,
            "glb":glb.name,"glbSha256":digest(glb),
            "shaftStep":shaft_step.name,"shaftStepSha256":digest(shaft_step),
            "shaftStl":shaft_stl.name,"shaftStlSha256":digest(shaft_stl),
            "shaftBoundsMm":[0,0,0,6,6,shaft_length_mm],"boundsMm":bounds,
            "shaftDatum":{"axisXmm":axis_x*1000,"axisYmm":axis_y*1000,
                          "gearboxFaceZmm":face_z*1000,"oldTipZmm":old_tip*1000}}

def make_instance(instance_id,part_id,asset_id,position,rotation=None,motion="fixed",basis="source-evidenced placement"):
    return {"id":instance_id,"partId":part_id,"assetId":asset_id,"componentIds":["geometry"],
            "parentId":None,"positionMm":[round(float(v),6) for v in position],
            "rotationDeg":rotation or [0,0,0],"scale":[1,1,1],"motionGroup":motion,"basis":basis}


def resolve_layout(evidence,layout,shaft_length_mm):
    """Resolve one complete assembly in the robot render frame, in millimetres."""
    if shaft_length_mm not in (16,22):
        raise ValueError("Unsupported documented shaft variant")
    cfg=layout["layout"]; face=cfg["gearboxFaceMm"]
    flange=face+shaft_length_mm; wheel_center=flange+5
    variant="bom-nominal-16mm" if shaft_length_mm==16 else "vendor-cad-22mm"
    motor_asset="motor-16mm" if shaft_length_mm==16 else "motor"
    instances=[make_instance("deck","deck","deck",[0,cfg["deckBottomMm"],0],[-90,0,0],basis="project-custom v10 deck")]
    for side,sign in (("right",1),("left",-1)):
        rotation=[0,0 if sign==1 else 180,0]
        instances.append(make_instance(f"{side}-motor","motor",motor_asset,
            [-sign*19.93,54,sign*54.08],rotation,basis=f"{variant}; vendor body datum"))
        instances.append(make_instance(f"{side}-bracket","bracket","bracket",
            [-sign*3.25,47,sign*95.65],rotation,basis="vendor bracket mounting-face datum"))
        motion=f"{side}-wheel"
        if sign==1:
            hub_position,hub_rotation=[0,40,flange-2.5],[180,0,0]; wheel_rotation=[0,-90,0]
        else:
            hub_position,hub_rotation=[0,40,-flange+2.5],[0,0,180]; wheel_rotation=[0,90,0]
        instances.append(make_instance(f"{side}-hub","hub","hub",hub_position,hub_rotation,motion,
            "hub flange seated at selected shaft tip; received-part fit unmeasured"))
        instances.append(make_instance(f"{side}-wheel","wheel","wheel",[0,40,sign*wheel_center],wheel_rotation,
            motion,"native vendor wheel geometry; catalogue width does not rescale CAD"))
        for index,(x,y) in enumerate(((.899,9.006),(9.148,4.244),(9.148,-5.281),
                                      (.899,-10.044),(-7.35,-5.281),(-7.35,4.244))):
            instances.append(make_instance(f"{side}-wheel-screw-{index+1}","wheel-screw","wheel-screw",
                [sign*x,40-y,sign*(flange+1)],[0,0 if sign==1 else 180,0],motion,
                "nominal #4-40 screw in hub-pattern display; axial seating unverified"))
    for x in cfg["casterPositionsXmm"]:
        instances.append(make_instance(f"caster-{x}","caster","caster",[x,2.1,0],[-90,0,-90],
            basis="vendor caster; ball bottom at floor datum"))
        instances.append(make_instance(f"caster-spacer-{x}","caster-spacer","caster-spacer",
            [x,13.52+cfg["casterSpacerMm"]/2,0],[-90,0,0],basis="selected 1/8 inch spacer envelope"))
        instances.append(make_instance(f"riser-{x}","riser","riser",
            [x,cfg["deckBottomMm"]-cfg["casterRiserMm"],0],[-90,0,0],basis="project-custom riser"))
    for component in layout["mechanism"]:
        instances.append(make_instance(component["id"],component["partId"],component["id"],
            component["positionMm"],[-90,0,0],component["motionGroup"],"proposed custom mechanism; assumed dimensions"))

    custom=[
        {"id":"deck","bomId":"A-FAU-FIXTURE","sku":None,"role":"custom","geometryMode":"cadquery-custom","sourceIds":["mule-geometry"],"omissions":[]},
        {"id":"riser","bomId":"A-FAU-FIXTURE","sku":None,"role":"custom","geometryMode":"cadquery-custom","sourceIds":["mule-geometry"],"omissions":[]},
        {"id":"caster-spacer","bomId":"A-CASTER","sku":"953","role":"custom","geometryMode":"cadquery-custom","sourceIds":["caster-page"],"omissions":["Envelope study; exact spacer holes omitted"]},
        {"id":"lift","bomId":None,"sku":None,"role":"proposed","geometryMode":"cadquery-custom","sourceIds":[],"omissions":["No actuator selected"]},
        {"id":"gate","bomId":None,"sku":None,"role":"proposed","geometryMode":"cadquery-custom","sourceIds":[],"omissions":["No actuator selected"]}]
    parts=evidence["parts"]+custom
    colliders=[{"id":m["id"],"shape":"cuboid","halfExtentsMm":[v/2 for v in m["sizeMm"]],
                "positionMm":m["positionMm"],"motionGroup":m["motionGroup"]} for m in layout["mechanism"]
               if m["motionGroup"] in ("lift","gate")]
    spec={"schema":"assembly-spec-v13/1","id":f"order-a-{variant}-v13","revision":"v13.0",
          "units":"mm","renderAxes":"X forward, Y up, Z right","partFrames":"vendor-native or documented CadQuery local",
          "parts":parts,"instances":instances,
          "joints":[
            {"id":"lift-carriage","parentInstanceId":"deck","childInstanceId":"tray-back","kind":"prismatic",
             "axis":[0,1,0],"home":150,"limits":[0,150],"units":"mm","collisionPolicy":"ideal position actuation"},
            {"id":"gate-slide","parentInstanceId":"tray-back","childInstanceId":"gate","kind":"prismatic",
             "axis":[1,0,0],"home":0,"limits":[0,1],"travelMm":cfg["gateTravelMm"],
             "speedMmPerS":cfg["gateSpeedMmPerS"],"collisionPolicy":"continuous collidable travel"}],
          "interfaces":[
            {"id":"shaft-bore","kind":"shaft-bore","variant":variant,"measuredValueMm":6,"requiredValueMm":6,"evidenceIds":["motor-page","hub-step"]},
            {"id":"hub-span","kind":"engagement","variant":variant,"measuredValueMm":9.2,"requiredValueMm":9.2,"evidenceIds":["hub-step"]},
            {"id":"motor-body-gap","kind":"clearance","variant":variant,"measuredValueMm":cfg["motorBodyGapMm"],"requiredValueMm":cfg["motorBodyGapMinimumMm"],"evidenceIds":["mule-geometry"]},
            {"id":"wheel-diameter","kind":"clearance","variant":variant,"measuredValueMm":80,"requiredValueMm":80,"evidenceIds":["wheel-page","wheel-step"]}],
          "exclusions":[{"instanceA":"fork-right","instanceB":"tray-back","reason":"joined custom tray"},
                        {"instanceA":"fork-left","instanceB":"tray-back","reason":"joined custom tray"},
                        {"instanceA":"tray-side-right","instanceB":"tray-back","reason":"joined custom tray"},
                        {"instanceA":"tray-side-left","instanceB":"tray-back","reason":"joined custom tray"}],
          "colliders":colliders,
          "physics":{"trackMm":wheel_center*2,"overallWidthMm":(wheel_center+6.75)*2,
                     "chassisHalfExtentsMm":[95,25,wheel_center+6.75],"chassisPositionMm":[0,40,0],
                     "gateTravelMm":cfg["gateTravelMm"],"gateSpeedMmPerS":cfg["gateSpeedMmPerS"]},
          "sourceIds":[s["id"] for s in evidence["sources"]],"qualification":layout["qualification"]}
    identity=json.dumps({"parts":parts,"instances":instances,"joints":spec["joints"]},sort_keys=True,separators=(",",":"))
    spec["assemblyHash"]=hashlib.sha256(identity.encode()).hexdigest()
    return spec

def main():
    OUT.mkdir(parents=True,exist_ok=True); PARTS_OUT.mkdir(parents=True,exist_ok=True)
    evidence,sources,procurement=load_evidence()
    layout=json.loads((ROOT/"cad-v13/assembly-layout.json").read_text())
    geometry=json.loads((ROOT/layout["sourceGeometry"]).read_text())
    structure,mechanism,hardware=map(load_module,("structure","mechanism","hardware"))
    assets=[]; vendor_shapes={}
    for part in evidence["parts"]:
        if part["geometryMode"]=="vendor-step":
            asset,shape=convert_vendor_part(part,sources)
            assets.append(asset); vendor_shapes[part["id"]]=shape
    motor_asset=next(a for a in assets if a["id"]=="motor")
    assets.append(derive_bom_motor(motor_asset,PARTS_OUT/motor_asset["glb"]))
    deck_spec={"length_mm":geometry["deck"]["length_mm"],"width_mm":geometry["deck"]["width_mm"],
               "thickness_mm":geometry["deck"]["thickness_mm"],"corner_radius_mm":geometry["deck"]["corner_radius_mm"],
               "holes":[{"x_mm":h["x"],"y_mm":h["y"],"diameter_mm":h["diameter"]}
                        for h in geometry["holes"]["motor"]+geometry["holes"]["caster"]]}
    assets.append(export_solid("deck",structure.build_deck(deck_spec),"cadquery-custom","project-custom deck; no fabrication release"))
    riser_spec={"length_mm":24,"width_mm":24,"height_mm":geometry["riser"]["exact_mm"],
                "hole_pitch_mm":geometry["riser"]["hole_spacing_mm"],"hole_diameter_mm":geometry["riser"]["hole_diameter_mm"]}
    assets.append(export_solid("riser",structure.build_riser(riser_spec),"cadquery-custom","project-custom riser; received-part adjustment required"))
    spacer_spec={"id":"caster-spacer","sizeMm":[20.32,layout["layout"]["casterSpacerMm"],15.24]}
    assets.append(export_solid("caster-spacer",mechanism.build_mechanism(spacer_spec),"cadquery-custom","selected spacer envelope; holes omitted"))
    for component in layout["mechanism"]:
        assets.append(export_solid(component["id"],mechanism.build_mechanism(component),"cadquery-custom","proposed mechanism; assumed dimensions"))
    screw_part=next(p for p in evidence["parts"] if p["id"]=="wheel-screw")
    screw_spec={**screw_part["expected"],"headDiameterMm":5.5,"headHeightMm":2.2}
    assets.append(export_solid("wheel-screw",hardware.build_standard_fastener(screw_spec),"standard-nominal",
        "documented #4-40 diameter/length; simplified head, drive and smooth thread"))
    nominal=resolve_layout(evidence,layout,16); vendor=resolve_layout(evidence,layout,22)
    write_json(OUT/"assembly-spec.json",nominal); write_json(OUT/"assembly-vendor-22mm.json",vendor)
    inputs=[ROOT/"cad-v13/bom-evidence.json",ROOT/"cad-v13/assembly-layout.json",Path(__file__).resolve(),
            ROOT/"cad-v13/parts/structure.py",ROOT/"cad-v13/parts/mechanism.py",ROOT/"cad-v13/parts/hardware.py",
            ROOT/"order-a-procurement-v4.json",ROOT/layout["sourceGeometry"]]
    inputs += [ROOT/s["path"] for s in evidence["sources"]]
    manifest={"schema":"editable-cad-v13/1","units":"mm","cadquery":cq.__version__,
              "status":"source-evidenced purchased geometry, explicit shaft conflict and proposed custom mechanism; no physical validation",
              "defaultAssembly":"assembly-spec.json","vendorComparisonAssembly":"assembly-vendor-22mm.json",
              "assemblyHashes":{"bom-nominal-16mm":nominal["assemblyHash"],"vendor-cad-22mm":vendor["assemblyHash"]},
              "sources":evidence["sources"],"assets":assets,
              "coverage":[{"bomId":p["bomId"],"sku":p["sku"],"geometryMode":p["geometryMode"],
                           "installedQuantity":p["installedQuantity"],"omissions":p["omissions"]} for p in evidence["parts"]],
              "inputHashes":{str(p.relative_to(ROOT)):digest(p) for p in inputs}}
    write_json(OUT/"manifest.json",manifest)
    print(json.dumps({"assets":len(assets),"instances":len(nominal["instances"]),
                      "defaultShaftMm":16,"comparisonShaftMm":22,
                      "nominalTrackMm":nominal["physics"]["trackMm"],"vendorTrackMm":vendor["physics"]["trackMm"]}))


if __name__=="__main__":
    main()

