#!/bin/bash
# B opsiyonu render: Remotion render -> -14 LUFS ses normalizasyonu (örnekler gibi dolgun ses) -> metaveri temizliği
# Kullanım: bash tools/render_b.sh <KompozisyonId> <çıktı.mp4>
#   ör: bash tools/render_b.sh B-m01-cihazina-iyi-bak ../shorts/mustafa_sozen/B_m01_cihazina_iyi_bak.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH=~/.local/node/bin:$PATH
COMP="$1"; OUT="$2"
TMP="out/_b_raw.mp4"
npx remotion render src/index.ts "$COMP" "$TMP" --codec=h264 --crf=22 --audio-bitrate=192k 2>&1 | grep -v "^\s*at " | tail -1
# loudnorm: entegre -14 LUFS, tepe -1.5 dBTP (YouTube/TikTok/Instagram hedefi); görüntü yeniden kodlanmaz
npx remotion ffmpeg -nostdin -hide_banner -loglevel error -y -i "$TMP" -map 0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k \
  -map_metadata -1 -metadata:s:v encoder= -fflags +bitexact -flags:v +bitexact -flags:a +bitexact \
  -movflags +faststart "$OUT"
echo "OK $OUT"
