import type { Metadata } from "next";
import { DeeboFrame } from "./DeeboFrame";

/**
 * إطارُ «المنضدة» في غرفة طبع ديبو (٢٠٢٦-١١-١٣): شاشةُ ديبو العامّةُ نفسُها (`DeeboScreen`) بالطبع الذي يُكتب في الغرفة،
 * والغرفةُ ترسل إليه مسوّدتَها برسالةٍ من الأصل نفسه (`lib/stageFrame`). كلُّ سؤالٍ فيه يُسأل بالمسوّدة (`probePersona`، لصاحب
 * صلاحية ديبو وحده)، ولا يُسجَّل ولا يُحسب من سقف الزوّار.
 */
export const metadata: Metadata = { title: "معاينة ديبو", robots: { index: false, follow: false } };

export default function DeeboFramePage() {
  return <DeeboFrame />;
}
