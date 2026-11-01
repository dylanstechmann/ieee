# Mechanism geometry-prototype kit — October 31, 2026

Agent-generated coupons for E01/E04. **These are low-force geometry tests, not complete grippers, final robot CAD, validated fits or competition-legal mechanisms.** No files have been printed or physically tested.

## Tire geometry baseline

Source: `derived/organizer-cad/Spare Tire v2.stl`, SHA-256 `e04ac6ac4874902f0aa7a4383f738e04d0f0b0b88f553b85f008d66de448e2df`. Inputs: **68.184 mm OD, 40.3 mm nominal bore, 27.6 mm thickness**. The bore is not a certified manufactured minimum. Material, friction, mass, compliance and tolerances remain unmeasured.

## Bore-alignment gauges

Each STL is in millimetres, with a 20 mm stem, 2 mm tip chamfer and 8 mm handle/flange. Clearance below is arithmetic from the nominal bore, **not a fit recommendation**.

| Gauge Ø (mm) | Nominal diametral clearance (mm) | Nominal radial clearance (mm) | STL |
|---:|---:|---:|---|
| 39 | 1.3 | 0.65 | `stl/bore-gauge-39.stl` |
| 39.4 | 0.9 | 0.45 | `stl/bore-gauge-39p4.stl` |
| 39.8 | 0.5 | 0.25 | `stl/bore-gauge-39p8.stl` |

Measure the printed gauge and actual tire. Use gentle hand alignment only; never force a gauge or use it as a capture actuator. Record actual dimensions in the E01 measurement sheet.

## Passive-fork coupon

`stl/passive-fork-coupon.stl`: 4 mm thick, 70 × 90 mm outer bounds. The nominal throat width is **70.184 mm** (1 mm radial clearance per side); mouth width is 76 mm. This coupon tests approach/contact geometry only. It has no proven retention, release, mounting, actuator or structural capacity.

See [coupon-preview.svg](coupon-preview.svg). Use the same E04 pose matrix for every candidate; do not compare this fixed coupon against a differently positioned alternative.

## True-scale E04 alignment sheets

Print SVGs at **100% / actual size**, not “fit to page.” Measure the 50 mm calibration line before every session and reject a mis-scaled sheet. Positive offset is robot-left/page up; yaw is CCW. Mark a surrogate tire’s witness line if yaw is being tested.

| Lateral offset (mm) | Yaw (°) | Attempts in cell | File |
|---:|---:|---:|---|
| -12.7 | -10 | 5 | `alignment/E04_offset-m12p7_yaw-m10.svg` |
| -12.7 | 0 | 5 | `alignment/E04_offset-m12p7_yaw-0.svg` |
| -12.7 | 10 | 5 | `alignment/E04_offset-m12p7_yaw-10.svg` |
| 0 | -10 | 5 | `alignment/E04_offset-0_yaw-m10.svg` |
| 0 | 0 | 5 | `alignment/E04_offset-0_yaw-0.svg` |
| 0 | 10 | 5 | `alignment/E04_offset-0_yaw-10.svg` |
| 12.7 | -10 | 5 | `alignment/E04_offset-12p7_yaw-m10.svg` |
| 12.7 | 0 | 5 | `alignment/E04_offset-12p7_yaw-0.svg` |
| 12.7 | 10 | 5 | `alignment/E04_offset-12p7_yaw-10.svg` |

Five attempts per cell plus five nominal repeats give 50 attempts per candidate per officially required pose class. Unknown pose classes remain diagnostic. Record every attempt in `E04-trial-matrix.csv` and the hardware package’s main trial log.

## Geometry verification

All four STL meshes are closed, edge-two-manifold, nondegenerate and have positive outward signed volume in the computational checks. These checks do not certify slicer output, printability, tolerances, material strength, fit, safety or mechanism performance. Re-run:

```sh
node tools/mechanism-prototyping-v3.js
node tools/verify-mechanism-prototyping-v3.js
node --test tests/mechanism-prototyping-v3.test.js
```
