"""Synthetic/source-CAD tests for v13; no received-part measurements."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

import cadquery as cq

ROOT=Path(__file__).resolve().parents[2]


def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


BUILD=load("build_cad_v13",ROOT/"tools/build-cad-v13.py")
FIT=load("check_fit_v13",ROOT/"tools/check-fit-v13.py")
MECH=load("mechanism_v13",ROOT/"cad-v13/parts/mechanism.py")
HARDWARE=load("hardware_v13",ROOT/"cad-v13/parts/hardware.py")


class CadV13Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads((ROOT/"derived/cad-v13/manifest.json").read_text())
        cls.assets={a["id"]:a for a in cls.manifest["assets"]}
        cls.spec=json.loads((ROOT/"derived/cad-v13/assembly-spec.json").read_text())
        cls.vendor=json.loads((ROOT/"derived/cad-v13/assembly-vendor-22mm.json").read_text())

    def test_evidence_and_bom_coverage(self):
        evidence,sources,_=BUILD.load_evidence()
        self.assertEqual(len(evidence["parts"]),6)
        self.assertEqual({p["sku"] for p in evidence["parts"]},{"4754","1995","1083","1430","953","1962"})
        for source in sources.values(): self.assertEqual(BUILD.digest(ROOT/source["path"]),source["sha256"])

    def test_vendor_solids_and_native_extents(self):
        expected={"motor":(92.1,16),"bracket":(6.5,1),"hub":(9.2,1),"wheel":(80,2),"caster":(13.52,2)}
        for part_id,(extent,submeshes) in expected.items():
            asset=self.assets[part_id]
            shape=cq.importers.importStep(str(ROOT/asset["sourceStep"])).val()
            self.assertTrue(shape.isValid()); self.assertGreater(shape.Volume(),0)
            self.assertEqual(asset["subMeshes"],submeshes)
            if part_id=="wheel":
                b=asset["boundsMm"]; self.assertAlmostEqual(b[4]-b[1],80,places=1)
                self.assertAlmostEqual(b[3]-b[0],11.75,places=1)
            elif part_id in ("bracket","hub"):
                self.assertAlmostEqual(asset["boundsMm"][5]-asset["boundsMm"][2],extent,places=1)
            elif part_id=="caster":
                self.assertAlmostEqual(asset["boundsMm"][5]-asset["boundsMm"][2],extent,places=1)
            else:
                self.assertAlmostEqual(max(asset["boundsMm"][i+3]-asset["boundsMm"][i] for i in range(3)),extent,places=1)

    def test_shaft_variants_are_distinct_and_unscaled(self):
        shaft=cq.importers.importStep(str(ROOT/"derived/cad-v13/parts/motor-shaft-16mm.step")).val()
        self.assertTrue(shaft.isValid()); self.assertAlmostEqual(shaft.BoundingBox().zlen,16,places=5)
        self.assertAlmostEqual(self.assets["motor-16mm"]["boundsMm"][5],35.92,places=2)
        self.assertAlmostEqual(self.assets["motor"]["boundsMm"][5],41.92,places=1)
        self.assertNotEqual(self.spec["assemblyHash"],self.vendor["assemblyHash"])
        self.assertEqual(self.spec["physics"]["trackMm"],190)
        self.assertEqual(self.vendor["physics"]["trackMm"],202)
        for instance in self.spec["instances"]: self.assertEqual(instance["scale"],[1,1,1])

    def test_custom_geometry_and_invalid_inputs(self):
        solid=MECH.build_mechanism({"id":"gate","sizeMm":[8,46,126]}).val()
        self.assertTrue(solid.isValid()); self.assertEqual(solid.BoundingBox().xlen,8)
        with self.assertRaises(ValueError): MECH.build_mechanism({"id":"bad","sizeMm":[8,0,126]})
        screw=HARDWARE.build_standard_fastener({"majorDiameterMm":2.845,"lengthMm":12.7}).val()
        self.assertTrue(screw.isValid()); self.assertAlmostEqual(screw.BoundingBox().zmin,-12.7)
        with self.assertRaises(ValueError): HARDWARE.build_standard_fastener({"majorDiameterMm":-2,"lengthMm":12.7})

    def test_gate_travel_and_negative_fixture(self):
        result=FIT.evaluate_gate_travel(self.spec,samples=21)
        self.assertEqual(result["status"],"pass",result)
        bad=copy.deepcopy(self.spec)
        next(i for i in bad["instances"] if i["id"]=="gate")["positionMm"][0]=228
        collision=FIT.evaluate_gate_travel(bad,samples=21)
        self.assertEqual(collision["status"],"fail"); self.assertIsNotNone(collision["firstFailure"])
        with self.assertRaises(ValueError): FIT.evaluate_gate_travel(self.spec,samples=1)

    def test_analytic_failures_and_conflict_remain_visible(self):
        results=FIT.analytic_results(self.spec)
        self.assertEqual(next(r for r in results if r["id"]=="motor-body-gap")["status"],"fail")
        self.assertEqual(next(r for r in results if r["id"]=="motor-shaft-source-length")["status"],"conflict")
        bad=copy.deepcopy(self.spec)
        next(i for i in bad["interfaces"] if i["id"]=="hub-span")["measuredValueMm"]=4
        self.assertEqual(next(r for r in FIT.analytic_results(bad) if r["id"]=="hub-span")["status"],"fail")


if __name__=="__main__": unittest.main()
