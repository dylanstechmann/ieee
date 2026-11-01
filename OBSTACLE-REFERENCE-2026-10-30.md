# Archived obstacle-reference audit — October 30, 2026

Agent-assisted local-source audit for the owner's hobby/learning project. This is
not a current organizer/Q&A review, measurement, purchase recommendation or legal
layout certification. No new online source was needed for this archived audit.

## Source and extraction

`/workspace/ieee/ieee/sources/organizer-2026-10-29/Game-Manual-2027-2-V3-1.docx`
has SHA-256 `90e4061310f81d4b42027ecb3b2c9a0ad9167dc8adf9c917c0b25017560039b8`,
recorded in `/workspace/ieee/ieee/sources/organizer-2026-10-29/manifest.json`.
The filename is not proof of a 3.1 rules revision. Extract `word/document.xml`
with `unzip -p`, identify `<w:p>` elements (not `<w:pPr>`), concatenate their
`<w:t>` text. The indices below are zero-based extracted paragraph indices,
including empty paragraphs, not printed page numbers.

| Item | Archived location | Evidence status | Modeling consequence |
|---|---|---|---|
| Three obstacles | §3.1 narrative, paragraph 118; revision entry 46 | Explicit source fact | One blocker is a diagnostic probe, not match coverage |
| Placement in different lanes | §3.1 paragraph 118 | Explicit text; exact allocation unresolved | Do not infer a particular three-obstacle arrangement |
| Straightaway quadrants, inner/outer lanes | Paragraph 165 | Explicit text | Pit-gate probe cannot be called an official legal placement |
| Equal quadrants, 2-in offsets from side and center rails | Appendix E paragraph 362 | Explicit text; rail reference edge unresolved | Do not convert to exact global polygons silently |
| 16-in width and 16-in longitudinal extent; 4-in gap | Appendix E paragraph 362 | Explicit text; coordinate mapping unresolved | Placement region dimensions, NOT toy-car footprint dimensions |
| Toy Vehicle Obstacle Set | Materials table paragraphs 307–311 | Explicit item label | Exact installed vehicle models, shapes and dimensions unknown |
| Toy set linked product | Table hyperlink relationship `rId24`, Amazon ASIN `B00EX5K1GG` | Archived document relationship, not live listing verification | No verified dimensions, availability or selected purchase |
| Four illustrated quadrants and three toy vehicles | Appendix E embedded `rId30`, `/workspace/ieee/ieee/derived/GM2-V3.1/media/image8.tmp` (PNG bytes) | Direct image inspection; perspective illustration | Quadrants 1–4 shown, cars illustrated in 1/2/3; not an exhaustive allocation rule or scale measurement |
| Square 2×2-in regression probes | `/workspace/ieee/ieee/navigation-stress-v3.json` | Engineering assumptions | Keep for regression; do not relabel as actual obstacles |

The toy item label is plain text; inspect the **Amazon Toy Vehicle Obstacle Set**
hyperlink itself, rather than taking the next relationship after the heading
(which can refer to the following masking-tape item).

The Appendix E image is a PNG despite its `.tmp` suffix; it was copied to a
temporary `.png` path for direct inspection, without altering the source. It shows
four orange quadrant outlines on both sides of the center rail and three toy cars.
Perspective and lack of vehicle dimensions prevent using it for footprint sizing.
The extracted Appendix E text and picture do not
resolve object orientation, whether the entire vehicle must lie within a
quadrant, placement tolerance, or exactly which rail edge defines the offset.
The existing field/AprilTag/tire images are not obstacle dimension evidence.
Do not estimate vehicle dimensions from a product name or undimensioned photo.

## Questions to obtain before competition-layout claims

1. Exact vehicle set/models, maximum footprint/height and placement orientation?
2. Does the whole vehicle or its reference point have to lie within a quadrant?
3. Which rail faces define the 2-in offsets and 16-in spans?
4. How are three obstacles allocated across the lanes/quadrants?
5. Is any pit-access obstruction legal? Which pit-entry/exit routes are allowed?
6. What track/marking overlap and lap-crossing interpretations govern detours?

Until answered, use explicitly hypothetical bounds and retain source ambiguities.
No measured or source-qualified three-car scenario is generated in this pass.