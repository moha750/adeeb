import { Container, LandingHeading, Reveal, SoundStage } from "@adeeb/design-system";
import { SONIC_DURATION, SONIC_PEAKS, SONIC_PRINT, SONIC_SRC } from "./sonicData";

/**
 * قسمُ «الهويّة الموسيقيّة» في صفحة الهبوط (طلبُ المالك ٢٠٢٦-١٠-٠٨): الأسطوانة على مسرحٍ
 * كحليّ، فيلبس الرأسُ فوقه ثوبَه المعكوس (`data-head-skin`). وسجلُّ اختيارها `/ui/sound-stage`.
 */
export function SonicIdentity({ id = "sound" }: { id?: string }) {
  return (
    <section id={id} className="snd-stage py-20 md:py-28" data-head-skin="inverse">
      <Container>
        <Reveal>
          <LandingHeading
            eyebrow="لحن"
            title="الهويّة الموسيقيّة"
            deck="لحنٌ وُلد من دندنة، فصار صوتَ أدِيب."
            align="center"
            tone="onDark"
          />
          <SoundStage
            src={SONIC_SRC}
            name="الهويّة الموسيقيّة"
            peaks={SONIC_PEAKS}
            print={SONIC_PRINT}
            duration={SONIC_DURATION}
            seal="/brand/pattern-circular.svg"
          />
        </Reveal>
      </Container>
    </section>
  );
}
