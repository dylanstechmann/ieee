# AprilTag 41h12 readability check (v7) — October 31, 2026

Agent-run synthetic experiment for the owner's hobby/learning project. It answers three questions behind the team concept table's row "Read April Tag to find pit area":

1. **Which tag family is it, and which libraries read it?**
2. **How far away, and at what angle, can a robot camera still decode it?**
3. **What tag size must pose estimation use?**

No physical camera, printed tag, lamination, lens distortion, motion blur or venue lighting was tested. Treat every range below as an upper bound from an idealized model.

## Run

From `/workspace/ieee/ieee`, using the uv-managed CPython (the container's system `python3` is stripped):

```
uv run --no-project --python 3.12 --with pupil-apriltags==1.0.4.post11 \
    --with opencv-python-headless --with numpy python -I tools/apriltag-41h12-v7.py
node tools/verify-apriltag-41h12-v7.js
```

The script refuses to run if the organizer inputs differ from the archived hashes. It took about one minute here; two runs produced a byte-identical `report.json`. pupil-apriltags 1.0.4.post11 segfaulted in `Detector.__del__`, so the script keeps its detectors alive and exits with `os._exit` after writing its outputs.

## Inputs

- `derived/GM2-V3.1/media/image5.jpg` — the organizer's tag sheet, byte-identical to `word/media/image5.jpg` inside the archived GM2 V3 manual (`sources/organizer-2026-10-29/Game-Manual-2027-2-V3-1.docx`).
- Environment recorded in `report.json`: Python 3.12.16, OpenCV 5.0.0, NumPy 2.5.4, pupil-apriltags 1.0.4.post11 (AprilTag 3 library).

## Findings

**Family and library.** The organizer sheet decodes as `tagStandard41h12` IDs 1, 2 and 3 with zero bit errors. None of the seven other AprilTag 3 families decodes it. OpenCV 5.0.0's ArUco predefined dictionaries include AprilTag 16h5, 25h9, 36h10 and 36h11, but **no 41h12**. `report.json` records the main build; the `opencv-contrib-python-headless` 5.0.0.93 build was checked separately in the same session with the same result. A team using OpenCV's ArUco detector would never see these tags. Use the AprilTag 3 library: C `apriltag`, Python `pupil-apriltags`, or a ROS wrapper configured for `tagStandard41h12`.

**Geometry of a 41h12 tag.** The printed pattern is 9 × 9 cells. The detector's quad is the inner 5-cell square, the inside edge of the black ring; the outer ring carries data bits. On the organizer sheet the detected quad measures 0.5556 of the printed pattern (5/9), for all three tags. `organizer-sheet-detections.png` shows the detected quad in green and the full pattern in magenta.

**Pose needs the 5-cell edge.** Pose estimation with `tag_size` = 5/9 of the printed width matched the true range to within 0.5% at 0.3, 0.6 and 1.0 m. Passing the printed width overestimated range by 1.80×, and the outer black-ring edge by 1.40×. If the organizer's "68mm" label is the full printed width (assumed; measure a real print), `tag_size` = 0.0378 m.

**Range.** Ten seeded renders per cell; "reliable" means 10/10 correct decodes over a contiguous distance run. The values are the last grid distance (m) that met this bar, as `quad_decimate` 1.0 / 2.0. pupil-apriltags defaults to 2.0, which roughly halves the resolution used for quad detection. Distance grid: 0.15–4.0 m in 22 geometric steps, so true limits lie between grid points.

| Camera profile (hypothetical) | 0° | 30° | 45° | 60° |
|---|---:|---:|---:|---:|
| VGA-60 (640×480, 60° HFOV) | 1.83 / 1.56 | 1.83 / 1.56 | 1.56 / 1.15 | 1.34 / 0.98 |
| HD-70 (1280×720, 70° HFOV) | 3.42 / 2.50 | 2.93 / 2.50 | 2.93 / 2.14 | 2.14 / 1.56 |
| FHD-70 (1920×1080, 70° HFOV) | ≥4.00 / ≥4.00 | ≥4.00 / 3.42 | ≥4.00 / 3.42 | 3.42 / 2.50 |
| HD-100 (1280×720, 100° HFOV) | 1.83 / 1.56 | 1.83 / 1.56 | 1.56 / 1.34 | 1.34 / 0.98 |

Across 7,040 detections there were no wrong-ID detections. Decoding succeeded at as little as 1.5 horizontal pixels per cell, and failed with the tag fully in frame at up to 2.36. With a real lens, motion and lighting, plan for **at least 3 px per cell (27 px across the printed tag)**.

**What range is needed.** GM2 V3 fastens the single tag to the wall by the start area. The robot can read it while standing still in the start box, before the flag, at roughly 0.15–0.6 m: well inside every profile above. The Technician may orient the robot anywhere in the 12-in start cube (GM2 G08), so point the camera at the tag at setup. Reading the tag from across the field (≈2.7 m diagonal) is not required.

**Glare is the realistic failure.** GM2 Appendix C recommends laminating the tags. In the crude glare model, a saturated disc covering 5% of the tag cut decoding to 7/24, 10% to 5/24, and 20% or more to 0/24 (HD-70, 0.4 m, 20° yaw). Mitigations:
- Avoid viewing angles that reflect overhead lights into the camera.
- Vote across several frames, and move or rotate slightly if no read arrives.
- Log failures at the venue practice field.

**Defocus at close range** mattered less than glare. At 0.10–0.30 m, Gaussian blur up to σ = 3 px still decoded 10/10. At σ = 5 px, only 1–3 of 10 decoded.

## Outputs

- `report.json`: environment, input hashes, library check, organizer decode with recovered bit patterns, assumptions, 704 aggregated sweep rows, summary, and the pose, glare and defocus checks, plus 8 self-checks (all passed).
- `organizer-sheet-detections.png`: detected 5-cell quads and inferred 9-cell outlines on the organizer sheet.
- `synthetic-examples.png`: six synthetic camera crops (near, angled, range limit, beyond the limit, glare, defocus), each labeled decoded or not.
- `manifest.json`: SHA-256 of inputs, tool and outputs; checked by `tools/verify-apriltag-41h12-v7.js`.

## Not established

- The organizer sheet's physical print scale. "68mm" is the label printed on the sheet; measure the printed pattern and the inner white square on a real print.
- Real camera optics, auto-exposure, motion blur, rolling shutter and processor frame rate.
- Lamination glare under real venue lighting, and the exact tag mounting height and angle (GM2 says only "fastened to the wall by the starting area").
- Whether the official Q&A changes the tag, its position or the die-roll mapping (GM2 Appendix G: 1/4 → box 1, 2/5 → box 2, 3/6 → box 3).
