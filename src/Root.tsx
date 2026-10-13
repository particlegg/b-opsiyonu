import { Composition } from "remotion";
import { calculateBMultiMetadata, OptionBMulti } from "./OptionBMulti";
import { bilalDenemeEdit } from "./data/bilaldeneme/edit";

// B opsiyonu kompozisyonları.
// Yeni kurgu: src/data/<proje>/edit.ts dosyası yaz (bilaldeneme/edit.ts örneğini kopyala) ve buraya bir <Composition> ekle.
export const RemotionRoot: React.FC = () => (
  <>
    {/* Örnek: 4 telefon videosundan "sahte para trollü" kurgusu (videolar repoda yok, bkz. README) */}
    <Composition
      id="B-BilalDeneme"
      component={OptionBMulti}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1000}
      calculateMetadata={calculateBMultiMetadata}
      defaultProps={bilalDenemeEdit}
    />
  </>
);
