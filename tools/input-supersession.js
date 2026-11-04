'use strict';
// Input-hash checking with dated supersession records. A sealed report lists the SHA-256 of each input
// at sealing time. A supersession record may accept one documented later edit of a specific input, but
// only when the sealed hash and the current hash both match the record exactly. Everything else stays
// strict, so any further edit, or a change to any other input, is still reported as stale.

function checkInputHashes(inputHashes, hashOf, record) {
  const accepted = [];
  const stale = [];
  const superseded = (record && Array.isArray(record.superseded_inputs)) ? record.superseded_inputs : [];
  for (const [file, sealed] of Object.entries(inputHashes)) {
    const current = hashOf(file);
    if (current === sealed) continue;
    const entry = superseded.find(s => s.file === file);
    if (entry && entry.sealed_sha256 === sealed && entry.current_sha256 === current) accepted.push(file);
    else stale.push({file, sealed, current});
  }
  return {accepted, stale};
}

module.exports = {checkInputHashes};
