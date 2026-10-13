// Ortak dikey video katmanı (A, A2, A3, B ortak): kadraj, vurgu zoom, tepki ara kesmesi, kaynak yazısını kapatma.
// Font yüklemez; B gibi farklı fontlu opsiyonlar bunu güvenle kullanabilir.
import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type Word = { w: string; s: number; e: number };

// Kesit bazlı kurgu düzeltmeleri (src/data/<proje>/<id>_edit.json)
export type AEdit = {
  // [from,to) aralığında görüntüyü kaynağın srcFrom anından al (ses ana videodan devam eder).
  // Konuşan kişi çekimde yokken dinleyenin tepkisini göstermek için.
  cutaways?: { from: number; to: number; srcFrom: number; not?: string }[];
  // at anında hızlı yakınlaştır, dur boyunca tut, sonra bırak (absürt cevap / punchline vurgusu)
  punches?: { at: number; dur: number; amount?: number; originY?: number; not?: string }[];
  // Kaynaktaki gömülü yazıyı kapat: [from,to) (kaynak sn) boyunca x,y,w,h (kaynağa oranla) bölgesine,
  // hemen üstündeki (dy kadar yukarıdaki) temiz arka plan parçası kopyalanır.
  masks?: Mask[];
};
export type Mask = { from: number; to: number; x: number; y: number; w: number; h: number; dy?: number; not?: string };

export type VideoCoreProps = {
  src: string; // 16:9 kaynak kesit (public/ altında)
  srcWidth: number;
  srcHeight: number;
  crop: number[]; // her kare için kadraj merkezinin x konumu (0-1, kaynağa göre)
  hideBottom?: number; // kaynağın altından gizlenecek oran (kaynaktaki gömülü altyazıları kadraj dışına iter)
  edit?: AEdit;
};

export const VerticalVideo: React.FC<{
  src: string;
  srcWidth: number;
  srcHeight: number;
  crop: number[];
  transform?: string; // A2: zoom / sarsıntı efektleri için
  frameOffset?: number; // A3: bu parça kaynağın hangi karesinden başlıyor (meme ara kesmeleri için)
  hideBottom?: number; // kaynağın alt kısmını kadraj dışına it (üst sabit, hafif zoom)
  muted?: boolean;
  masks?: Mask[];
}> = ({ src, srcWidth, srcHeight, crop, transform, frameOffset = 0, hideBottom = 0, muted, masks = [] }) => {
  const frame = useCurrentFrame() + frameOffset;
  const { width, height, fps } = useVideoConfig();
  const scale = height / (srcHeight * (1 - hideBottom));
  const videoW = srcWidth * scale;
  const videoH = srcHeight * scale;
  const cx = crop[Math.min(frame, crop.length - 1)] ?? 0.5;
  const left = Math.min(0, Math.max(width - videoW, width / 2 - cx * videoW));
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform }}>
        <OffthreadVideo
          src={staticFile(src)}
          trimBefore={frameOffset || undefined}
          muted={muted}
          style={{ position: "absolute", top: 0, left, height: videoH, width: videoW }}
        />
        {masks
          .filter((m) => frame >= Math.round(m.from * fps) && frame < Math.round(m.to * fps))
          .map((m, i) => {
            const dy = m.dy ?? m.h; // kaynağı bu kadar aşağı kaydır: üstteki temiz bölge yazının yerine gelir
            return (
              <OffthreadVideo
                key={i}
                src={staticFile(src)}
                trimBefore={frameOffset || undefined}
                muted
                style={{
                  position: "absolute",
                  top: dy * videoH,
                  left,
                  height: videoH,
                  width: videoW,
                  clipPath: `inset(${(m.y - dy) * videoH}px ${videoW - (m.x + m.w) * videoW}px ${videoH - (m.y + m.h - dy) * videoH}px ${m.x * videoW}px round 24px)`,
                }}
              />
            );
          })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// vurgu zoom çarpanı (o karedeki)
export const punchScale = (frame: number, fps: number, punches: NonNullable<AEdit["punches"]>) => {
  let z = 1;
  for (const p of punches) {
    const a = Math.round(p.at * fps);
    const b = a + Math.round(p.dur * fps);
    if (frame < a || frame > b + 8) continue;
    const env = interpolate(frame, [a, a + 5, b, b + 8], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    z = Math.max(z, 1 + (p.amount ?? 0.25) * env);
  }
  return z;
};

// Kurgulu dikey video katmanı: kadraj + vurgu zoom + tepki ara kesmeleri + yazı kapatma (A ve B ortak)
export const EditedVideo: React.FC<VideoCoreProps> = ({
  src,
  srcWidth,
  srcHeight,
  crop,
  hideBottom,
  edit,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punches = edit?.punches ?? [];
  const active = punches.find((p) => frame >= Math.round(p.at * fps) && frame <= Math.round((p.at + p.dur) * fps) + 8);
  const z = punchScale(frame, fps, punches);
  const zoomStyle = { transform: `scale(${z})`, transformOrigin: `50% ${(active?.originY ?? 0.35) * 100}%` };
  return (
    <AbsoluteFill style={zoomStyle}>
      <VerticalVideo src={src} srcWidth={srcWidth} srcHeight={srcHeight} crop={crop} hideBottom={hideBottom} masks={edit?.masks} />
      {(edit?.cutaways ?? []).map((c, i) => (
        <Sequence key={i} from={Math.round(c.from * fps)} durationInFrames={Math.round((c.to - c.from) * fps)}>
          <VerticalVideo
            src={src}
            srcWidth={srcWidth}
            srcHeight={srcHeight}
            crop={crop}
            hideBottom={hideBottom}
            frameOffset={Math.round(c.srcFrom * fps)}
            muted
            masks={edit?.masks}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
