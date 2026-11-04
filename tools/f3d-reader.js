'use strict';
// Read-only access to Autodesk Fusion .f3d archives and their ASM ("ACIS binary") B-rep blobs.
// The archives are untrusted input: members are decompressed in memory with size limits, names are
// never used as file paths, and nothing from the archive is executed.
// Supports ZIP methods 0 (stored) and 93 (Zstandard, Node >= 22.15 / 23.8 zlib.zstdDecompressSync).
const zlib = require('node:zlib');

const MEMBER_LIMIT = 64 * 1024 * 1024;

function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a ZIP archive: no end-of-central-directory record');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const members = [];
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    if (usize > MEMBER_LIMIT) throw new Error(`member too large: ${name}`);
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`bad local header: ${name}`);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    if (start + csize > buf.length) throw new Error(`truncated member: ${name}`);
    const data = buf.subarray(start, start + csize);
    let body;
    if (method === 0) body = Buffer.from(data);
    else if (method === 93) body = zlib.zstdDecompressSync(data, {maxOutputLength: MEMBER_LIMIT});
    else throw new Error(`unsupported compression method ${method}: ${name}`);
    if (body.length !== usize) throw new Error(`size mismatch: ${name}`);
    members.push({name, method, size: usize, data: body});
  }
  return members;
}

const MAGIC = 'ASM BinaryFile4';

// Tokenize an ASM binary B-rep. Returns entities: {name, toks}; pointers index the entity list.
function readSab(buf) {
  if (buf.toString('latin1', 0, MAGIC.length) !== MAGIC) throw new Error('not an ASM BinaryFile4 stream');
  let p = MAGIC.length + 16; // version, record count, entity count, flags (4 x int32)
  const take = n => { const s = p; p += n; if (p > buf.length) throw new Error(`token overrun at ${s}`); return s; };
  const triple = () => [buf.readDoubleLE(take(8)), buf.readDoubleLE(take(8)), buf.readDoubleLE(take(8))];
  const text = n => buf.toString('latin1', take(n), p);
  const entities = [];
  let current = [];
  while (p < buf.length) {
    const at = p;
    const tag = buf[take(1)];
    let tok;
    switch (tag) {
      case 0x02: tok = {t: 'char', v: buf[take(1)]}; break;
      case 0x03: tok = {t: 'short', v: buf.readInt16LE(take(2))}; break;
      case 0x04: tok = {t: 'int', v: buf.readInt32LE(take(4))}; break;
      case 0x05: tok = {t: 'float', v: buf.readFloatLE(take(4))}; break;
      case 0x06: tok = {t: 'double', v: buf.readDoubleLE(take(8))}; break;
      case 0x07: tok = {t: 'str', v: text(buf[take(1)])}; break;
      case 0x08: tok = {t: 'str', v: text(buf.readUInt16LE(take(2)))}; break;
      case 0x09: case 0x12: tok = {t: 'str', v: text(buf.readUInt32LE(take(4)))}; break;
      case 0x0A: tok = {t: 'true'}; break;
      case 0x0B: tok = {t: 'false'}; break;
      case 0x0C: tok = {t: 'ptr', v: buf.readInt32LE(take(4))}; break;
      case 0x0D: tok = {t: 'ident', v: text(buf[take(1)])}; break;
      case 0x0E: tok = {t: 'subident', v: text(buf[take(1)])}; break;
      case 0x0F: tok = {t: 'open'}; break;
      case 0x10: tok = {t: 'close'}; break;
      case 0x11: tok = {t: 'end'}; break;
      case 0x13: tok = {t: 'pos', v: triple()}; break;
      case 0x14: tok = {t: 'vec', v: triple()}; break;
      case 0x15: tok = {t: 'enum', v: buf.readInt32LE(take(4))}; break;
      case 0x16: tok = {t: 'uvec', v: triple()}; break;
      case 0x17: case 0x18: tok = {t: 'int64', v: Number(buf.readBigInt64LE(take(8)))}; break;
      default: throw new Error(`unknown ASM tag 0x${tag.toString(16)} at byte ${at}`);
    }
    current.push(tok);
    if (tag === 0x11) { entities.push(current); current = []; }
  }
  if (current.length) entities.push(current);
  const out = entities.map(toks => ({name: toks.filter(k => k.t === 'ident' || k.t === 'subident').map(k => k.v).join('-'), toks}));
  const header = out[0].toks.filter(k => k.t === 'str').map(k => k.v);
  const units = out[0].toks.find(k => k.t === 'double');
  return {entities: out, product: header[0], version: header[1], timestamp: header[2], mm_per_unit: units ? units.v : null};
}

// Every 'point' position reachable from a body without passing through another body or a transform.
function bodyPoints(entities, index) {
  const seen = new Set([index]);
  const stack = [index];
  const points = [];
  let transform = null;
  while (stack.length) {
    const j = stack.pop();
    const e = entities[j];
    if (!e) continue;
    if (e.name === 'point') {
      const pos = e.toks.find(k => k.t === 'pos');
      if (pos) points.push(pos.v);
    }
    for (const k of e.toks) {
      if (k.t !== 'ptr' || k.v < 0 || seen.has(k.v)) continue;
      const target = entities[k.v];
      if (!target || target.name === 'body') continue;
      if (target.name === 'transform') { if (j === index) transform = k.v; continue; }
      seen.add(k.v);
      stack.push(k.v);
    }
  }
  return {points, transform};
}

function transformMatrix(entities, index) {
  if (index === null) return null;
  const t = entities[index].toks;
  const vecs = t.filter(k => k.t === 'vec' || k.t === 'uvec' || k.t === 'pos').map(k => k.v);
  const scale = t.find(k => k.t === 'double');
  return {rows: vecs.slice(0, 3), translation: vecs[3], scale: scale ? scale.v : 1};
}

function isIdentity(m) {
  if (!m) return true;
  const eye = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return m.rows.every((r, i) => r.every((v, j) => Math.abs(v - eye[i][j]) < 1e-12))
    && m.translation.every(v => Math.abs(v) < 1e-12) && Math.abs(m.scale - 1) < 1e-12;
}

module.exports = {readZip, readSab, bodyPoints, transformMatrix, isIdentity};
