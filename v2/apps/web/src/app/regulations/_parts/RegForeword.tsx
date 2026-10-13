import { ModalSectionHeading } from "@adeeb/design-system";
import { PenNib, Quotes } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import type { RegSigner } from "@/lib/regulations/signers";

/**
 * كلمةُ الرئيسين في ذيل الفهرس لا رأسِه، فمن جاء يبحث عن مادّةٍ لا تقف بينه وبينها (المالك ٢٠٢٦-١٠-١٣).
 * **لوحٌ مذهّبٌ يختم الصفحة كما يفتحها لوحُ الدستور**: عنوانُه عنوانُ القسم في الهويّة (رقاقةُ الأيقونة في
 * الصدر وخطٌّ يمتدّ) بحبر اللوح، ولكلّ
 * رئيسٍ كلمتُه في رقاقةٍ زجاجيّة بعلامة اقتباس، وتوقيعُه صورتُه واسمُه ومنصبُه.
 */
export function RegForeword({ signers }: { signers: RegSigner[] }) {
  return (
    <section className="reg-words">
      <ModalSectionHeading icon={<PenNib weight={ICON_WEIGHT} />} title="كلمة الرئيسين" />
      <div className="reg-words-g">
        {signers.map((s) => (
          <figure key={s.id} className="reg-wq">
            <Quotes className="reg-wq-mark" weight={ICON_WEIGHT} aria-hidden />
            <blockquote className="reg-wq-x">
              <p>{s.word}</p>
            </blockquote>
            <figcaption className="reg-wq-by">
              <Avatar name={s.name} src={s.avatar ?? undefined} gender={s.gender} size="lg" />
              <span>
                <b>{s.name}</b>
                <span>{s.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
