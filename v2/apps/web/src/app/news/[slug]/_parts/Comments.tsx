"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Input } from "@adeeb/design-system";
import { CalendarBlank, ChatCircle, Heart, SealCheck, User } from "@phosphor-icons/react";
import { Trash } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { arCount } from "@/lib/arabicCount";
import { standingName, type AdeebStanding } from "@/lib/standing";
import { cleanComment, commentError, COMMENT_MAX } from "@/lib/news/comments";
import { AR_COMMENT, AR_LIKE } from "./ReaderEnd";
import { COMMENTS_ID } from "./ArticleToc";

/** هويّةُ القارئ المسجَّل كما سيُنشَر بها تعليقُه. */
export type PublicComment = {
  id: string;
  /** اسمُ صاحبه — عضوٌ باسمه أو زائرٌ بما كتبه لنفسه. */
  name: string;
  /**
   * منزلتُه إن كان له حساب، و`null` للزائر. **تُوسَم كلُّ منزلةٍ باسمها** (قرار المالك ٢٠٢٦-١٠-٠٨):
   * كانت الشارةُ «عضو أدِيب» لكلّ من له ملفّ، فيُعلَن العضوَ من ليس عضوًا.
   */
  standing: AdeebStanding | null;
  gender: "male" | "female" | null;
  avatar: string | null;
  text: string;
  when: string;
  likes: number;
  liked: boolean;
};

export type CommentMe = {
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  standing: AdeebStanding | null;
};

/**
 * **التعليقات بلغة الصفحة** (المالك ٢٠٢٦-١٠-١٥: كانت «بدائيّةً لا تتوافق مع احترافيّة الصفحة»).
 *
 * الهيكلُ اعتمده المالك، والتنفيذُ الأوّل (صناديقُ بيضاءُ عامّةٌ بلغة لوحة التحكّم) رُدّ «قبيحًا». والثاني بلغة الصفحة:
 * - **المُنشئ يتدلّى من شريط القسم** كما يتدلّى الغلافُ من الشُّرفة، وفي رأسه هويّةُ الكاتب لا جملةٌ شارحة.
 * - **كلُّ تعليقٍ اقتباسٌ موقَّع** بلغة لوح الاقتباس: علامةُ اقتباس، والنصُّ، ثمّ سطرُ توقيعٍ كسطر «بريشة»
 *   فيه الصورةُ والاسمُ والمنزلةُ والتاريخ، والقلبُ في آخره. بلا صناديق، وتفصل بينها خطوطٌ رفيعة.
 */
export function Comments({
  items,
  me,
  onLike,
  onSend,
  busy,
  notice,
  siteKey,
  next,
  onDelete,
}: {
  items: PublicComment[];
  me: CommentMe | null;
  onLike: (id: string) => void;
  onSend: (text: string, guestName: string, token?: string) => Promise<boolean>;
  busy?: boolean;
  notice?: string | null;
  siteKey?: string;
  /** المسارُ الذي يعود إليه بعد الدخول. */
  next: string;
  /** حذفُ رئيس التحرير من الصفحة نفسها (شرطُ النشر المباشر الثاني). لا يُمرَّر إلّا لحامل `manage_news`. */
  onDelete?: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [who, setWho] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const signedIn = !!me;
  const clean = cleanComment(text);
  const blocked = commentError(clean, signedIn ? null : cleanComment(who), signedIn);
  const shielded = !siteKey || !!token;
  const published = items.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || busy || !shielded) return;
    const sent = await onSend(clean, cleanComment(who), token ?? undefined);
    setToken(null);
    setReset((r) => r + 1);
    if (sent) setText("");
  }

  return (
    <section id={COMMENTS_ID} className="art-col art-anchor">
      {/* **المُنشئ يتدلّى من شريط القسم** كما يتدلّى الغلافُ من الشُّرفة: صوتُك في لوحٍ معلَّقٍ برأس القسم،
          وأصواتُ الآخرين تحته اقتباساتٌ موقَّعة. */}
      <div className="cm-hang">
        <h2 className="art-sec-h">
          <ChatCircle className="art-sec-ic" aria-hidden />
          <span className="art-h-t">التعليقات</span>
          {published ? <Badge tone="neutral" variant="glass">{arCount(published, AR_COMMENT)}</Badge> : null}
        </h2>

        <form ref={formRef} className="cm-compose" data-open={open || undefined} onSubmit={submit}>
          <div className="cm-who">
            {me ? (
              <>
                <Avatar name={me.name} src={me.avatar ?? undefined} gender={me.gender} size="sm" />
                <span className="cm-ident">
                  <span className="cm-nameline"><b className="cm-name">{me.name}</b><Verified standing={me.standing} /></span>
                  <Standing standing={me.standing} gender={me.gender} />
                </span>
              </>
            ) : (
              <>
                <Avatar name="زائر" icon={<User />} size="sm" />
                {open ? (
                  // حقلُ الهويّة نفسُه (`Input`) بلا عنوانٍ فوقه: الصورةُ و«زائر» قبله يقومان مقامَه.
                  <Input
                    className="cm-guest" aria-label="اسمك" placeholder="اسمك كما تحبّ أن يظهر"
                    value={who} onChange={(e) => setWho(e.target.value)} maxLength={60}
                  />
                ) : (
                  <span className="cm-sig"><b className="cm-name">زائر</b></span>
                )}
                <Link className="abtn abtn-ghost abtn-sm cm-login" href={`/login?next=${encodeURIComponent(next)}`}>
                  {/* «علّق بحسابك» لا «سجّل دخولك» (المالك ٢٠٢٦-١٠-١٥): تلك تُقرأ شرطًا للتعليق، وهذه طريقٌ ثانٍ يقول غرضَه. */}
                  علّق بحسابك
                </Link>
              </>
            )}
          </div>

          <textarea
            className="cm-text" aria-label="تعليقك"
            placeholder={published ? "ما رأيُك فيما قرأت؟" : "كن أوّلَ من يعلّق"}
            // **لا يُقطع الكاتبُ عند الحدّ** (المالك ٢٠٢٦-١٠-١٥): يكتب ما شاء ويرى الزيادةَ حمراءَ في العدّاد، ولا
            // يُرسَل حتى يعود إلى الحدّ. فالإيقافُ كان يقطع الجملةَ في منتصفها، ويقصّ الملصوقَ بصمت. وسقفٌ واسعٌ للصق وحده.
            rows={open ? 3 : 1} maxLength={COMMENT_MAX * 4}
            value={text} onFocus={() => setOpen(true)}
            onChange={(e) => {
              setText(e.target.value);
              // يتمدّد الحقلُ مع النصّ ولا يحبس الكاتبَ في ثلاثة أسطر.
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); formRef.current?.requestSubmit(); }
            }}
          />

          {open ? (
            <>
              {siteKey ? <TurnstileWidget siteKey={siteKey} onToken={setToken} resetSignal={reset} /> : null}
              <div className="cm-foot">
                {/* العدّادُ ظاهرٌ دائمًا، ويُقرأ من اليمين: المكتوبُ ثمّ الحدّ (المالك ٢٠٢٦-١٠-١٥). ويتلوّن:
                    كهرمانيٌّ من ٨٠٪، وأحمرُ إذا جاوز الحدَّ (وحينها لا يُرسَل). */}
                <span
                  className="cm-count"
                  data-level={clean.length > COMMENT_MAX ? "over" : clean.length >= COMMENT_MAX * 0.8 ? "near" : undefined}
                  aria-label={`${clean.length} من ${COMMENT_MAX} حرف`}
                >
                  <span>{clean.length}</span><span aria-hidden>/</span><span>{COMMENT_MAX}</span>
                </span>
                {/* زرُّ الهويّة لا زرٌّ مصنوعٌ هنا (المالك ٢٠٢٦-١٠-١٥: «من اجتهادك أم من الهويّة؟»). */}
                <Button type="submit" variant="primary" size="md" disabled={!!blocked || !shielded} loading={busy}>
                  أرسِل
                </Button>
              </div>
            </>
          ) : null}
        </form>
      </div>
      {notice ? <Alert tone="info" className="mt-3">{notice}</Alert> : null}

      {items.length ? <CommentList items={items} onLike={onLike} onDelete={onDelete} /> : null}
    </section>
  );
}

/**
 * **المنزلةُ سطرٌ خافتٌ تحت الاسم، نصًّا بلا أيقونة** (المالك ٢٠٢٦-١٠-١٥؛ والريشةُ في الموقع تعني «بريشة» كاتبِ الخبر فسقطت هنا). جُرّبت حبّةً ملوّنةً بجانبه («متواضعة وغبيّة»)،
 * ثمّ علامةَ توثيقٍ اسمُها في التلميح، فسقطت: التلميحُ يحتاج مؤشرًا ولا مؤشرَ على الجوّال. وللعضو والمتطوّع
 * وحدَهما: «صديق أدِيب» لا يقول إلّا أنّ له حسابًا.
 */
function Standing({ standing, gender }: { standing: AdeebStanding | null; gender: "male" | "female" | null }) {
  if (standing !== "member" && standing !== "volunteer") return null;
  return (
    <span className="cm-standing">{standingName(standing, gender)}</span>
  );
}

/**
 * **علامةُ التوثيق للعضو وحدَه، بعد الاسم** (المالك ٢٠٢٦-١٠-١٥). بكحليّ الهويّة لا بأزرق المنصّات، وممتلئةٌ لأنّها
 * حالٌ كالقلب بعد الإعجاب. تُلتقط بالعين قبل أن تُقرأ المنزلةُ تحتها.
 */
function Verified({ standing }: { standing: AdeebStanding | null }) {
  if (standing !== "member") return null;
  // بأزرق الهويّة الفولاذيّ لا كحليّها: الكحليُّ في 17px يُقرأ أسود. واسمُها في تلميحٍ مرسومٍ لا `title`: تلميحُ
  // المتصفّح لا يظهر في كلّ بيئة (لم يظهر في المتصفّح المدمج)، وهذا يظهر بالتمرير وبالتركيز وباللمس على الجوّال.
  return (
    <span className="cm-verified" data-tip="عضو موثّق في أدِيب" tabIndex={0} role="img" aria-label="عضو موثّق في أدِيب">
      <SealCheck size={17} weight="fill" aria-hidden />
    </span>
  );
}

function Like({ c, onLike, glass }: { c: PublicComment; onLike: (id: string) => void; glass?: boolean }) {
  return (
    <button
      type="button" className={glass ? "cm-like cm-like-glass" : "cm-like"} aria-pressed={c.liked} onClick={() => onLike(c.id)}
      aria-label={c.likes ? `أعجبني، ${arCount(c.likes, AR_LIKE)}` : "أعجبني"}
    >
      <Heart size={17} weight={c.liked ? "fill" : undefined} aria-hidden />
      {c.likes ? <b>{c.likes}</b> : null}
    </button>
  );
}

/**
 * **علامةُ الاقتباس بطلُ التعليق**: رسمُ «Quotes» الممتلئ نفسُه، لكن بتدرّج الهويّة الكحليّ (كالشُّرفة) لا بلونٍ
 * واحد، وحولَه هالةٌ بلون الصفحة تقطع حدَّ الكرت حيث تعبره. ليست أيقونةَ واجهةٍ بل شعارُ القسم، فلا تتبع قاعدةَ
 * الأيقونات (duotone): رُدّت قبلُ رقيقةً وصغيرةً «خجولة».
 */
function QuoteMark() {
  const id = useId();
  return (
    <svg className="cm-k-mark" viewBox="0 0 256 256" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--steel-400)" />
          <stop offset="1" stopColor="var(--navy-800)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M116,72v88a48.05,48.05,0,0,1-48,48,8,8,0,0,1,0-16,32,32,0,0,0,32-32v-8H40a16,16,0,0,1-16-16V72A16,16,0,0,1,40,56h60A16,16,0,0,1,116,72ZM216,56H156a16,16,0,0,0-16,16v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,216,56Z"
      />
    </svg>
  );
}

/**
 * **«العلامة الخارجة عن الإطار»** — أقربُ ما وصلنا إليه (المالك ٢٠٢٦-١٠-١٥)، مطوَّرةً بأربع: علامةٌ أكبرُ وأثقلُ
 * بالتدرّج الكحليّ تقطع حافّةَ الكرت العليا؛ وسطحُ الكروت المعتمد (تدرّجٌ فولاذيٌّ خفيف) لا أبيضُ مسطّح؛ ونصٌّ
 * أكبرُ وأثقلُ يُقرأ قولًا؛ وتوقيعٌ بلا خلفيّةٍ يفصله خطٌّ رفيع. رُدّت قبلها كلُّ الأشكال الأخرى (انظر ملفّ المشروع).
 */
function CardItem({ c, onLike, onDelete }: { c: PublicComment; onLike: (id: string) => void; onDelete?: (id: string) => void }) {
  return (
    <figure className="cm-k">
      <span className="cm-k-halo" aria-hidden><QuoteMark /></span>
      {/* **التاريخُ في رأس الكرت مقابلَ العلامة، والتوقيعُ للكاتب وحدَه** (المالك ٢٠٢٦-١٠-١٥): كانت المنزلةُ والتاريخُ
          سطرًا واحدًا بحجمٍ ولونٍ واحد فتزاحما، وهما شيئان: هذا يعرّف بالكاتب، وذاك بالتعليق. */}
      <time className="cm-k-when"><CalendarBlank size={13} aria-hidden />{c.when}</time>
      <blockquote className="cm-k-t">{c.text}</blockquote>
      <figcaption className="cm-k-sig">
        <Avatar name={c.name} src={c.avatar ?? undefined} gender={c.gender} size="sm" />
        <span className="cm-ident">
          <span className="cm-nameline"><b className="cm-name">{c.name}</b><Verified standing={c.standing} /></span>
          <Standing standing={c.standing} gender={c.gender} />
        </span>
        <Like c={c} onLike={onLike} />
      </figcaption>
      {/* **«لسانُ الحذف»** (المالك ٢٠٢٦-١٠-١٦، بعد ثمانية أشكالٍ مرفوضةٍ بجانب القلب): يتدلّى من قاع الكرت كما يتدلّى
          لسانُ العودة من الشُّرفة. فعلٌ إداريٌّ معلَّقٌ على كلام القارئ لا جزءٌ منه، فلا يمسّ القلبَ ولا يراه إلّا رئيسُ التحرير. */}
      {onDelete ? (
        <button type="button" className="cm-k-tab" onClick={() => onDelete(c.id)}><Trash size={15} aria-hidden />حذف</button>
      ) : null}
    </figure>
  );
}

function CommentList({ items, onLike, onDelete }: { items: PublicComment[]; onLike: (id: string) => void; onDelete?: (id: string) => void }) {
  return <div className="cm-cards">{items.map((c) => <CardItem key={c.id} c={c} onLike={onLike} onDelete={onDelete} />)}</div>;
}
