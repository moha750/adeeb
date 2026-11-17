"use client";

/**
 * **تعليقاتُ الخبر بقطع الهويّة** (مختبرُ صفحة الخبر ٢٠٢٦-١١-١٧ — محمد: «ابنِ الصفحة كاملةً بنظام الهويّة، وأقول لك ما كان يعجبني ونتناقش»).
 * السلوكُ سلوكُ `news/[slug]/_parts/Comments` حرفًا (الحدُّ والتنظيفُ من `lib/news/comments`، والزائرُ باسمه، وTurnstile، وCtrl+Enter، والكاتبُ
 * لا يُقطع عند الحدّ)، والقطعُ قطعُ الهويّة:
 * - **الرأسُ عنوانُ مجموعة** كرؤوس الفصول (`.ad-gtitle`)، وعددُ التعليقات في آخر خطّه.
 * - **المُنشئ ورقةُ قسم** (`.ad-sec`): مَن يكتب في رأسها (صورتُه واسمُه ومنزلتُه، أو «زائر» و«علّق بحسابك»)، ثمّ حقلُ الهويّة (`Textarea` بعدّاده)
 *   واسمُ الزائر حقلًا، ثمّ «أرسِل» زرَّ اللوح.
 * - **كلُّ تعليقٍ ورقةٌ** بختم الاقتباس في ركنها (مربّعٌ من اللوح كختم الأزرار)، والنصُّ، ثمّ سطرُ التوقيع: الصورةُ والاسمُ والمنزلةُ
 *   والتاريخ، و«أعجبني» بعدده، و«حذف» لرئيس التحرير.
 */
import { ChatCircle, Heart, PaperPlaneTilt, Quotes, SealCheck, User, UserCircle } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { Field, Textarea } from "@adeeb/design-system";
import { PencilSimple, Trash } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { arCount } from "@/lib/arabicCount";
import { standingName, type AdeebStanding } from "@/lib/standing";
import { cleanComment, commentError, COMMENT_MAX } from "@/lib/news/comments";
import { COMMENTS_ID } from "@/app/news/[slug]/_parts/ArticleToc";
import type { CommentMe, PublicComment } from "@/app/news/[slug]/_parts/Comments";
import { AR_COMMENT, AR_LIKE } from "@/app/news/[slug]/_parts/ReaderEnd";
import { AdBadge, AdButton, AdIconButton, AdNote } from "../primitives";

/** المنزلةُ للعضو والمتطوّع وحدهما («صديق أدِيب» لا يقول إلّا أنّ له حسابًا) — كما كانت */
function Standing({ standing, gender }: { standing: AdeebStanding | null; gender: "male" | "female" | null }) {
  if (standing !== "member" && standing !== "volunteer") return null;
  return <small className="ad-nc-standing">{standingName(standing, gender)}</small>;
}

/**
 * **علامةُ التوثيق للعضو والمتطوّع** (محمد ٢٠٢٦-١١-١٧: «اجعلها للمتطوّع والعضو… جميلةٌ بصريًّا، وعند التمرير موثوق»): تُلتقط بالعين قبل أن تُقرأ
 * المنزلةُ تحتها، واسمُها تلميحٌ بالمرور، وباللمس على الجوّال (تأخذ التركيز)، ولقارئ الشاشة. والصديقُ بلا علامة: لا يقول إلّا أنّ له حسابًا
 */
function Seal({ standing, gender }: { standing: AdeebStanding | null; gender: "male" | "female" | null }) {
  if (standing !== "member" && standing !== "volunteer") return null;
  const tip = standing === "member" ? "عضو موثّق في أدِيب" : gender === "female" ? "متطوّعة موثّقة في أدِيب" : "متطوّع موثّق في أدِيب";
  return <span className="ad-nc-seal" data-tip={tip} tabIndex={0} role="img" aria-label={tip}><SealCheck aria-hidden /></span>;
}

function Who({ name, avatar, gender, standing, icon }: { name: string; avatar: string | null; gender: "male" | "female" | null; standing: AdeebStanding | null; icon?: React.ReactNode }) {
  return (
    <span className="ad-nc-who">
      <Avatar name={name} src={avatar ?? undefined} gender={gender} size="sm" icon={icon} />
      <span className="ad-nc-id">
        <span className="ad-nc-name"><b>{name}</b><Seal standing={standing} gender={gender} /></span>
        <Standing standing={standing} gender={gender} />
      </span>
    </span>
  );
}

export function NewsComments({ items, me, onLike, onSend, busy, notice, siteKey, next, onDelete, plate }: {
  items: PublicComment[]; me: CommentMe | null; onLike: (id: string) => void;
  onSend: (text: string, guestName: string, token?: string) => Promise<boolean>;
  busy?: boolean; notice?: string | null; siteKey?: string; next: string; onDelete?: (id: string) => void;
  /** **«شرفةُ الكتابة»** (محمد ٢٠٢٦-١١-١٧): الرأسُ لوحُ فصلٍ كألواح المتن، والمُنشئُ يتدلّى منه كما يتدلّى الغلافُ من لوح الصدر */
  plate?: boolean;
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (blocked || busy || !shielded) return;
    const sent = await onSend(clean, cleanComment(who), token ?? undefined);
    setToken(null);
    setReset((r) => r + 1);
    if (sent) setText("");
  }

  return (
    <section id={COMMENTS_ID} className="ad-nc" data-plate={plate || undefined}>
      {plate ? (
        <h2 className="ad-nr-chap" data-icon="">
          <ChatCircle className="ad-nr-chap-ic" aria-hidden />
          <span className="ad-nr-chap-t">التعليقات</span>
          {published ? <AdBadge glass>{arCount(published, AR_COMMENT)}</AdBadge> : null}
        </h2>
      ) : (
        <h2 className="ad-gtitle ad-nr-h">
          <span className="ad-gtitle-name"><ChatCircle aria-hidden /><span>التعليقات</span></span>
          {published ? <span className="ad-nr-hn">{arCount(published, AR_COMMENT)}</span> : null}
        </h2>
      )}

      <form ref={formRef} className="ad-sec ad-nc-form" data-open={open || undefined} onSubmit={submit}>
        <div className="ad-nc-head">
          {me ? <Who {...me} /> : (
            <>
              <Who name="زائر" avatar={null} gender={null} standing={null} icon={<User />} />
              {/* «علّق بحسابك» لا «سجّل دخولك» (المالك ٢٠٢٦-١٠-١٥): طريقٌ ثانٍ يقول غرضَه، لا شرطٌ للتعليق */}
              <AdButton variant="line" size="sm" icon={<UserCircle />} href={`/login?next=${encodeURIComponent(next)}`}>علّق بحسابك</AdButton>
            </>
          )}
        </div>
        {!me && open ? (
          <Field label="اسمك" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك كما تحبّ أن يظهر" value={who}
            onChange={(e) => setWho(e.target.value)} maxLength={60} required />
        ) : null}
        <Textarea label="تعليقك" icon={<ChatCircle />} innerIcon={<PencilSimple />} placeholder={published ? "ما رأيُك فيما قرأت؟" : "كن أوّلَ من يعلّق"}
          // **لا يُقطع الكاتبُ عند الحدّ** (المالك ٢٠٢٦-١٠-١٥): يرى الزيادةَ في العدّاد ولا يُرسَل حتى يعود إليه، وسقفٌ واسعٌ للّصق وحده
          rows={open ? 3 : 1} maxLength={COMMENT_MAX * 4} count={open ? { max: COMMENT_MAX } : undefined} value={text} onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); formRef.current?.requestSubmit(); } }} />
        {open ? (
          <>
            {siteKey ? <TurnstileWidget siteKey={siteKey} onToken={setToken} resetSignal={reset} /> : null}
            <div className="ad-nc-foot">
              <AdButton variant="fill" icon={<PaperPlaneTilt />} busy={busy} disabled={!!blocked || !shielded} onClick={() => formRef.current?.requestSubmit()}>أرسِل</AdButton>
            </div>
          </>
        ) : null}
      </form>
      {notice ? <AdNote tone="info" live>{notice}</AdNote> : null}

      {items.length ? (
        <div className="ad-nc-list">
          {items.map((c) => (
            <figure key={c.id} className="ad-nc-card">
              <span className="ad-nc-mark" aria-hidden><Quotes /></span>
              <blockquote className="ad-nc-t">{c.text}</blockquote>
              <figcaption className="ad-nc-sig">
                <Who name={c.name} avatar={c.avatar} gender={c.gender} standing={c.standing} />
                <time className="ad-nc-when">{c.when}</time>
                <span className="ad-nc-acts ad-nr-like">
                  <AdButton variant={c.liked ? "fill" : "line"} size="sm" pressed={c.liked} icon={<Heart />} onClick={() => onLike(c.id)}>
                    أعجبني{c.likes ? <span className="ad-nr-count" aria-label={arCount(c.likes, AR_LIKE)}>{c.likes}</span> : null}
                  </AdButton>
                  {/* الحذفُ رمزُ سلّةٍ أحمرُ هادئ (٢٠٢٦-١١-١٧): لونُ الخطر من الهويّة، لكن بلا تصميت — المصمتُ الأحمرُ بجانب «أعجبني» المضغوط يلتبسان */}
                  {onDelete ? <AdIconButton danger quiet label="حذف التعليق" icon={<Trash />} onClick={() => onDelete(c.id)} /> : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
