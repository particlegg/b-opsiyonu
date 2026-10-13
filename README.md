# B Opsiyonu: Bilal tarzı dikey Shorts kurgusu

Telefon videolarından (birden fazla çekim) tek bir dikey Short kurgusu çıkaran [Remotion](https://www.remotion.dev) projesi.

- **Altyazı:** Proxima Nova, konuşulduğu gibi küçük harf, beyaz yazı, her zaman ince siyah kontur, 1–3 kelimelik öbekler
- **Kaplamalar:** kırmızı oklu isim etiketi, Google yorum kartı, resim kutusu
- **Ses:** konuşmanın ~19 dB altında kısık müzik yatağı, kısık meme efektleri, segment geçişlerinde swoosh, küfürlerde bip, final -14 LUFS
- **Çekim seçimi:** aynı cümle birkaç kez denenmişse her zaman **son tam çekim** kullanılır (`tools/takes.py`)

Ayrıntılı stil analizi ve tüm kurallar: [`B_OPSIYONU.md`](B_OPSIYONU.md)

## Kurulum

Node.js 18+ gerekiyor.

```bash
npm install
```

```bash
npm run assets
```

`npm run assets` müzikleri ve efektleri orijinal kaynaklarından (Pixabay / Mixkit) indirir.

### Repoda olmayan 2 şey

1. **Font:** `public/fonts/ProximaNova-Bold.ttf`
   - Proxima Nova ticari bir font; repoya konamaz.
   - Adobe Creative Cloud varsa Adobe Fonts'tan etkinleştir, ya da Mark Simonson Studio'dan lisans al.
   - Dosyayı bu ada kopyala; `.otf` ise `src/OptionB.tsx` içindeki `loadFont` satırındaki dosya adını değiştir.
2. **Videolar:** `public/<proje>/` altına konur. Örnek kurgu (`B-BilalDeneme`) şu dosyaları bekler:
   ```text
   public/bilaldeneme/v7258.mp4  v7260.mp4  v7263.mp4  v7264.mp4
   ```
   iPhone videolarını (`IMG_xxxx.MOV`, 4K, döndürmeli) 1080×1920 / 30 fps'e çevirmek için:
   ```bash
   npx remotion ffmpeg -i IMG_7258.MOV -map 0:v:0 -map 0:a:0 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -r 30 -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k public/bilaldeneme/v7258.mp4
   ```

## Kullanım

Önizleme (tarayıcıda canlı düzenleme):

```bash
npm run studio
```

Final render: Remotion → -14 LUFS → metaveri temizliği

```bash
bash tools/render_b.sh B-BilalDeneme out/sahte_para.mp4
```

## Yeni bir video kurgulamak

1. Videoları 1080×1920'ye çevir (yukarıdaki komut) ve `public/<proje>/` altına koy.
2. **Kelime zamanlamaları + çekim seçimi.** Python 3, ffmpeg ve `pip install faster-whisper` gerekir:
   ```bash
   TAKES_MODEL=large-v3 python3 tools/takes.py public/<proje>/*.mp4 > takes.json
   ```
   - `parts` içinde her konuşma parçası `keep` / `drop` ve nedeniyle listelenir.
   - Sadece `keep` parçaları kullan; `words` doğrudan altyazı verisidir.
3. `src/data/bilaldeneme/edit.ts` dosyasını kopyalayıp düzenle:
   - `segments`: hangi videonun hangi aralığı, hangi hızda
   - `overlays`: etiketler / kartlar (çıktı zamanı, ekran oranı koordinatları)
   - `cues`: ses efektleri (`src/sfxLibrary.ts` listesi)
   - `punches`: vurgu zoom'u
   - `bleeps`: küfür sansürü (kaynak zamanı)
   - `music`: `public/music/` içinden bir parça
   - `speechP90`: konuşma seviyesi, `node tools/audio_meta.mjs out.json public/<proje>/*.mp4` ile ölç
4. `src/Root.tsx`'e bir `<Composition>` ekle ve render al.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `src/OptionB.tsx` | B stili: altyazı, kaplamalar, müzik yatağı, `B_STYLE` ayarları |
| `src/OptionBMulti.tsx` | çok kaynaklı zaman çizelgesi (segmentler, hız, bip, zoom) |
| `src/videoCore.tsx` | dikey video katmanı, zoom, ara kesme, yazı kapatma (16:9 kaynaklar için) |
| `src/sfxCore.tsx`, `src/sfxLibrary.ts` | seviye eşitlemeli ses efekti sistemi + efekt listesi |
| `tools/takes.py` | çekim seçici (son tam çekim kuralı) |
| `tools/audio_meta.mjs` | ses seviyesi ölçümü (müzik / konuşma dengesi) |
| `tools/sfx_meta.mjs` | efektlerin seviye ve başlangıç analizi (yeni efekt ekleyince çalıştır) |
| `tools/render_b.sh` | render + loudnorm + metaveri temizliği |
| `tools/download_assets.sh` | müzik ve efektleri indirir |

## Lisanslar

- **Müzik ve efektler:** Pixabay Content License ve Mixkit Free License. İkisi de YouTube dahil ticari kullanımı ücretsiz ve atıfsız serbest bırakır, ancak dosyaların tek başına yeniden dağıtımını yasaklar. Bu yüzden repoda sadece kaynak listesi (`tools/*_sources.tsv`) var.
- **`public/sfx/bleep.wav`:** proje için üretilmiş 1 kHz sinüs; serbestçe kullanılabilir.
- **Proxima Nova:** ticari font, lisansını kendin edinmelisin.
