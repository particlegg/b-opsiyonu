// B opsiyonu — ÇOK KAYNAKLI KURGU (birden fazla telefon videosunu tek hikâyede birleştirir)
// Zaman çizelgesi: segments[] sırayla oynar. Her segment: kaynak dosya, [from,to) aralığı, hız.
// - Konuşmalı segmentler 1x ve kendi sesiyle; hızlandırılmış (b-roll) segmentler sessiz, müzik taşır
// - Altyazı: kaynakların kelime zamanlamaları çıktı zamanına taşınır (B altyazı stili)
// - Kaplamalar, cue'lar, zoom'lar ÇIKTI zamanında (saniye) verilir
// - Segment geçişlerinde kısık swoosh (otomatik)
import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEdit, punchScale, Word } from "./videoCore";
import { autoCutCues, Cue, SfxClip } from "./sfxCore";
import { B_STYLE, BCaptions, BOverlay, MusicBed, Overlays } from "./OptionB";

export type Segment = { src: string; from: number; to: number; speed?: number; muted?: boolean; not?: string };

export type OptionBMultiProps = {
  segments: Segment[];
  words: Record<string, Word[]>; // kaynak dosya -> kelimeler (kaynak zamanı)
  speechP90: number;
  music: string;
  musicOffset?: number;
  overlays?: BOverlay[];
  cues?: Cue[];
  punches?: AEdit["punches"];
  captionFix?: Record<string, string>; // altyazıda kelime değiştirme (ör. sansür)
  // Bip: KAYNAK zamanında [from,to) aralığında orijinal ses kesilir, yerine 1 kHz bip çalar (küfür sansürü)
  bleeps?: { src: string; from: number; to: number; not?: string }[];
};

const BLEEP_P90 = -9; // public/sfx/bleep.wav ölçümü (tools/audio_meta.mjs)

const FPS = 30;
const segFrames = (s: Segment) => Math.round(((s.to - s.from) / (s.speed ?? 1)) * FPS);

export const calculateBMultiMetadata: CalculateMetadataFunction<OptionBMultiProps> = ({ props }) => ({
  durationInFrames: props.segments.reduce((t, s) => t + segFrames(s), 0),
});

// kaynak kelimelerini çıktı zamanına taşı
const timelineWords = (p: OptionBMultiProps): Word[] => {
  const out: Word[] = [];
  let t0 = 0;
  for (const s of p.segments) {
    const sp = s.speed ?? 1;
    if (sp === 1 && !s.muted) {
      for (const w of p.words[s.src] ?? []) {
        if (w.s >= s.from - 0.05 && w.s < s.to - 0.05) {
          out.push({
            w: p.captionFix?.[w.w] ?? w.w,
            s: t0 + Math.max(0, w.s - s.from),
            e: t0 + Math.min(s.to, w.e) - s.from,
          });
        }
      }
    }
    t0 += segFrames(s) / FPS;
  }
  return out;
};

export const OptionBMulti: React.FC<OptionBMultiProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const z = punchScale(frame, fps, p.punches ?? []);
  const active = (p.punches ?? []).find((q) => frame >= Math.round(q.at * fps) && frame <= Math.round((q.at + q.dur) * fps) + 8);

  // segmentler
  let cursor = 0;
  const starts: number[] = [];
  const seqs = p.segments.map((s, i) => {
    const from = cursor;
    const dur = segFrames(s);
    cursor += dur;
    starts.push(from / fps);
    const sp = s.speed ?? 1;
    const bl = (p.bleeps ?? []).filter((b) => b.src === s.src && b.to > s.from && b.from < s.to);
    return (
      <Sequence key={i} from={from} durationInFrames={dur}>
        <OffthreadVideo
          src={staticFile(s.src)}
          trimBefore={Math.round(s.from * fps)}
          playbackRate={sp}
          muted={s.muted ?? sp !== 1}
          volume={(f) => {
            const t = s.from + (f / fps) * sp;
            return bl.some((b) => t >= b.from && t < b.to) ? 0 : 1;
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>
    );
  });

  const overlays = p.overlays ?? [];
  const cues: Cue[] = [...(p.cues ?? []), ...overlays.map((o) => ({ t: o.from, sfx: B_STYLE.overlayPopSfx }))];
  const cutCues = autoCutCues(cues, starts).map((c) => ({ ...c, vol: B_STYLE.cutSwooshVol }));
  const words = timelineWords(p);
  // bipleri çıktı zamanına yerleştir; seviye = kesitin konuşma seviyesi
  const bleepGain = Math.min(1, Math.pow(10, (p.speechP90 - BLEEP_P90) / 20));
  const bleepSeqs: React.ReactNode[] = [];
  {
    let t0 = 0;
    p.segments.forEach((s, si) => {
      const sp = s.speed ?? 1;
      for (const b of p.bleeps ?? []) {
        if (b.src !== s.src || b.to <= s.from || b.from >= s.to) continue;
        const a = Math.max(b.from, s.from);
        const e = Math.min(b.to, s.to);
        bleepSeqs.push(
          <Sequence key={`bl${si}-${a}`} from={Math.round((t0 + (a - s.from) / sp) * fps)} durationInFrames={Math.max(1, Math.round(((e - a) / sp) * fps))} layout="none">
            <Audio src={staticFile("sfx/bleep.wav")} volume={bleepGain} />
          </Sequence>,
        );
      }
      t0 += segFrames(s) / FPS;
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `50% ${(active?.originY ?? 0.4) * 100}%` }}>{seqs}</AbsoluteFill>
      <Overlays list={overlays} />
      <BCaptions words={words} />
      <MusicBed name={p.music} offset={p.musicOffset ?? 0} speechP90={p.speechP90} />
      {bleepSeqs}
      {[...cutCues, ...cues].map((c, i) => (
        <SfxClip key={i} cue={c} />
      ))}
    </AbsoluteFill>
  );
};
