import { VisionPage, visionMetadata } from "./_parts/VisionPage";

// يُنعَش لحظةَ كلّ تغييرٍ من غرفة «متابعة الرؤية» (`refreshVisionPages`)، وهذا البناءُ الدوريّ شبكةُ أمانٍ وعدٌّ تنازليٌّ لا يتأخّر يومًا.
export const revalidate = 300;

export const generateMetadata = () => visionMetadata();

/** **الرؤيةُ السارية** — صفحةٌ علنيّة تعرّف الأعضاءَ بها وتتابعها أمامهم (`VisionView`). */
export default function VisionIndex() {
  return <VisionPage />;
}
