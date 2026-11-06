# Implementation Plan

[Overview]
Build an offline v13 CAD/simulation showcase in which the selected Order A drivetrain looks like the listed parts, uses source-evidenced dimensions, and is assembled and checked with open-source software.

The repository root is now `/workspace/ieee`; all paths below use that root and no stale `/workspace/ieee/ieee` prefix. “No proprietary vendor CAD” is interpreted as **no proprietary CAD application**: use CadQuery/OpenCASCADE and the repository’s existing open-source conversion/rendering tools. Archived manufacturer STEP and PDF files remain neutral reference evidence, with attribution and source hashes; using them does not make them open-source software. No SolidWorks, Fusion 360, Onshape, AutoCAD, or Blender dependency is needed.

The selected baseline in `order-a-procurement-v4.json` is Pololu #4754 motors, #1995 brackets, #1083 hubs, #1430 wheels, #953 casters, and #1962 wheel screws, plus included mounting hardware where its dimensions are documented. The v11 approximations are inadequate: they simplify or omit the motor encoder/end cap, wheel tread/spokes, hub holes/set screw, bracket slots/holes, and caster housing. Existing v7 conversion scripts and archived STEP files provide a better source baseline, but v13 will regenerate and verify its own assets rather than editing sealed v7/v10/v11/v12 outputs.

Custom deck/riser geometry remains CadQuery-generated and identified as project-designed, not purchased. The battery, controller, lift actuator, and mechanism have no selected SKU: generic electronics reservations will not appear as though they were real selected parts. A proposed fork/tray/gate may remain as a visibly distinct, optional mechanism study with assumed dimensions. It must not contaminate the BOM-accurate drivetrain view or its fit claims.

The product page for #4754 states a 16 mm shaft while the archived vendor STEP measures 22 mm. V13 will use the published 16 mm value for the **BOM-nominal** assembly, preserve the unmodified 22 mm vendor-CAD variant for comparison, and report the conflict. This is a modeling policy, not proof of received-part length. The 7.8 mm motor-body gap remains a failed project clearance gate until an owner-reviewed layout revision changes it.

Explicitly excluded are workspace/controller/container repair, MCP/Cline installation or migration, proprietary CAD workflows, BOM substitutions, selecting electronics/actuators, arbitrary in-browser B-rep editing, automatic release retries, a broad handling robustness matrix, purchases, outreach, publishing, commits, and hardware-operation claims. There will be no attempt to tune away the heavy-tire failure.

Deliverables are `share/Showcase-v13.html`, source-evidenced part/assembly assets and reports under `derived/cad-v13/` and `derived/showcase-v13/`, and focused validation. V11/v12 HTML, sources, manifests, and historical results remain unchanged.

[Types]
Use JSON at the CAD/JavaScript boundary, JSDoc typedefs and dependency-free JavaScript validators. Python performs STEP metrology and fit checks; JavaScript consumes those results rather than maintaining a second fit implementation. Unknown dimensions are `null` with an evidence gap, never zero or invented values. Reject unknown keys, nonfinite numbers, duplicate IDs, missing references, non-unit scale on purchased parts, and invalid joint limits.

- `SourceEvidence = {id,kind:'product-page'|'dimension-drawing'|'vendor-step'|'project-cad'|'standard-nominal',path,sha256,locator:string|null,revision:string|null,attribution}` — repository-relative path plus table/figure/feature locator where available.
- `DimensionEvidence = {feature,valueMm:number|null,intervalMm:[number,number]|null,sourceId,datum,status:'documented'|'cad-derived'|'assumed'|'conflicting'|'unmeasured',note}` — distinguishes nominal catalogue dimensions from overall CAD extents; an 80 × 10 mm wheel name must not scale away a measured 11.75 mm overall CAD extent.
- `PartDefinition = {id,bomId,sku,role:'purchased'|'custom'|'proposed',geometryMode:'vendor-step'|'bom-nominal-derived'|'cadquery-custom'|'standard-nominal',sourceIds,components,nominalDimensions,omissions,qualification}` — every visible component has provenance; no global “exact” claim covers omitted details.
- `PartComponent = {id,partId,sourceSolidIds,assetId,materialId,collisionRole:'active'|'envelope'|'visual-only',installed:boolean}` — preserves wheel tire/rim, motor housing/shaft/encoder, caster body/ball, and visible fastener identities.
- `AssemblySpec = {schema:'assembly-spec-v13/1',id,revision,units:'mm',cadAxes:'X forward, Y left, Z up',renderAxes:'X forward, Y up, Z right',parts:PartDefinition[],instances:InstanceSpec[],joints:JointSpec[],interfaces:InterfaceSpec[],fitResultIds,sourceIds}` — the sole runtime placement source.
- `InstanceSpec = {id,partId,componentIds,parentId:string|null,positionMm:[number,number,number],rotationDeg:[number,number,number],scale:[1,1,1],motionGroup:'fixed'|'left-wheel'|'right-wheel'|'lift'|'gate',basis}` — fixed purchased geometry is never stretched to fit; custom variants require a new assembly ID.
- `JointSpec = {id,parentInstanceId,childInstanceId,kind:'fixed'|'continuous'|'prismatic',axis:[number,number,number],home,limits:[number,number],collisionPolicy}` — wheel rotation is visual in the reduced-order drive model; lift/gate actuation is ideal position control, not force qualification.
- `InterfaceSpec = {id,a:{instanceId,datumId},b:{instanceId,datumId},kind:'shaft-bore'|'bolt-pattern'|'planar-seat'|'clearance'|'engagement',requiredValueMm:number|null,evidenceIds}`.
- `FitResult = {interfaceId,variant:'bom-nominal-16mm'|'vendor-cad-22mm',status:'pass'|'fail'|'conflict'|'unknown',measuredValueMm:number|null,requiredValueMm:number|null,firstFailure:{pose,partA,partB}|null,reason,evidenceIds}` — `unknown` never becomes `pass`; CAD success is not received-part or fabrication tolerance certification.
- `ContactSample = {timeS,phase,colliderA,colliderB,category:'support'|'unexpected'|'intentional-seat',impulseNs:number|null}` with persistent counters and bounded detailed storage.
- `RunIdentity = {assemblyId,assemblyHash,physicsProfile:'v13-jointed-gate',arenaId,parameters,sourceHashes}`; `RunSnapshot` adds joint positions, terminal reason, named contact counters, and evidence durations. No result is shared with v12 under a v13 identity.

[Files]
New evidence and CAD inputs:
- `/workspace/ieee/cad-v13/bom-evidence.json` — maps each selected BOM line and included visible hardware to archived product pages, drawings, STEP files, hashes, local datums, known omissions, and coverage status. Includes only the selected #4754/#1995/#1083/#1430/#953/#1962 baseline, not motor/bracket alternatives.
- `/workspace/ieee/cad-v13/assembly-layout.json` — datum relationships and instance definitions derived from `derived/drivetrain-mule-v10/geometry.json`, plus separately labeled proposed lift/gate assumptions. No consumer-side placement offsets.
- `/workspace/ieee/cad-v13/parts/structure.py` — versioned CadQuery deck/riser generators based on the validated v11 construction conventions, with strict parameter validation.
- `/workspace/ieee/cad-v13/parts/mechanism.py` — CadQuery tray/fork/mast/gate solids for the proposed mechanism only; named solids and joint-friendly local origins.
- `/workspace/ieee/cad-v13/parts/hardware.py` — visible fastener/spacer geometry only where BOM/manufacturer/standard dimensions exist. Each record distinguishes documented diameter/length from simplified head/thread details; missing evidence stays disclosed.
- `/workspace/ieee/cad-v13/tests/test_cad_v13.py` — synthetic generator, source-import, metrology, transform, and negative-fit tests.

New versioned runtime, leaving v11 sources frozen:
- `/workspace/ieee/robot-studio-v13/assembly-spec.js` — schema validation, datum transform resolution, CAD-to-render conversion, and named collider-registry generation.
- `/workspace/ieee/robot-studio-v13/app.js` — detailed GLB part loading, unscaled instance placement, selection/provenance display, BOM-nominal versus vendor-shaft comparison, and optional proposed-mechanism visibility. No arbitrary wheel scaling.
- `/workspace/ieee/robot-studio-v13/live-view.js` — rendering driven by resolved assembly/joint state, fit/contact panels, pause/reset/download, and run identity.
- `/workspace/ieee/robot-studio-v13/physics.js` — versioned Rapier model based on v11 behavior but using the v13 collider registry, continuous gate travel, and named mechanism contacts.
- `/workspace/ieee/robot-studio-v13/panel.html` and `physical-evidence.json` — v13 controls, provenance labels, limitations, software credits, and source-conflict display.
- `/workspace/ieee/robot-studio-v13/README.md` — exact offline build/test commands and distinctions among purchased geometry, custom structure, proposed mechanism, and simplified physics colliders.

New build, verification, and test tools:
- `/workspace/ieee/tools/build-cad-v13.py` — imports archived STEP with CadQuery/OpenCASCADE, generates color-preserving GLB through the existing open-source conversion path, creates custom solids, derives the 16 mm shaft study without altering source CAD, measures exact-solid features, and writes STEP/STL/GLB plus `derived/cad-v13/manifest.json` and `assembly-spec.json`.
- `/workspace/ieee/tools/check-fit-v13.py` — analytic datum checks plus exact-solid interference/distance checks at joint endpoints and at least 21 evenly spaced samples through gate travel; records the first failing pair/pose and does not claim a continuous collision certificate.
- `/workspace/ieee/tools/export-assembly-v13.js` — loads the v13 GLBs and resolved placements, exports `derived/showcase-v13/assembly.glb`, and verifies one-to-one node/collider identities.
- `/workspace/ieee/tools/build-showcase-v13.js` — embeds v13 assets, source evidence, licenses, and versioned runtime in a new offline `share/Showcase-v13.html`; never writes v11/v12 outputs.
- `/workspace/ieee/tools/check-live-v13.js` — runs focused nominal, organizer-field, missing-tire, weak-lift, misalignment, gate-travel, and 0.12 kg tire diagnostics; preserves failures and traces without retry logic or a broad matrix.
- `/workspace/ieee/tools/check-showcase-v13-browser.js` — offline `file:` rendering and interaction checks using existing Playwright/Chromium overrides.
- `/workspace/ieee/tools/verify-cad-v13.js` and `/workspace/ieee/tools/verify-cad-v13.py` — read-only source/output hash and geometry verification; the JS verifier is auto-discovered by `check-all.js` and invokes the pinned Python environment without rebuilding artifacts.
- `/workspace/ieee/tests/assembly-spec-v13.test.js`, `/workspace/ieee/tests/live-physics-v13.test.js`, and `/workspace/ieee/tests/showcase-v13.test.js` — contract, physics, asset identity, and exact v12-preservation regressions.

New outputs/documentation: `derived/cad-v13/`, `derived/showcase-v13/`, `share/Showcase-v13.html`, and `/workspace/ieee/docs/mechanical-readiness-v13.md` containing the parts-coverage table, source conflicts, fit results, screenshots, and deferred hardware work.

Existing files modified: `/workspace/ieee/README.md` gains links to the validated v13 deliverables, and `/workspace/ieee/implementation_plan.md` is replaced by this plan. The prior plan is archived at `/workspace/ieee/docs/plans/implementation-plan-v13-superseded.md`. No other existing source needs modification; `check-all.js` already discovers `verify-*.js`. No files are deleted or moved. V7/v10 sealed outputs, v11/v12 sources/HTML/reports, procurement data, firmware, and agent/MCP configuration are untouched.

[Functions]
New Python functions:
- `load_evidence(bom_path, procurement_path):EvidenceSet` in `tools/build-cad-v13.py` — require every selected major BOM line to map to an archived source and hash; reject stale/missing files and silently introduced alternatives.
- `convert_vendor_part(part,out_dir):PartAssets` — preserve native millimetre scale and source-solid/component identities; generate render GLB and metrology assets without fitting a bounding box by scaling.
- `measure_vendor_part(part,shape):MeasurementRecord` — measure overall extents and interface features from exact solids where possible; tessellated meshes are for appearance, not authoritative metrology.
- `derive_bom_motor(source_assets,shaft_length_mm=16):PartAssets` — retain the detailed motor body and replace/shorten only the separately identified shaft component at its gearbox-face datum. Preserve the original 22 mm asset as another variant. If the shaft cannot be isolated reliably, fail the build and retain the conflict rather than cutting arbitrary body geometry.
- `build_deck(spec)`, `build_riser(spec)`, `build_mechanism(spec)`, and `build_standard_fastener(spec)` in the respective `cad-v13/parts/*.py` files — return named valid solids, validate finite dimensions, and never mutate input specifications.
- `resolve_layout(evidence,measurements,custom_parts):AssemblySpec` — calculate placements from mating datums, not viewer offsets; generate both motor-shaft variants with distinct assembly hashes.
- `check_interfaces(assembly,solids):list[FitResult]` in `tools/check-fit-v13.py` — check shaft/bore engagement, hub/wheel screw pattern, bracket/motor/deck mounting, wheel/deck clearance, motor-body gap, and sampled gate travel. Report conflicting/unknown evidence separately.
- `verify_artifacts(root):VerificationReport` in `tools/verify-cad-v13.py` — read-only hash, solid-validity, extent, and manifest checks; return nonzero on stale or missing assets.

New JavaScript functions:
- `validateAssemblySpec(raw):AssemblySpec`, `resolveAssembly(spec,jointPositions={}):ResolvedAssembly`, `cadPointToRender(pointMm):[number,number,number]`, and `buildColliderRegistry(resolved):ColliderRecord[]` in `robot-studio-v13/assembly-spec.js` — pure validated transforms with stable names, cycle/missing-reference rejection, and unit scale assertions for purchased parts.
- `loadPartLibrary(data):Promise<Map<string,THREE.Object3D>>` and `createPartInstances(resolved,library):THREE.Group` in `robot-studio-v13/app.js` — clone detailed GLB scenes without altering geometry scale and preserve material/component identity.
- `rebuild()`, `select(partId)`, `setMode(value)`, and `start()` in `robot-studio-v13/app.js` — rebuild only from the active resolved assembly, show its evidence/fit state, dispose replaced resources, and initialize the identical headless/browser physics profile.
- `createLiveView(options):Promise<LiveView>` in `robot-studio-v13/live-view.js` — consume resolved joints and snapshots; do not independently position the dynamic tire or hide the gate to simulate opening.
- `runCase(options):Promise<RunSnapshot>` in `tools/check-live-v13.js` — execute one bounded simulation-time case and write its full parameters, events, contacts, and terminal reason.

Removed functions: none. Historical v11/v12 builders and generators remain callable for archival reproduction; v13 uses new versioned files instead of changing their behavior.

[Classes]
Add a versioned `LiveMission` in `/workspace/ieee/robot-studio-v13/physics.js`, with no inheritance from or edits to the v11 class. Constructor signature remains `constructor(RAPIER,overrides={},options={})`, but `options.assembly` and `options.profileId` identify the v13 geometry/profile. `buildWorld()` creates named colliders from the resolved registry while avoiding duplicate chassis/component mass. `updateFork(initial=false)` maps carriage/gate positions through their joint limits. New `updateGate(initial=false)` keeps the gate collider present and continuously positioned throughout its real travel; it replaces v11’s abrupt local `y=-0.12` collider relocation. `controller()` waits for achieved gate/lift positions and persistent support evidence. `step(withSnapshot=true)` records named mechanism/environment contacts and finite-state checks. `snapshot()` emits run identity, joint positions, contact counters, support/release evidence, and terminal reason. `dispose()` remains idempotent.

No existing class is modified or removed. Viewer/live-view APIs remain plain factory functions. Firmware classes and controllers are outside this work.

[Dependencies]
No new dependency families or version upgrades. Use the already established open-source stack: CadQuery 2.8.0/OpenCASCADE for solids and STEP import/metrology; the existing `cascadio==0.1.1`/`trimesh==5.2.0` conversion path only where needed for color-preserving GLB; Three.js 0.170.0, esbuild 0.24.0, and Rapier 0.12.0 for the offline viewer/physics; Node 24, uv with Python 3.12, and existing Playwright/Chromium for validation. Builds use archived local inputs and existing caches; runtime HTML makes no network requests. Blender and proprietary CAD applications are not required.

Third-party licenses and attribution remain embedded. Manufacturer CAD is reference data, not relicensed as project-owned open source. Any unavailable tool is reported as an unrun validation, not replaced by a claim of success or by installing a proprietary alternative.

[Testing]
1. **Baseline and preservation:** record current Git status and hashes for v11/v12 inputs/outputs before edits. Verify `share/Showcase-v12.html` remains SHA-256 `2d334c7e2f8f0007dc3b21fdbd3a1b668f8b5e8d4da1b2b444a05d39a30f372b`. Run existing Node/CadQuery tests and record actual counts; do not reuse historical counts as new results.
2. **BOM coverage:** assert that selected #4754, #1995, #1083, #1430, #953, and #1962 lines have evidence records and installed-instance accounting. Included bracket screws, hub set screws, caster spacers/screws/nuts, and wheel screws receive visible-hardware coverage entries. Anything lacking head/thread/profile evidence is labeled `standard-nominal` or omitted explicitly, never silently called exact. Generic electronics and alternative SKUs cannot enter the selected assembly.
3. **CAD validity and fidelity:** `cad-v13/tests/test_cad_v13.py` checks valid nonzero solids, exact-solid extents/interface features, native units, source hashes, component presence, and no non-unit purchased-part scaling. Include known anchors: 80 mm wheel diameter without forcing its overall axial extent to 10 mm, 6 mm hub bore, 25.4 mm hub flange, 6.5 mm bracket depth, 13.52 mm caster height, 7 mm motor-shaft offset, and both distinct 16/22 mm shaft variants. Source STEP metrology takes precedence over triangle-bounding-box approximations.
4. **Datum and fit tests:** test valid/invalid specs, cycles, unknown joints, unit transforms, and JS/Python agreement to 0.01 mm computational tolerance (not manufacturing tolerance). Negative fixtures cover short engagement, offset bolt patterns, bad seats, and gate/wall overlap. Verify the 7.8 mm body-gap flag survives. Exact-solid checks sample gate endpoints and at least 21 poses; report first failure and disclose finite sampling.
5. **Physics regression:** v11 tests remain unchanged and must still pass. V13 tests verify a present gate collider at every sampled position, no dynamic tire pose writes, missing/weak/misaligned cases cannot pass, continuous support evidence is required, and named contacts identify the responsible pair. Diagnose the 0.12 kg release case from height/fork/fixture/contact traces; retain a genuine failure and add no retry.
6. **Asset/viewer tests:** GLB component/source identities match the CAD manifest, the default scene contains no scaled SKU, the 16 mm default and 22 mm comparison have different run/assembly identities, and fit/provenance panels agree with generated reports. Capture individual-part and assembled screenshots for review; screenshots are evidence of rendered appearance, not owner visual approval.
7. **Offline browser checks:** load `share/Showcase-v13.html` through `file:` with zero external requests/errors; test assembly-to-live transition, gate travel, variant switching, proposed-mechanism toggle, selection, pause/resume/reset, download identity, organizer/demo arenas, and 390 px layout without horizontal overflow.
8. **Final regression:** after all generated outputs exist, run `node tools/check-all.js --json /tmp/ieee-v13-full.json`; the new read-only `verify-cad-v13.js` runs in the existing verifier stage. Add syntax/whitespace checks and a scan of changed sources for accidental credentials. Derive `derived/showcase-v13/validation-summary.json` from actual machine output and state every unrun check.

[Implementation Order]
1. Record the baseline and archive only the superseded planning document; do not touch infrastructure, MCP settings, or historical application outputs.
2. Build `bom-evidence.json` and a coverage table from the existing procurement BOM and archived sources. Confirm native units, component mappings, missing fastener details, and the 16/22 mm source conflict before generating geometry.
3. Implement the v13 STEP import/conversion and exact-solid metrology. Produce detailed unscaled motor, bracket, hub, wheel, and caster assets plus per-part renders. Preserve the original 22 mm motor and derive the clearly labeled 16 mm BOM-nominal variant only if the shaft can be isolated safely.
4. Add versioned CadQuery deck/riser, documented fastener/spacer, and separately labeled proposed-mechanism generators with synthetic tests. Do not invent missing dimensions or select unpriced electronics/actuators.
5. Generate the datum-driven `assembly-spec.json` and both shaft-variant assemblies. Run exact interface/fit checks, retain the 7.8 mm gap failure, and revise only project-custom layout assumptions if evidence supports a correction—never stretch purchased parts.
6. Implement the v13 GLB viewer, provenance/fit panels, unscaled placements, and assembled GLB export. Verify rendered component identity and capture part/assembly screenshots before connecting live physics.
7. Add the v13 physics profile with registry-driven colliders, continuous gate travel, and named contact diagnostics. Run focused baseline/negative/heavy-tire cases and preserve all failures; no automatic recovery or broad robustness study.
8. Build the self-contained `Showcase-v13.html`, then run asset, physics, offline browser, and preservation regressions. Fix implementation defects without changing historical outputs or hiding evidence conflicts.
9. Run the complete verifier suite, generate machine-derived validation summaries and `docs/mechanical-readiness-v13.md`, update only the root README links, and report exact deliverables, actual test results, unresolved source conflicts, and remaining hardware-validation work.

Completion requires every default purchased component to have traceable provenance and unit scale, all known dimensional conflicts/omissions to be visible, and all executed validations to be reported accurately. It does not require or permit claiming that nominal CAD equals measured received hardware.
