import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@/app/_components/glyphs";
import { shareOg } from "@/lib/share";
import { gamesService } from "@/lib/games/authz";
import { AttractVideo } from "../_components/AttractVideo";

/**
 * **صفحةُ «بنك أدِيب»** (`/games/bank-adeeb`، طلبُ المالك ٢٠٢٦-١٠-١٧) — كأختها «دربك خضر»: صفحةٌ فوق ملفّ
 * اللعب (`/play`) تعرّف باللعبة وتدعو إليها. كان الرابطُ الأعلى يفتح «غير موجودة» حين انتقل البنكُ تحت
 * `/games` (لاحظه المالك)، فحُوِّل مؤقّتًا إلى اللعب، ثمّ بُنيت.
 *
 * **بهويّة اللعبة لا الموقع** (القاعدة ١، `.bnk`): صرّافٌ بشاشةٍ خضراء وزرٍّ ذهبيّ، ونصُّ الترحيب من اللعبة
 * نفسِها. ولا صدارةَ ولا حساب: اللاعبُ فيها اسمٌ يُكتب بيده. فالصفحةُ ترحيبٌ وكيف تتمّ العمليّة وأرقامُ
 * الفرع (`bank_stats`)، وتتجدّد كلَّ خمس دقائق.
 *
 * والمُهَلُ (١٥ و٢٠ و٢٥ ثانية) هي افتراضُ اللعبة (`settings.times` في `game.html`)، ولموظّف الركن أن
 * يغيّرها على تابلته، فلا تُقرأ من القاعدة.
 */
export const revalidate = 300;

const LEAD = "أجب عن سؤالٍ واحدٍ عن الوطن قبل انتهاء المهلة، واستلم بطاقتك.";

export const metadata: Metadata = {
  title: "بنك أدِيب",
  description: LEAD,
  openGraph: shareOg({ title: "بنك أدِيب", description: LEAD, type: "website" }),
};

type Stats = { plays: number; results: Partial<Record<"correct" | "wrong" | "timeout", number>> };

async function getFigures(): Promise<{ plays: number; hit: number } | null> {
  const sb = gamesService();
  if (!sb) return null;
  const { data } = await sb.rpc("bank_stats");
  const s = data as Stats | null;
  if (!s || typeof s.plays !== "number") return null;
  const r = s.results ?? {};
  const answered = (r.correct ?? 0) + (r.wrong ?? 0) + (r.timeout ?? 0);
  return { plays: s.plays, hit: answered ? Math.round(((r.correct ?? 0) / answered) * 100) : 0 };
}

const nf = (n: number) => n.toLocaleString("en-US");
const PLAY = "/games/bank-adeeb/play";

export default async function BankPage() {
  const figs = await getFigures();
  return (
    <div className="bnk">
      <div className="bnk-wrap">
        <header className="bnk-top">
          <span className="bnk-sign">
            <b>بنك أدِيب</b>
            <span>فرع اليوم الوطني</span>
          </span>
          <Link href="/games" className="bnk-back">
            <span>ألعاب أدِيبيّة</span>
            <ArrowLeft aria-hidden />
          </Link>
        </header>

        <div className="bnk-cq">
          <section className="bnk-atm">
            <div className="bnk-screen">
              <span className="bnk-eyebrow">مرحبًا بك في</span>
              <h1 className="bnk-big">بنك أدِيب</h1>
              <p className="bnk-lead">{LEAD}</p>
              <Link href={PLAY} className="bnk-go">
                <span>
                  ابدأ العمليّة
                  <small>Start</small>
                </span>
              </Link>
            </div>
            <div className="bnk-clip" aria-hidden>
              <AttractVideo src="/games/cabinets/bank-adeeb.mp4" poster="/games/cabinets/bank-adeeb.jpg" />
            </div>
          </section>
        </div>

        {figs && figs.plays > 0 ? (
          <div className="bnk-figs">
            <span className="bnk-fig"><b>{nf(figs.plays)}</b>عمليّةً حتّى الآن</span>
            <span className="bnk-fig"><b>{figs.hit}%</b>تمّت الموافقة عليها</span>
          </div>
        ) : null}

        <h2 className="bnk-sec-h">كيف تتمّ العمليّة؟</h2>
        <div className="bnk-rcpt">
          <div className="bnk-rcpt-h">
            <b>إيصال عمليّة</b>
            <span>بنك أدِيب</span>
          </div>
          <ol className="bnk-steps">
            <li>
              <span>
                <b>اختر لغتك</b>
                <p>العربيّة أو الإنجليزيّة.</p>
              </span>
            </li>
            <li>
              <span>
                <b>اكتب اسمك</b>
                <p>يُطبع على بطاقتك إن فزت.</p>
              </span>
            </li>
            <li>
              <span>
                <b>اختر مستوى السؤال</b>
                <p>ولكلّ مستوى مهلتُه.</p>
                <span className="bnk-levels">
                  <span className="bnk-level">سهل <small>15 ث</small></span>
                  <span className="bnk-level">متوسّط <small>20 ث</small></span>
                  <span className="bnk-level">صعب <small>25 ث</small></span>
                </span>
              </span>
            </li>
            <li>
              <span>
                <b>أجب قبل أن ينفد الوقت</b>
                <p>أربعةُ خياراتٍ وإجابةٌ واحدةٌ صحيحة. أصبت؟ تمّت الموافقة واستلمت بطاقتك. وإلّا خرج لك إيصالٌ بالإجابة الصحيحة.</p>
              </span>
            </li>
          </ol>
        </div>

        <p className="bnk-foot">
          من إنتاج وتشغيل <Link href="/">نادي أدِيب</Link>
        </p>
      </div>
    </div>
  );
}
