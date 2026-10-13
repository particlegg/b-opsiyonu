"""ÇEKİM SEÇİCİ (B opsiyonu kuralı: tekrar edilen denemelerden HER ZAMAN son tam çekim kullanılır)

Telefon çekimlerinde aynı cümle çoğu zaman birkaç kez denenir ("Bugün bu paraları..." x3).
Tek parça Whisper bu denemeleri birleştirip yanlış zamanlara yayabilir (ör. bir kelimeyi sessizliğe kadar uzatır).
Bu araç:
  1. Sesi duraklamalardan (>= 0.45 sn sessizlik) konuşma parçalarına ayırır
  2. Her parçayı AYRI çözümler (doğru kelime zamanları)
  3. Bir parça, kendisinden sonra gelen bir parçanın başlangıcıyla aynı başlıyorsa (ilk 2 kelime / %60 benzerlik)
     o parça "deneme" sayılır ve atılır; yarım kalanlar ("sak...", "paraları...") da deneme sayılır
  4. Ardışık parçalar arasında yarım kelimeyle bölünmüş cümleleri birleştirir ("sak..." + "...layacağım")

Kullanım (Higgsfield sandbox):  python3 takes.py dosya1.mp3 [dosya2.mp3 ...] > takes.json
Çıktı: { "<dosya>": { "parts": [{s,e,text,keep,why}], "words": [{w,s,e}] (sadece keep=True parçalar) } }
"""
import json
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher

import numpy as np
from faster_whisper import WhisperModel

SR = 16000
SIL_DB = -36  # bu seviyenin altı sessizlik
MIN_SIL = 0.45  # parça ayıran en kısa sessizlik
PAD = 0.12

model = WhisperModel(os.environ.get("TAKES_MODEL", "large-v3"), device="cpu", compute_type="int8", cpu_threads=8)


def load(path):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def bursts(x):
    W = SR // 20
    rms = [20 * np.log10(max(np.sqrt(np.mean(x[i:i + W] ** 2)), 1e-6)) for i in range(0, len(x) - W, W)]
    loud = [r > SIL_DB for r in rms]
    out, start, quiet = [], None, 0
    for k, l in enumerate(loud + [False] * 20):
        t = k * W / SR
        if l:
            if start is None:
                start = t
            quiet = 0
        elif start is not None:
            quiet += W / SR
            if quiet >= MIN_SIL:
                out.append((max(0, start - PAD), t - quiet + W / SR + PAD))
                start, quiet = None, 0
    return [b for b in out if b[1] - b[0] > 0.3]


norm = lambda s: re.sub(r"[^\wçğıöşü ]", "", s.lower()).split()

result = {}
for path in sys.argv[1:]:
    x = load(path)
    parts = []
    for s, e in bursts(x):
        seg = x[int(s * SR):int(e * SR)]
        segs, _ = model.transcribe(seg, language="tr", word_timestamps=True, vad_filter=False, beam_size=5,
                                   condition_on_previous_text=False)
        ws = [{"w": w.word.strip(), "s": round(s + w.start, 3), "e": round(s + w.end, 3)} for g in segs for w in g.words if w.word.strip()]
        if ws:
            parts.append({"s": round(s, 2), "e": round(e, 2), "text": " ".join(w["w"] for w in ws), "words": ws, "keep": True, "why": ""})
    # yarım kelimeyle bölünmüşleri birleştir: "... sak..." + "...layacağım ve ..."
    merged = []
    for p in parts:
        if merged and merged[-1]["text"].endswith("...") and p["text"].startswith("...") and p["s"] - merged[-1]["e"] < 0.5:
            # tek parça olarak yeniden çözümle (yarım kelimeleri yapıştırmak yerine)
            m = merged[-1]
            s0, e0 = m["s"], p["e"]
            segs, _ = model.transcribe(x[int(s0 * SR):int(e0 * SR)], language="tr", word_timestamps=True, vad_filter=False,
                                       beam_size=5, condition_on_previous_text=False)
            m["words"] = [{"w": w.word.strip(), "s": round(s0 + w.start, 3), "e": round(s0 + w.end, 3)} for g in segs for w in g.words if w.word.strip()]
            m["e"] = e0
            m["text"] = " ".join(w["w"] for w in m["words"])
        else:
            merged.append(p)
    # denemeleri işaretle
    for i, p in enumerate(merged):
        a = norm(p["text"])
        for q in merged[i + 1:]:
            b = norm(q["text"])
            same_start = len(a) >= 2 and a[:2] == b[:2]
            # kısa yarım denemeler ("bu gibi parılı" ~ "bugün bu paraları") için eşik daha düşük
            thr = 0.5 if len(a) <= 4 else 0.6
            similar = SequenceMatcher(None, " ".join(a), " ".join(b[: len(a) + 2])).ratio() > thr
            if same_start or similar:
                p["keep"], p["why"] = False, f"sonra tekrar denenmiş: '{q['text'][:40]}'"
                break
        if p["keep"] and p["text"].rstrip().endswith("..."):
            p["keep"], p["why"] = False, "yarım kalmış"
    result[path] = {
        "parts": [{k: v for k, v in p.items() if k != "words"} for p in merged],
        "words": [w for p in merged if p["keep"] for w in p["words"]],
    }
print(json.dumps(result, ensure_ascii=False, indent=1))
