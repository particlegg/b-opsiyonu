// public/sfx/*.mp3 dosyalarını analiz eder -> src/data/sfx_meta.json
//   onset: sesin gerçekten başladığı an (sn) -> başındaki sessizlik atlanır
//   peakDb: en yüksek 100 ms penceresinin RMS seviyesi (dBFS) -> efektler aynı seviyeye eşitlenir
//   length: süre (sn)
// Yeni efekt indirdikten sonra çalıştır: node sfx_meta.mjs
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const dir = "public/sfx";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sfx-"));
const SR = 16000;
const meta = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mp3")).sort()) {
  const wav = path.join(tmp, f + ".wav");
  execFileSync("npx", ["remotion", "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-i", path.join(dir, f), "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", wav]);
  const b = fs.readFileSync(wav);
  const i = b.indexOf("data") + 8;
  const s = new Int16Array(b.buffer.slice(b.byteOffset + i, b.byteOffset + b.length - ((b.length - i) % 2)));
  let peak = 0;
  for (const x of s) peak = Math.max(peak, Math.abs(x));
  let on = 0;
  while (on < s.length && Math.abs(s[on]) < peak * 0.1) on++;
  const W = SR / 10;
  let best = 0;
  for (let k = 0; k + W <= s.length; k += W / 2) {
    let t = 0;
    for (let j = k; j < k + W; j++) t += s[j] * s[j];
    best = Math.max(best, Math.sqrt(t / W));
  }
  meta[f.replace(".mp3", "")] = {
    onset: Math.max(0, +(on / SR - 0.02).toFixed(3)),
    peakDb: +(20 * Math.log10(Math.max(best, 1) / 32768)).toFixed(1),
    length: +(s.length / SR).toFixed(2),
  };
}
fs.writeFileSync("src/data/sfx_meta.json", JSON.stringify(meta, null, 1));
console.log(Object.keys(meta).length, "efekt analiz edildi -> src/data/sfx_meta.json");
