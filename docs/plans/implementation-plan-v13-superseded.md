# Implementation Plan

[Overview]
Make the v13 assembly mechanically consistent: one datum-driven specification shared by CAD, viewer, physics and exports; explicit fit results for shaft/hub/bracket interfaces; a continuously collidable gate mechanism replacing the current hide-the-collider workaround; and full mechanism-contact diagnostics, with the heavy-tire release failure diagnosed rather than tuned away.

Planning date: November 5, 2026. This is a proposed implementation plan, not a verified promise that implementation can run in the current session. `/workspace/.agent-containers/image/workspace-control` is a real wrapper around `/opt/agent-workspace/control.py`. `/workspace/AGENTS.md` requires managed project isolation and reservations; checking Git status alone does not establish exclusive agent ownership. A missing command in PATH establishes only that the command is unavailable there, not that the repository is unusable. Before implementation, establish the actual applicable execution context without bypassing workspace guidance or claiming that an unverified environment is ready.

Context from investigation: `share/Showcase-v12.html` matches its manifest hash (`2d334c7e...30f372b`) and the tree is otherwise untracked work from v11/v12, preserved. The concrete v13 target in `robot-studio-v11/physics.js:134-137` is the gate workaround: `frontGate.setTranslationWrtParent({x:.228,y:this.lift>.025?.032:-.12,z:0})` teleports the gate collider below the floor to open it while the viewer merely hides the mesh. `robot-studio-v11/assembly-primitives.js` already shares 11 procedural boxes across physics/viewer/GLB but has no joints, and placements still contain fixed offsets in `robot-studio-v11/assembly.js`. The 22 mm versus 16 mm shaft datum and the 7.8 mm versus 8 mm motor-gap gate remain unresolved; v13 reports them as fit results instead of silently resolving them. The 0.12 kg tire case fails release while showing destination support, so support/height/fork-contact gating must be decomposed before any recovery is added.

Deliverable: `/workspace/ieee/ieee/share/Showcase-v13.html` plus `/workspace/ieee/ieee/derived/showcase-v13/` (assembled STEP/STL/GLB, fit report, contact traces, matrix runs, screenshots). V11/v12 outputs stay untouched and are treated as archived baselines; v13 results are reported separately, including failures. Out of scope for v13 and explicitly deferred: final electrical/actuator selection, force-bounded lift and tipping dynamics, firmware-controller parity, official competition scoring/tire hardware, and arbitrary in-browser B-rep regeneration.

[Types]
Plain JavaScript runtime validation with JSDoc typedefs plus mirrored Python validators; JSON is the cross-language boundary. No TypeScript migration. All records reject unknown keys, nonfinite values, duplicate IDs, cyclic parents and missing references. Unknown dimensions stay null with a named blocker; they are never zero.

- `DimensionEvidence = {id,partId,feature,valueMm:number|null,intervalMm:[number,number]|null,sourceId:string|null,datum,status:'documented'|'cad-derived'|'assumed'|'conflicting'|'unmeasured',note}` — ordered intervals; the 16 mm and 22 mm shaft candidates are two records, never averaged.
- `SourceRecord = {id,kind:'manufacturer-drawing'|'vendor-cad'|'project-archive'|'measurement'|'design-choice',path,sha256,retrievedAt:string|null,revision:string|null,locator,attribution}` — repository-relative paths and page/figure locators; unknown dates are null.
- `AssemblySpec = {schema:'assembly-spec-v13/1',id,revision,parentId:string|null,units:'mm',axes:'X forward, Y left, Z up',parts:PartSpec[],instances:InstanceSpec[],joints:JointSpec[],interfaces:InterfaceSpec[],exclusions:ContactExclusion[],physicalProfileId,sourceIds}` — the single source of truth for every consumer.
- `PartSpec = {id,generator:'deck'|'riser'|'motor'|'wheel'|'hub'|'bracket'|'caster'|'mechanism',parameters,evidenceIds,basis:'documented-exterior'|'proposed-custom'|'packaging-reservation'}` — only allowlisted local generators run; fixed SKUs are never scaled.
- `InstanceSpec = {id,partId,parentId:string|null,translationMm:[number,number,number],rotationDeg:[number,number,number],datumIds,collisionRole:'active'|'envelope'|'visual-only',motionGroup}` — transform is the only placement input; no consumer-side offsets.
- `JointSpec = {id,parentInstanceId,childInstanceId,kind:'fixed'|'prismatic'|'revolute',axis:[number,number,number],limits:[number,number],home,actuation:'fixed'|'ideal-position',evidenceIds}` — normalized axis, home within limits; the gate is a prismatic joint with real travel, and its collider moves continuously with the joint.
- `InterfaceSpec = {id,a:{instanceId,datumId},b:{instanceId,datumId},kind:'shaft-bore'|'bolt-pattern'|'planar-seat'|'clearance',requiredEngagementMm:number|null,minimumClearanceMm:number|null,evidenceIds}`.
- `FitResult = {interfaceId,status:'pass'|'fail'|'unknown',measuredValueMm:number|null,requiredValueMm:number|null,reason,evidenceIds}` — pass qualifies only the named geometric check; unknown blocks a fit-certified label, not a disclosed study export.
- `ContactExclusion = {instanceA,instanceB,reason,jointId:string|null}` — only intentional joint/seat pairs; no blanket exclusions.
- `ContactSample = {timeS,phase,colliderA,colliderB,category:'support'|'unexpected-contact'|'intentional-seat',impulseNs:number|null}` with a bounded buffer, persistent counters and overflow count.
- `ValidationRun = {id,assemblyId,assemblyHash,profileId,arenaId,seed,parameters,result,terminalReason:string|null,contactCounters,inputHashes}` — a distinct `profileId` separates the archived ideal-gate runs from jointed-gate v13 runs.

[Files]
New files:
- `/workspace/ieee/ieee/configs/assembly-v13.json` — complete AssemblySpec: motor/hub/bracket/wheel/caster instances at resolved datums, proposed tray/finger/carriage/gate mechanism with JointSpecs, InterfaceSpecs, ContactExclusions and evidence references.
- `/workspace/ieee/ieee/cad-v13/interface-evidence.json` — DimensionEvidence/SourceRecord inventory for the shaft candidates, hub engagement, bracket mounting and motor gap; conflicts listed, nothing invented.
- `/workspace/ieee/ieee/cad-v13/parts/mechanism.py` — CadQuery generators `build_tray(spec)`, `build_finger(spec)`, `build_carriage(spec)`, `build_gate(spec)`, `build_mast(spec)` producing named solids with datum-friendly origins.
- `/workspace/ieee/ieee/cad-v13/tests/test_mechanism.py` — solid validity, nonzero volume, exact parameter bounds, deliberate-invalid-input cases.
- `/workspace/ieee/ieee/robot-studio-v13/assembly-spec.js` — `validateAssemblySpec(raw)`, `resolveAssembly(spec,jointPositions={})`, `cadPointToRender(pointMm)`, `buildColliderRegistry(resolved)`; pure, dependency-free, immutable outputs.
- `/workspace/ieee/ieee/robot-studio-v13/fit.js` — `evaluateInterfaces(spec,resolved,evidence)`: analytic shaft/bore diameter, engagement, bolt-pattern and clearance checks with conservative interval propagation and explicit unknown outcomes.
- `/workspace/ieee/ieee/robot-studio-v13/contact-evidence.js` — `classifyContact(a,b,policy)`, `recordContact(sample,buffer,limit)` with stable collider names.
- `/workspace/ieee/ieee/tools/build-cad-v13.py` — generates all v13 solids plus an assembled STEP from `configs/assembly-v13.json`; writes `/workspace/ieee/ieee/derived/cad-v13/manifest.json` with source/output hashes.
- `/workspace/ieee/ieee/tools/check-fit-v13.py` — independent CadQuery/OCC exact-solid interference and minimum-distance checks across sampled joint travel; intentional-seat pairs mapped through ContactExclusions; first failing pose and part pair reported.
- `/workspace/ieee/ieee/tools/export-assembly-v13.js` — resolved GLB, collider registry and placement/datum manifest under `derived/showcase-v13/`.
- `/workspace/ieee/ieee/tools/check-robustness-v13.js` — deterministic bounded matrix (tire mass 0.06/0.08/0.10/0.12 kg; friction 0.4/0.8/1.0; offsets -0.02/0/0.02 m; speed caps 0.12/0.18 m/s), nominal plus deduplicated one-factor cases and 12 fixed-seed combined perturbations, with full traces.
- `/workspace/ieee/ieee/tools/build-showcase-v13.js` — composes `share/Showcase-v13.html` from the v12 base plus v13 assembly/fit/matrix panels; never writes v11/v12 outputs.
- `/workspace/ieee/ieee/tools/check-showcase-v13-browser.js` — offline file-protocol checks: load, assembly-to-live transition, gate travel rendered and collidable, fit panel, config-edit identity, pause/reset, download, organizer and demo arenas, 390 px layout, zero external requests/errors.
- `/workspace/ieee/ieee/tests/assembly-spec-v13.test.js`, `/workspace/ieee/ieee/tests/fit-v13.test.js`, `/workspace/ieee/ieee/tests/contact-evidence-v13.test.js` — contract, transform, fit and contact classification tests including negative fixtures (short shaft, offset bolt pattern, negative engagement, gate/wall overlap).
- `/workspace/ieee/ieee/share/Showcase-v13.html`, `/workspace/ieee/ieee/derived/showcase-v13/` — delivery plus `baseline/` with copied v12 hashes and reports so archived evidence is never regenerated from changed sources.
- `/workspace/ieee/ieee/docs/mechanical-readiness-v13.md` — interface results table, unresolved measurements, mechanism scope and the deferred milestones (electrical, lift force/tipping, firmware parity, organizer scoring, hardware tests).

Existing files modified:
- `/workspace/ieee/ieee/robot-studio-v11/physics.js` — optional `options.assemblySpec` path: `buildWorld()` creates named colliders from `buildColliderRegistry()`; `updateFork()` moves the gate along its JointSpec travel instead of `setTranslationWrtParent(..., y:-0.12)`; `step()` records named mechanism/environment contacts via `contact-evidence.js`; `snapshot()` gains `assemblyHash`, `jointPositions`, named `contactCounters` and `mechanismModelRevision`. Legacy default profile and constructor remain compatible; the old hide-gate behavior exists only under the archived `profileId`.
- `/workspace/ieee/ieee/robot-studio-v11/live-view.js` — consume resolved instances/joints for the v13 path, drive the gate mesh from joint state, render contact diagnostics and the fit summary; resets use the active assembly hash.
- `/workspace/ieee/ieee/robot-studio-v11/app.js` — opt-in v13 rebuild that instantiates from `resolveAssembly()` transforms (no side offsets); picking maps to part IDs; legacy path unchanged.
- `/workspace/ieee/ieee/robot-studio-v11/panel.html` — v13-only fit/contact/joint controls injected by the v13 builder.
- `/workspace/ieee/ieee/robot-studio-v11/physical-evidence.json` — correct stale 'reference-only' wording for organizer mode; add gate-joint and contact-evidence assumptions.
- `/workspace/ieee/ieee/tools/build-showcase-v11.js` — extract `buildFromData(data,options)` shared with the v13 builder; `build()`/`generate()` wrappers keep exact v12 byte behavior.
- `/workspace/ieee/ieee/tools/check-all.js` — discover the `cad-v13` Python suite and hash untracked file contents (not just names) in `treeState()`.
- `/workspace/ieee/ieee/tests/showcase-v11.test.js` — keep exact v12 assertions; add v13 exact-rebuild coverage in the new test files.
- `/workspace/ieee/ieee/robot-studio-v11/README.md`, `/workspace/ieee/ieee/cad-v11/README.md`, `/workspace/ieee/ieee/implementation_plan.md` — version-scoped build commands and completed/pending scope.

No deletions or moves. No edits to vendor archives, historical geometry values, firmware control code or v10/v11/v12 HTML.

[Functions]
New:
- `validateAssemblySpec(raw):AssemblySpec` / `resolveAssembly(spec,jointPositions={}):ResolvedAssembly` / `cadPointToRender(pointMm):[number,number,number]` / `buildColliderRegistry(resolved):ColliderRecord[]` in `/workspace/ieee/ieee/robot-studio-v13/assembly-spec.js` — validate, resolve datum hierarchy and emit stable named collider records; reject cycles, unknown joints and travel outside limits.
- `evaluateInterfaces(spec,resolved,evidence):FitResult[]` in `/workspace/ieee/ieee/robot-studio-v13/fit.js` — conservative interval arithmetic; conflicting shaft records yield two results, not one average.
- `classifyContact(a,b,policy):string` / `recordContact(sample,buffer,limit):void` in `/workspace/ieee/ieee/robot-studio-v13/contact-evidence.js` — classify actual collider pairs; keep counters when the detailed buffer overflows.
- `build_tray/build_finger/build_carriage/build_gate/build_mast(spec):Workplane` in `/workspace/ieee/ieee/cad-v13/parts/mechanism.py` — parameterized proposed mechanism solids with explicit mm dimensions.
- `check_interfaces(spec,solids):list[dict]` in `/workspace/ieee/ieee/tools/check-fit-v13.py` — exact-solid intersection/minimum-distance checks at joint home/ends and ≥21 evenly spaced samples per travel; finite sampling is disclosed as not a continuous certificate.
- `runCase(spec,profile,parameters,seed):Promise<ValidationRun>` / `runMatrix(options):Promise<Report>` in `/workspace/ieee/ieee/tools/check-robustness-v13.js` — bounded simulation-time cases with replayable input hashes and event traces.
- `buildFromData(data,options):BuildResult` in `/workspace/ieee/ieee/tools/build-showcase-v11.js` — shared offline-document composition with checked insertion anchors; explicit versioned callers choose output paths.

Modified:
- `buildWorld()` / `updateFork(initial=false)` / `step(withSnapshot=true)` / `snapshot()` / `controller()` in `/workspace/ieee/ieee/robot-studio-v11/physics.js` — resolved-registry colliders, continuous gate joint travel, named contact recording, assembly hash in snapshots, and at most one bounded release retry after safe stop/settle with confirmed fixture support. No tire attachment, no dynamic-pose writes, no retry after lost payload or lift stall.
- `createLiveView(options)` in `/workspace/ieee/ieee/robot-studio-v11/live-view.js` — resolved assembly/joint rendering and contact/fit diagnostics.
- `rebuild()` in `/workspace/ieee/ieee/robot-studio-v11/app.js` — v13 path builds from resolved hierarchy; disposes replaced resources.
- `treeState()` in `/workspace/ieee/ieee/tools/check-all.js` — content-hash untracked files.

Removed: none. Legacy `assemblyPrimitives()` and the archived hide-gate profile stay available for v12 reproduction.

[Classes]
Modify `LiveMission` in `/workspace/ieee/ieee/robot-studio-v11/physics.js`; no new classes or inheritance. Constructor gains optional `options.assemblySpec`/`options.profileId`. `buildWorld()` allocates named colliders from the registry and avoids double-counting chassis/component masses. `updateFork()` maps carriage and gate positions through resolved JointSpecs so the gate stays a real collider throughout travel. `controller()` commands explicit gate open/close and waits for achieved joint position before acquisition/release contact gates. `step()` reports all named mechanism/environment contacts. `snapshot()` includes assembly hash, joint positions, named contact counters, retry state and readiness results. `dispose()` stays idempotent. Firmware classes (`MissionDriver`, `Runner`, `Supervisor`, `Tracker`, `WheelSpeedController`, `SafetyMonitor`) are untouched; their existing tests are regressions only.

[Dependencies]
No new packages and no version changes: Three.js 0.170.0, esbuild 0.24.0, Rapier 0.12.0, CadQuery 2.8.0 (with its existing OCC for exact-solid checks), Node v24, Python 3.12 via uv. Runtime validators stay dependency-free. JSON Schema files are documentation/interchange only. Dependency hashes and license text remain embedded in built HTML via the existing builder. No network fetches at runtime; source archives referenced only from `sources/`.

[Testing]
1. Baseline gate: v12 HTML hash must still equal `2d334c7e2f8f0007dc3b21fdbd3a1b668f8b5e8d4da1b2b444a05d39a30f372b`; run existing 21 Node tests and 3 CadQuery tests before any change; archive the run.
2. Contract tests (`assembly-spec-v13.test.js`): valid spec, cycle rejection, unknown joints, invalid travel, immutable inputs, `cadPointToRender` handedness against known points, collider-registry stability.
3. Fit tests (`fit-v13.test.js` + `test_mechanism.py` + `check-fit-v13.py`): both shaft candidates yield separate results; unknown engagement is `unknown`, never `pass`; negative fixtures (short shaft, offset bolt pattern, negative engagement, undersized gate/wall overlap) fail with the first offending pair/pose recorded; JS/Python nominal datum transforms agree within 0.01 mm computational tolerance (disclosed as not manufacturing tolerance).
4. Mechanism/contact tests (`contact-evidence-v13.test.js`): classification of support vs unexpected vs intentional-seat pairs, buffer overflow counters, no duplicate inflation of persistent manifolds.
5. Physics regression: archived v12 profile reproduces its recorded outcomes unchanged. New jointed-gate runs in both arenas are reported independently; a failure is a valid result. Heavy-tire case gets a decomposition trace (support height, fork contact, fixture contact over time) before any retry logic; at most one bounded retry, and never after lost payload or lift stall.
6. Robustness matrix: deduplicated nominal/one-factor cases plus 12 fixed-seed combined perturbations with full input hashes, terminal reasons and contact summaries. Ranges are design-study assumptions, not hardware limits or confidence intervals.
7. Browser (`check-showcase-v13-browser.js`): offline `file:` load, zero external requests/errors, assembly-to-live transition, gate visible and collidable through travel, fit panel populated, config edit creates a new identity and fresh world, pause freezes simulation, download JSON matches active identity, organizer and demo terminals recorded, 390 px no horizontal overflow.
8. Full regression: `node tools/check-all.js --json /tmp/ieee-v13-full.json` with no concurrent edits, plus v13 CadQuery discovery, syntax and whitespace checks, and a secrets scan of changed sources/HTML (known historical embedded-image false positive in `share/Showcase-v10.html` documented, not suppressed). Validation counts come from machine output, never hardcoded.

[Implementation Order]
1. Verify the execution context and ownership required by `/workspace/AGENTS.md`; do not infer exclusivity from Git status. Then perform the baseline gate and archive (testing step 1 above); inspect tracked and untracked changes and record hashes without overwriting unowned work. Derive baseline test counts and dependency versions from actual results rather than treating prior reported counts as new verification.
2. Interface evidence inventory (`cad-v13/interface-evidence.json`) from existing archives; record both shaft candidates and the motor-gap conflict as unresolved evidence — no invented dimensions.
3. `assembly-spec.js` + `fit.js` + `contact-evidence.js` with contract tests; verify frame conversion against `derived/drivetrain-mule-v10/geometry.json` datums.
4. `configs/assembly-v13.json` built from those datums with the proposed jointed gate; run `fit.js` and record pass/fail/unknown results.
5. `cad-v13/parts/mechanism.py` + `build-cad-v13.py` + `check-fit-v13.py`; generate solids, assembled STEP/STL and the independent interference report across sampled travel.
6. `export-assembly-v13.js` (GLB + collider registry); wire the opt-in v13 path into `physics.js`/`live-view.js`/`app.js`, replacing the hide-gate hack with continuous joint travel under the new `profileId`.
7. Contact diagnostics and heavy-tire decomposition; implement at most one bounded release retry only if the trace shows a mechanically justified cause; keep impossible/missing/weak cases failed.
8. `check-robustness-v13.js` matrix; compare against archived v12 outcomes and report every difference.
9. `build-showcase-v13.js` + `check-showcase-v13-browser.js`; build `share/Showcase-v13.html`, capture screenshots and downloaded run evidence.
10. Full regression, secrets/whitespace checks, machine-derived `validation-summary.json` and `docs/mechanical-readiness-v13.md`; deliver results including failures and the concrete next milestone (electrical/actuator selection or lift force-bounded dynamics).
