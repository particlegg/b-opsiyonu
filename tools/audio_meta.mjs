// Ses seviyesi ölçümü (B opsiyonunda müzik/konuşma dengesi için).
// Kullanım: node tools/audio_meta.mjs <çıktı.json> <dosya1> [dosya2 ...]
// Her dosya için (dBFS, 16 kHz mono):
//   p90:    100 ms pencerelerin %90'lık dilimi  -> konuşmanın "dolu" seviyesi (kesitler için)
//   median: 500 ms pencerelerin medyanı         -> müziğin tipik yatak seviyesi (müzikler için)
//   duration
// Var olan JSON'a ekler/günceller (anahtar: dosya adı, uzantısız).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [, , outPath, ...files] = process.argv;
const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-"));
const SR = 16000;
const db = (x) => +(20 * Math.log10(Math.max(x, 1) / 32768)).toFixed(1);
const windows = (s, n) => {
  const v = [];
  for (let i = 0; i + n <= s.length; i += n) {
    let t = 0;
    for (let j = i; j < i + n; j++) t += s[j] * s[j];
    v.push(Math.sqrt(t / n));
  }
  return v.sort((a, b) => a - b);
};

for (const f of files) {
  const wav = path.join(tmp, "a.wav");
  execFileSync("npx", ["remotion", "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", f, "-vn", "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", wav]);
  const b = fs.readFileSync(wav);
  const i = b.indexOf("data") + 8;
  const s = new Int16Array(b.buffer.slice(b.byteOffset + i, b.byteOffset + b.length - ((b.length - i) % 2)));
  const w1 = windows(s, SR / 10);
  const w5 = windows(s, SR / 2);
  const key = path.basename(f).replace(/\.[^.]+$/, "");
  out[key] = { p90: db(w1[Math.floor(w1.length * 0.9)]), median: db(w5[Math.floor(w5.length / 2)]), duration: +(s.length / SR).toFixed(2) };
  console.log(key, out[key]);
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
