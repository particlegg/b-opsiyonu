> **Repo notu:** Bu doküman ana projeden alındı. Repoda çok kaynaklı (telefon videoları) akış (`src/OptionBMulti.tsx`) hazır.
> Tek kaynaklı 16:9 akışta (yüz takipli kadraj, `B-<kesit>` kompozisyonları, `tools/gen_project.mjs`, `reframe.mjs`) bahsedilen bazı araçlar ana projede kaldı. Bunlar sadece 16:9 yatay kaynaklar için gerekir.

# B Opsiyonu — "Bilal" tarzı kurgu

Referans örnekler: `../Bilal/` (4 dikey video, 24–50 sn). B, bu videoların görsel ve işitsel stilini birebir hedefler.
Kod: `src/OptionB.tsx`. Kompozisyonlar: `B-<kesit-id>` (ör. `B-m01-cihazina-iyi-bak`).

## 1. Örneklerden çıkan stil

| Öğe | Örneklerde | B'de |
|---|---|---|
| Format | 1080×1920, 60 fps telefon çekimi | 1080×1920 / 30 fps; 16:9 kaynak, yüz takipli dikey kadraja çevrilir (A ile aynı altyapı) |
| Altyazı fontu | Proxima Nova (kalın) | Proxima Nova Bold |
| Altyazı yazımı | konuşulduğu gibi, **küçük harf** ("bu kadar şey", "incelediğimde", "60 liraya") | cümle başı küçük harf, özel isimler büyük kalır ("Google", "Japonya"), sondaki nokta/virgül atılır |
| Altyazı rengi | beyaz, **ince siyah kontur** + yumuşak gölge | beyaz, her zaman ~3,5 px siyah kontur + `0 4px 12px` gölge |
| Altyazı öbeği | 1–3 kelime | en fazla 3 kelime / 18 karakter; noktalama ve >0,35 sn duraklamada yeni öbek |
| Altyazı konumu | ekranın alt-ortası, yüksekliğin ~%79'u | `captionCenterY: 0.79` |
| Animasyon | sade, neredeyse animasyonsuz | çok hafif pop (1,06 → 1, 3 kare) |
| Kaplamalar | Google yorum kartı (avatar, isim, yıldız, yorum), ok + isim etiketi ("ahraz"), resim kutusu (PiP), ekran görüntüsü | `review`, `label` (kırmızı eğri ok), `image` kaplamaları |
| B-roll | yemek ve dükkân çekimleri, altyazısız | kaynakta varsa `cutaways` ile |
| Müzik | sürekli, **çok kısık** yatak | konuşmanın ~19 dB altında, giriş 0,4 sn, çıkış 1 sn fade |
| Efektler | seyrek, kısık (kaplama girişleri, geçişler) | kaplama girişinde pop, sahne kesiminde swoosh, isteğe bağlı cue'lar; A2 kısık eşitleme sistemiyle (-35 dB) |
| Genel ses | dolgun / yüksek (konuşma ≈ -12 dB) | render sonrası **-14 LUFS** normalizasyon |

### Ölçülen ses profili (0,1 sn RMS, dBFS)

| | En sessiz anlar (müzik) | Konuşma (p90) | Tepe |
|---|---|---|---|
| Örnek 1–4 | -24 … -35 | -10 … -18 | -7 … -10 |
| B demo (m01) | -28,4 | -13,0 | -8,2 |

## 1a. B'nin değişmez kuralları

### Çekim seçimi: her zaman SON TAM çekim
Telefon çekimlerinde aynı cümle çoğu zaman birkaç kez denenir. Tek parça Whisper bu denemeleri birleştirip
kelimeleri yanlış yerlere (hatta sessizliğe) yayabilir. Bu yüzden B'de konuşmalı her kaynak için:

1. Sandbox'ta çalıştır: `TAKES_MODEL=large-v3 python3 tools/takes.py kaynak1.mp3 kaynak2.mp3 > takes.json`
   - Ses, duraklamalardan konuşma parçalarına bölünür ve her parça **ayrı** çözümlenir.
   - Kendisinden sonra aynı şekilde başlayan parça **deneme** sayılır ve atılır.
   - Yarım kalan ("paraları...") ve kısa yarım denemeler ("bu gibi parılı" ≈ "bugün bu paraları") da atılır.
2. Kurguya sadece `keep: true` parçalar girer. Segmentler bu parçaların sınırlarından kesilir,
   altyazı kelimeleri `takes.json → words` dosyasından alınır.
3. Altyazıda görünen her kelimenin o anda gerçekten söylendiğini kontrol karelerinden doğrula.

Örnek (BilalDeneme / IMG_7258), 7 konuşma parçası:

| Parça | Söylenen | Karar |
|---|---|---|
| 0–2,9 | "Elimde… sahte" | atıldı |
| **3,6–6,0** | "Elimde… sahte" | **kullanıldı** |
| 6,3 / 8,6 / 14,5 | "Bugün bu paraları…" | atıldı |
| 10,5–13,2 | tam cümle | sonra tekrar çekildiği için atıldı |
| **15,9–18,6** | "Bugün bu paraları saklayacağım ve ilk bulan kişiyi trolleyeceğim" | **kullanıldı** |

### Küfür: her zaman bip
Küfür içeren kelimelerde ses bip'lenir, altyazıda `***` görünür.

- Çok kaynaklı kurguda: `bleeps: [{ src, from, to }]` (kaynak zamanı).
  - O aralıkta orijinal ses tamamen kesilir.
  - Yerine konuşma seviyesinde 1 kHz bip çalar (`public/sfx/bleep.wav`, yerelde üretildi, lisans sorunu yok).
- `captionFix: { "siktir.": "***" }` ile altyazı sansürlenir.
- Aralığı belirlerken kelimenin tamamını ve ardından gelen eki/kelimeyi ("git") kapsa; ses grafiğinden kontrol et.

## 2. Ayarlar (`B_STYLE`, `src/OptionB.tsx`)

| Ayar | Değer | Açıklama |
|---|---|---|
| `captionCenterY` | 0.79 | altyazı dikey konumu |
| `fontSize` / `maxTextWidth` | 104 / 900 | uzun öbekler otomatik küçülür |
| `strokePx` | 7 | kontur (yarısı görünür) — "her zaman hafif kontur" |
| `maxWords` / `maxChars` | 3 / 18 | öbek boyu |
| `musicBelowSpeechDb` | 19 | müzik yatağı konuşmanın kaç dB altında (daha kısık: 22, daha belirgin: 16) |
| `cutSwooshVol` | 0.8 | sahne geçişi swoosh'u (eşitlenmiş seviyeye çarpan) |

Efektlerin genel seviyesi: `src/OptionA2.tsx` → `A2_STYLE.targetDb` (-35).

## 3. Müzik kütüphanesi (`public/music/`, kaynak listesi: `music_sources.tsv`)

Tümü Pixabay (Pixabay Content License: YouTube dahil ticari kullanım serbest, atıf gerekmez).

| Ad | Hava | Ne zaman |
|---|---|---|
| `vlog_food` | yemek vlog'u beat | yemek ve mekân incelemesi (varsayılan) |
| `vlog_sunny` | güneşli lofi vlog | gezi, sakin anlatım |
| `vlog_beats` | vlog beat | genel |
| `lofi_chill` | lofi | sohbet, röportaj |
| `hiphop_vlog` | old school hip-hop | sokak, enerjik |
| `upbeat` | neşeli pop | pozitif, kutlama |
| `funny_bgm` / `funny_bouncy` | komik | absürt anlar, şaka |
| `quirky` / `sneaky` | tuhaf, sinsi | şüphe, "yakalama", yalan |

Örnek videolardaki şarkıların kendisini tespit edemedim (şarkı tanıma aracı yok). Aynı havayı veren, lisansı temiz parçalar seçildi.
Yeni şarkı eklersen: dosyayı `public/music/` klasörüne koy, sonra şunu çalıştır:

```bash
node tools/audio_meta.mjs src/data/music_meta.json public/music/*.mp3
```

Seviye otomatik ayarlanır.

## 4. Kesite B kurgusu ekleme

`src/data/<proje>/<id>_b.json` (A'nın `_edit.json` dosyasıyla birleştirilir; aynı anahtar varsa B kazanır):

```json
{
  "music": "vlog_food",
  "musicOffset": 0,
  "overlays": [
    { "type": "label", "from": 41.0, "to": 44.2, "text": "mustafa sözen", "x": 0.66, "y": 0.09, "arrowTo": { "x": 0.5, "y": 0.2 } },
    { "type": "review", "from": 2.0, "to": 5.0, "name": "Ahmet Y.", "stars": 1, "text": "Et aşırı yağlıydı", "avatar": "b/avatar.jpg", "y": 0.07 },
    { "type": "image", "from": 6.0, "to": 9.0, "src": "b/foto.jpg", "x": 0.5, "y": 0.22, "w": 0.45 }
  ],
  "punches": [{ "at": 47.75, "dur": 2.4, "amount": 0.16 }],
  "cutaways": [{ "from": 31.0, "to": 34.7, "srcFrom": 21.85 }],
  "cues": [{ "t": 50.45, "sfx": "ooh" }]
}
```

- Koordinatlar ekrana oranladır (x: 0 sol, 1 sağ; y: 0 üst, 1 alt).
- Görseller `public/` altına konur.
- Kaplama girişlerine pop sesi otomatik eklenir.

## 4a. Birden fazla videoyu tek kurguda birleştirme (`src/OptionBMulti.tsx`)

Örnek: `src/data/bilaldeneme/edit.ts`, kompozisyon `B-BilalDeneme`. Tek dosyada şunlar tanımlanır:

- `segments`: `[{ src, from, to, speed? }]`, sırayla oynar.
  - Hızlandırılmış (b-roll) segmentler sessizdir; müzik taşır.
- `words`: kaynak dosya → kelimeler (`takes.py` çıktısı). Kaynak zamanından çıktı zamanına otomatik taşınır.
- `overlays`, `cues`, `punches`: **çıktı** zamanında.
- `bleeps`: **kaynak** zamanında.
- `music`, `speechP90`: müzik seçimi ve konuşma seviyesi.

Segment geçişlerine otomatik kısık swoosh eklenir; kaplama girişlerine pop.

## 5. Render

```bash
node tools/gen_project.mjs <proje>
```

```bash
bash tools/render_b.sh B-m01-cihazina-iyi-bak ../shorts/mustafa_sozen/B_m01_cihazina_iyi_bak.mp4
```

`render_b.sh` sırasıyla şunları yapar:
1. Remotion render
2. Ses `loudnorm` ile -14 LUFS / -1,5 dBTP'ye normalize edilir; görüntü yeniden kodlanmaz.
3. Metaveri temizlenir.

Yeni projede konuşma seviyesini ölç (müzik kazancı buna göre hesaplanır):

```bash
node tools/audio_meta.mjs src/data/<proje>/speech_meta.json public/<proje>/*_4k.mp4
```

## 6. Font lisansı — önemli

- Kullanılan dosya: `public/fonts/ProximaNova-Bold.ttf`, macOS içindeki sistem kopyası
  (`/System/Library/PrivateFrameworks/Slideshows.framework/...`).
- `~/Downloads/Proxima-Nova-Extra-Condensed/Demo_Fonts/` içindeki dosyalar **Fontspring DEMO**. Demo lisansı genelde
  ticari kullanıma izin vermez; bu yüzden kullanmadım.
- Para kazanılan kanalda sorun yaşamamak için Proxima Nova'yı lisanslı edin:
  - Adobe Creative Cloud'un içindeki Adobe Fonts'ta var; video kullanımı serbest.
  - Ya da Mark Simonson Studio'dan satın alınabilir.
  - Lisanslı `.otf` dosyasını `public/fonts/ProximaNova-Bold.ttf` yerine koymak yeterli (dosya adını aynı tut ya da `OptionB.tsx`'teki `loadFont` satırını güncelle).
