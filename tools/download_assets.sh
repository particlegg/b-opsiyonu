#!/bin/bash
# Müzik ve ses efektlerini orijinal kaynaklarından (Pixabay / Mixkit) indirir.
# Bu dosyalar lisansları gereği repoda tutulmaz; ikisi de YouTube dahil ticari kullanımda ücretsiz ve atıfsızdır.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/sfx public/music
fail=0
while IFS=$'\t' read -r name url _; do
  [ -z "$name" ] && continue
  [ -f "public/sfx/$name.mp3" ] && continue
  curl -sSfL -A "Mozilla/5.0" -o "public/sfx/$name.mp3" "$url" < /dev/null || { echo "İNDİRİLEMEDİ (efekt): $name"; fail=1; }
done < tools/sfx_sources.tsv
while IFS=$'\t' read -r name url _; do
  [ -z "$name" ] && continue
  [ -f "public/music/$name.mp3" ] && continue
  curl -sSfL -A "Mozilla/5.0" -o "public/music/$name.mp3" "$url" < /dev/null || { echo "İNDİRİLEMEDİ (müzik): $name"; fail=1; }
done < tools/music_sources.tsv
echo "efekt: $(ls public/sfx/*.mp3 2>/dev/null | wc -l | tr -d ' ')  müzik: $(ls public/music/*.mp3 2>/dev/null | wc -l | tr -d ' ')"
[ $fail = 0 ] && echo "TAMAM" || echo "Bazı dosyalar indirilemedi (bağlantı süresi dolmuş olabilir); sources.tsv içindeki sayfadan elle indir."
