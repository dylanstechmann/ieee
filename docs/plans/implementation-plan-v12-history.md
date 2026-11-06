# Implementation Plan

[Overview]
Advance the single-file offline robot showcase from its working v11 demonstration into a reproducible, configuration-consistent study with stronger contact evidence, complete assembly exports and an explicit competition-field live-study mode.

Planning date: November 5, 2026. The user's latest direction explicitly authorizes implementation immediately after planning; no additional routine approval is required. Preserve the working v11 HTML and historical results; create `/workspace/ieee/ieee/share/Showcase-v12.html` as the new delivery. Preserve the previous plan at `/workspace/ieee/ieee/docs/plans/implementation-plan-v11-history.md`. No purchases, commits, publishing, credential changes, destructive cleanup or hardware operation are authorized.

Investigation found JavaScript/CommonJS pure modules bundled with esbuild, browser ESM/Three.js, Rapier 0.12.0 with inline WASM, CadQuery 2.8.0 Python generators, Node tests and Python firmware/plant tests. The working demo uses an enlarged field, a level-plane chassis and ideal kinematic lift. Its nominal pass includes contact bumps. The v11 viewer duplicates mechanism geometry, exports only 19 core meshes, can report the baseline assembly identity after a wheel edit, and counts accumulated rather than uninterrupted acquisition contact. Missing product measurements remain explicit assumptions, not blockers for digital work.

Implementation priorities are consistency and truthful evidence, not silently replacing difficult physics with animation. Add live organizer-field attempts from the archived CAD extraction while retaining the successful demo mode. A failed competition-field attempt is valid output and must never be relabeled successful. Complete procedural mechanism/reservation exports and collision descriptors using shared records. Retain ideal lift and level-plane disclosure unless independently tested alternatives meet regression gates. Full physical qualification, perception, purchase-ready electrical design, arbitrary browser B-rep CAD regeneration and firmware parity are separate substantial work and are not claimed complete by this increment.

Workspace limitation: no IEEE managed-project registration/controller CLI is present in this legacy container. Existing provider extension processes at workspace root do not prove another agent is editing IEEE; avoid touching other worktrees, inspect changes and do not claim an exclusive managed lease.

[Types]
Continue plain JavaScript with explicit runtime validation; no TypeScript migration.

- `ArenaSpec`: `{id:string, label:string, board:{width:number,depth:number}, bounds:{minX:number,maxX:number,minZ:number,maxZ:number}, barriers:Array<{x:number,z:number,hx:number,hz:number,height:number,kind:string}>, start:{x:number,z:number}, loop:Array<{x:number,z:number}>, source:{x:number,z:number}, destination:{x:number,z:number}, sourceApproach:Array<{x:number,z:number}>, returnApproach:Array<{x:number,z:number}>, destinationApproach:Array<{x:number,z:number}>, park:{x:number,z:number}, gridStep:number, provenance:string, qualification:string}`. SI units; finite values; positive dimensions; organizer conversion `(x-48)*0.0254, -(y-24)*0.0254`.
- `AssemblyPrimitive`: `{id:string,partId:string,size:[number,number,number],position:[number,number,number],color:number,motion:'fixed'|'lift'|'gate',basis:string}`. Sizes positive metres, local Y up. Mechanism, caster spacers and generic electronics are explicitly proposed/reserved, never misidentified as selected products.
- `RunIdentity`: `{assemblyId:string,assemblyRevision:string,arenaId:string,physicalModelRevision:string,parameterProfileId:string}`; derived afresh for every reset. Report actual edited assembly identity, not embedded baseline.
- `ContactEvidence`: `{supportDuration:number,releaseDuration:number,sourceSupport:boolean,destinationSupport:boolean,finite:boolean}`. Acquisition duration resets on contact loss; release requires destination fixture contact and no fork support, not proximity alone.
- Extend `LiveMission` snapshots with arena ID, evidence and terminal reason, keeping existing fields for compatibility. Freeze validated parameter copies and returned configuration data where practical; invalid coordinates/parameters fail explicitly.

[Files]
New files:
- `/workspace/ieee/ieee/robot-studio-v11/arenas.js`: shared demo/organizer descriptors and coordinate conversion; no network dependency.
- `/workspace/ieee/ieee/robot-studio-v11/assembly-primitives.js`: complete shared procedural/reservation geometry and collision-study records.
- `/workspace/ieee/ieee/tests/studio-consistency-v12.test.js`: arena conversion, primitives, planner endpoints, immutable assembly identities and export coverage.
- `/workspace/ieee/ieee/share/Showcase-v12.html`: newly generated deliverable, preserving v11 output.
- `/workspace/ieee/ieee/derived/showcase-v12/`: complete GLB, assembly/collision manifests, live and browser reports/screenshots.
- `/workspace/ieee/ieee/docs/plans/implementation-plan-v11-history.md`: unchanged historical plan archive.
Existing files modified:
- `/workspace/ieee/ieee/robot-studio-v11/physics.js`: configurable arenas/targets, bounded planner, continuous support and destination-contact evidence, snapshot fields.
- `/workspace/ieee/ieee/robot-studio-v11/assembly.js`: shared primitive records and valid group/datum coverage.
- `/workspace/ieee/ieee/robot-studio-v11/app.js`: build procedural geometry from shared records; active config callback; maintain mode/render separation.
- `/workspace/ieee/ieee/robot-studio-v11/live-view.js`: shared arena rendering, exact current run identity, arena reset selector, contact telemetry and resource disposal.
- `/workspace/ieee/ieee/robot-studio-v11/panel.html`: live arena selector and honest outcome labels.
- `/workspace/ieee/ieee/tools/build-showcase-v11.js`: parameterized v12 target, source/dependency provenance and embedded shared data; preserve build API for tests.
- `/workspace/ieee/ieee/tools/export-assembly-v11.js`: complete primitive export and collision descriptors with input/output hashes under v12.
- `/workspace/ieee/ieee/tools/check-live-v11.js`: arena-aware reports; require demo regression while recording competition failures.
- `/workspace/ieee/ieee/tools/check-showcase-v11-browser.js`: v12 offline lifecycle, current edited run IDs, arena switch, pause/reset and terminal outcomes.
- `/workspace/ieee/ieee/tests/showcase-v11.test.js`, `/workspace/ieee/ieee/tests/live-physics-v11.test.js`: updated artifact targets, stronger evidence assertions.
- `/workspace/ieee/ieee/robot-studio-v11/README.md`, `/workspace/ieee/ieee/cad-v11/README.md`: actual completed scope, reproduction and remaining gaps.
No files deleted or moved. Historical field/BOM/firmware/v10 geometry and v11 HTML remain untouched.

[Functions]
New functions:
- `createArena(id:string, fieldData?:object):ArenaSpec` and `fieldPoint(x:number,y:number):{x:number,z:number}` in `/workspace/ieee/ieee/robot-studio-v11/arenas.js`.
- `assemblyPrimitives(config:object):AssemblyPrimitive[]` in `/workspace/ieee/ieee/robot-studio-v11/assembly-primitives.js`.
- `fixtureContact(which:'source'|'destination'):boolean` in `LiveMission` in `/workspace/ieee/ieee/robot-studio-v11/physics.js`.
Modified functions:
- `planPath(start,goal,obstacles,margin=0.16,arena=demo):Vec2[]`: finite bounds, exact endpoints checked, no corner cutting or clamping unreachable targets into success.
- `assemblyInstances(config)`: include primitives with source basis and motion group assignments.
- `createLiveView(options)`: receive `getConfig()` callback, construct arena from selected ID, export actual run identity; dispose textures/sprites on resets.
- `build(options={version:'v12'})` / `generate(options={version:'v12'})` in build tool: one fresh output, dependency version/hash inventory, assertions on insertion anchors.
- `run()` in export/check tools: target v12, source hashes and comprehensive geometry/report coverage.
- `rebuild()` in app: restore assembly transforms before clearing; same primitives as export and physics study.
No removed public functions. Existing tests and calls retain compatible defaults where possible.

[Classes]
Modify `LiveMission` in `/workspace/ieee/ieee/robot-studio-v11/physics.js`; no inheritance.
- Constructor `(RAPIER,overrides={},options={arenaId:'demo',fieldData:null})` stores validated ArenaSpec and immutable run input.
- `buildWorld()` consumes arena barriers/fixtures/start; chassis remains explicitly level-plane.
- `stand(point,which)` retains collider references for contact evidence.
- `navigate(goal)` passes exact arena/grid bounds and rejects unreachable goals.
- `controller()` consumes arena route/approach/parking targets and continuous contact evidence; realistic failures preserved.
- `step(withSnapshot=true)` records finite physics state, terminal reason and contact data; terminal results cannot become pass later.
- `snapshot()` includes source/geometry/model identifiers and evidence; `dispose()` releases Rapier resources once.
No new or removed classes. Keep exported baseline names to minimize regression risk.

[Dependencies]
No new dependency or package upgrades required. Retain cached Three.js 0.170.0, esbuild 0.24.0, Rapier 0.12.0, CadQuery 2.8.0, Node 24 and Python 3.12; record actual exact installed versions/hashes and reject incompatible versions. Rapier WASM remains inline for file-protocol offline use. Do not claim reproducibility from a private cache alone: document environment overrides and exact packages. Third-party license text remains embedded. No internet research is necessary for local code integration; any new product/electrical recommendation requires primary-source verification before inclusion.

[Testing]
1. Preserve baseline targeted tests; first verify the live nominal case and existing emitted artifact hashes.
2. Unit-test SI conversion against organizer wall/divider dimensions; test independent demo/organizer geometry with no scaling; validate planner finite inputs, out-of-bounds and occupied endpoints, exact goal segments and blocked routes.
3. Test every primitive has positive finite dimensions, a unique ID, a motion group and a clear basis. GLB node count must cover mesh instances plus all primitives. Match exported collision descriptors to shared source geometry; note conservative chassis envelope.
4. Run nominal and missing/weak/misaligned/slippery/blocked live cases. Acquisition must require uninterrupted elevated fork contact; release must require independently supported destination contact. Do not require all organizer-field attempts to pass; record failure reason and first failing phase rather than weakening clearance criteria.
5. Browser offline file loading: assembly transition, live/replay switching, pause/reset, wheel edit creates fresh identity and physical radius, arena selection resets world, run JSON reports current values, no unhandled errors/external requests and 390px layout fits.
6. Run CadQuery tests, syntax checks and secrets scan. Run full `/workspace/ieee/ieee/tools/check-all.js` with no simultaneous tree edits and logs outside repository. Read generated report and screenshots; preserve exact failure counts. Do not claim physical/GPU portability qualification.

[Implementation Order]
1. Save this plan and preserve prior plan and v11 HTML; latest user direction already authorizes implementation after planning. No additional routine question is necessary.
2. Add shared arena specifications, SI conversion and planner input/endpoint tests; run tests before integration.
3. Add complete shared primitive descriptors; wire viewer/export and emit v12 GLB/collision records.
4. Generalize LiveMission world/waypoints to ArenaSpec; keep demo regression working and expose exact organizer attempts separately.
5. Strengthen continuous acquisition and independent release contact evidence; diagnose any exposed baseline failure without bypassing physical checks.
6. Bind actual active assembly identity and wheel radius into resets/reports; correct resource/mode reset behavior and add tests.
7. Integrate v12 offline document, arena controls, updated assumptions and source/dependency inventory.
8. Run scenario studies and browser checks, inspect screenshots and fix failures. Record competition limitations without making another enlarged-field substitution.
9. Finish documentation and run isolated full regression, CAD, whitespace and secrets checks. Deliver one final response with the HTML path, actual tests, demonstrated scope and concrete remaining blockers; no routine approval requests.

## Execution results — November 5, 2026

Implemented the bounded v12 increment above without a routine continuation prompt.
Deliverable: `/workspace/ieee/ieee/share/Showcase-v12.html` (4,235,293 bytes).
V11 HTML and archived v11 reports were not regenerated. Complete export has
19 core CAD meshes plus 11 shared proposed/reservation primitives; moving tray
boxes share coordinates across viewer, physics and GLB. The collision study
explicitly distinguishes active contact boxes from packaging reservations.

Organizer-CAD mode now completes the digital three-lap pickup/carry/release/park
mission at nominal settings in 179.91 simulated seconds and at reduced cruise
speed in 211.13 seconds. Both recorded zero **chassis obstacle contact events**;
this is not a certificate that every mechanism surface is collision-free. The
field remains exactly the archived 96 × 48 inch board with the archived divider
geometry. Proposed tire rail fixtures are placed in pit boxes; these are not
organizer tire hardware. Lap gates are geometric, not official competition scoring.
The enlarged demo still completes in 371.43 seconds with contact bumps.

Evidence gates require uninterrupted elevated fork contact and actual destination
rail contact without fork support. Tests cover interrupted contact, immutable
terminal state, independent snapshots and idempotent disposal. Corrected an
integration regression that entered acquisition before lowering the tray: the
controller now waits until the tray is below 1 mm before approaching the tire.
A wheel input blur also used to reset an unchanged value and silently return to
assembly; unchanged edits now do nothing, and browser tests cover the real flow.

Failure scenarios remain visible, not forced to pass: missing/misaligned tire,
weak actuator, slippery transport, blocked release and 0.12 kg payload release.
The nominal 0.08 kg payload result is not generalized to the heavier case.

Validation: 21 targeted Node tests; 3 CadQuery tests; 16 offline browser checks,
zero external requests and zero page errors; 35/35 full-regression steps passed
with no stages skipped (274 Node tests, 138 software Python tests and 67 firmware
host tests). The regression checker verified its run did not change the tracked
diff or untracked file list; its state check is not an independent content hash
of every pre-existing untracked file. Full report/log: `/tmp/ieee-v12-full.json`
and `/tmp/ieee-v12-full.log`. Summary and scenario evidence:
`/workspace/ieee/ieee/derived/showcase-v12/validation-summary.json`.

Changed-source/HTML secrets scan is clean (20 files). Whole-worktree scan flags
one Brave-shaped substring inside an unchanged v10 embedded base64 PNG. Decoding
confirmed PNG signature 89504e470d0a1a0a and 238787 image bytes: image-payload false
positive, not a credential assignment. Historical HTML was preserved. Whitespace
check passed. No purchases, commits, pushes, publishing or hardware operations.

Remaining original requirements are not complete: shaft/interface fit and motor
gap disputes, selected electrical/lift hardware, complete manufacturable mechanism
CAD, official competition mechanisms/scoring, firmware parity, physical parameter
calibration, arbitrary browser B-rep regeneration, tip/compliance modeling and
hardware qualification. Managed workspace exclusivity remains unestablished.
