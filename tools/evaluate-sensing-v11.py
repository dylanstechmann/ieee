"""Characterize the sensed game-element models (AprilTag pit box, start flag, checkered lap line).

Agent-run synthetic study. The tag and flag poses are documented assumptions (QA02, QA08); the checkered
openings come from the organizer CAD. Reports the camera read envelope and the lap-line detector so the
sensed full mission is grounded in measured model behaviour — without editing any pinned v10 file.

Usage: python -I tools/evaluate-sensing-v11.py
"""
import hashlib
import json
import math
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar.field import Field  # noqa: E402
from stockcar.sensors_camera import CameraModel, StartFlagModel, LapLineDetector, TAG_POSE, FLAG_POSE  # noqa: E402

OUT = ROOT / "derived" / "sensing-v11"
DATE = "2026-11-06"
INPUTS = ["tools/evaluate-sensing-v11.py", "software/stockcar/sensors_camera.py",
          "software/stockcar/field.py", "software/stockcar/geometry.py",
          "derived/organizer-cad-v10/field-v10.json"]


def frange(a, b, step):
    out = []
    x = a
    while x <= b + 1e-9:
        out.append(x)
        x += step
    return out


def visibility_sweep(field):
    cam = CameraModel(1)
    flag = StartFlagModel()
    x0, y0, x1, y1 = field.walls
    xs = frange(x0 + 1.0, x1 - 1.0, 3.0)
    ys = frange(y0 + 1.0, y1 - 1.0, 3.0)
    headings = [k * (2 * math.pi / 12) for k in range(12)]
    samples = len(xs) * len(ys) * len(headings)
    tag_reads = flag_view = 0
    tag_ranges = []
    for x in xs:
        for y in ys:
            for th in headings:
                tid, r, _ = cam.read((x, y, th))
                if tid is not None:
                    tag_reads += 1
                    tag_ranges.append(r)
                if flag.read((x, y, th), True)[0]:
                    flag_view += 1
    return {
        "samples": samples,
        "tag_reads": tag_reads,
        "tag_read_fraction": round(tag_reads / samples, 6),
        "tag_range_in": None if not tag_ranges else {
            "min": round(min(tag_ranges), 2), "max": round(max(tag_ranges), 2),
            "mean": round(statistics.mean(tag_ranges), 2)},
        "flag_views": flag_view,
        "flag_view_fraction": round(flag_view / samples, 6),
    }


def lap_line_test(field):
    det = LapLineDetector(field)
    c = field.data["features"]["checker_band"]
    x0, x1 = c["x"]
    gap_mid = (c["low_y"][1] + c["high_y"][0]) / 2
    bands = {"low": c["low_y"], "high": c["high_y"], "gap": (gap_mid, gap_mid)}
    crosses = {}
    for name, band in bands.items():
        det.last = None
        hits = 0
        prev = None
        for x in frange(x0 - 8.0, x1 + 8.0, 0.5):
            pose = (x, (band[0] + band[1]) / 2, 0.0)
            if prev is not None and det.detect(pose, prev):
                hits += 1
            prev = pose
        crosses[name] = hits
    return crosses


def main():
    field = Field()
    vis = visibility_sweep(field)
    line = lap_line_test(field)
    report = {"version": "0.11.0", "date": DATE,
              "status": "agent-run synthetic study; tag/flag poses are assumptions (QA02/QA08)",
              "tag_pose_in": list(TAG_POSE), "flag_pose_in": list(FLAG_POSE),
              "visibility": vis, "lap_line": line}
    lines = [
        "# Sensing v11: sensed game-element models",
        "",
        f"{DATE}. Agent-run synthetic study. The pit-box AprilTag and start flag are read through cone/range camera models; the lap-line detector runs on the organizer CAD's checkered openings.",
        "",
        f"- Tag pose {TAG_POSE}, flag pose {FLAG_POSE} — assumed until a built field is measured and QA02/QA08 are answered.",
        f"- {vis['samples']} sampled poses over the field interior: tag read in {vis['tag_reads']} ({vis['tag_read_fraction']:.2%}), flag visible in {vis['flag_views']} ({vis['flag_view_fraction']:.2%}).",
        f"- Tag read range {vis['tag_range_in']['min']}–{vis['tag_range_in']['max']} in (mean {vis['tag_range_in']['mean']}).",
        f"- Lap-line rising edges: low opening {line['low']}, high opening {line['high']}, divider gap {line['gap']} (expected 1 / 1 / 0).",
        "",
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    files = {"report.json": json.dumps(report, indent=1) + "\n", "summary.md": "\n".join(lines)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": report["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {vis['samples']} visibility samples, lap-line {line}")


if __name__ == "__main__":
    main()