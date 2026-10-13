// B OPSİYONU — "Bilal" tarzı vlog / sokak röportajı kurgusu (örnekler: ../Bilal/)
// - Tam dikey 1080x1920, A ile aynı kadraj/zoom/ara kesme altyapısı (EditedVideo)
// - Altyazı: Proxima Nova, küçük harf (konuşulduğu gibi), beyaz + HER ZAMAN hafif siyah kontur + yumuşak gölge,
//   1-3 kelimelik öbekler, ekranın alt-ortasında (~%79)
// - Kaplamalar: yorum kartı (Google yorumu gibi), ok + isim etiketi, resim kutusu (PiP)
// - Müzik: kesitin konuşma seviyesine göre otomatik, konuşmanın ~19 dB altında (örneklerdeki gibi kısık), giriş/çıkış fade
// - Efektler: kısık (A2 eşitleme sistemi), sahne kesimlerinde swoosh, kaplamalarda pop
// - Final: render sonrası -14 LUFS normalizasyon (tools/finish_b.sh)
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { fitText } from "@remotion/layout-utils";
import { AEdit, EditedVideo, Word } from "./videoCore";
import { autoCutCues, Cue, SfxClip } from "./sfxCore";
import musicMeta from "./data/music_meta.json";

const FONT = "ProximaNovaB";
loadFont({ family: FONT, url: staticFile("fonts/ProximaNova-Bold.ttf"), weight: "700" });

export const B_STYLE = {
  // altyazı
  captionCenterY: 0.79,
  fontSize: 104,
  maxTextWidth: 900,
  strokePx: 7, // hafif kontur (paint-order ile yarısı dışarıda görünür -> ~3.5 px)
  shadow: "0 4px 12px rgba(0,0,0,0.6)",
  maxWords: 3,
  maxChars: 18,
  popFrom: 1.06,
  popFrames: 3,
  holdGap: 0.5,
  // müzik
  musicBelowSpeechDb: 19, // müzik yatağı konuşmadan bu kadar dB aşağıda
  musicFadeIn: 0.4,
  musicFadeOut: 1.0,
  // efektler (A2 sistemiyle eşitlenir; burada sadece ek çarpan)
  cutSwooshVol: 0.8,
  overlayPopSfx: "pop" as Cue["sfx"],
};

export type BOverlay =
  | { type: "review"; from: number; to: number; name: string; stars: number; text: string; avatar?: string; y?: number }
  | { type: "label"; from: number; to: number; text: string; x: number; y: number; arrowTo?: { x: number; y: number } }
  | { type: "image"; from: number; to: number; src: string; x?: number; y?: number; w?: number };

export type BEdit = AEdit & {
  music?: string; // public/music/<ad>.mp3 (music_meta.json'da olmalı)
  musicOffset?: number; // şarkının kaçıncı saniyesinden başlasın
  overlays?: BOverlay[];
  cues?: Cue[]; // ek ses efektleri (A2 formatı)
  sceneCuts?: number[];
};

export type OptionBProps = {
  src: string;
  srcWidth: number;
  srcHeight: number;
  words: Word[];
  crop: number[];
  hideBottom?: number;
  speechP90: number; // kesitin konuşma seviyesi (tools/audio_meta.mjs)
  edit?: BEdit;
};

// ---- altyazı ----
// Cümle başı büyük harfi küçült (örneklerdeki gibi "bu kadar şey"), özel isimler (cümle ortasında büyük) kalsın
const toCaseB = (words: Word[]): Word[] =>
  words.map((w, i) => {
    const prev = words[i - 1];
    const sentenceStart = !prev || /[.?!…]$/.test(prev.w);
    let t = w.w.replace(/[.,;:]+$/u, "").replace(/…$/u, "..");
    if (sentenceStart && !/^[A-ZÇĞİÖŞÜ]{2,}$/.test(t)) t = t.charAt(0).toLocaleLowerCase("tr-TR") + t.slice(1);
    return { ...w, w: t };
  });

type Chunk = { text: string; s: number; e: number };
// raw: noktalamalı orijinal kelimeler (öbek sınırları için), cased: gösterilecek hâlleri
const chunk = (raw: Word[], cased: Word[]): Chunk[] => {
  const words = cased;
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({ text: cur.map((w) => w.w).join(" "), s: cur[0].s, e: cur[cur.length - 1].e });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const len = cur.map((x) => x.w).join(" ").length + w.w.length + 1;
    if (cur.length && (cur.length >= B_STYLE.maxWords || len > B_STYLE.maxChars || w.s - cur[cur.length - 1].e > 0.35)) flush();
    cur.push(w);
    if (/[.?!,…]$/.test(raw[i].w)) flush();
  }
  flush();
  return out;
};

export const BCaptions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => chunk(words, toCaseB(words)), [words]);
  const idx = chunks.findIndex((c, i) => {
    const next = chunks[i + 1];
    const end = next && next.s - c.e < B_STYLE.holdGap ? next.s : c.e + 0.15;
    return t >= c.s && t < end;
  });
  if (idx < 0) return null;
  const c = chunks[idx];
  const local = frame - Math.round(c.s * fps);
  const scale = interpolate(local, [0, B_STYLE.popFrames], [B_STYLE.popFrom, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const { fontSize } = fitText({ text: c.text, withinWidth: B_STYLE.maxTextWidth, fontFamily: FONT, fontWeight: "700" });
  const size = Math.min(B_STYLE.fontSize, fontSize);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: height * B_STYLE.captionCenterY,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(-50%) scale(${scale})`,
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.1,
          color: "#fff",
          whiteSpace: "nowrap",
          WebkitTextStroke: `${B_STYLE.strokePx}px #000`,
          paintOrder: "stroke fill",
          textShadow: B_STYLE.shadow,
          letterSpacing: -0.5,
        }}
      >
        {c.text}
      </span>
    </div>
  );
};

// ---- kaplamalar ----
const usePop = (from: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(from * fps), fps, config: { damping: 13, stiffness: 220 }, durationInFrames: 12 });
};

const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span style={{ fontSize: 46, letterSpacing: 2 }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <span key={i} style={{ color: i < n ? "#FBBC04" : "transparent", WebkitTextStroke: i < n ? "0" : "2px #444" }}>
        ★
      </span>
    ))}
  </span>
);

const ReviewCard: React.FC<{ o: Extract<BOverlay, { type: "review" }> }> = ({ o }) => {
  const p = usePop(0);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: (o.y ?? 0.1) * 1920, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${p})`,
          background: "#fff",
          borderRadius: 70,
          padding: "26px 54px",
          minWidth: 640,
          maxWidth: 920,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          fontFamily: FONT,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          {o.avatar && <Img src={staticFile(o.avatar)} style={{ width: 84, height: 84, borderRadius: 42, objectFit: "cover" }} />}
          <span style={{ fontSize: 56, fontWeight: 700, color: "#111" }}>{o.name}</span>
          <Stars n={o.stars} />
        </div>
        <div style={{ fontSize: 58, fontWeight: 700, color: "#444", marginTop: 8 }}>{o.text.toLocaleUpperCase("tr-TR")}</div>
      </div>
    </div>
  );
};

const ArrowLabel: React.FC<{ o: Extract<BOverlay, { type: "label" }> }> = ({ o }) => {
  const p = usePop(0);
  const W = 1080;
  const H = 1920;
  const x = o.x * W;
  const y = o.y * H;
  const to = o.arrowTo ? { x: o.arrowTo.x * W, y: o.arrowTo.y * H } : null;
  // ok, etiketin hedefe bakan kenarından başlar (yazının içinden geçmesin); hafif kavisli
  const half = o.text.length * 24 + 16;
  let sx = x;
  let sy = y;
  if (to) {
    const dx = to.x - x;
    const dy = to.y - y;
    if (Math.abs(dx) > Math.abs(dy) * 0.8) sx = x + Math.sign(dx) * half;
    else sy = y + Math.sign(dy) * 62;
  }
  const cx = to ? (sx + to.x) / 2 + (to.y - sy) * 0.25 : 0;
  const cy = to ? (sy + to.y) / 2 - Math.abs(to.x - sx) * 0.25 : 0;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, p * 1.5) }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-50%,-50%) scale(${p})`,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 96,
          color: "#fff",
          WebkitTextStroke: "8px #000",
          paintOrder: "stroke fill",
          textShadow: B_STYLE.shadow,
          whiteSpace: "nowrap",
        }}
      >
        {o.text}
      </div>
      {to && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#E11" />
            </marker>
          </defs>
          <path
            d={`M ${sx} ${sy} Q ${cx} ${cy} ${to.x} ${to.y}`}
            stroke="#E11"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
            markerEnd="url(#ah)"
            strokeDasharray={1400}
            strokeDashoffset={1400 * (1 - Math.min(1, p))}
            style={{ filter: "drop-shadow(0 3px 0 #000)" }}
          />
        </svg>
      )}
    </AbsoluteFill>
  );
};

const ImageBox: React.FC<{ o: Extract<BOverlay, { type: "image" }> }> = ({ o }) => {
  const p = usePop(0);
  const w = (o.w ?? 0.45) * 1080;
  return (
    <div
      style={{
        position: "absolute",
        left: (o.x ?? 0.5) * 1080,
        top: (o.y ?? 0.2) * 1920,
        width: w,
        transform: `translate(-50%,-50%) scale(${p})`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
      }}
    >
      <Img src={staticFile(o.src)} style={{ width: "100%", display: "block" }} />
    </div>
  );
};

export const Overlays: React.FC<{ list: BOverlay[] }> = ({ list }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {list.map((o, i) => (
        <Sequence key={i} from={Math.round(o.from * fps)} durationInFrames={Math.max(1, Math.round((o.to - o.from) * fps))}>
          {o.type === "review" ? <ReviewCard o={o} /> : o.type === "label" ? <ArrowLabel o={o} /> : <ImageBox o={o} />}
        </Sequence>
      ))}
    </>
  );
};

// ---- müzik ----
export const MusicBed: React.FC<{ name: string; offset: number; speechP90: number }> = ({ name, offset, speechP90 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const m = (musicMeta as Record<string, { median: number; duration: number }>)[name];
  if (!m) return null;
  const gain = Math.min(1, Math.pow(10, (speechP90 - B_STYLE.musicBelowSpeechDb - m.median) / 20));
  const fi = Math.round(B_STYLE.musicFadeIn * fps);
  const fo = Math.round(B_STYLE.musicFadeOut * fps);
  return (
    <Audio
      src={staticFile(`music/${name}.mp3`)}
      trimBefore={Math.round(offset * fps)}
      loop
      volume={(f) =>
        interpolate(f, [0, fi, durationInFrames - fo, durationInFrames], [0, gain, gain, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

export const OptionB: React.FC<OptionBProps> = ({ src, srcWidth, srcHeight, words, crop, hideBottom, speechP90, edit }) => {
  const overlays = edit?.overlays ?? [];
  const cues: Cue[] = [
    ...(edit?.cues ?? []),
    // kaplama girişlerinde kısık pop
    ...overlays.map((o) => ({ t: o.from, sfx: B_STYLE.overlayPopSfx })),
  ];
  const cutCues = autoCutCues(cues, edit?.sceneCuts ?? []).map((c) => ({ ...c, vol: B_STYLE.cutSwooshVol }));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <EditedVideo src={src} srcWidth={srcWidth} srcHeight={srcHeight} crop={crop} hideBottom={hideBottom} edit={edit} />
      <Overlays list={overlays} />
      <BCaptions words={words} />
      <MusicBed name={edit?.music ?? "vlog_food"} offset={edit?.musicOffset ?? 0} speechP90={speechP90} />
      {[...cutCues, ...cues].map((c, i) => (
        <SfxClip key={i} cue={c} />
      ))}
    </AbsoluteFill>
  );
};
