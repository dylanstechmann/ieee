#!/usr/bin/env node
// Reproducible, loss-aware extraction from the two archived Word files.
// Requires Node.js and the unzip executable; no third-party packages.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'derived');
const documents = [1, 2].map(n => ({ name: `GM${n}-V2`, file: path.join(root, 'sources', `Game-Manual-2027-${n}-V2.docx`) }));
for (const [name, file] of [['GM1-V3', 'Game-Manual-2027-1-V3.docx'], ['GM2-V3.1', 'Game-Manual-2027-2-V3-1.docx']]) {
  const source = path.join(root, 'sources', 'organizer-2026-10-29', file);
  if (fs.existsSync(source)) documents.push({ name, file: source });
}
const unzip = (file, ...args) => execFileSync('unzip', args.concat(file), { maxBuffer: 25 * 1024 * 1024 });
const decode = text => text.replace(/&#x([\da-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi, (_, hex, dec, entity) => hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity]);

fs.mkdirSync(target, { recursive: true });
for (const doc of documents) {
  const xml = execFileSync('unzip', ['-p', doc.file, 'word/document.xml'], { maxBuffer: 25 * 1024 * 1024 }).toString();
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(match => {
    const parts = [...match[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br(?:\s[^>]*)?\s*\/>/g)];
    return parts.map(part => part[1] === undefined ? (part[0].startsWith('<w:tab') ? '\t' : '\n') : decode(part[1])).join('');
  });
  fs.writeFileSync(path.join(target, `${doc.name}-paragraphs.txt`), `Derived document.xml paragraphs; tables are flattened, images and headers omitted. Consult the original.\nSource: ${path.relative(root, doc.file)}\n\n${paragraphs.join('\n')}\n`);
  const listing = unzip(doc.file, '-Z1').toString().split('\n').filter(entry => /^word\/media\/[^/]+$/.test(entry));
  const dir = path.join(target, doc.name, 'media');
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of listing) {
    const data = execFileSync('unzip', ['-p', doc.file, entry], { maxBuffer: 25 * 1024 * 1024 });
    fs.writeFileSync(path.join(dir, path.basename(entry)), data);
  }
  console.log(`${doc.name}: ${paragraphs.length} paragraphs, ${listing.length} embedded media files`);
}