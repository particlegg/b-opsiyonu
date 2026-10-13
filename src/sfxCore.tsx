// Ortak ses efekti sistemi (A2, A3, B): seviye eşitlemeli efekt çalma, görsel vuruşlar, sahne kesimi swoosh sesi.
import React from "react";
import { Audio, Easing, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { SFX_LIBRARY, SfxName } from "./sfxLibrary";
import sfxMeta from "./data/sfx_meta.json";

const SFX_META = sfxMeta as Record<SfxName, { onset: number; peakDb: number; length: number }>;

export type Fx = "zoom" | "shake" | "flash";
export type Cue = { t: number; sfx: SfxName; vol?: number; dur?: number; fx?: Fx; not?: string };

export const A2_STYLE = {
  // Her efektin en yüksek anı bu seviyeye eşitlenir (dBFS, 100 ms RMS).
  // Konuşma ~-21 dB (0,5 sn RMS); -35 => efektler konuşmanın belirgin şekilde altında, arka planda.
  // Daha da kısmak için sayıyı küçült (-38, -40...), açmak için büyüt (-32...).
  targetDb: -35,
  // Ek ortak çarpan (ping dahil). Normalde 1 bırak, ayarı targetDb ile yap.
  masterVolume: 1,
  pingVolume: 0.18, // ping ~-31 dB: efektlerden biraz belirgin, konuşmadan kısık
  cutSwoosh: "swoosh_small" as SfxName,
  cutSwooshVol: 0.28,
  minGapForCutSwoosh: 0.6, // elle konmuş bir efektin bu kadar yakınındaki kesime swoosh ekleme (sn)
  zoomAmount: 0.14, // punch-in büyüklüğü
  zoomFrames: 14, // zoom ne kadar sürer
  shakePx: 22,
  shakeFrames: 10,
  flashFrames: 7,
  fadeOutFrames: 8, // uzun sesler kesilirken yumuşak kısılır
};

export const SfxClip: React.FC<{ cue: Cue }> = ({ cue }) => {
  const { fps } = useVideoConfig();
  const lib: { maxDur: number; vol?: number } = SFX_LIBRARY[cue.sfx];
  const meta = SFX_META[cue.sfx];
  const durS = Math.min(cue.dur ?? lib.maxDur, meta.length - meta.onset);
  const frames = Math.max(3, Math.round(durS * fps));
  // kısa efektlerde sönümleme efektin en fazla yarısı kadar sürer
  const fade = Math.max(1, Math.min(A2_STYLE.fadeOutFrames, Math.floor(frames / 2)));
  // seviye eşitleme: en yüksek anı targetDb'ye çek, sonra ek çarpanlar
  const norm = Math.pow(10, (A2_STYLE.targetDb - meta.peakDb) / 20);
  const vol = Math.min(1, norm * (lib.vol ?? 1) * (cue.vol ?? 1) * A2_STYLE.masterVolume);
  return (
    <Sequence from={Math.round(cue.t * fps)} durationInFrames={frames} layout="none">
      <Audio
        src={staticFile(`sfx/${cue.sfx}.mp3`)}
        trimBefore={Math.round(meta.onset * fps)}
        volume={(f) =>
          interpolate(f, [0, frames - fade, frames], [vol, vol, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </Sequence>
  );
};

// Görsel vuruşların verilen karedeki toplam etkisi (frame: cue zamanlarıyla aynı zaman ekseni)
export const visualFxAt = (frame: number, fps: number, cues: Cue[]) => {
  let zoom = 1;
  let dx = 0;
  let dy = 0;
  let flash = 0;
  for (const c of cues) {
    const local = frame - Math.round(c.t * fps);
    if (local < 0) continue;
    if (c.fx === "zoom" && local < A2_STYLE.zoomFrames) {
      const env = interpolate(local, [0, 2, A2_STYLE.zoomFrames], [0, 1, 0], {
        easing: Easing.out(Easing.quad),
        extrapolateRight: "clamp",
      });
      zoom += A2_STYLE.zoomAmount * env;
    }
    if (c.fx === "shake" && local < A2_STYLE.shakeFrames) {
      const decay = 1 - local / A2_STYLE.shakeFrames;
      dx += Math.sin(local * 2.7) * A2_STYLE.shakePx * decay;
      dy += Math.cos(local * 3.3) * A2_STYLE.shakePx * 0.6 * decay;
    }
    if (c.fx === "flash" && local < A2_STYLE.flashFrames) {
      flash = Math.max(flash, interpolate(local, [0, A2_STYLE.flashFrames], [0.85, 0]));
    }
  }
  return { transform: `translate(${dx}px, ${dy}px) scale(${zoom})`, flash };
};

// Sahne kesimlerine otomatik swoosh (elle konmuş bir efektin yakınındakiler hariç)
export const autoCutCues = (cues: Cue[], sceneCuts: number[]): Cue[] =>
  sceneCuts
    .filter((t) => t > 0.1 && !cues.some((c) => Math.abs(c.t - t) < A2_STYLE.minGapForCutSwoosh))
    .map((t) => ({ t: Math.max(0, t - 0.12), sfx: A2_STYLE.cutSwoosh, vol: A2_STYLE.cutSwooshVol }));
