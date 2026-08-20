import { SiteHeader } from "../_components/SiteHeader";
import { clubHour } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { loadDeeboFirstName } from "@/lib/deebo/viewer";
import { DeeboChat } from "./DeeboChat";
import { listMyConversations, openMyConversation } from "./actions";

export const metadata = {
  title: "ديبو",
  description: "مساعدُ نادي أديب. اسأله عن النادي وفعاليّاته وعضويّته.",
};

/**
 * صفحةُ ديبو — **غرفةُ محادثةٍ لا صفحةٌ تُقرأ** (اعتمدها المالك ٢٠٢٦-٠٨-٢٠).
 *
 * خادميّةٌ لثلاثة أشياء لا رابعَ لها: مفتاحُ Turnstile العلنيّ، ومعرفةُ هل لصاحب الطلب
 * جلسة، وسِجلُّ محادثاته إن كانت له. والمحادثةُ كلُّها عميليّة.
 *
 * وثلاثةُ فروقٍ عن سائر صفحات الموقع، وكلُّها مقصودة:
 *  • **لا `<main className="py-16">` ولا عنوانَ فوقها**: العمودُ كلُّه غرفةٌ بملء النافذة
 *    (`.dchs-shell`)، واسمُ ديبو في شريطها العلويّ. عنوانٌ ثابتٌ فوق محادثةٍ يأكل من
 *    شاشة الجوّال ثلثَها ولا يقول شيئًا لا يقوله الشريط.
 *  • **رأسُ الموقع يبقى** بابًا للخروج: عُرضت هيئتان تحذفانه (جزيرةٌ تحلّ محلّه، ثمّ
 *    جزيرتان فوق بعض) فردّهما المالك ٢٠٢٦-٠٨-٢٠ واختار الجذر: يبقى الرأسُ كما هو،
 *    و**ينطق زرُّ السِّجلّ** بكلمته في شريط الغرفة، وتنزل من تحته جزيرةُ المحادثات.
 *  • **ولا تذييلَ**: تذييلٌ تحت محادثةٍ يقول «انتهى» وهي لم تنتهِ، ولا يُبلَغ أصلًا فالمتنُ
 *    وحدَه ذو تمرير.
 *
 * **ومن دخل بحسابه لا يرى درعًا** (`siteKey = null`): المِنفذُ لا يطلب رمزًا ممّن له جلسة،
 * فلو رُسمت الودجةُ له لانتظرت رمزًا لا يُطلَب. والقراران في موضعٍ واحدٍ من الحقيقة.
 */
export default async function DeeboPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const rawKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;

  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  const signedIn = !!data.user;
  const conversations = signedIn ? await listMyConversations() : null;

  /* العودةُ من صفحة المحادثات (`?c=`) تُفتح **على الخادم**: تصل الغرفةُ عامرةً من أوّل
     رسم، فلا ومضةَ ترحيبٍ قبلها ولا أثرٌ يضبط حالةً بعده. والسياسةُ تحرسها: صفُّ غيرك
     يرجع فارغًا فتُفتح غرفةٌ جديدة. */
  const wanted = (await searchParams).c;
  const talk = signedIn && wanted ? await openMyConversation(wanted) : null;

  /* **التحيّةُ تُقرَع في الخادم** (٢٠٢٦-٠٨-٢٠): البذرةُ والساعةُ والاسمُ تنزل خواصَّ إلى
     الغرفة، فيرسم الخادمُ والمتصفّحُ الجملةَ نفسَها. ولو رُميت القرعةُ في المكوّن لاختلف
     الرسمان وصرخ الترطيبُ في الطرفيّة. وساعةُ الرياض من `clubHour` لا من ساعة الخادم:
     خادمُ النشر يعمل بغرينتش، فالعاشرةُ مساءً عنده السابعةُ مساءً وتحيّتُها تكذب. */
  /* والقرعةُ عمدًا (`react-hooks/purity` يمنعها في المكوّنات): هذا مكوّنٌ خادميٌّ يُرسَم
     مرّةً لكلّ طلبٍ ولا يُعاد رسمُه، فلا «نتيجةٌ غيرُ مستقرّة» ههنا — بل هي المقصودةُ نفسُها. */
  // eslint-disable-next-line react-hooks/purity
  const greetingSeed = Math.floor(Math.random() * 1_000_000);
  const viewerName = data.user ? await loadDeeboFirstName(data.user.id) : null;

  return (
    <div className="dchs-shell">
      <SiteHeader activeHref="/deebo" />
      <DeeboChat
        siteKey={signedIn ? null : rawKey}
        signedIn={signedIn}
        initialConversations={conversations}
        initialTalk={talk && wanted ? { id: wanted, turns: talk } : null}
        greetingSeed={greetingSeed}
        greetingHour={clubHour()}
        viewerName={viewerName}
      />
    </div>
  );
}
