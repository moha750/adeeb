"use client";

import { useState } from "react";
import { Alert, Badge, Button, Field, Textarea } from "@adeeb/design-system";
import { ChatCircle, Heart, User } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { arCount } from "@/lib/arabicCount";
import { cleanComment, commentError, COMMENT_MAX } from "@/lib/news/comments";
import { AR_COMMENT } from "./ReaderBar";

export type PublicComment = {
  id: string;
  /** اسمُ صاحبه — عضوٌ باسمه أو زائرٌ بما كتبه لنفسه. */
  name: string;
  /** صاحبُ حسابٍ في أدِيب؟ يُوسَم، فالزائرُ والعضوُ لا يستويان في الميزان. */
  member: boolean;
  gender: "male" | "female" | null;
  avatar: string | null;
  text: string;
  when: string;
  likes: number;
  liked: boolean;
  /** تعليقٌ ينتظر الإقرار — يراه صاحبُه وحدَه، فلا يظنّ أنّ كلامَه ضاع. */
  pending?: boolean;
};

/**
 * تعليقاتُ الخبر — **بابٌ كان مبنيًّا في القاعدة ومسدودًا في الواجهة.**
 *
 * الجدولُ `news_public_comments` قائمٌ منذ ٢٠٢٦-٠٣، وفيه تعليقاتٌ مُقَرّة، ولغرفةِ
 * التحرير تبويبٌ يُقرّها ويحذفها. وما كان ينقص هو الصفحةُ التي تعرضها وتقبل جديدَها.
 *
 * **والإقرارُ قبل النشر حكمُ القاعدة لا اختيارُ الشاشة:** سياسةُ الإدراج تفرض
 * `is_approved = false` على كلّ داخل. فتُقال الجملةُ فوق الحقل مرّةً — «يُقرأ قبل أن
 * يُنشَر» — ولا تُكرَّر تحت كلّ تعليق.
 *
 * **والتحقّقُ ههنا تجربةٌ لا أمن:** القاعدةُ نفسُها في `lib/news/comments` يقرؤها هذا
 * الحقلُ ليُعطّل الزرَّ، ويقرؤها الفعلُ الخادميُّ ليردّ. مصدرٌ واحدٌ لا حكمان.
 */
export function Comments({
  items,
  signedIn,
  onLike,
  onSend,
  busy,
  notice,
  siteKey,
}: {
  items: PublicComment[];
  signedIn: boolean;
  onLike: (id: string) => void;
  onSend: (text: string, guestName: string, token?: string) => Promise<boolean>;
  busy?: boolean;
  notice?: string | null;
  siteKey?: string;
}) {
  const [text, setText] = useState("");
  const [who, setWho] = useState("");
  const [token, setToken] = useState<string | null>(null);
  // الرمزُ يُستهلك مرّةً، فيُعاد ضبطُ الودجة بعد كلّ محاولة.
  const [reset, setReset] = useState(0);

  const clean = cleanComment(text);
  const blocked = commentError(clean, signedIn ? null : cleanComment(who), signedIn);
  const shielded = !siteKey || !!token;
  const published = items.filter((c) => !c.pending).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || busy || !shielded) return;
    const sent = await onSend(clean, cleanComment(who), token ?? undefined);
    setToken(null);
    setReset((r) => r + 1);
    if (sent) setText("");
  }

  return (
    <section id="art-comments" className="art-col">
      <h2 className="art-h">{published ? arCount(published, AR_COMMENT) : "لا تعليقَ بعد"}</h2>

      {/* المُنشئ فوقَ الكلام لا تحته: من قرأ الخبرَ ووصل هنا يريد أن يقول، لا أن يقرأ
          خمسةً ثمّ يبحث عن الحقل. */}
      <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
        {signedIn ? null : (
          <Field
            label="اسمك" icon={<User />} innerIcon={<PencilSimple />}
            placeholder="كما تحبّ أن يظهر"
            value={who} onChange={(e) => setWho(e.target.value)}
            helper="أو سجّل دخولك فيظهر اسمُك في أدِيب."
          />
        )}
        <Textarea
          label="تعليقك" icon={<ChatCircle />} innerIcon={<PencilSimple />}
          placeholder="ما رأيُك فيما قرأت؟"
          rows={3} maxLength={COMMENT_MAX}
          value={text} onChange={(e) => setText(e.target.value)}
        />
        <p className="art-cmt-note">يُقرأ تعليقُك قبل أن يُنشَر.</p>
        {siteKey ? <TurnstileWidget siteKey={siteKey} onToken={setToken} resetSignal={reset} /> : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <Button type="submit" variant="primary" size="md" disabled={!!blocked || !shielded} loading={busy}>
          أرسِل
        </Button>
      </form>

      {items.length ? (
        <div className="art-cmts mt-8">
          {items.map((c) => (
            <article key={c.id} className="art-cmt">
              <Avatar name={c.name} src={c.avatar ?? undefined} gender={c.gender} size="sm" />
              <div>
                <header className="art-cmt-who">
                  <span className="art-cmt-name">{c.name}</span>
                  {c.member && !c.pending ? <Badge tone="info" variant="soft" size="sm">عضو أدِيب</Badge> : null}
                  {c.pending ? <Badge tone="warning" variant="soft" size="sm" dot>ينتظر الإقرار</Badge> : null}
                  <span className="art-cmt-when">{c.when}</span>
                </header>
                <p className="art-cmt-txt">{c.text}</p>
                {c.pending ? null : (
                  <div className="art-cmt-act">
                    <button type="button" className="art-cmt-like" aria-pressed={c.liked} onClick={() => onLike(c.id)}>
                      <Heart size={15} aria-hidden />
                      {c.likes ? <b>{c.likes}</b> : null}
                      <span>{c.liked ? "أعجبَني" : "إعجاب"}</span>
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
