import "server-only";

import { createAdeebServiceClient } from "@adeeb/core";
import { firstAndLastOf } from "@/lib/personName";
import { positionLine } from "@/lib/positionLabel";
import { isLiveMembership } from "@/lib/memberRecord";
import { standingName, type AdeebStanding } from "@/lib/standing";

/**
 * **مَن يكلّم ديبو** — صفةُ صاحب الجلسة كما تُقال له لا كما تُخزَّن.
 *
 * أذن المالك ٢٠٢٦-٠٨-٢٠ أن يعرف ديبو مُحدِّثَه إن كان له حساب، واختار **الاسمَ الأوّل
 * والصفةَ** لا أكثر. فهذا الملفّ هو الحدُّ المرسوم: ما يخرج منه يخرج إلى المزوّد
 * الخارجيّ، فلا يُزاد عليه بريدٌ ولا جوّالٌ ولا رقمٌ أكاديميّ ولا تاريخُ ميلاد.
 *
 * **ولا يجيب ديبو عن بياناتك من عنده**: هذا يقول «من أنت» ليختار الجوابَ المناسب
 * ويسوقك إلى بابك، ولا يقول «كم مهمّةً عليك». وأرقامُك لا تُحقَن هنا، وحارسُ الأرقام
 * (`guard.ts`) يحجب كلَّ رقمٍ لم يأته من معرفته.
 *
 * ويُقرأ بمفتاح الخدمة كسائر قراءات الهويّة (`lib/auth.ts`)، ويسقط إلى `null` عند أيّ
 * تعثّر — فيعود ديبو إلى حاله مع الزائر المجهول، ولا يُسقِط المحادثةَ كلَّها.
 */
export type DeeboViewer = {
  userId: string;
  /** الاسمُ الأوّل وحده: «محمّد». والنداءُ بالاسم الكامل في محادثةٍ ثقيلٌ متكلّف. */
  firstName: string | null;
  /** جملةُ المنصب من مصدرها الواحد: «عضو لجنة الإعلام». `null` لمن لا مقعدَ له. */
  position: string | null;
  /** صفتُه في أدِيب — ثلاثٌ لا رابعَ لها. */
  standing: AdeebStanding;
};

/** اسمُ المنزلة من مصدرها (`lib/standing`) فيناديه ديبو بما يناديه به الموقع، ثمّ ما يحتاجه ليختار جوابه. */
const STANDING_AR: Record<DeeboViewer["standing"], string> = {
  member: standingName("member"),
  volunteer: `${standingName("volunteer")}: يتطوّع مع النادي، وليس عضوًا بعد`,
  account: `${standingName("account")}: له حسابٌ في الموقع، وليس عضوًا ولا متطوّعًا`,
};

export async function loadDeeboViewer(userId: string): Promise<DeeboViewer | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const sb = createAdeebServiceClient(url, key);

  // خمسُ قراءاتٍ صغيرةٍ لصفٍّ واحدٍ أو صفرٍ في كلٍّ منها، وتجري معًا.
  const [profileRes, seatRes, memberRes, volunteerRes] = await Promise.all([
    sb.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    sb
      .from("user_roles")
      .select("role_name, committee_id, department_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    /* **`members` عرضٌ مفتاحُه `id` لا `user_id`** (حدُّ العضويّة `joined_date`، راجع
       تعريف العرض). أُمسك في أوّل تجربةٍ حيّة: كان الاستعلامُ بـ`user_id` فيتعثّر صامتًا،
       فيقول ديبو لعضوٍ في لجنةٍ «أنت صاحبُ حسابٍ ولستَ عضوًا» ثمّ يذكر منصبَه في السطر
       نفسِه — جملتان تتناقضان في نَفَسٍ واحد. */
    /* والعرضُ يضمّ العضوَ السابقَ أيضًا (أرشيفُ الكشوف)، فالحدُّ `isLiveMembership` لا مجرّدُ
       وجود الصفّ: العضوُ السابقُ صديقُ أدِيب (٢٠٢٦-١٠-٠٣). */
    sb.from("members").select("id, joined_date, account_status").eq("id", userId).maybeSingle(),
    /* والمتطوّعُ صفٌّ حالُه `active`. لا `ended_at`: العائدُ إلى التطوّع يبقى عليه خبرُ انقطاعه
       (`volunteers_return_keeps_history`)، فكان يُقرأ «صديقَ أدِيب» وهو متطوّع. */
    sb.from("volunteers").select("user_id, status").eq("user_id", userId).maybeSingle(),
  ]);

  if (profileRes.error) return null;
  const full = (profileRes.data?.full_name ?? "").trim();
  const firstName = full ? firstAndLastOf(full).split(" ")[0] || null : null;

  // المنصبُ يُقرأ في خطوةٍ ثانية: أكثرُ من يكلّم ديبو لا مقعدَ له، فلا تُدفع كلفتُه لهم.
  let position: string | null = null;
  const seat = seatRes.data;
  if (seat?.role_name) {
    const [roleRes, comRes, deptRes] = await Promise.all([
      sb.from("roles").select("role_name_ar").eq("role_name", seat.role_name).maybeSingle(),
      seat.committee_id != null
        ? sb.from("committees").select("committee_name_ar").eq("id", seat.committee_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      seat.department_id != null
        ? sb.from("departments").select("name_ar").eq("id", seat.department_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const unit =
      (comRes.data as { committee_name_ar?: string } | null)?.committee_name_ar ??
      (deptRes.data as { name_ar?: string } | null)?.name_ar ??
      null;
    position = positionLine(roleRes.data?.role_name_ar ?? null, unit);
  }

  const standing: DeeboViewer["standing"] = isLiveMembership(memberRes.data)
    ? "member"
    : (volunteerRes.data as { status?: string } | null)?.status === "active"
      ? "volunteer"
      : "account";

  return { userId, firstName, position, standing };
}

/**
 * سطرُ التعريف كما يُحقن في تعليمات النظام.
 *
 * وهو **وصفٌ وأمرٌ معًا**: يقول من يكلّمه، ويقيّده بأن يبني عليه اختيارَ الجواب لا أن
 * يعلّق عليه — فمساعدٌ يفتتح كلَّ جوابٍ بـ«بصفتك عضوًا في لجنة الإعلام» يصير ثقيلًا في
 * السؤال الثاني.
 */
export function viewerBriefing(viewer: DeeboViewer): string {
  const who = [
    viewer.firstName ? `اسمه ${viewer.firstName}` : null,
    STANDING_AR[viewer.standing],
    viewer.position ? `ومنصبه: ${viewer.position}` : null,
  ]
    .filter(Boolean)
    .join("، ");

  return `## مَن يكلّمك الآن
${who}.
نادِه باسمه مرّةً في أوّل جوابٍ إن كان لك اسمُه، ثمّ اتركه. ولا تُصدّر أجوبتك بصفته.
واختر جوابك على قدر صفته: لا تدعُ عضوًا إلى التطوّع ليصير عضوًا، ولا تشرح لصاحب منصبٍ
ما يعرفه بحكم موقعه، وسُقْ من ليس عضوًا إلى بابه الصحيح.
ولا تذكر من بياناته إلّا ما ورد في هذا السطر، ولا تُخبره بأرقامٍ عن عضويّته أو مهامّه
أو إنذاراته: تلك في لوحته لا عندك، فأرشده إليها.`;
}

/**
 * الاسمُ الأوّل وحدَه، **لتحيّة الصفحة الفارغة** (٢٠٢٦-٠٨-٢٠).
 *
 * ولمَ لا يُنادى `loadDeeboViewer` وفيه الاسمُ أصلًا؟ لأنّ ذاك يقرأ خمسَ قراءاتٍ ليعرف
 * صفةَ صاحبه (عضوٌ أم متطوّعٌ أم صديقُ أدِيب) وهي لا تُذكر في التحيّة، وثمنُها يُدفع في
 * **كلّ فتحةِ صفحة** لا عند السؤال. فالتحيّةُ تحتاج صفًّا واحدًا، وهذا يقرؤه.
 *
 * واستخراجُ الاسم من `firstAndLastOf` كما في أخيه: القاعدةُ واحدةٌ فلا يُنادى العضوُ
 * في التحيّة باسمٍ ويُنادى في الجواب بغيره.
 */
export async function loadDeeboFirstName(userId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  const sb = createAdeebServiceClient(url, key);
  const { data, error } = await sb.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  if (error) return null;
  const full = (data?.full_name ?? "").trim();
  return full ? firstAndLastOf(full).split(" ")[0] || null : null;
}
