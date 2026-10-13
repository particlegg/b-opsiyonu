import type { OptionBMultiProps } from "../../OptionBMulti";
import w7258 from "./v7258_takes.json";
import w7264 from "./v7264_words.json";

// "Sahte para trollü" kurgusu — BilalDeneme klasöründeki 4 video (IMG_7258/7260/7263/7264)
// Hikâye: sahte paraları göster (hook) -> sakla -> gizli kamerayla bulan kişiyi izle -> yüzleş -> gerçek parayı ver (twist)
//
// ÇEKİM SEÇİMİ (tools/takes.py): IMG_7258'de giriş cümleleri birkaç kez denenmiş; HER ZAMAN son tam çekim kullanılır.
//   0-2.9 "Elimde ... sahte" (1. deneme, atıldı)          3.6-6.0  "Elimde ... sahte" (SON ÇEKİM ✓)
//   6.3 / 8.6 / 14.5 "Bugün bu paraları..." (yarım, atıldı)  10.5-13.2 tam ama sonra tekrar çekilmiş (atıldı)
//   15.9-18.6 "Bugün bu paraları saklayacağım ve ilk bulan kişiyi trolleyeceğim" (SON ÇEKİM ✓)
//
// Çıktı zamanları (sn): 1:0-2.35  2:2.35-5.1  3:5.1-7.7  4:7.7-9.57  5:9.57-13.17  6:13.17-18.47  7:18.47-27.27  8:27.27-34.57

export const bilalDenemeEdit: OptionBMultiProps = {
  segments: [
    { src: "bilaldeneme/v7258.mp4", from: 3.6, to: 5.95, not: "HOOK (son çekim): Elimde gördüğünüz bu paraların hepsi sahte." },
    { src: "bilaldeneme/v7258.mp4", from: 15.85, to: 18.6, not: "(son çekim) Bugün bu paraları saklayacağım ve ilk bulan kişiyi trolleyeceğim." },
    { src: "bilaldeneme/v7260.mp4", from: 1.0, to: 3.6, not: "parayı banka gizleme (b-roll)" },
    { src: "bilaldeneme/v7260.mp4", from: 5.8, to: 8.6, speed: 1.5, not: "para masada (b-roll)" },
    { src: "bilaldeneme/v7263.mp4", from: 0, to: 9.0, speed: 2.5, not: "gizli kamera: genç parka giriyor (hızlı)" },
    { src: "bilaldeneme/v7263.mp4", from: 9.0, to: 19.6, speed: 2, not: "bankta parayı buluyor (hızlı)" },
    { src: "bilaldeneme/v7264.mp4", from: 1.15, to: 9.95, not: "yüzleşme: sosyal deney yapmıştım / o paralar gerçek değil / bak istersen" },
    { src: "bilaldeneme/v7264.mp4", from: 13.6, to: 20.9, not: "TWIST: şunları al / bu ne abi / ben sana gerçeğini vereyim" },
  ],
  words: { "bilaldeneme/v7258.mp4": w7258, "bilaldeneme/v7264.mp4": w7264 },
  speechP90: -16.5,
  music: "sneaky",
  musicOffset: 0,
  captionFix: { "siktir.": "***" },
  bleeps: [{ src: "bilaldeneme/v7264.mp4", from: 18.38, to: 19.2, not: "\"siktir git\" -> bip" }],
  overlays: [
    { type: "label", from: 1.8, to: 4.0, text: "sahte para", x: 0.72, y: 0.665, arrowTo: { x: 0.2, y: 0.64 } },
    { type: "label", from: 9.65, to: 13.05, text: "gizli kamera", x: 0.5, y: 0.13 },
    { type: "label", from: 13.35, to: 16.65, text: "ilk bulan kişi", x: 0.42, y: 0.2, arrowTo: { x: 0.58, y: 0.44 } },
  ],
  cues: [
    { t: 4.9, sfx: "goofy_laugh", not: "\"trolleyeceğim\"" },
    { t: 22.95, sfx: "record_scratch", not: "\"O paralar gerçek değil.\"" },
    { t: 30.65, sfx: "cash_register", not: "\"Ben sana gerçeğini vereyim\" -> twist" },
    { t: 32.45, sfx: "laugh_crowd", not: "kapanış gülüşmesi" },
  ],
  punches: [{ at: 30.55, dur: 1.6, amount: 0.15, originY: 0.4, not: "\"gerçeğini vereyim\" vurgusu" }],
};
