# Implementation Plan

## November 5, 2026 — autonomous implementation continuation

The owner explicitly authorized end-to-end work without routine continuation
prompts and authorized labeled estimates for missing physical properties.
That authorization supersedes earlier text requesting another approval.

Implemented in `/workspace/ieee/ieee/share/Showcase-v11.html`: offline embedded
assembly animation, parametric exterior studies, inspection, dimension preview,
Rapier 0.12.0 live force-driven navigation, three laps, contact-supported tire
lifting/retention/release and parking; miniature couch avoidance and failure
scenarios. Archived competition-field replay remains separately selectable.
New provenance/GLB/headless/browser reports are under
`/workspace/ieee/ieee/derived/showcase-v11/`.

**Not a completion claim for every architecture requirement below:** successful
live runs use a larger 4.86 × 2.48 m demonstration arena, a level-plane chassis,
virtual traction and ideal position lift. Exact competition-field live success,
embedded firmware parity, detailed electrical/actuator selection, complete
purchased-part fit fidelity, full arbitrary browser CAD regeneration, shared
complete mechanism CAD/collision exports and hardware qualification remain open.
The nominal run includes contact bumps and is not collision-free. See
`/workspace/ieee/ieee/robot-studio-v11/README.md` for explicit limitations.
No historical 91/91 qualification is attached to the changed model. No hardware
was purchased, and no commit/push/publishing was performed.

Workspace caution remains: this legacy container lacks an IEEE managed-project
registration/controller CLI. Other provider extension processes exist at the
workspace root, with no IEEE file descriptors observed during inspection; that
does not establish a managed exclusive lease or resolve the environment issue.

[Overview]
Build a comprehensive, single-file offline robotics showcase with an editable open-source CAD pipeline, a documentation-qualified candidate parts list, and live mission simulation including tire acquisition, retention, delivery, release, and failure behavior.

Planning date: November 5, 2026. Implementation requires explicit approval after this document. The user selected full development, including live contact physics, even if it cannot be completed before the meeting. Deliver a useful presentation milestone first, but do not substitute that milestone for the requested full simulator. No implementation or dependency installation has been performed during planning.

## Revised source and purchasing policy — latest user direction

### Latest clarification: geometry first, measurement-calibrated physics later

The owner reasonably expects each candidate part's appearance, overall dimensions and mounting interfaces to be discoverable and wants development to advance on that basis. Treat this as an active research objective, not a universal factual guarantee. Search deliberately before declaring an item unresolved. Missing mass, friction or inertia does not block geometry modeling or an explicitly synthetic demonstration. Unverified critical mating geometry blocks a fit-certified claim, not creation of a labeled provisional model. Do not turn uncertainty management into repeated requests for permission to research or build the planned digital studies.

This message approves the direction but repeats a planning-only handoff requirement: update this document now and request explicit implementation confirmation afterward. No purchases or code changes are authorized by this planning revision.

#### Two readiness gates, not one

- **Geometry-ready:** exact candidate identity; documented overall size and critical mating dimensions; sufficient views to reconstruct the exterior; named datums; material/finish appearance with disclosed estimates. Required functional geometry includes bores, flats, shafts, hole patterns, wheel contact outline, connector clearance and articulation limits where relevant. Hidden cosmetic details may remain approximations. Decorative detail is not required to certify an interface.
- **Simulation-ready for a stated purpose:** every parameter required by the solver has a finite validated value and provenance, including an explicitly bounded assumption when measurements are unavailable. This allows a pre-purchase synthetic model, but not a hardware-performance claim. Mass may be assumed temporarily; actual center of mass, inertia, friction, compliance and losses are distinct quantities, not recoverable merely by weighing an exterior CAD model.

Define three visible parameter profiles: `prepurchase-assumed`, `datasheet-informed`, and `measurement-calibrated`. These are profiles, not global quality grades: each parameter retains its own source. A calibrated mass does not upgrade assumed friction. Preserve historical and provisional runs so later measurements can be compared without rewriting prior evidence.

#### Practical research completion rule

For each part, inspect the primary product page, dimensional drawing/datasheet, CAD resources and several useful product views. Search the exact MPN and revision for missing features; use distributor or independent material as corroboration with attribution and an explicit confidence limitation. Check dimension conflicts and product variants before modeling. Complete an initial audit pass across the entire installed assembly, then a focused second pass on missing critical features. Do not allow one unavailable logo texture or undocumented internal detail to stall the entire robot.

If a critical feature remains missing, record the attempted sources, model a disclosed provisional envelope, and compare documented alternatives. Do not silently infer a shaft flat, hole thread, connector pinout or safe electrical limit from a photograph. Research motor/driver supply voltage, current and speed data now when available: these influence compatibility and candidate selection, even if later calibration waits. Missing measurements are acceptable simulation assumptions, not a reason to defer all electrical compatibility checks until after purchase.

#### Measurement-to-simulation iteration

1. Before purchase, build the editable exterior, functioning simulation and uncertainty controls from available documentation plus named assumptions. Run sensitivity sweeps to identify which measurements would most change the next design decision.
2. After purchase, accept user-entered component mass and dimensions, part/lot identity, mounting configuration, instrument resolution, repetitions and conditions. Never replace nulls with zero or overwrite raw records. Preserve uncertainty and date.
3. Reuse existing E02/E03 analysis where applicable. `/workspace/ieee/ieee/tools/mule-measurements-v10.js:main(argv)` already reads raw CSV, calls unchanged `summarizeE02`/`summarizeE03`, records hashes and creates output exclusively with `flag: 'wx'`. Existing `/workspace/ieee/ieee/derived/drivetrain-mule-v10/templates/e02a-measurements.json` demonstrates copied measurement records with nulls meaning unmeasured. Preserve those pinned files and implement v11 adapters rather than changing their semantics.
4. Produce a proposed parameter revision with a before/after diff. Update geometric dimensions through the local CAD build; update supported physical parameters through validated configuration import. Neither path may silently alter the purchased SKU or historical evidence.
5. For trajectory data, fit only identifiable physical parameters using bounded searches and documented residuals. Hold out whole physical trials for evaluation; do not report fit-to-training-data error as predictive validation. If multiple parameter sets fit equally well, report ambiguity instead of false precision.
6. Run the same scenario matrix with old and updated profiles; compare predicted trajectories and failures against held-out trials when available. Synthetic stress tests explore consequences of the model, not new information about the hardware.
7. Optimization/policy experiments are a later gate after baseline contact/controller checks and calibration. Keep controller tuning, physical-parameter identification and policy training separate. No trained-policy or sim-to-real reliability claim follows simply from entering component weights. Physical execution, automatic tuning on hardware and hardware commands are not included.

This revision supersedes the intervening open-reference-design-only restriction. Open-source CAD/software and editable, locally rebuildable models are priorities; purchased components and their reference documentation need not themselves be open hardware. Public manufacturer dimensions, drawings, photographs, datasheets and CAD may be investigated as evidence. Permission to inspect information and permission to embed/relicense an asset are separate review items. Do not assume a download is openly licensed, or that reconstructing an imported mesh automatically clears third-party rights. This is an operational review gate, not a legal conclusion.

The user permits proposing a different parts list to improve documentation/modelability. That is not authorization to purchase parts, replace historical BOMs, change repository visibility, or select an inferior drivetrain merely because its rendering is easier. No immediate hardware substitution is selected in this plan. First audit current candidates, then compare only roles with consequential gaps. The latest clarification is sufficient to plan; no additional user question is required before saving this revision.

The initial repository budget is historical: USD 500 minimum, USD 750 working target, USD 1,000 maximum, with later-category reserves and excluded costs. Use it as an explicit comparison baseline, not new spending authority. All price/availability fields require a dated supplier check before recommendations become purchase-ready. Shipping, tax, connectors, mounting hardware and supporting electronics belong in the change impact, not just the headline motor price.

### Findings supporting retain-first research

On November 5, 2026, official Pololu resource pages for candidate #4754 and #1430 were opened. Both provide dimension diagrams and STEP model downloads; #4754 also links a motor datasheet, and both have product-picture sections. Therefore, lack of discoverable external geometry is not yet a reason to discard these candidates. This does not establish complete internal construction, actual received-part tolerances, asset redistribution rights or calibrated dynamics. The other BOM roles require their own audit before comparable claims.

Sources actually opened for this revision: `https://www.pololu.com/product/4754/resources`, `https://www.pololu.com/product/1430/resources`, `https://cadquery.readthedocs.io/en/latest/intro.html`, `https://rapier.rs/docs/user_guides/javascript/getting_started_js/`. Capture exact retrieval metadata and evidence hashes during implementation. Do not describe cached documentation dates as manufacturing revisions.

### Evidence-qualified BOM workflow

1. Inventory installed quantities separately from purchased pack quantities: two motors and brackets, two hubs from one two-pack, two wheels from one pair, two caster kits, and the actually used fasteners from their purchased packs. Include custom chassis, risers, mechanism, electronics, power, sensors, cables and connectors as separate roles; Order A is only a first-experiment BOM.
2. For each exact manufacturer/MPN/revision, record envelope, mating datums, shaft/bore and flat, hole pattern, connectors, cable exits, moving axes/travel, visible appearance, mass and relevant performance specifications. Link every critical parameter to evidence; conflicting dimensions remain unresolved rather than averaged.
3. Separate four coverage axes: mounting/interface fidelity, visual fidelity, physical-model evidence, and reproduction/distribution rights. A highly detailed mesh does not compensate for missing torque/current or shaft compatibility. Photos can inform color/form; perspective and scale uncertainty prevent treating uncalibrated photo measurements as exact dimensions.
4. Qualification states: `unreviewed`, `documented-for-modeling`, `conditional`, `rejected`, `selected-for-digital-study`. `documented-for-modeling` requires an exact product identity, traceable critical interfaces and declared physical assumptions; it does not mean hardware-qualified. Missing safety-critical or mating dimensions blocks selection for assembly release. Missing cosmetic detail can remain visibly approximate.
5. For a consequential gap, compare the current part with up to three documented alternatives from primary sources. Hard gates precede preferences: mechanical/electrical compatibility, required performance, physical envelope and supportability. Among passing candidates prefer clearer documentation, editable/open reference sources, stable identifiers, accessible supply and lower total integration cost. Reject undocumented guesses and record the reason for retaining the baseline if alternatives are worse.
6. Candidate substitutions produce a complete assembly/configuration branch. Propagate motor voltage/speed/current/encoder count, shaft and mounting changes; wheel diameter/track/contact geometry; controller/driver limits; battery and protection requirements; mass/COM/inertia and mechanism loads. Rerun affected clearance, drive, sensor and mission studies. Never attach historical 91/91 results to a changed design.
7. Show a proposed BOM diff before promoting a replacement to the preferred configuration. The research agent may create alternatives without buying anything. Default showcase remains a clearly labeled candidate configuration; procurement approval is separate.

### Open-source CAD ownership and fidelity architecture

Use the already-established CadQuery 2.8.0/Python pipeline as the authoritative authoring path. The existing `/workspace/ieee/ieee/tools/mule-deck-v10-cad.py` implements `deck(geometry)`, `riser(geometry)` and normalized STEP/STL exports; preserve it and build additive v11 modules using the same conventions. No mandatory FreeCAD, Blender, cloud CAD, or AI mesh-generation dependency is introduced.

Author each new component in editable Python plus reviewed parameter JSON, with stable component IDs, named mating datums and joint frames. Export STEP for interchange, GLB for rendering, STL where useful, and reduced collision geometry for simulation. An imported STEP wrapped by Python is an imported reference, not a reconstructed parametric design. Vendor CAD may serve as a comparison/reference or explicitly approved visual exception, but is not the default authoritative v11 part source.

Reconstruct external product geometry only to the fidelity supported by evidence. Expose omitted/estimated details in the inspector. Undocumented gear teeth, windings, encoder interiors or chip dies are not fabricated and presented as exact. Educational cutaways are optional separate hypothetical models and are excluded from SKU-fidelity claims. Building our own physical motors or electronics is a later independent engineering project, not an implied deliverable of matching the exterior of a purchased component.

CAD does not supply unknown material density, tire friction, internal mass distribution, motor losses or thermal ratings. Keep effective physical models and uncertainty independent of render meshes; do not calculate a hollow motor's mass as a solid steel exterior. Simulation fidelity is established by tests and eventually measurements, not by visual detail.

Browser controls edit only declared safe scenario/configuration parameters. General B-rep CAD regeneration runs locally in Python, then is rebuilt into the HTML. Do not claim arbitrary CAD editing runs offline inside the page. Provide an embedded model/source manifest and a separate reproducible source package; the single HTML remains independently viewable and runnable without that package. Public open-source release and the license for newly authored code/designs require owner approval; do not silently license the whole existing repository or third-party assets.

## Investigated baseline

- Repository: `/workspace/ieee/ieee`, branch reported as `next-phase-v10`; initial Git status was clean. Read repository AGENTS/CLAUDE guidance and the shared workspace instructions.
- `/workspace/ieee/ieee/share/Showcase-v10.html` is the final existing presentation. Preserve its later visual fixes; do not use temporary fragments. It embeds pictures but links to separate studios. No reproducible showcase builder currently accompanies it.
- `/workspace/ieee/ieee/robot-studio-v8/app.js` uses Three.js, vendor GLBs, OrbitControls, and a custom illustrative drive. `routes()`, `buildPath()`, `poseAt()`, and `stepSim()` follow CatmullRom curves. The pit pause explicitly has no mechanism. This is not the Python full-mission simulation.
- `buildMechanism()` renders historical v6 relative-kinematic samples independently of the detailed assembly. The study has 162 cases / 2,970 samples, unresolved mounting and actuation, and no selected mechanism. It cannot certify pickup by attaching its animation to a chassis.
- `/workspace/ieee/ieee/firmware/host_tests/full_mission.py:run()` actually runs Supervisor, MissionDriver, Tracker, Estimator, simulated sensors, Runner, and PlantHal. It injects exchange success/failure after a timer. `judge()` checks a 10-inch-square footprint and nonphysical obstacle overlaps. Preserve its historical 91-mission results unchanged.
- `/workspace/ieee/ieee/tools/demo-mission-v10.py:keep_samples()` temporarily replaces `judge()` to capture pose samples. Its HTML trace lacks wheel angles, full sensor state and mechanism physics. Do not extract a new simulator by scraping its HTML or reusing its timed exchange as a contact result.
- Existing vendor-CAD assets match candidate SKUs 4754, 1995, 1083, 1430 and 953. Order A also contains fasteners, custom fixtures and unselected consumables. It is not a complete robot BOM. Electrical and mechanism choices remain conditional.
- `/workspace/ieee/ieee/derived/drivetrain-mule-v10/geometry.json` is the corrected shaft-down layout: 190 x 172 x 5 mm deck, 202 mm track, nominal 28.6 mm deck top and 6.91 mm caster risers. It retains a failed 7.8 mm versus 8 mm motor-gap project check. Do not hide that flag.
- `/workspace/ieee/ieee/derived/competition-mockup-v10/README.md` describes 254 mm square/round mockups, not complete competition CAD. Do not show the small mule while implying the 10-inch-square simulation footprint is its actual outline.
- Existing browser runtime pins are Three.js 0.170.0 and esbuild 0.24.0, currently loaded from an external build cache. Node tests use `node:test`; Python uses unittest and MicroPython-compatible pure classes. No framework migration is needed.
- The v9 JavaScript golden fixture is not the corrected v10 dynamics implementation. Port the corrected `plant_step()` behavior from Python, not the old browser dynamics unchanged.
- Existing verifiers hash source inputs as well as artifacts. Changing old Python/controller files would invalidate historical evidence. Prefer additive v11 modules and adapters.
- No TODO/FIXME markers were returned in the targeted studio/full-mission/model scan. Broad workspace searches timed out and are not evidence of absence. Later shell integration was unreliable; do not count those commands as successful validation.
- Browser-tool navigation to the existing file URL was blocked. No new visual or runtime validation is claimed from this planning session. Use the project's established direct-file Playwright runner during implementation.

## Product structure

Create `/workspace/ieee/ieee/share/Showcase-v11.html` as the primary deliverable and `/workspace/ieee/ieee/share/Robot-Studio-v11.html` as an optional standalone export of the same studio. The showcase must need neither sibling files nor network access. Keep v10/v8 deliverables as fallback evidence.

Retain the existing PITWALL/editorial style. Arrange the scroll narrative as: purpose and evidence labels; organizer field; robot/parts; integrated mission studio; tire exchange close-up and failure cases; drivetrain/controller physics; historical results versus new results; limitations; build/measurement plan; sources and credits. Include concise explanations beside interactive sections, not an uninterrupted wall of technical prose. Keep owner-only conversation notes out of the shared file.

Use one shared Three.js renderer and scene resource pool for the primary studio, with assembly, mission, exchange bench and historical-study views. Sections can select views without creating multiple full WebGL worlds. Controls must remain accessible while the document scrolls. Wheel input scrolls the page by default; explicit interaction/focus enables orbit zoom. Provide leave-interaction, camera reset, full-screen and keyboard equivalents. No scroll-jacking or automatic mission start.

Controls: run/pause, reset, single physics step, speed multiplier, recorded-timeline seek, scenario and seed, pit assignment, assembly configuration, mechanism concept, tire pose/offset, friction/mass/supply/actuator assumptions, camera presets, follow camera, parts selection, exploded inspection, render/collision overlays and telemetry. Parameter changes reset the live run with confirmation if its trace would be lost. Replay seek is not live time travel; restore complete checkpoints or replay from the seed before branching.

Always show model mode: `recorded-v10`, `live-v11`, or `historical-study`. Store each run's assumptions, model revision, seed and evidence status. Never carry the old 91/91 statistic into a new contact-physics result card.

## Mechanical scope and exactness

1. Preserve existing vendor assets in historical packages. Generate new default visuals from editable CadQuery models after the evidence audit; compare against documented dimensions and, where permitted, vendor geometry. Imported reference assets remain explicitly labeled exceptions, not parametric source models. Never stretch a product model to force a fit.
2. Rebuild the corrected mule using the audited dimensions and new parametric sources; include holes, risers and verified fastener locations. Add the square competition mockup as a separate proposed configuration. If a candidate part changes, regenerate the entire affected stack rather than copying the old track/height. Keep the round variant historical/experimental until its rule interpretation is settled.
3. Every visible purchased component links to an exact BOM identity, parametric source and evidence record. Every visible custom component has a proposed part ID, dimensions and revision. Unselected electronics, battery, actuator and sensors appear as labeled reserved volumes, not apparently exact products. Report coverage separately for editable geometry, documented interfaces, approximate appearance, physical assumptions and missing information.
4. Add assemblies for passive fork, guided bore and OD gripper using existing concept geometry as historical reference, not fabrication-ready hardware. A force-limited, lifted OD-jaw concept is the first actively actuated full-loop candidate; this is an engineering hypothesis, not a hardware selection or reliability winner. Preserve fork/pin comparison cases and unsupported orientation failures.
5. Design and disclose proposed mounting, travel limits, lift/retention geometry, actuator forces/rates and collision reservations before simulating success. Permit ordinary failures if packaging does not fit. Do not silently shrink the tire or expand the chassis to make a demo pass.
6. Model two identifiable tire bodies: starting tire and replacement tire. Encode delivery-zone, acquisition and retention conditions from archived rule evidence, retaining unresolved interpretations. A release-after-finish bench action is separate from the mission requirement to keep the replacement through the finish. No automatic disposal of the original tire.
7. Exact visual identity cannot be guaranteed where vendor CAD/photos or selected SKUs are missing. Keep a visible unresolved-assets list; do not generate plausible lookalikes and label them exact. Recheck external asset licensing before embedding/distributing. Purchases and repository visibility changes are out of scope.

## Simulation architecture and qualification gates

Implement two separate backends under one UI:

- Historical reference: replay adapter and a corrected planar v10-compatible model for controller parity tests. Explicit ghost-contact behavior remains only in the historical mode.
- New live model: dynamic chassis, wheel/contact response, articulated mechanisms, tires and obstacles in a browser rigid-body world. The renderer reads physics poses; it never advances bodies along the route. Route following produces commands through the control stack.

The new contact engine is a dependency decision gate. Rapier 3D compat is the researched candidate, not an installed dependency. Existing libraries alone have not been established to provide the required rigid-body solver. Do not write an ad-hoc collision/grip solver merely to avoid this decision. Approve and pin the dependency before full contact implementation; the dependency-free replay/visual milestone can proceed independently.

Port pure controller/estimator behavior into tested JavaScript modules, preserving source attribution and source hashes. Keep original Python/firmware modules unchanged. Use golden vectors for Supervisor, MissionDriver, Tracker, DriveShaper, WheelSpeedController, SafetyMonitor, Estimator, sensors and corrected motor/plant behavior. Python's seeded random stream is not automatically equivalent to JavaScript: use captured observations for parity and a documented deterministic PRNG for new live runs.

Use meters, kilograms, seconds and radians internally. Simulation frame: X forward, Y left, Z up. Explicit adapters convert organizer inches and vendor millimeters to Three.js X/Y-up/Z coordinates. Test orientation, wheel-side signs, axle centers, field origin and tire bore axis.

Start with a fixed 1 ms simulation step, a 5 ms control tick (200 Hz), 50 ms estimation tick (20 Hz), and independently throttled rendering/telemetry. Benchmark rather than claiming real-time performance. A speed multiplier changes tick throughput, never step size. If the solver cannot sustain requested speed, display achieved speed and reduce playback rate; never discard physics ticks silently. Timestep-convergence tests may justify a revised pinned step.

For the live backend, the contact solver owns chassis and tire poses. Motor electronics compute torque/current/supply sag and apply equal/opposite wheel/drive reactions through the chosen wheel model; avoid also integrating the planar body's pose or applying a second friction model. Explicitly account for gravity, support loads, caster approximation, braking, lateral sliding, obstacle contact and mechanism reaction loads. Use a wheel joint/contact prototype to settle this interface before full missions. Compare free driving to the planar reference as a trend/limit check, not a demand for identical 3D trajectories.

Use simplified collision solids distinct from detailed visual meshes. The tire collider must preserve the bore (compound convex sectors, not a solid cylinder); the floor/walls are static; obstacle bodies have explicit mass/friction assumptions. Do not use detailed concave moving visual meshes indiscriminately. Include collision meshes and approximation error in the manifest.

No parenting tire meshes to the robot to simulate retention, no unconditional fixed grasp joint, no teleport on pickup, no time-based exchange success. Joint motors are force/torque and speed limited. Model compliance only to the extent supported and tested; a rigid-body/friction approximation is not a deformable-tire material model. Full soft-body/FEM, vision photorealism and hardware qualification remain outside this iteration.

Mechanism phases: stowed, approach, align, release-original, acquire-replacement, lift, verify-hold, retained, release-bench, recover, failed. State transitions use modeled position/contact/velocity/effort observations with explicit tolerances and dwell windows. The evaluator can use ground truth for diagnostics; the controller must use a documented sensor abstraction, with perfect-state assistance separately labeled. An absent/unselected sensor remains an assumption. Physical capture and simulated detection of capture are separate outputs.

Judge replacement capture from containment/contact geometry and bounded relative motion; judge lift from ground clearance; retention must persist through acceleration, turning and braking; original delivery must be in the specified zone and no longer supported by the mechanism. A drop after exchange invalidates retention credit. Retry and bail-out feed the existing supervisor semantics; jam/timeout/low-force cases must be demonstrated. Completing all missions is not an acceptance requirement: credible failures are.

## Source/dependency research recorded during planning

Official Rapier documentation read on November 5, 2026:

- `https://rapier.rs/docs/user_guides/javascript/getting_started_js/`: compat package embeds WASM in JavaScript; asynchronous initialization still required. Test actual direct-file/worker behavior, not CDN examples.
- `https://rapier.rs/docs/user_guides/javascript/colliders/`: collider shape, friction, mass and contact interfaces; select reduced collision geometry deliberately.
- `https://rapier.rs/docs/user_guides/javascript/determinism/`: reproducibility requires the same version, initial values and insertion order; transcendental initialization can break cross-platform identity. Promise tolerance-based end-to-end comparisons unless identical snapshots are established.

[Types]

Use existing plain JavaScript plus JSDoc typedefs and runtime JSON validation, not a TypeScript/framework migration. Define all shared types in `/workspace/ieee/ieee/robot-studio-v11/contracts.js`.

- `Vec3 = [number, number, number]`; `Quaternion = [number, number, number, number]` in xyzw order. All values finite; quaternion normalized within 1e-6. Transforms explicitly name parent/child frames.
- `EvidenceKind = 'vendor-cad' | 'organizer-cad' | 'dimension-based' | 'proposed-custom' | 'reserved-volume' | 'synthetic' | 'physical-measurement'`. No physical measurement record without an actual measurement artifact.
- `SourceRef = {path:string, sha256:string, description:string, sourceUrl:string|null, retrievedDate:string|null, license:string|null}`. Unknown license blocks redistributing that new asset, not inspection of already-present references.
- `PartRecord = {id:string, bomId:string|null, sku:string|null, name:string, quantity:number, evidence:EvidenceKind, sources:SourceRef[], visualAsset:string|null, collisionAsset:string|null, dimensionsM:Vec3|null, massKg:number|null, finishBasis:string, status:'candidate'|'proposed'|'unselected', missingDetails:string[]}`. Null stays unknown, never becomes zero mass or a claimed measurement.
- `AssemblyConfig = {id:string, revision:string, base:'mule'|'square-mockup'|'round-study', partInstances:Array<{id:string,partId:string,parentId:string|null,positionM:Vec3,rotation:Quaternion}>, wheelRadiusM:number, trackM:number, mechanismId:string|null, checks:Array<{id:string,status:'pass'|'fail'|'unknown',basis:string}>}`.
- `AssumedValue = {value:number,unit:string,basis:EvidenceKind,source:SourceRef|null,min:number,max:number}`. Runtime validators reject out-of-range overrides.
- `ScenarioConfig = {schema:'studio-scenario/1',id:string,seed:number,backend:'reference-planar'|'contact-3d',assemblyId:string,pitBox:1|2|3,routeId:string,preset:'aggressive'|'safe'|'drive_only',physicsStepS:number,controlStepS:number,estimatorStepS:number,parameters:Record<string,AssumedValue>,tires:Array<{id:string,role:'starting'|'replacement',positionM:Vec3,rotation:Quaternion}>,obstacles:Array<{id:string,positionM:Vec3,rotation:Quaternion,partId:string}>,faults:Array<{id:string,startS:number,endS:number,parameters:Record<string,number>}>,limitations:string[]}`. Integer seed; positive time steps; integral clock ratios; unique IDs.
- `MechanismState = {phase:string,attempt:number,jointPositions:number[],jointVelocities:number[],efforts:number[],originalDelivered:boolean,replacementCaptured:boolean,replacementRetained:boolean,failure:string|null}`. Validate phase against the enumerated phases above; no timer-derived capture booleans.
- `FrameSnapshot = {tick:number,timeS:number,robot:{positionM:Vec3,rotation:Quaternion,linearVelocity:Vec3,angularVelocity:Vec3},estimatedPose:[number,number,number],wheelAngleRad:[number,number],wheelSpeedRadS:[number,number],duty:[number,number],currentA:[number,number],busV:number,missionState:string,laps:number,mechanism:MechanismState,tires:Array<{id:string,positionM:Vec3,rotation:Quaternion}>,contacts:Array<{a:string,b:string,normalForceN:number}>,warnings:string[]}`. Historical adapters mark unavailable fields separately rather than fabricating wheel/current/contact measurements.
- `RunRecord = {schema:'studio-run/1',id:string,mode:'recorded-v10'|'live-v11',scenario:ScenarioConfig,sourceHashes:Record<string,string>,engineVersion:string|null,snapshots:FrameSnapshot[],events:Array<{tick:number,type:string,message:string}>,result:RunResult}`.
- `RunResult = {completed:boolean,parked:boolean,originalDelivered:boolean,replacementHeldAtFinish:boolean,wallContacts:number,vehicleContacts:number,failure:string|null,scoreLike:number|null,scoreBasis:string,physicalTrials:0,qualification:'synthetic-only'}`. Score may remain null when rule interpretation or required observations are unresolved.
- `WorkerRequest = {protocol:1,runId:string,sequence:number,type:'init'|'start'|'pause'|'step'|'reset'|'snapshot'|'restore'|'dispose',payload:object}`; `WorkerReply = {protocol:1,runId:string,sequence:number,type:'ready'|'frame'|'result'|'error',payload:object}`. Ignore stale run IDs; serialize only validated data.
- `Checkpoint` includes solver bytes, simulation tick, controller/estimator/PRNG state, mechanism state and event cursor. A physics-only snapshot is insufficient for seeking/resuming.

### Additional CAD/procurement contracts

Define these JSDoc contracts in `/workspace/ieee/ieee/robot-studio-v11/contracts.js` and mirror validation in `/workspace/ieee/ieee/cad-v11/contracts.py`. JSON, not Python objects, is the cross-language boundary.

- `ParameterEvidence = {id:string,value:number|null,unit:string,basis:'manufacturer-drawing'|'manufacturer-spec'|'reference-cad'|'photo-estimate'|'measured'|'design-choice'|'assumed',sourceIds:string[],locator:string|null,uncertainty:number|null,critical:boolean,conflictIds:string[]}`. Unknown uncertainty is not zero; a `measured` claim requires a measurement record. Angles and lengths use explicit units.
- `ReferenceRecord = {id:string,url:string|null,localPath:string|null,sha256:string|null,retrievedDate:string,manufacturer:string|null,productId:string|null,documentRevision:string|null,kind:'drawing'|'datasheet'|'photo'|'cad'|'measurement'|'design-source',licenseExpression:string|null,redistribution:'approved'|'reference-only'|'unknown',attribution:string|null,reviewNote:string}`. Only approved material is embedded; citations may point to reference-only material without copying it.
- `CandidatePart = {id:string,role:string,manufacturer:string,mpn:string,revision:string|null,installedQuantity:number,packQuantity:number,parameters:ParameterEvidence[],referenceIds:string[],qualification:'unreviewed'|'documented-for-modeling'|'conditional'|'rejected'|'selected-for-digital-study',blockers:string[],missingCosmeticDetails:string[],price:{currency:string,unit:number|null,checkedDate:string|null},availability:{status:string,checkedDate:string|null},substitutesFor:string|null}`. Positive quantities; currency/pack basis explicit; no multiplication of installed quantity by two-pack price.
- `CadModelSpec = {id:string,partId:string,revision:string,generatorModule:string,generatorFunction:string,parameterIds:string[],units:'mm',datums:Array<{id:string,originMm:Vec3,rotation:Quaternion}>,subcomponents:Array<{id:string,materialId:string|null,moving:boolean}>,sourceMode:'parametric'|'imported-reference'|'reservation',visualLimitations:string[],parameterHash:string}`.
- `FidelityReport = {partId:string,modelRevision:string,checks:Array<{id:string,feature:string,expected:number|null,actual:number|null,unit:string,tolerance:number|null,evidenceIds:string[],status:'pass'|'fail'|'unknown'}>,visualReview:'not-reviewed'|'agent-reviewed'|'owner-reviewed',interfaceCoverage:number,physicalUnknowns:string[],omittedDetails:string[]}`. Coverage denominator is enumerated requirements, not a subjective accuracy percentage. Owner review requires actual confirmation.
- `BomChange = {id:string,baselineId:string,candidateId:string,reason:string,changedParameters:string[],affectedArtifacts:string[],costDelta:number|null,compatibility:'pass'|'fail'|'unknown',requiredTests:string[],decision:'proposed'|'accepted-for-study'|'rejected',decisionBy:string|null}`.
- Extend `PartRecord` with `candidateId:string|null`, `cadModelId:string|null`, `fidelityReportId:string|null`, `geometryOrigin:'parametric'|'imported-reference'|'reservation'` and `physicalModelId:string|null`. Existing `evidence` remains a summary; detailed source/parameter fields control claims. Extend `ScenarioConfig` and `RunRecord` with `bomRevision:string`, `assemblyRevision:string`, `cadManifestHash:string`, `physicalModelRevision:string`; mismatched IDs invalidate reuse.

- `MeasurementRecord = {schema:'part-measurement/1',id:string,partId:string,productRevision:string|null,lotId:string|null,assemblyRevision:string|null,date:string,measuredBy:string,instrument:{name:string,resolution:number|null,unit:string},quantity:string,unit:string,samples:number[],conditions:Record<string,string|number>,rawArtifactHashes:Record<string,string>,notes:string}`. Nonempty finite samples, explicit compatible units and no invented instrument precision; raw records immutable.
- `ParameterProfile = {id:string,revision:string,stage:'prepurchase-assumed'|'datasheet-informed'|'measurement-calibrated',assemblyRevision:string,values:ParameterEvidence[],measurementIds:string[],parentRevision:string|null}`. Per-parameter provenance dominates stage labeling; mass, COM, inertia and surface-pair friction are separate fields. Friction records identify both surfaces and conditions.
- `CalibrationReport = {id:string,profileBefore:string,profileAfter:string|null,fitParameters:string[],bounds:Record<string,[number,number]>,trainingTrialIds:string[],heldOutTrialIds:string[],residualUnits:Record<string,string>,trainingMetrics:Record<string,number>,heldOutMetrics:Record<string,number>|null,identifiabilityWarnings:string[],sourceHashes:Record<string,string>,status:'proposed'|'insufficient-data'|'evaluated'}`. Disjoint trial sets; null held-out results cannot be labeled validated. Extend `RunRecord` with `parameterProfileId:string` and `parameterProfileRevision:string`.

[Files]

New source files (all under the repository, additive to historical packages):

| Absolute path | Purpose |
|---|---|
| `/workspace/ieee/ieee/showcase-v11/index.html` | Editable scroll document; start from final v10 HTML, preserving reviewed diagrams/content and fixing overclaims |
| `/workspace/ieee/ieee/showcase-v11/showcase.css` | Responsive editorial layout, embedded studio, print and reduced-motion styles |
| `/workspace/ieee/ieee/showcase-v11/app.js` | Section navigation, inline studio mount, visibility/interaction management, fallback |
| `/workspace/ieee/ieee/robot-studio-v11/index.html` | Standalone shell for the same studio |
| `/workspace/ieee/ieee/robot-studio-v11/app.js` | Studio orchestration and event binding |
| `/workspace/ieee/ieee/robot-studio-v11/contracts.js` | Typedefs, schema checks and invariants |
| `/workspace/ieee/ieee/robot-studio-v11/coordinates.js` | Unit/frame conversions and pose interpolation |
| `/workspace/ieee/ieee/robot-studio-v11/scene.js` | Renderer, lighting, field, cameras and lifecycle |
| `/workspace/ieee/ieee/robot-studio-v11/assembly.js` | Instances of generated parametric parts, corrected deck, mockup, evidence inspection and clearly labeled reference exceptions |
| `/workspace/ieee/ieee/robot-studio-v11/mechanism.js` | Shared mechanism geometry, joint specifications and visualization |
| `/workspace/ieee/ieee/robot-studio-v11/replay.js` | Read-only historical trace adapter and playback |
| `/workspace/ieee/ieee/robot-studio-v11/telemetry.js` | Timeline, plots, diagnostics and result comparisons |
| `/workspace/ieee/ieee/robot-studio-v11/sim/worker.js` | Fixed-step worker entry and protocol |
| `/workspace/ieee/ieee/robot-studio-v11/sim/runtime.js` | Clock scheduling, run lifecycle, checkpoints and deterministic step orchestration |
| `/workspace/ieee/ieee/robot-studio-v11/sim/reference-plant.js` | Corrected v10 planar reference port, isolated from live contact integration |
| `/workspace/ieee/ieee/robot-studio-v11/sim/control.js` | Tested browser ports of mission, tracker, wheel control and safety logic |
| `/workspace/ieee/ieee/robot-studio-v11/sim/sensing.js` | Sensor/estimator adapters and explicitly labeled assistance |
| `/workspace/ieee/ieee/robot-studio-v11/sim/contact-world.js` | Approved engine adapter, body/collider/joint setup and drive coupling |
| `/workspace/ieee/ieee/robot-studio-v11/sim/exchange.js` | Contact-driven exchange controller and failure/recovery behavior |
| `/workspace/ieee/ieee/robot-studio-v11/sim/evaluation.js` | Delivery/retention/contact/parking diagnostics and conditional score |
| `/workspace/ieee/ieee/robot-studio-v11/parts-catalog.json` | BOM mapping and asset coverage, including missing/unselected parts |
| `/workspace/ieee/ieee/robot-studio-v11/scenarios.json` | Reviewed nominal, sensitivity and deliberate-failure configurations |
| `/workspace/ieee/ieee/robot-studio-v11/mechanisms.json` | Proposed joint/mount geometry, assumptions and historical references |
| `/workspace/ieee/ieee/robot-studio-v11/package.json` | Isolated build dependencies; only introduce after dependency approval |
| `/workspace/ieee/ieee/robot-studio-v11/package-lock.json` | Exact dependency resolutions/integrity after approved install |
| `/workspace/ieee/ieee/tools/export-studio-reference-v11.py` | Additive reference harness using existing Python classes, no monkeypatch of historical judge |
| `/workspace/ieee/ieee/tools/build-robot-studio-v11.js` | Bundle assets, worker and studio without external fetches |
| `/workspace/ieee/ieee/tools/build-showcase-v11.js` | Build the single-file document and provenance manifest |
| `/workspace/ieee/ieee/tools/evaluate-studio-v11.js` | Headless seeded synthetic scenario matrix |
| `/workspace/ieee/ieee/tools/check-showcase-v11-browser.js` | Direct-file offline browser, interaction, layout and failure-path checks |
| `/workspace/ieee/ieee/tools/verify-robot-studio-v11.js` | Build/data/source integrity and simulation evidence verifier |
| `/workspace/ieee/ieee/tools/verify-showcase-v11.js` | Single-file asset completeness, citations, labels and reproducibility |
| `/workspace/ieee/ieee/tests/robot-studio-v11.test.js` | Geometry, schema, lifecycle and reference parity tests |
| `/workspace/ieee/ieee/tests/studio-contact-v11.test.js` | Solver/contact/exchange/failure and convergence tests |
| `/workspace/ieee/ieee/tests/showcase-v11.test.js` | HTML build and embedding/offline assertions |
| `/workspace/ieee/ieee/tests/fixtures/studio-reference-v11.json` | Versioned Python comparison vectors with source hashes |
| `/workspace/ieee/ieee/derived/robot-studio-v11/README.md` | Architecture, reproduction commands, model boundary and limits |
| `/workspace/ieee/ieee/derived/robot-studio-v11/asset-audit.json` | Exact/approximate/missing parts, licensing and collision approximation evidence |
| `/workspace/ieee/ieee/derived/robot-studio-v11/reference-runs.json` | Historical/reference export, separate from live results |
| `/workspace/ieee/ieee/derived/robot-studio-v11/evaluation.json` | New runs and complete failure statistics |
| `/workspace/ieee/ieee/derived/robot-studio-v11/build-manifest.json` | Inputs, engine/dependencies, assets and output hashes |
| `/workspace/ieee/ieee/derived/showcase-v11/build-manifest.json` | Showcase input/output hashes |
| `/workspace/ieee/ieee/derived/showcase-v11/browser-validation.json` | Actual tested browsers/viewports/offline results and limitations |
| `/workspace/ieee/ieee/derived/showcase-v11/screenshots/` | Reviewed overview, assembly, exchange, failure and narrow-layout images |
| `/workspace/ieee/ieee/share/Showcase-v11.html` | Main offline deliverable |
| `/workspace/ieee/ieee/share/Robot-Studio-v11.html` | Optional standalone studio, not a showcase runtime dependency |

Modify `/workspace/ieee/ieee/README.md` and `/workspace/ieee/ieee/PROJECT-STATUS.md` only after accepted milestones, reporting precisely what works. Update `/workspace/ieee/ieee/derived/club-update-v10/CONVERSATION-PREP.md` and `/workspace/ieee/ieee/derived/club-update-v10/DEMO-RUN-SHEET.md` to rehearse the new scroll workflow and remove statements implying the owner personally reviewed work without confirmation. Do not strengthen electrical, legal or procurement advice in presentation copy.

No file deletions or moves. Do not modify old studio sources, pinned PDFs, old derived reports/manifests, historical simulation source inputs or archived source assets. Add any newly licensed vendor assets under `/workspace/ieee/ieee/sources/hardware-v11/` with retrieval records rather than overwriting existing sources. Preserve owner-only prep boundaries.

### Additional CAD and BOM files

All files below are new; the historical Order A BOM and v7/v10 generators remain unchanged.

| Absolute path | Purpose |
|---|---|
| `/workspace/ieee/ieee/cad-v11/README.md` | Rebuild instructions, frame/datums, parameter evidence and source ownership |
| `/workspace/ieee/ieee/cad-v11/contracts.py` | Validate parameter/specification JSON before geometry generation |
| `/workspace/ieee/ieee/cad-v11/registry.py` | Explicit part-generator registry; no arbitrary execution from imported JSON |
| `/workspace/ieee/ieee/cad-v11/parts/drivetrain.py` | Parametric motor exterior, bracket, hub, wheel and caster components with separated moving parts |
| `/workspace/ieee/ieee/cad-v11/parts/structure.py` | Parametric deck, risers, square mockup and mechanism mount |
| `/workspace/ieee/ieee/cad-v11/parts/mechanisms.py` | Fork, pin, jaws, lift and mounting proposals with named joints |
| `/workspace/ieee/ieee/cad-v11/parts/accessories.py` | Supported fasteners, connector envelopes and documented electronics exteriors; unselected reservations remain distinct |
| `/workspace/ieee/ieee/cad-v11/assembly.py` | Datum-based placement and joint-frame export |
| `/workspace/ieee/ieee/cad-v11/export.py` | STEP/STL/GLB and collision exports, units, stable identifiers and metadata normalization |
| `/workspace/ieee/ieee/cad-v11/parts.json` | Source-driven geometry parameters, reference IDs and model specifications |
| `/workspace/ieee/ieee/cad-v11/assemblies.json` | Explicit alternative configurations and parameter propagation |
| `/workspace/ieee/ieee/cad-v11/environment.json` | Exact approved Python/CadQuery/conversion toolchain versions |
| `/workspace/ieee/ieee/procurement-v11/candidates.json` | Retained and proposed SKU-specific candidates, evidence gaps and dated checks |
| `/workspace/ieee/ieee/procurement-v11/requirements.json` | Role-specific hard gates and required evidence; baseline budget context |
| `/workspace/ieee/ieee/procurement-v11/decisions.json` | Reasons for retain/replace/defer and proposed BOM diffs |
| `/workspace/ieee/ieee/sources/parts-v11/references.json` | Provenance and rights ledger for reference material; approved archived files only |
| `/workspace/ieee/ieee/tools/build-cad-v11.py` | Build selected audited parts/assemblies into a new output directory |
| `/workspace/ieee/ieee/tools/audit-parts-v11.js` | Evidence completeness, pack quantities, candidate gates and substitution impact |
| `/workspace/ieee/ieee/tools/verify-cad-v11.js` | Manifest, export geometry, source dependency and assembly checks |
| `/workspace/ieee/ieee/cad-v11/tests/test_parts.py` | Solid validity, datums, critical dimensions and parameter variation |
| `/workspace/ieee/ieee/cad-v11/tests/test_assembly.py` | Mating, moving frames, fit and configuration propagation |
| `/workspace/ieee/ieee/tests/parts-audit-v11.test.js` | Qualification, price pack arithmetic and stale evidence cases |
| `/workspace/ieee/ieee/derived/cad-v11/` | Generated STEP/STL/GLB/collider assets, fidelity reports and manifest; no hand edits |
| `/workspace/ieee/ieee/derived/procurement-v11/` | Proposed BOM CSV/Markdown, coverage table, alternatives and change-impact report |
| `/workspace/ieee/ieee/THIRD-PARTY-NOTICES-v11.md` | Approved dependency/asset notices, without relicensing old files |
| `/workspace/ieee/ieee/robot-studio-v11/parameter-profiles.json` | Bounded pre-purchase and datasheet-informed profiles; no fabricated measurements |
| `/workspace/ieee/ieee/robot-studio-v11/measurements.js` | Browser measurement/profile import, validation and before/after preview; export only on user action |
| `/workspace/ieee/ieee/tools/calibrate-studio-v11.js` | Offline bounded parameter fitting and held-out trial reporting, separate from policy training |
| `/workspace/ieee/ieee/tools/import-measurements-v11.js` | Additive E02/E03 and component-record adapter with immutable provenance |
| `/workspace/ieee/ieee/measurements/studio-v11/README.md` | Measurement record conventions and raw/derived separation; no manufactured observations |
| `/workspace/ieee/ieee/derived/robot-studio-v11/measurement-template.json` | Empty template for later owner-supplied measurements |
| `/workspace/ieee/ieee/tests/studio-measurements-v11.test.js` | Units, uncertainty, missing data, profile revision and split-leakage tests |

The new studio build consumes `/workspace/ieee/ieee/derived/cad-v11/manifest.json`, not old vendor GLBs by default. The generated BOM and studio catalogue both derive from `candidates.json` plus assembly instances; do not maintain incompatible copies. CadQuery tests need an explicit documented command because the existing Node runner does not automatically discover this new Python test directory. Extend the new CAD verifier with an opt-in reproduction mode, or document the additional suite in the final release checklist; do not claim the original check-all automatically covers it.

[Functions]

### Additional new functions

- `/workspace/ieee/ieee/robot-studio-v11/measurements.js`: `validateMeasurement(value):MeasurementRecord`, `proposeProfileUpdate(profile,records):object`, `compareProfiles(before,after):object`, `importProfile(text,assembly):ParameterProfile`; parse JSON only, enforce matching part/config identities and preserve source assumptions for unmeasured fields.
- `/workspace/ieee/ieee/tools/import-measurements-v11.js`: `adaptBenchSummary(summary,partIds):MeasurementRecord[]`, `writeRevision(records,outDir):object`; map E02/E03 semantics explicitly, reject incompatible trials and refuse overwrites. No reclassification of synthetic fixtures as physical data.
- `/workspace/ieee/ieee/tools/calibrate-studio-v11.js`: `splitTrials(trials,heldOutIds):object`, `fitParameters(training,profile,bounds):Promise<CalibrationReport>`, `evaluateHeldOut(report,trials):Promise<object>`; deterministic bounded coarse-to-fine search using the tested simulator, physical plausibility constraints and explicit insufficient-data outcomes. Reuse existing numeric primitives and Node facilities; no new ML library or reinforcement-learning dependency for this milestone.

- `/workspace/ieee/ieee/cad-v11/contracts.py`: `validate_part_spec(value: dict) -> dict`, `validate_parameters(value: dict) -> dict`; reject unsupported units, missing critical data, invalid ranges and unresolved conflicts before qualified export.
- `/workspace/ieee/ieee/cad-v11/registry.py`: `get_generator(part_type: str) -> Callable`; allowlisted registered modules only.
- `/workspace/ieee/ieee/cad-v11/parts/drivetrain.py`: `build_motor_exterior(spec: dict) -> dict`, `build_bracket(spec: dict) -> dict`, `build_hub(spec: dict) -> dict`, `build_wheel(spec: dict) -> dict`, `build_caster(spec: dict) -> dict`. Return named CadQuery solids, datums, material identifiers and omissions; do not fuse rotating wheel/hub with stationary motor housing.
- `/workspace/ieee/ieee/cad-v11/parts/structure.py`: `build_deck(spec: dict) -> dict`, `build_riser(spec: dict) -> dict`, `build_mount(spec: dict) -> dict`; preserve corrected baseline as a named historical comparison, not a universal configuration.
- `/workspace/ieee/ieee/cad-v11/parts/mechanisms.py`: `build_fork(spec: dict) -> dict`, `build_guided_pin(spec: dict) -> dict`, `build_jaw_lift(spec: dict) -> dict`; explicit joint axis/limits and parametric mounting.
- `/workspace/ieee/ieee/cad-v11/parts/accessories.py`: `build_fastener(spec: dict) -> dict`, `build_documented_enclosure(spec: dict) -> dict`, `build_reservation(spec: dict) -> dict`; distinguish approximate threads/cosmetics from critical mating geometry.
- `/workspace/ieee/ieee/cad-v11/assembly.py`: `assemble(spec: dict, parts: dict) -> dict`, `check_mates(assembly: dict) -> list`, `export_joint_frames(assembly: dict) -> list`; stable datum transforms and no automatic rescaling.
- `/workspace/ieee/ieee/cad-v11/export.py`: `export_part(part: dict, out_dir: Path) -> dict`, `export_collision(part: dict, policy: dict) -> dict`, `check_export_fidelity(part: dict, artifacts: dict) -> dict`; use the already-present conversion stack where supported and verify the exact version APIs before implementation.
- `/workspace/ieee/ieee/tools/build-cad-v11.py`: `build(config_path: Path, out_dir: Path) -> dict`, `main() -> None`; source hash, canonical output metadata and explicit overwrite protections.
- `/workspace/ieee/ieee/tools/audit-parts-v11.js`: `auditCandidate(candidate,requirements,references):object`, `compareCandidates(candidates,requirements):object`, `computeBom(instances,candidates):object`, `assessSubstitution(change,dependencyGraph):object`, `build():object`; unknowns remain unknown, critical failures cannot be outweighed by cosmetic scores.
- `/workspace/ieee/ieee/tools/verify-cad-v11.js`: `verify(options={}):object`; validate provenance and export invariants; report separately whether expensive regeneration/Python tests ran.

No new CAD classes are required: follow existing function-based CadQuery conventions. JSON contracts carry metadata; do not add a second elaborate class framework. Existing function/class modifications and removals remain none. New studio functions below must consume the added manifests/evidence fields.

New exported functions, grouped by absolute module path:

- `/workspace/ieee/ieee/robot-studio-v11/contracts.js`: `validateScenario(value):ScenarioConfig`, `validateRun(value):RunRecord`, `validateCatalog(value):PartRecord[]`, `validateWorkerMessage(value):WorkerRequest|WorkerReply`; reject nonfinite/negative dimensions, duplicate IDs, unsupported versions and ambiguous units.
- `/workspace/ieee/ieee/robot-studio-v11/coordinates.js`: `fieldInchesToWorld(x,y,z):Vec3`, `robotMmToWorld(point):Vec3`, `worldToFieldInches(point):Vec3`, `interpolatePose(a,b,alpha):object`; explicit sign conventions and shortest-angle/quaternion interpolation only for rendering.
- `/workspace/ieee/ieee/robot-studio-v11/scene.js`: `createScene(canvas,options):object`, `buildField(fieldData,assets):object`, `setCameraPreset(scene,id,target):void`, `disposeScene(scene):void`; use v10 field data instead of hand-entered v8 markings and undersized toy cars.
- `/workspace/ieee/ieee/robot-studio-v11/assembly.js`: `loadPartAssets(catalog,embedded):Promise<object>`, `buildRobot(config,assets):object`, `applyRobotSnapshot(robot,snapshot):void`, `setInspectionMode(robot,options):void`, `auditAssembly(config,catalog):object`; no geometry scale deception, explode mode is inspection only.
- `/workspace/ieee/ieee/robot-studio-v11/mechanism.js`: `buildMechanism(spec,assets):object`, `buildCollisionSpec(spec):object`, `applyMechanismSnapshot(group,state):void`; visual and physics pivots come from one specification.
- `/workspace/ieee/ieee/robot-studio-v11/replay.js`: `adaptReferenceRun(raw):RunRecord`, `sampleReplay(run,timeS):FrameSnapshot`, `findEventTime(run,type):number|null`; preserve missing telemetry and historical qualifications.
- `/workspace/ieee/ieee/robot-studio-v11/sim/reference-plant.js`: `initialState():object`, `plantStep(state,input,dt):object`, `motorElectricalStep(state,input,dt):object`; corrected v10 equations and original-source attribution, with electrical helper reusable by contact drive.
- `/workspace/ieee/ieee/robot-studio-v11/sim/contact-world.js`: `initializeEngine(bytes):Promise<object>`, `buildContactWorld(engine,scenario,assets):object`, `applyDriveTorques(world,commands,dt):void`, `collectContacts(world):object[]`; solver alone owns live body integration.
- `/workspace/ieee/ieee/robot-studio-v11/sim/evaluation.js`: `evaluateDelivery(world,criteria):object`, `evaluateCapture(world,criteria):object`, `evaluateRetention(history,criteria):object`, `evaluateMission(run,criteria):RunResult`; diagnostics distinct from controller sensing and score claims.
- `/workspace/ieee/ieee/showcase-v11/app.js`: `mountShowcase(root,data):Promise<object>`, `activateChapter(id):void`, `setStudioInteraction(enabled):void`, `showFallback(reason):void`; visible narrative without JavaScript and accessible error states.
- `/workspace/ieee/ieee/tools/export-studio-reference-v11.py`: `run_reference(case)->dict`, `capture_control_vectors()->dict`, `export_reference(output_dir)->dict`, `main()->None`; import unchanged modules, export timing/true and estimated pose/angles/events and explicit timed-exchange status.
- `/workspace/ieee/ieee/tools/build-robot-studio-v11.js`: `data():object`, `bundle():object`, `build():object`, `generate():object`; follow existing builder conventions, escape script terminators, embed worker/WASM/assets and third-party notices.
- `/workspace/ieee/ieee/tools/build-showcase-v11.js`: `build():object`, `generate():object`; import the same bundle/data once, avoid nested copies of 13 MB HTML.
- `/workspace/ieee/ieee/tools/evaluate-studio-v11.js`: `evaluateScenario(config):Promise<RunRecord>`, `evaluateMatrix(configs):Promise<object>`; record failures, not just selected successful runs.
- Both new verifier files export `verify():object` with no writes; browser checker exports `run():Promise<object>` and writes explicitly requested evidence only.

Modified existing functions: none planned. Existing v8 functions are reference material, not silently redefined in the frozen package. Removed functions: none. The new runtime replaces spline driving only in the new v11 app.

[Classes]

- `/workspace/ieee/ieee/robot-studio-v11/sim/runtime.js`: new `SimulationRuntime`, no inheritance; constructor accepts engine/factories/scenario, methods `initialize()`, `stepTicks(count)`, `pause()`, `reset(config)`, `snapshot()`, `restore(checkpoint)`, `dispose()`. Owns authoritative clocks and complete state.
- `/workspace/ieee/ieee/robot-studio-v11/sim/control.js`: new ports `Supervisor`, `MissionDriver`, `Tracker`, `DriveShaper`, `WheelSpeedController`, `SafetyMonitor`, retaining corresponding Python constructor semantics and public update/step/reset methods. Document each source path and parity coverage. No inheritance unless the source behavior requires it.
- `/workspace/ieee/ieee/robot-studio-v11/sim/sensing.js`: new `SensorSuite` with `measure(world,dt)` and explicit mode/seed; new `Estimator` with `predict()`, `correct()`, `pose()`, `snapshot()` and `restore()`. Rendered camera imagery is not a claimed implemented vision detector.
- `/workspace/ieee/ieee/robot-studio-v11/sim/exchange.js`: new `ExchangeController` with `reset(config)`, `step(observations,dt)`, `outputs()`, `snapshot()`, `restore()`; finite phases, bounded attempts and observable failure reasons.
- `/workspace/ieee/ieee/robot-studio-v11/app.js`: new `StudioController` with `mount()`, `setMode()`, `selectScenario()`, `play()`, `pause()`, `seek()`, `reset()`, `getDiagnostics()`, `dispose()`; isolate UI from model stepping.

Modified/removed existing classes: none. Do not alter hardware arming behavior or make the current firmware entry point start missions.

[Dependencies]

Keep vanilla HTML/CSS/JavaScript, Node built-ins, existing Python standard-library harnesses, Three.js 0.170.0 and esbuild 0.24.0. Keep existing geometry tooling where needed, including recorded CadQuery/GLB conversion versions; do not regenerate sealed inputs.

CAD additions reuse confirmed CadQuery 2.8.0 and Python 3.12; the existing asset pipeline records cascadio 0.1.1 and trimesh 5.2.0. Verify these installed versions and transitive requirements before locking the v11 environment. Do not blindly upgrade to a documentation site's latest version or add a competing CAD kernel. No paid CAD subscription, vendor cloud authoring service or proprietary plugin is required. Open-source dependencies still require retaining their notices; approve licensing of newly authored sources separately from dependency licenses.

New full-contact dependency gate: proposed `@dimforge/rapier3d-compat`. It is not confirmed in this codebase and must not be used until explicitly approved. At adoption, verify an exact published version/API/license, pin it in the isolated package and lockfile, record integrity and bundle notices, and run a direct-file offline worker contact smoke test before implementing the full world. Do not use wildcard versions or a CDN. No unverified version number is prescribed here. If the dependency is declined, stop the full-contact milestone for a revised design rather than falsely labeling an animation as physics.

Use an existing Playwright installation as the project does; record actual executable/version and GPU backend instead of assuming old hard-coded cache paths still exist. No Python-in-browser runtime, React, remote services or server requirement for the final artifact. Simulation worker uses bundled Blob code; include a deliberately throttled main-thread fallback if Blob workers are unavailable, with visible performance limitations. On missing WebAssembly/WebGL, show the embedded static/reference fallback without claiming live execution.

[Testing]

1. Baseline: verify worktree/reservation and record `node /workspace/ieee/ieee/tools/check-all.js` before code changes. Only run compatible builds/tests in the authorized project environment; do not start a second agent or Docker layer. A failed baseline is documented before proceeding.
2. Historical integrity: hash all reused old inputs; compare before/after. Existing 35 checks are historical context, not a promise of the new count. New `verify-*.js` files are automatically discovered by check-all; no runner edits expected.
3. Coordinates and assets: known field corners, 202 mm track, 80 mm nominal wheels, 7 mm shaft offset, corrected support heights, left/right rotation signs, tire orientations; BOM quantity/SKU mapping; no unintentionally shared mutable transforms; custom/approximate labels visible. Retain motor-gap failure.
4. Reference parity: export Python samples with exact sources. Compare pure control decisions and events exactly for captured inputs; numeric state uses documented per-field tolerances (initial goal 1e-6 in internal scalar units for equivalent planar calculations). Cover nominal, spin, braking, low voltage, saturation, stale command, e-stop, sensor faults, retry and bail-out. Never relax a tolerance to conceal a sign/unit bug.
5. Contact primitives: drop/rest, inclined slip trend, annular-bore clearance, blocked jaw, force-limited joint, static friction bounds, dynamic obstacle impulse, chassis-wall blocking, no nonfinite state. Check mass/inertia ownership and equal/opposite reactions. Compare half-step results, publish maximum penetration and drift, and reject gross tunneling rather than hiding it visually.
6. Mechanism tests: original delivery, flat and upright replacement approach, lateral/yaw errors, weak actuator, low friction, lost grasp under braking/turns, deliberate jam, floor interference, successful bench release and recovery. Tests assert predicates and failure causes, not an all-success target. Verify no tire pose assignment/parenting shortcut in live mode.
7. Mission integration: three pit boxes; safe/aggressive/drive-only; empty and guide-size obstacle fields; original tire retained until delivery; replacement present through finish; failed exchange retries/bail-out; wall contact and prolonged stalls; end-of-run parking. Route-end lap events remain explicitly inherited approximations unless separately replaced by modeled line sensing.
8. Scenario reproducibility: same seed/config/version and insertion order reproduce within stated tolerances; full snapshot restore reproduces continued controller/mechanism behavior. Random initial geometry is generated deterministically and persisted. Changed settings produce a new run ID and clear incompatible results.
9. Offline HTML: build twice and compare deterministic hashes, open via `file://` with offline networking, assert zero external requests, no console errors and no missing font/model/worker/WASM. Inspect script escaping, load failures, context loss, worker termination and fallback. Core experience works after copying only the final HTML elsewhere.
10. Interaction/layout: 1440x900, 1366x768, 1024x768 and narrow 390x844; keyboard focus, screen-reader names, contrast, reduced motion, print, ordinary scrolling over the canvas, explicit interaction exit, full-screen, camera reset, chapter jump, seek/restart and all scenario controls. No invisible content depending on IntersectionObserver success.
11. Performance: record startup time, final file size, physics ticks/s, frame rate and memory over repeated reset/mode switches on tested machines. Reuse geometry and dispose owned GPU/worker resources. Target 30 fps interaction on the meeting laptop, but report actual performance; simulated time may run slower than real time without altering physics.
12. Evidence freshness: browser report references final HTML hash; manifests do not create circular self-hashes. Finish generation before verifiers. Run `node /workspace/ieee/ieee/tools/check-all.js` with no concurrent edits, then new browser checks and targeted tests as appropriate. Secrets checks required before shipping/commit, including embedded data; investigate token-shaped base64 matches rather than blanket exclusions. Do not commit or push automatically merely because planning was approved.

[Implementation Order]

### Mandatory revision to the sequence below

Before the earlier step 2, audit current BOM candidates against the new documentation requirements, verify reference rights, and produce proposed substitutions with full compatibility/cost impact. Before step 3, implement and test the additive CadQuery source pipeline and evidence-backed generators. Step 3 uses its generated assets, not default vendor-mesh imports. A missing critical part model blocks claims of a complete SKU-matched assembly, but permits a labeled reservation or bench prototype milestone.

After any substitution, regenerate affected geometry/physics/configuration and rerun parity only against the appropriate baseline. Preserve the unchanged original configuration for historical replay. Add CAD unit tests, evidence/quantity tests, and source-license audit to each release gate. The final source package must reconstruct the model without a proprietary CAD application; offline HTML usability remains a separate acceptance check.

1. Confirm approval, project execution/reservation and dependency decision. Re-read this plan and current Git status. Record baseline checks, historical hashes, approved dependency/license and exact runtime versions. No purchases, visibility changes or hardware actions.
2. Build the v11 source/builder skeleton from final v10 HTML and additive studio modules. Establish contracts, coordinate tests, asset catalogue and missing-model ledger. Keep the narrative usable with no live engine.
3. Build corrected mule and separate square mockup with generated, evidence-backed parametric parts. Add selection, inspect/explode, section cameras and collision overlays. Verify geometry against documented source features and disclose incomplete details before adding motion.
4. Export reference trajectories and controller vectors without touching historical sources. Integrate faithful recorded 3D mission playback; clearly label timed tire exchange as historical and do not animate it as solved gripping.
5. Deliver presentation milestone A: self-contained scroll document with embedded studio, parts coverage, historical replay, concept-on-assembly inspection, physics explanation and honest limits. Validate and retain a stable local fallback for the meeting. This is not completion of the requested full simulator.
6. Port and test pure control, sensing and corrected reference plant. Establish deterministic worker protocol, fixed clocks, telemetry and full checkpoint lifecycle. Run controller parity before joining it to a new physical world.
7. Prove approved contact engine offline with drop/contact/joint tests, then a motor-driven chassis test. Settle wheel torque, body integration, support loading and collision representations. Gate further work on stable behavior, no double integration and measured runtime performance.
8. Develop mounted mechanism prototypes and two-tire exchange bench. Implement joint limits/force limits, bore-preserving collision shapes, delivery/capture/retention predicates and failure cases. Record missing actuator/sensor hardware rather than selecting products implicitly.
9. Couple ExchangeController to live mission control; obstacles physically resist motion, wheels respond through drive physics, retained tires remain dynamic. Exercise retry, jam, drop, bail-out and parking. Keep new failures visible; redesign proposed geometry openly if needed.
10. Add scenario editing/reset, live/reference comparison, inspection overlays, telemetry/plots and complete run export/import. Showcase sections explain changed assumptions and why historical 91/91 is not a prediction for this new model.
11. Run scenario matrix, convergence checks, snapshot tests, offline tests and browser/performance/accessibility review. Record agent-run results with source/engine hashes. Keep unresolved limitations as release blockers where necessary.
12. Finish source/asset credits and repeatable build manifests. Update navigation/status and owner rehearsal notes to only the validated milestone. Run full checks without concurrent edits, secrets review, and inspect final HTML directly. Report completed work, measured failures, missing hardware/CAD, and remaining qualification work; ask separately before committing/pushing or changing access.

## Acceptance and handoff

Full implementation is complete only when one copied HTML can run the new live model offline; detailed robot motion comes from the simulator; mechanisms are physically situated on the assembly; tire outcomes are contact/state-based and can fail; part identity/unknowns are visible; historical results are preserved; and tests/evidence describe the actual final artifact. Software passing does not establish hardware reliability or competition legality.

No finite simulation validates real grip, tire material behavior, actual actuator sizing or the real competition field. Those remain physical measurement/test work. No deadline promise is attached to the full-development milestone.

## Additional acceptance tests for the revised CAD/BOM scope

- A geometry-ready component with unknown measured mass must still build; live runs require an explicit positive assumed mass with visible provenance rather than silently defaulting to zero. Missing critical geometry produces an incomplete-fit status while permitting labeled visual prototyping.
- Measurement import rejects unit mismatch, wrong SKU/revision, nonfinite samples, implausible bounds and attempts to overwrite raw records. Entering mass must not change friction, torque or geometry implicitly. Geometry changes require a new local CAD build, not mesh stretching in the browser.
- Verify profile switching creates a new run and preserves old results. Synthetic identification fixtures test algorithm recovery with labels `synthetic`; they never populate the owner's physical-measurement directory.
- Calibration tests enforce disjoint whole-trial train/held-out sets, evaluate the same residual units, expose nonidentifiability, and refuse predictive claims with no held-out physical trials. Sensitivity runs distinguish input assumptions from observed outcomes.

- Rebuild a bracket and wheel from parameter source in the pinned environment; change an allowed parameter and confirm CAD, mesh, mating checks and manifest all update. Never silently change a purchased SKU parameter without creating a hypothetical/custom variant ID.
- Test unknown/missing/conflicting critical dimensions, inches/mm confusion, installed-versus-pack quantities, stale price checks and unsupported revisions. Qualification must fail closed on critical missing evidence.
- Compare exported bounds, hole axes, shaft/bore flats, named datums and rotating groups against input evidence within feature-specific tolerances. Tesselation tolerance is not manufacturing tolerance or product-match accuracy. Preserve documented discrepancies rather than widening thresholds to pass.
- Exercise baseline retention and a synthetic candidate substitution; confirm all dependent hashes and simulation configuration change, and historical result attribution does not transfer.
- Test mass/COM/inertia override provenance; missing internal construction must not be converted into a homogeneous-solid physical claim. Ensure cosmetic display LOD changes do not change the physics configuration.
- Verify every redistributed asset's approval and notices. Unknown rights block embedding that asset, not an entire research comparison. No invented whole-repository license or claim that independently editable models automatically reproduce proprietary internals.
- Label each part's source mode, exact product identity, modeled/omitted features and evidence coverage in the HTML. Include a reproducible source export/manifest and distinguish freely editable local source from the offline viewer's limited controls.
- Additional commands after implementation: `uv run --no-project --python 3.12 --with cadquery==2.8.0 python -B -m unittest discover -s /workspace/ieee/ieee/cad-v11/tests`; `node /workspace/ieee/ieee/tools/verify-cad-v11.js`; `node --test /workspace/ieee/ieee/tests/parts-audit-v11.test.js`. Document any further exact conversion dependencies required by tests. Run existing full checks and offline browser checks as already specified; do not claim tests executed during planning.

## Handoff decision

Latest emphasis: move forward with discoverable appearance/dimensions and configurable pre-purchase physics, then support owner measurement-driven calibration. Do not make complete physical characterization a prerequisite for the useful digital model. After implementation approval, sequence the initial whole-BOM evidence pass, geometry-ready CadQuery assembly and integrated live model first; implement measurement import alongside the parameter controls, with data fitting gated on actual suitable trials. Do not postpone this practical milestone for speculative motor internals or policy training.

Only this planning document is changed. Ask the user to approve implementation of the revised documentation-qualified BOM research, editable CadQuery model pipeline, integrated showcase and live simulation. Approval is not a purchase instruction. Rapier remains a proposed new dependency requiring confirmation/pinning; part substitutions remain reviewable digital-study proposals. The achievable commitment is transparent, evidence-backed fidelity—not an unsupported guarantee that every commercial product's dimensions, internals and material behavior are discoverable online.