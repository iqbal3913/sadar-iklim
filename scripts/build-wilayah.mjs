import { readFileSync, writeFileSync } from "node:fs";

const [input, output = "src/data/wilayah.json"] = process.argv.slice(2);
if (!input) {
  console.error("Pemakaian: node scripts/build-wilayah.mjs <wilayah.sql> [src/data/wilayah.json]");
  process.exit(1);
}

const row = /^\('(\d{2}(?:\.\d{2}){0,2}(?:\.\d{4})?)','(.*)'\)[,;]?\s*$/;
const tree = new Map();
let total = 0;

for (const line of readFileSync(input, "utf8").split(/\r?\n/)) {
  const m = row.exec(line);
  if (!m) continue;
  const code = m[1];
  const name = m[2].replaceAll("\\'", "'").replaceAll("''", "'");
  const parent = code.includes(".") ? code.slice(0, code.lastIndexOf(".")) : "";
  if (!tree.has(parent)) tree.set(parent, []);
  tree.get(parent).push([code, name]);
  total += 1;
}

const body = [...tree]
  .map(([parent, items]) => `${JSON.stringify(parent)}:${JSON.stringify(items.sort((a, b) => (a[0] < b[0] ? -1 : 1)))}`)
  .join(",");

writeFileSync(output, `{${body}}`);
console.log(`${total} wilayah, ${tree.size} induk, ditulis ke ${output}`);
