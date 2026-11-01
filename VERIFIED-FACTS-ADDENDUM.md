# Verified facts — addendum (October 31 and November 1, 2026)

Kept separate because `VERIFIED-FACTS.md` is a pinned input of sealed packages (hardware-development-v3, mechanism-prototyping-v3); editing it makes their verifiers stale.

## Added 2026-10-31 (team concept input v7)

* **AprilTag family:** the organizer tag sheet (`derived/GM2-V3.1/media/image5.jpg`, byte-identical to the archived GM2 V3 docx media) decodes as **tagStandard41h12 IDs 1, 2, 3**, Hamming 0, with the AprilTag 3 detector (pupil-apriltags 1.0.4.post11). No other bundled family decodes it.
* **OpenCV ArUco** 5.0.0 (main and contrib builds) has **no 41h12 dictionary**; use the AprilTag 3 library.
* **41h12 geometry:** the detected quad is the inner **5/9** of the printed 9 × 9-cell pattern, measured 0.5556 on the sheet. Pose `tag_size` must use that edge: **37.8 mm if "68mm" is the full print**, which is unmeasured. Details: `derived/apriltag-41h12-v7/README.md`.
* **Ranking format (GM1 V3 §4.7.1, §4.8–4.9):**
  * Qualification ranks each Team by its **best** of three Matches, with ties broken by the second- and then third-best score.
  * The top 6 are seeded directly; seeds 7–10 play in.
  * Eliminations are single head-to-head Matches, and a Red Card is an automatic loss.
* **Yellow Cards:** an additional Yellow Card in any later incident becomes a Red Card (GM1 C03).
* **Field colors (GM2 Appendix B + build guide):** black floor; white center line (masked with 1-in tape), pit boxes and start/finish area; gray walls.
* **Barrier heights are still assumptions:** nominal 1×4 and 1×2 lumber standing on edge would give ~3.5 in walls and a ~1.5 in divider.

## Added 2026-11-01 (vendor CAD, `derived/robot-studio-v7/assembly.json`)

* **#4754 gearmotor (Pololu STEP for 50:1 and 70:1 with encoder; drawing agrees):**
  * output shaft **7.0 mm off the gearbox center**;
  * 6.0 mm D-shaft with a 5.4 mm flat, 22 mm from the gearbox face;
  * gearbox Ø36.8 mm; 70.1 mm from the face to the encoder end.
* **#1995 bracket:**
  * gearbox center **18.4 mm** above the flat mounting edge;
  * the shaft-boss slot runs perpendicular to that edge, so the shaft sits **25.4 or 11.4 mm** above it;
  * M3 tapped holes (Ø2.5) 14.8 mm apart, **3.25 mm** from the motor-side face.
* **#1083 hub:** flange Ø25.4 × 5 mm, collar Ø12, 6 mm bore, 9.2 mm long.
* **#1430 wheel:** Ø80.0 mm, 10 mm silicone tire, 3 mm center bore with a small boss on one side.
* **#953 caster:** 13.52 mm from mounting face to ball bottom.
* **Assembled with stock parts:** wheel center 101 mm from the robot centerline, so the **track is 202 mm** and the overall width 212 mm.
* These are CAD geometry, not measurements of received parts.
