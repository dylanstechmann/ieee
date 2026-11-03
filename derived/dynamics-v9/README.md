# Dynamics v9 — corrected track, synthetic physics

November 3, 2026. AI-assisted digital study for the owner's hobby/learning project. No physical validation, fabrication release or component purchase.

This package regenerates the earlier planar drivetrain model using the vendor-CAD **202 mm track**, rather than the historical 176 mm value. It shares the proposed shaft-down mule parameters in `robot-baseline-v9.json`; the competition rectangle is a separate concept, not this mule assembly.

The report contains six nominal scenarios and 48 deterministic sensitivity cases. These are uncalibrated motor, traction, mass, voltage, encoder and control assumptions. They are not measured distributions, reliability estimates, thermal qualification, battery selection or proof of stable real-robot control. The historical stopping and mechanism packages remain unchanged and are not declared compatible with a competition chassis.

Reproduce from `/workspace/ieee/ieee`:

```sh
node tools/dynamics-v9.js
```

`manifest.json` binds the generator inputs and outputs. `nominal-simulations.json` retains the trajectories; `report.json` summarizes the cases. No physical trials or purchases are recorded. Measure received parts and complete the approved bench/commissioning gates before using these parameters for hardware decisions.
