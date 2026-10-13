// git kurulu olmayan makinede GitHub'a tek commit ile yükleme (gh CLI + Git Data API).
// Kullanım: node tools/gh_upload.mjs <sahip/depo> "<commit mesajı>"
// .gitignore'daki kurallara uyar (node_modules, out, lisanslı müzik/efekt/font, videolar gönderilmez).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [, , repo, message] = process.argv;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const ignored = (rel) =>
  rel.startsWith("node_modules/") ||
  rel.startsWith("out/") ||
  rel.endsWith(".DS_Store") ||
  /^public\/(music|sfx)\/.+\.mp3$/.test(rel) ||
  (/^public\/fonts\//.test(rel) && !rel.endsWith(".gitkeep")) ||
  /\.(mp4|mov|MOV)$/.test(rel);

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(root, abs);
    if (e.isDirectory()) {
      if (!ignored(rel + "/")) walk(abs);
    } else if (!ignored(rel)) files.push(rel);
  }
};
walk(root);

const api = (args, input) =>
  JSON.parse(execFileSync("gh", ["api", ...args, ...(input ? ["--input", "-"] : [])], { input: input ? JSON.stringify(input) : undefined, encoding: "utf8", maxBuffer: 64 << 20 }));

const head = api([`repos/${repo}/git/ref/heads/main`]).object.sha;
const tree = files.sort().map((rel) => {
  const blob = api(["-X", "POST", `repos/${repo}/git/blobs`], { content: fs.readFileSync(path.join(root, rel)).toString("base64"), encoding: "base64" });
  const exec = /\.(sh)$/.test(rel);
  console.log(`  + ${rel}`);
  return { path: rel, mode: exec ? "100755" : "100644", type: "blob", sha: blob.sha };
});
const t = api(["-X", "POST", `repos/${repo}/git/trees`], { tree });
const c = api(["-X", "POST", `repos/${repo}/git/commits`], { message, tree: t.sha, parents: [head] });
api(["-X", "PATCH", `repos/${repo}/git/refs/heads/main`], { sha: c.sha, force: false });
console.log(`${files.length} dosya yüklendi -> commit ${c.sha.slice(0, 7)}`);
