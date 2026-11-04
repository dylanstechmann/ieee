# Tire replica print notes

Source mesh: `derived/organizer-cad/Spare Tire v2.stl` (organizer STL, millimetres, sha256 e04ac6ac4874902f…, 5380 triangles). Official tires are TPU (GM2 Appendix D).

1. Print at least four TPU replicas (2 red, 2 blue if filament allows) and two PLA replicas as a rigid control.
2. Record for every replica:
   - an ID;
   - the material, infill and wall count;
   - its mass, weighed on a scale with a known check weight. The official tire mass is unmeasured; solid TPU by mesh volume would be about 77–79 g.
   - OD, thickness and bore, measured with calipers, three times each.
3. Compare the measurements with the nominal 68.18 / 27.6 / 40.3 mm. Note that the organizer CAD profile shows 27.10 mm thick, the STL 27.60 mm.
4. Use the same replica IDs in the DOE sheets (`tire_id`). A replica that is clearly off-size is retired, and the reason recorded, rather than silently swapped.
