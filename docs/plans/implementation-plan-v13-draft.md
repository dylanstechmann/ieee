# Implementation Plan

[Overview]
Build a v13 mechanical-consistency milestone that makes the robot's mating interfaces, proposed mechanism and simulated contacts auditable before expanding firmware or electrical scope.

Planning date: November 5, 2026. This is planning only. The latest request requires confirmation before implementation; earlier autonomous authorization does not override that handoff. The previous plan and execution history are preserved at `/workspace/ieee/ieee/docs/plans/implementation-plan-v12-history.md`. Only planning documents are changed in this task.

The v12 build, assembly and live-study source hashes and delivered HTML hash were checked and match their manifests. Organizer-field nominal digital missions are a useful baseline, but the 0.12 kg tire still fails release. The next priority is a consistent mechanical definition, not more presentation polish or another nominal success claim.

Investigation found concrete gaps: shaft length remains disputed (22 mm archived CAD datum versus 16 mm published length); hub/set-screw and bracket mating details are omitted; placements contain fixed offsets; physics reconstructs its own partial assembly configuration. The gate collider moves to Y=-0.12 m when opened while the viewer hides it. This is an ideal opening, not a linkage. Physical-evidence JSON still says organizer geometry is reference-only despite the live mode. Zero chassis contact events cannot establish complete mechanism clearance.

Approach: preserve v12 source/output evidence, define a datum-driven assembly contract, audit critical mating dimensions, generate parameterized mechanism solids and joint travel, then use the same resolved placements for CAD, viewer, export and collision study. Explain heavy-payload release failure before introducing one bounded recovery attempt. Preserve the ideal v12 mechanism as a labeled comparison. New geometry may fail; do not disable collisions, enlarge the field, move the dynamic tire, or reduce payload assumptions to manufacture success.

No final electronics purchase, calibrated force-driven lift, tipping model, firmware parity, arbitrary browser B-rep regeneration or hardware qualification is included in this bounded milestone. Firmware already contains MissionDriver, Runner, DriveShaper, WheelSpeedController and host-tested Supervisor; these need real route/unit/observation contracts, not a renamed JS controller. Product facts will require primary-source verification during implementation; this plan makes no new component recommendation.

Execution prerequisite: most v11/v12 additions are untracked. Hash and preserve them before editing; do not automatically commit or publish. Establish the documented project execution context and a single writer. Managed IEEE registration/controller access remains unestablished. Do not kill unrelated provider extensions or claim a lease without evidence; if ownership cannot be established, report the concrete blocker instead of bypassing the controller.

[Types]
Keep plain JavaScript runtime validation, JSON contracts and Python/CadQuery generators; no TypeScript migration. Reject unknown keys, nonfinite values, duplicate IDs, cyclic parents and missing references. Unknown dimensions remain null with blockers, never zero.

- `DimensionEvidence`: `{id:string,partId:string,feature:string,valueMm:number|null,intervalMm:[number,number]|null,sourceId:string|null,datum:string,status:'documented'|'cad-derived'|'assumed'|'conflicting'|'unmeasured',note:string}`. Ordered intervals and positive lengths where relevant. Keep 16/22 mm candidates separately; do not average conflicts.
- `SourceRecord`: `{id:string,kind:'manufacturer-page'|'manufacturer-drawing'|'vendor-cad'|'project-archive'|'measurement',path:string,sha256:string,retrievedAt:string|null,revision:string|null,locator:string,attribution:string}`. Repository-relative artifact path and PDF page/figure or HTML section locator; unknown dates remain null.
- `AssemblySpec`: `{schema:'assembly-spec-v13/1',id:string,revision:string,parentId:string|null,units:'mm',axes:'X forward, Y left, Z up',parts:PartSpec[],instances:InstanceSpec[],joints:JointSpec[],interfaces:InterfaceSpec[],exclusions:ContactExclusion[],physicalProfileId:string,sourceIds:string[]}`. Convert CAD coordinates once to render metres using `(x,y,z)->(x,z,-y)/1000`.
- `PartSpec`: `{id:string,generator:string,parameters:object,evidenceIds:string[],basis:'documented-exterior'|'proposed-custom'|'packaging-reservation',materialId:string|null}`. Only allowlisted local generators execute. Fixed SKUs are not arbitrarily scaled; hypothetical variants receive distinct identities.
- `InstanceSpec`: `{id:string,partId:string,parentId:string|null,translationMm:[number,number,number],rotationDeg:[number,number,number],datumIds:string[],collisionRole:'active'|'envelope'|'visual-only',motionGroup:string}`.
- `JointSpec`: `{id:string,parentInstanceId:string,childInstanceId:string,kind:'fixed'|'prismatic'|'revolute',axis:[number,number,number],limits:[number,number],unit:'mm'|'deg',home:number,actuation:'fixed'|'ideal-position',evidenceIds:string[]}`. Normalized axis, ordered limits, home within travel. Opening a gate must follow continuous modeled travel, not disappear below the floor.
- `InterfaceSpec`: `{id:string,a:{instanceId:string,datumId:string},b:{instanceId:string,datumId:string},kind:'shaft-bore'|'bolt-pattern'|'planar-seat'|'clearance',requiredEngagementMm:number|null,minimumClearanceMm:number|null,evidenceIds:string[]}`.
- `FitResult`: `{interfaceId:string,status:'pass'|'fail'|'unknown',measuredValueMm:number|null,requiredValueMm:number|null,reason:string,evidenceIds:string[]}`. Pass qualifies only the named geometric check. Unknown mating data blocks a fit-certified label, not a disclosed study export.
- `ContactExclusion`: `{instanceA:string,instanceB:string,reason:string,jointId:string|null}`. Only explicit intentional seats/joints; no blanket mechanism/environment exclusions.
- `ContactSample`: `{timeS:number,phase:string,colliderA:string,colliderB:string,category:'support'|'unexpected-contact'|'intentional-seat',impulseNs:number|null}`. Bounded detailed buffer, persistent counters and overflow count.
- `ValidationRun`: `{id:string,assemblyId:string,assemblyHash:string,profileId:string,arenaId:string,seed:number,parameters:object,result:'passed'|'failed'|'running',terminalReason:string|null,contactCounters:object,inputHashes:object}`. Distinct profile/schema for legacy ideal gate and new jointed mechanism.

[Files]
New files:
- `/workspace/ieee/ieee/configs/assembly-v13.json`: complete study spec, datums, proposed mechanism joints, placements and evidence references.
- `/workspace/ieee/ieee/configs/assembly-v13.schema.json`: interchange/reference schema; dependency-free runtime validation.
- `/workspace/ieee/ieee/cad-v13/interface-evidence.json`: shaft/hub/bracket/caster source audit, conflicts and required measurements.
- `/workspace/ieee/ieee/cad-v13/parts/mechanism.py`: parameterized tray/fingers, carriage, mast/guide and gate solids. Not an actuator or structural-strength qualification.
- `/workspace/ieee/ieee/cad-v13/tests/test_mechanism.py`: invalid inputs, solid validity, bounds and parameter propagation.
- `/workspace/ieee/ieee/robot-studio-v13/assembly-spec.js`: validation, coordinate conversion, datum/joint resolution and named collider records.
- `/workspace/ieee/ieee/robot-studio-v13/fit.js`: analytic interface checks with explicit unknown outcomes.
- `/workspace/ieee/ieee/robot-studio-v13/contact-evidence.js`: stable collider names, contact classifications and bounded event recording.
- `/workspace/ieee/ieee/tools/build-cad-v13.py`: STEP/STL and assembled STEP generation using v13 configuration and reused legacy generators without changing historical inputs.
- `/workspace/ieee/ieee/tools/export-assembly-v13.js`: resolved GLB, datum/placement manifest, collider registry and hashes.
- `/workspace/ieee/ieee/tools/check-fit-v13.py`: independent CadQuery/OCC exact-solid interference/minimum-distance checks with explicit intentional-contact exemptions.
- `/workspace/ieee/ieee/tools/check-robustness-v13.js`: deterministic bounded handling matrix, traces and failure diagnostics.
- `/workspace/ieee/ieee/tools/build-showcase-v13.js`: explicit new offline document entry point, preserving old HTML.
- `/workspace/ieee/ieee/tools/check-showcase-v13-browser.js`: offline browser interactions, gate/identity/fit assertions and screenshots.
- `/workspace/ieee/ieee/tests/assembly-spec-v13.test.js`, `/workspace/ieee/ieee/tests/fit-v13.test.js`, `/workspace/ieee/ieee/tests/contact-evidence-v13.test.js`: contract, transforms, fit and contact tests.
- `/workspace/ieee/ieee/share/Showcase-v13.html`, `/workspace/ieee/ieee/derived/showcase-v13/`: new delivery and geometry/fit/live/browser provenance. Baseline source hashes and copied v12 reports go under `/workspace/ieee/ieee/derived/showcase-v13/baseline/`.
- `/workspace/ieee/ieee/docs/mechanical-readiness-v13.md`: interface gates, required measurements, actual mechanism scope and later milestones.

Existing modifications:
- `/workspace/ieee/ieee/robot-studio-v11/app.js`: opt-in v13 resolved-instance/joint rendering; retain legacy adapter and picking. Eliminate independent placement offsets in the new path.
- `/workspace/ieee/ieee/robot-studio-v11/live-view.js`: resolved active configuration, explicit gate joint state, all-contact diagnostics, exact run identity and fresh resets.
- `/workspace/ieee/ieee/robot-studio-v11/physics.js`: optional resolved assembly/profile, shared named collider creation, continuous gate state and full contact evidence. Legacy constructor/default profile remains compatible.
- `/workspace/ieee/ieee/robot-studio-v11/panel.html`: version-specific fit/readiness/contact controls without rewriting archived HTML.
- `/workspace/ieee/ieee/robot-studio-v11/physical-evidence.json`: correct stale reference-only wording; disclose new joint assumptions. Do not regenerate v12 history from changed source.
- `/workspace/ieee/ieee/tools/build-showcase-v11.js`: factor `buildFromData(data,options)` for v13 reuse; keep explicit legacy wrapper behavior.
- `/workspace/ieee/ieee/tests/showcase-v11.test.js`: preserve v12 output/hash and archived-source evidence assertions; add v13 exact-rebuild tests separately. Do not remove provenance checks to hide superseded sources.
- `/workspace/ieee/ieee/tools/check-all.js`: include new CadQuery suite and strengthen tree checking to hash existing untracked file contents, not just filenames.
- `/workspace/ieee/ieee/robot-studio-v11/README.md`, `/workspace/ieee/ieee/cad-v11/README.md`, `/workspace/ieee/ieee/implementation_plan.md`: version-specific commands and completed/pending scope.

No deletions or moves. No firmware behavior changes or overwriting v10/v11/v12 HTML, original product archives or archived geometry values. New verified sources go under `/workspace/ieee/ieee/sources/hardware-v13/`; archive/redistribute only as permitted.

[Functions]
New functions:
- `validateAssemblySpec(raw):AssemblySpec`, `/workspace/ieee/ieee/robot-studio-v13/assembly-spec.js`: validate fields/graph/evidence references; return independent immutable data.
- `resolveAssembly(spec,jointPositions={}):ResolvedAssembly`, same file: resolve datum hierarchy and transforms, reject unsupported travel, missing critical dimensions and unknown joints.
- `cadPointToRender(pointMm):[number,number,number]`, same file: explicit mm/Z-up to m/Y-up conversion.
- `buildColliderRegistry(resolved):ColliderRecord[]`, same file: stable IDs for named active/envelope shapes; preserve visual-only disclosure.
- `evaluateInterfaces(spec,resolved,evidence):FitResult[]`, `/workspace/ieee/ieee/robot-studio-v13/fit.js`: conservative interval propagation for shaft overlap, bore/shaft diameter, planar seat, bolt pattern and clearance checks. Unknown is not pass.
- `classifyContact(a,b,policy):string`, `recordContact(sample,buffer,limit):void`, `/workspace/ieee/ieee/robot-studio-v13/contact-evidence.js`: classify actual pairs and maintain counters on buffer overflow.
- `build_mechanism(spec):dict[str,Workplane]`, `/workspace/ieee/ieee/cad-v13/parts/mechanism.py`: generate validated custom parts without arbitrary configuration code execution.
- `check_interfaces(spec,solids):list[dict]`, `/workspace/ieee/ieee/tools/check-fit-v13.py`: independent exact-solid intersections/clearances in assembled coordinates, including known-failing fixtures.
- `runCase(spec,profile,parameters,seed):Promise<ValidationRun>`, `runMatrix(options):Promise<Report>`, `/workspace/ieee/ieee/tools/check-robustness-v13.js`: simulation-time caps and replayable inputs/traces.
- `buildFromData(data,options):BuildResult`, `/workspace/ieee/ieee/tools/build-showcase-v11.js`: shared offline document composition with checked insertion anchors; explicit versioned callers choose output paths.

Modified functions:
- `createLiveView(options)`, `/workspace/ieee/ieee/robot-studio-v11/live-view.js`: consume resolved assembly/joints/collider registry; reset from actual active identity, never write dynamic tire poses.
- `rebuild()`, `/workspace/ieee/ieee/robot-studio-v11/app.js`: v13 objects derive directly from resolved hierarchy; dispose old resources and preserve paused inspection behavior.
- `build()`/`generate()`, `/workspace/ieee/ieee/tools/build-showcase-v11.js`: compatibility wrappers; archived v12 reproduction tested against preserved source rather than changed current source.
- `treeState()`, `/workspace/ieee/ieee/tools/check-all.js`: include content hashes for nonignored untracked files; keep transient validation logs outside repository.

No public functions removed. `assemblyInstances()`, `assemblyPrimitives()`, `resolve()` and the old LiveMission API remain available to the archived ideal profile; v13 does not silently change their historical meaning.

[Classes]
Modify `LiveMission` in `/workspace/ieee/ieee/robot-studio-v11/physics.js`; no new inheritance or required new classes.
- Constructor `(RAPIER,overrides={},options={})`: optional `assemblySpec`, `profileId`, `jointPolicy`; validate before allocating physics resources.
- `buildWorld()`: named colliders from resolved registry, with mass allocation that does not double-count whole-chassis and component assumptions. Chassis remains explicitly level-plane and lift ideal-position in this milestone.
- `updateFork(initial=false)`: v13 continuous carriage/gate transforms, not collider disappearance below the floor. Keep old ideal behavior only in a distinctly identified legacy comparison; never attach the tire.
- `controller()`: explicit gate open/close commands, achieved-position waits and actual contact-based acquisition/release. Permit at most one release retry after safe stop/settle and confirmed fixture support; no retry after lost payload, lift stall or unknown support.
- `step(withSnapshot=true)`: report named mechanism/environment contacts as well as support, avoid repeated manifold event inflation, keep terminal states immutable.
- `snapshot()`: assembly hash, mechanism revision, joint positions, named contact counts, retry state and readiness results. Chassis counters cannot imply full collision freedom.
- `dispose()`: preserve idempotent cleanup for new resources.

Do not change `MissionDriver`, `Runner`, `Supervisor`, `Tracker` or motor/safety classes. Their existing tests remain regressions, not evidence of browser firmware parity.

[Dependencies]
No package additions/upgrades planned. Retain Three.js 0.170.0, esbuild 0.24.0, Rapier 0.12.0, CadQuery 2.8.0, Node v24.18.1 and Python 3.12.16 where available. Smoke-test CadQuery/OCC intersection/distance capabilities before depending on a particular API. No extra physics engine, JSON-validator dependency or Python-in-browser runtime.

JSON Schema documents interchange; implement dependency-free runtime validators initially. Keep exact dependency hashes, cache overrides and embedded license text. No credentials in repositories or output HTML. Manufacturer research at implementation time must verify exact product/revision through primary sources; source availability alone is not permission to redistribute vendor CAD.

[Testing]
Baseline/archive:
1. Recheck source/HTML hashes before implementation. Current v12 HTML SHA-256: `2d334c7e2f8f0007dc3b21fdbd3a1b668f8b5e8d4da1b2b444a05d39a30f372b`.
2. Run existing 21 targeted Node tests and three CadQuery tests. Preserve reports/source evidence before shared-code changes. Report superseded sources as archived, not fresh; do not relabel newly generated outcomes as historical v12.

Geometry/fit:
3. Test canonical coordinate points, handedness, left/right wheel axes, datum chains, cycles, missing references, invalid units, independent immutable inputs and invalid/null dimensions.
4. Test conflicting 16/22 mm shaft interpretations, intervals and unknown engagement. No inferred fit-certified pass with unknown mating details.
5. CadQuery validity/nonzero volume, bounds, holes and parameter propagation. JS/Python datum transforms agree within 0.01 mm computational tolerance, explicitly not manufacturing tolerance.
6. Check home/end/pickup/carry/release poses and at least 21 evenly spaced travel samples per joint, with intentional contacts distinguished from unexpected interference. Finite samples are not a continuous collision certificate.
7. Negative fixtures: short shaft, offset bolt pattern, negative engagement, undersized material and gate/wall overlap. Report first failing part pair/pose and render diagnostics.

Physics/handling:
8. Preserve legacy demo/organizer comparisons. Run the new gate geometry active in both arenas. If it fails, retain the failure; never remove the gate collider to restore a pass.
9. Factorized sensitivity ranges: tire masses 0.06/0.08/0.10/0.12 kg, tire friction 0.4/0.8/1.0, offsets -0.02/0/0.02 m, speed caps 0.12/0.18 m/s. Start with deduplicated nominal/one-factor cases, then 12 fixed-seed combined perturbations. These are assumed design-study ranges, not hardware limits or confidence intervals.
10. Trace actual fork/fixture support, gate travel, tire pose, release clearance and impulses when available. Existing 0.12 kg failure can have a destination-contact flag while release fails; decompose height/fork-contact/settling gates before altering recovery.
11. Test bounded retry, exhausted retry, missing/misaligned tire, weak lift and lost payload. No unbounded retries, dynamic pose corrections or hidden successful replays.

Browser/regression:
12. Offline v13 file loading, zero external requests/errors, exact active identity/parameters in download, gate visibility/contact through travel, pause/reset/config changes, complete export coverage and 390px layout. New screenshots/reports must not overwrite v12 evidence.
13. All Node tests, existing software/firmware Python suites, new CAD suite, verifiers, syntax/whitespace/secrets and isolated `/workspace/ieee/ieee/tools/check-all.js --json /tmp/ieee-v13-full.json` with no concurrent edits. Preserve context for the known historical embedded-image scanner false positive without blanket suppression.
14. Derive validation counts from machine results, not hardcoded totals. Save matrix inputs and source/output hashes in `/workspace/ieee/ieee/derived/showcase-v13/`. Hash untracked file contents before/after the full run.

[Implementation Order]
1. Obtain explicit implementation confirmation, establish the documented single-writer execution context, inspect/hash untracked work and preserve baseline evidence. No automatic commits.
2. Run baseline tests, archive/source reproduction checks and CadQuery distance/interference capability smoke test before changing shared-source provenance semantics.
3. Audit manufacturer archives and verify current primary documents as needed for shaft/hub/bracket mating. Record candidates and exact unknown measurements; continue disclosed hypothesis studies if a conflict cannot be resolved from documents.
4. Implement/test AssemblySpec, datum resolution, frame conversion and analytic fit. Preserve the legacy 7.8-versus-8 mm failure; any correction receives a new identity and recalculated track/clearance.
5. Generate parameterized mechanism solids and assembled STEP/STL; run independent interference checks. Explicitly list unmodeled actuator mounts/fasteners and do not claim fabrication readiness.
6. Export resolved GLB/collider registry, integrate opt-in v13 viewer/physics paths and verify transform equivalence, full mechanism contacts and continuous gate travel before controller tuning.
7. Diagnose nominal/heavy-tire release and implement only a bounded mechanically justified retry. Keep impossible/missing/weak cases failed.
8. Run handling matrix and both arenas; retain all outcomes and correct stale evidence text. Separate new model qualification from v12 archived passes.
9. Build `/workspace/ieee/ieee/share/Showcase-v13.html`, readiness/measurement documentation and actual limitations. Inspect offline browser screenshots and downloaded run evidence.
10. Run isolated full checks with content-hash tree integrity; write machine-derived summary and execution notes. Deliver the HTML, remaining fit blockers and next milestone recommendation, not a claim of complete robot qualification.

## Subsequent milestones, not hidden scope in v13

1. Primary-source electrical/actuator compatibility study: motor/driver supply/current/thermal limits, protection and charger/controller requirements, lift force/speed/stroke/duty budgets and documented alternatives. No purchase recommendation before critical compatibility gates.
2. Force-bounded lift and tipping dynamics with explicit mass/inertia allocation and new validation; ideal-lift passes cannot be transferred.
3. Actual firmware host integration, then scoped JavaScript ports with golden trace parity if offline browser execution requires them. Define inch/metre units, route formats and observations versus ground truth; do not invent missing lift firmware or pose sensing.
4. Current organizer mechanism/scoring integration after source audit: exact tires/exchange hardware/start/finish/parking criteria, distinct from position-gate laps.
5. Hardware measurements, calibration, safety review, physical tests and only then a manufacturing release.
