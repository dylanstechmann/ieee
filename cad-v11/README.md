# Editable CAD and integrated showcase — v11

Agent-written work in progress for the owner's hobby/learning project. Not a
complete robot, fabrication release, or physically validated design.

`parts/structure.py` provides parameter-driven CadQuery deck and caster-riser
solids, with explicit mm units and invalid-geometry checks. No proprietary CAD
application or imported vendor mesh is required to generate these solids.
`parts/drivetrain.py` and `parts.json` add parameter-driven exterior studies for
the motor, wheel, hub, bracket and caster. These are approximate exteriors, not
exact vendor replicas: mounting holes, fasteners and internal details are omitted
where recorded in the catalog. The 22 mm CAD shaft datum versus archived 16 mm
published shaft length remains unresolved; no complete fit is claimed.

`/workspace/ieee/ieee/tools/build-cad-v11.py` generates ten valid solids as STEP
and STL with input/output hashes in `/workspace/ieee/ieee/derived/cad-v11/manifest.json`.
`/workspace/ieee/ieee/tools/build-showcase-v11.js` embeds those meshes, a bundled
Three.js viewer and both historical simulation traces into
`/workspace/ieee/ieee/share/Showcase-v11.html`. No network or sibling studio page
is required. Three.js and esbuild use the existing external build cache.

Browser dimension changes are explicitly hypothetical scaled-wheel previews,
not regeneration of arbitrary CAD features. General CAD edits regenerate in
Python. A shared assembly/export placement manifest, GLB/collision exports,
complete purchased-part fidelity remain unfinished. A reduced-order live
contact mission now exists; see `/workspace/ieee/ieee/robot-studio-v11/README.md`
for its enlarged demonstration-arena scope, ideal lift and level-plane chassis
limitations. Historical mission results do not validate these new solids.

The initial dimension-stack adapter is
`/workspace/ieee/ieee/robot-studio-v11/dimensions.js`. Its historical baseline is
used only for regression tests. Corrections and substitutions get separate
identities and do not overwrite the original model or claim physical validation.

Tests (Python dependencies are resolved outside the repository by uv):

```sh
cd /workspace/ieee/ieee
node --test tests/studio-dimensions-v11.test.js
uv run --no-project --python 3.12 --with cadquery==2.8.0 python -B -m unittest discover -s cad-v11/tests -v
uv run --offline --no-project --python 3.12 --with cadquery==2.8.0 python -B tools/build-cad-v11.py
node tools/build-showcase-v11.js
node --test tests/showcase-v11.test.js tests/studio-dimensions-v11.test.js
node tools/check-showcase-v11-browser.js
```

Offline file-protocol browser checks cover load, playback, reset, trace selection,
seek, dimension preview, restore and narrow layout. This is not yet a browser CAD
editor. No physical measurements, purchases, source-license grants, or final
part substitutions are implied by these synthetic tests. This work is agent-run;
owner review and hardware testing have not been claimed.