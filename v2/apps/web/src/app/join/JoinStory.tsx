import { Card, CardBody } from "@adeeb/design-system";
import {
  Certificate, ClipboardText, HandHeart, IdentificationBadge, Megaphone, UserCirclePlus, UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import type { CommitteeOption } from "./data";

/* glyph-weight: UserCirclePlus HandHeart IdentificationBadge Certificate Megaphone ClipboardText —
   تُرسَم عبر `STATIONS` و`PERKS` باسمٍ واحدٍ `Icon`، والوزنُ مُمرَّرٌ في الوسم هناك؛ فلا يراه
   الفحصُ النصّيّ باسمها. */

/**
 * **متنُ صفحة الانضمام — يُقرأ بلا حساب.**
 *
 * كان كلُّ هذا خلف البريد: من أراد أن يعرف ما الذي يدخل فيه وجب عليه أوّلًا أن ينشئ حسابًا.
 * فصار القارئُ يُسأل الثمنَ قبل أن تُعرَض عليه البضاعة. وقلبُ الترتيب (قرار المالك
 * ٢٠٢٦-٠٩-١٢) جعل أقسامَه الثلاثةَ **عامّةً**: يقرأ الزائرُ ما ينالُه ثمّ الطريقَ ثمّ اللجان،
 * ثمّ يُطلب الحسابُ خطوةً في الصفحة لا بوّابةً قبلها.
 *
 * وثلاثتُها مكوّناتٌ **خادميّة** بلا حالة، فتنتقل إلى معرضها في `/ui/join` كما هي.
 */

/** محطّاتُ الطريق الثلاث — الترتيبُ نفسُه الذي تصفه القاعدة: حسابٌ ثمّ تطوّعٌ ثمّ عضويّة. */
const STATIONS = [
  {
    key: "account",
    Icon: UserCirclePlus,
    title: "حسابٌ في أدِيب",
    body: "تفتحه بنقرةٍ واحدة، فتحجز به برامجَنا وتتابع أخبارَنا. ولا يجعلك عضوًا ولا متطوّعًا، وإنّما يفتح البابَ لهما.",
  },
  {
    key: "volunteer",
    Icon: HandHeart,
    title: "متطوّعٌ معنا",
    body: "ترتّب رغباتك في لجانِنا فتصير من متطوّعي أدِيب، وتصلك الفرصُ التطوّعيّة أوّلًا بأوّل في حسابك وفي قروب المتطوّعين.",
  },
  {
    key: "member",
    Icon: IdentificationBadge,
    title: "عضوٌ في النادي",
    body: "العضويّةُ تُهدى ولا تُطلَب: من رأينا عملَه في الفرص وأثرَه فيها دعوناه إلى عضويّة أدِيب.",
  },
] as const;

/**
 * **ما ينالُه المتطوّع** — وكانت الصفحةُ تُغفله (رآه المالك ٢٠٢٦-٠٩-١٢): تقول **كيف** يُنضَمّ
 * ولا تقول **لماذا**. والثلاثةُ ههنا **أشياءُ مبنيّةٌ تعمل اليوم**، لا وعودَ تُكتب لتُقرأ:
 * الشهادةُ ورقةٌ تُرسَم وتُنزَّل ولها رقمٌ في `/verify`، والفرصُ تُعلَن في القروب وتظهر في
 * `/me`، والحضورُ والاستحقاقُ عمودان في `volunteer_applications`. فمن زاد سطرًا ههنا فليزد
 * له نظيرًا في النظام.
 */
const PERKS = [
  {
    key: "certificate",
    Icon: Certificate,
    title: "شهادةٌ موثّقة",
    body: "لكلّ فرصةٍ حضرتَها وأدّيتَ عملَك فيها شهادةُ مشاركةٍ تُنزّلها من حسابك، ولها رقمٌ يتحقّق منه من تشاء في صفحة التحقّق.",
  },
  {
    key: "first",
    Icon: Megaphone,
    title: "الفرصُ تبلغُك أوّلًا",
    body: "تُعلَن الفرصُ في قروب متطوّعي أدِيب وتظهر في حسابك، فلا تعرف بها بعد أن تمضي.",
  },
  {
    key: "record",
    Icon: ClipboardText,
    title: "عملُك مرصود",
    body: "حضورُك في كلّ فرصةٍ وتقييمُ عملك محفوظان في سجلّك. ومن هذا السجلّ تُهدى العضويّةُ على بيّنة، فلا يضيع جهدٌ بذلتَه.",
  },
] as const;

export function JoinPerks() {
  return (
    <div className="card-grid">
      {PERKS.map(({ key, Icon, title, body }) => (
        <Card key={key}>
          <CardBody className="flex flex-col gap-3 p-6">
            <Icon size={30} weight={ICON_WEIGHT} aria-hidden />
            <span className="text-lg font-bold">{title}</span>
            <p className="text-content-muted text-sm leading-relaxed">{body}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function JoinPath() {
  return (
    <div className="card-grid">
      {STATIONS.map(({ key, Icon, title, body }) => (
        <Card key={key}>
          <CardBody className="flex flex-col gap-3 p-6">
            <Icon size={30} weight={ICON_WEIGHT} aria-hidden />
            <span className="text-lg font-bold">{title}</span>
            <p className="text-content-muted text-sm leading-relaxed">{body}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/**
 * تعريفاتُ اللجان — كانت داخل نموذج الرغبات، فرُفعت إلى الصفحة.
 *
 * وموضعُها هذا هو الصواب: هي أساسُ الترتيب (من رتّب بلا تعريفٍ رتّب أسماءً) **وهي كذلك
 * إعلانُ النادي عن نفسه** — فيقرؤها من لم ينشئ حسابًا بعد. ولذلك اشترطت القاعدةُ التعريفَ
 * لعرض اللجنة أصلًا.
 *
 * **و`whitespace-pre-line` لا `normal`:** تعريفُ لجنة الفعاليّات مكتوبٌ في القاعدة أسطرًا
 * (جملةٌ ثمّ تعدادُ مهامّ)، و`normal` يطويها سطرًا واحدًا فتلتصق الجملُ ويُقرأ التعدادُ ركامًا.
 */
export function JoinCommittees({ options }: { options: CommitteeOption[] }) {
  return (
    <div className="card-grid">
      {options.map((o) => (
        <Card key={o.id}>
          <CardBody className="flex flex-col gap-2 p-5">
            <span className="flex items-center gap-2 font-bold">
              <UsersThree size={20} weight={ICON_WEIGHT} aria-hidden />
              {o.name}
            </span>
            <p className="text-content-muted whitespace-pre-line text-sm leading-relaxed">{o.description}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
