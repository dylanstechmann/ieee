# Navigation confirmation packet — October 31, 2026

Agent-assisted preparation for the owner's personal hobby/learning project.
**Draft, not sent. No organizer answers received; no legal route qualified.**

## Offline follow-up — owner Discord check

Owner reports: “I just looked through the discord and there's nothing new;
therefore, you can ignore.” Recorded October 31, 2026 from the conversation;
exact check time and channel scope were not supplied. This is owner-reported
evidence, not agent access to messages or confirmation of permission. The earlier
download manifest's `qa.status: not-reviewed` remains historically unchanged.
No further Discord check or new online source refresh was performed in this follow-up.

Question references now include human-readable sections, definitions and rule
identifiers. In particular, **G02 already publishes +/-1 inch**; Q6 asks how it
applies to datums and installed geometry, not whether any tolerance exists.
See `/workspace/ieee/ieee/derived/confirmation-packet-v3/geometry-evidence.md` for
the consolidated organizer/manufacturer/measurement/assumption ledger, and
`/workspace/ieee/ieee/derived/confirmation-packet-v3/acceptance-specification.json`
for seven future regression specifications. They are **specified, not executed**;
the accompanying unit tests validate evidence bookkeeping, not physical legality.

Input: `/workspace/ieee/ieee/confirmation-baseline-v3.json`. No supported physical
vehicle dimensions were added; no route, uncertainty bound or planner policy changed.

Follow-up validation: **81 tests passed, 0 failed/skipped**, Node v24.18.1;
8 packet-specific tests passed independently and packet verification succeeded.

## Read / send after owner review

- `/workspace/ieee/ieee/derived/confirmation-packet-v3/questions-to-organizer.md`:
  seven focused question groups, ready for review and posting in the official Q&A.
- `/workspace/ieee/ieee/derived/confirmation-packet-v3/diagram-A-south.png` and
  `/workspace/ieee/ieee/derived/confirmation-packet-v3/diagram-B-north.png`:
  human-readable attachments. Matching SVGs are vector originals.
- `/workspace/ieee/ieee/derived/confirmation-packet-v3/source-excerpts.json`:
  exact extracted manual paragraphs; indices are zero-based XML paragraphs,
  including empty paragraphs, NOT printed page numbers. XML entities retained.
- `/workspace/ieee/ieee/derived/confirmation-packet-v3/evidence-ledger.json`:
  all seven questions remain unresolved with null answers/provenance.
- `/workspace/ieee/ieee/derived/confirmation-packet-v3/MEASUREMENT-AND-ANSWER-CHECKLIST.md`:
  answer acceptance, geometry measurement and promotion gates.

Use questions Q1–Q3 first if the organizer prefers small posts, then Q4–Q6 and Q7.
Check existing official answers before posting duplicates. Only the owner should
post after review; this tool does not submit messages or contact anyone.

## Source refresh actually performed

On October 31, 2026 (UTC), the official student-competitions page was retrieved by
local HTTP fetch and inspected in the browser, including the otherwise collapsed
hardware tab. Its posted labels remain V3.0. All five resources were downloaded
and hashed: GM1, GM2, arena Fusion ZIP, spare tire ZIP and arena build-guide PDF.
**All five are byte-identical to their previous archived copies.** Thus no document
text/drawing change was detected; that is not proof that no Q&A update exists.

Exact downloads, retrieval timestamps, source URLs, page HTML and comparison hashes:
`/workspace/ieee/ieee/sources/confirmation-2026-10-31/manifest.json`.
The official page identifies official Discord Q&A as the clarification channel.
The public invitation resolves to “IEEE SoutheastCon - Official Discord”, but
the unauthenticated page exposes account creation/login rather than channel posts.
**Q&A messages were not reviewed.** No account was created, no server joined,
no credentials accessed and no question sent. An independent search-browser fetch
was robots-blocked; successful local HTTP/browser retrieval supplied this snapshot.

GM1 extracted paragraph 142 explicitly describes the official #qna answers.
C00, paragraphs 145–153, ranks head-referee decisions at competition first, then
official Q&A, written GM2, written GM1, their images and other GDC documents. The
extracted Q&A hierarchy line includes literal `???`; preserve the source instead
of silently editing its punctuation. C00 is the hierarchy heading even though
paragraph 142 cross-references C02. Ask if an interpretation remains uncertain.

## What the diagrams do and do not show

Both use the same stored, variant-aware **empty-control** example to pit box 1,
not a fabricated successful path and not an allegedly legal pit-blocker scenario.
Arrows show spatial travel; selected 10×10-in chassis footprints and heading ticks
show extent and orientation. Actual pit entry, dock, withdrawal and race reentry
waypoints come from the previous connected-study report. The north example crosses
the illustrated start area, an explicit subject for Q1/Q3 rather than hidden detail.

“North/south” only name the top/bottom of these sheets. Field dimensions, divider
placement and track tracing remain provisional. No official finish-line endpoints
are invented; Q3 requests them. No three-lap completion, mechanism/tire envelope,
official vehicle footprint or placement region is certified by these drawings.

## Reproduce and verify

From `/workspace/ieee/ieee`:

```sh
node tools/confirmation-packet-v3.js
node tools/verify-confirmation-packet-v3.js
node --test tests/*.test.js
```

The generator is local/offline and deterministic against the snapshot. It does not
rerun expensive planners or touch historical report files. To collect a **new**
dated source snapshot deliberately, run `node tools/refresh-confirmation-sources-v3.js`;
it uses the UTC date and verifies the expected published links are still present.
If the resource list changes, it stops for review rather than guessing replacements.
It refreshes public downloads only, not Discord message content. The seven-question
configuration still names this snapshot until explicitly reviewed and updated.

PNG previews were rendered from the actual SVGs with installed local headless
Chromium (1320×1040) and both inspected for clipping, route direction and legends.
The packet manifest hashes generated SVG/JSON/Markdown outputs and relevant inputs;
PNG files are convenience previews, not independent planner evidence.

Validation: Node v24.18.1; packet verifier checks downloads, old-file comparisons,
source excerpts, unresolved state, route-derived diagrams and freshness. No extra
packages, physical measurements or purchases. No planning policy or uncertainty
configuration was changed in preparing this packet.