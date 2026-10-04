"use client";

import { Button, Card, CardFooter, IconButton, Switch } from "@adeeb/design-system";
import { ArrowDown, ArrowUp, PencilSimple, Trash } from "@/app/_components/glyphs";
import type { AnnouncementRow } from "./data";

type Props = {
  announcement: AnnouncementRow;
  /** موضعه (1-based) — وهو ترتيبُ مروره في الشريط، ويُرسَم في رصيف الكرت. */
  order: number;
  /** أفي طرفٍ هو؟ فالسهمُ الذي لا وجهةَ له يُعطَّل ولا يُخفى (الصفُّ يبقى واحدًا). */
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
};

/**
 * كرت إعلان — **الكرتُ المنقسم برصيفه**، وهو ما أراه المالكُ بصورةٍ من كرت
 * الاستبيان وقال: «يكون مربّعٌ هنا فيه الترتيب» (٢٠٢٦-٠٩-١٩).
 *
 * **ولا شكلَ يُخترَع:** الرصيفُ هو `.scard-rail` من المكتبة نفسِه الذي أقرّه في
 * كرت الاستبيان، بمقاسه ولونه المنغَّم وحدِّه. ومن نسخ شكلًا مُقَرًّا بأسماءٍ
 * جديدةٍ أنشأ جوابين لسؤالٍ واحد، يومَ يتغيّر أحدُهما.
 *
 * وقبله جُرّب رقمٌ عارٍ في قرص الرأس فقُرئ هويّةً لا موضعًا، ثمّ لصيقةُ
 * «ترتيب ١» فقالت المعنى ولم تُبرزه. والرصيفُ يفعل الاثنين: مربّعٌ لا يُخطئه
 * البصر، وفيه الرقمُ كبيرًا وكلمتُه تحته.
 *
 * **والنغمةُ تقول الحال بلا شارة:** الرصيفُ أخضرُ لمن هو في الشريط ورماديٌّ
 * للمُطفَأ، كما يلبس رصيفُ الاستبيان حالَه. والمزلاجُ في الذيل يبدّله.
 *
 * **وأزرقُ الهويّة عُرض ورُدّ (٢٠٢٦-٠٩-٢٠):** سأل المالك «أزرقَ نجعله؟»، فعُرضت
 * ثلاثُ لوحاتٍ حيّةً في `/ui/announcement-card` واختار التلوينَ بالحال. وعلّتُه
 * أنّ الأزرقَ الدائم يجعل المُشعَلَ والمُطفَأَ توأمين لا يفرّقهما إلّا مزلاجٌ
 * صغير، ولأنّ «في الشريط» هو «نشط» بعينه، فلا يكون للنشاط لونان في لوحةٍ واحدة.
 */
export function AnnouncementCard({
  announcement,
  order,
  canUp,
  canDown,
  busy,
  onOpen,
  onToggle,
  onMove,
  onDelete,
}: Props) {
  /** كلُّ زرٍّ داخل كرتٍ يُنقر: يفعل فعلَه ولا يوقظ نقرةَ الكرت من تحته. */
  const only = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <Card
      interactive
      tone={announcement.isActive ? "success" : "neutral"}
      className="scard-split anc-card"
      onClick={onOpen}
    >
      <div className="scard-row">
        {/* الرصيف: الرقمُ كبيرًا وكلمتُه تحته بلون الحال، وسهما تحريكه معه —
            فالترتيبُ كلُّه في مربّعه، ولا يزاحمان الجملةَ في المتن. */}
        <div className="scard-rail">
          <span className="scard-rail-num">{order}</span>
          <span className="scard-rail-lbl">ترتيب</span>
          <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="lg"
              disabled={busy || !canUp}
              aria-label="تحريك لأعلى"
              title="تحريك لأعلى"
              onClick={only(() => onMove("up"))}
            >
              <ArrowUp aria-hidden />
            </IconButton>
            <IconButton
              size="lg"
              disabled={busy || !canDown}
              aria-label="تحريك لأسفل"
              title="تحريك لأسفل"
              onClick={only(() => onMove("down"))}
            >
              <ArrowDown aria-hidden />
            </IconButton>
          </span>
        </div>

        {/* المتن: الجملةُ وحدَها بعرض ما بقي، فتُقرأ ولا تُخنَق */}
        <div className="scard-main">
          <p className="anc-say">{announcement.text}</p>
        </div>
      </div>

      {/* الذيلُ يعمّ عرض الكرت أسفل الرصيف والمتن، كما في كرت الاستبيان */}
      <CardFooter>
        <span onClick={(e) => e.stopPropagation()}>
          <Switch
            row
            label={announcement.isActive ? "في الشريط" : "مُطفأ"}
            checked={announcement.isActive}
            disabled={busy}
            onChange={onToggle}
          />
        </span>
        {/* **الزرّان في غلافٍ واحد** (قِيس بلقطة): ذيلُ الكرت يمطّ كلَّ ابنٍ ليس
            `.abtn` حين يجاوره زرٌّ، فكان زرُّ الحذف الأيقونيُّ يخرج كبسولةً
            عريضة. والغلافُ يأخذ المطَّ عنهما ويُبقيهما بمقاسهما في طرفه. */}
        <span className="flex items-center justify-end gap-2">
          <Button
            variant="neutral"
            size="sm"
            disabled={busy}
            onClick={only(onOpen)}
          >
            <PencilSimple aria-hidden />
            تعديل
          </Button>
          <IconButton
            size="lg"
            tone="danger"
            disabled={busy}
            aria-label="حذف الإعلان"
            title="حذف"
            onClick={only(onDelete)}
          >
            <Trash aria-hidden />
          </IconButton>
        </span>
      </CardFooter>
    </Card>
  );
}
