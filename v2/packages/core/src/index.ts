import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * عميل Supabase موحّد للنسخة الثانية.
 * يتصل بـ **نفس** مشروع الخلفية الحالي (بلا أي تغيير في قاعدة البيانات).
 * القيم تُمرَّر من متغيّرات البيئة (لا تُكتب هنا مباشرةً).
 */

/** عميل للمتصفّح (يحفظ الجلسة ويجدّد الرمز تلقائيًا). */
export function createAdeebClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'adeeb_auth',
    },
  });
}

/** عميل للخادم (Server Components / SSR) — بلا حفظ جلسة، للقراءات العامة كـ anon. */
export function createAdeebServerClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * عميل الخدمة (service-role) — يتجاوز RLS للوحة الإدارية.
 * ⚠️ للخادم فقط (Server Components / Route Handlers). لا يُستورَد في كود المتصفّح أبدًا،
 * ومفتاحه (SUPABASE_SERVICE_ROLE_KEY) بلا بادئة NEXT_PUBLIC فلا يُحزَّم للعميل.
 */
export function createAdeebServiceClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * مخزَنُ الجلسة كما يطلبه Supabase. يُمرَّر من الخارج عمدًا:
 * هذه الحزمةُ يقرأها الويبُ والخادمُ والجوّال، فلا يجوز أن تعتمد على `expo-secure-store`.
 */
export type AdeebSessionStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * عميل الجوّال (React Native).
 *
 * يفترق عن عميل المتصفّح في ثلاثة، وكلُّها مقصودة:
 *   - **المخزَن يُحقَن** (`expo-secure-store` في التطبيق): لا `localStorage` ولا كعكات.
 *     وجلسةُ التطبيق منفصلةٌ عن جلسة الموقع، فالدخولُ في أحدهما لا يُدخِل الآخر.
 *   - `detectSessionInUrl: false`: لا شريطَ عنوانٍ في التطبيق. تركُها `true` يجعل GoTrue
 *     يفتّش عن رمزٍ في رابطٍ لا وجودَ له. والعودةُ من قوقل/أبل تُعالَج يدويًّا بالرابط العميق.
 *   - `lock`: الرمزُ يُجدَّد من شاشتين معًا أحيانًا (خلفيّة + مقدّمة)، فيُقفل التجديدُ
 *     على نفسه كي لا يُبطل أحدُهما رمزَ الآخر.
 *
 * ⚠️ التجديدُ التلقائيّ لا يعمل وحدَه في الجوّال: يجب ربطُه بـ`AppState` في التطبيق
 * (`startAutoRefresh` عند العودة للمقدّمة و`stopAutoRefresh` عند الخلفيّة)، وإلّا استمرّ
 * المؤقّتُ يعمل والتطبيقُ نائمٌ فيستيقظ برمزٍ منتهٍ.
 */
export function createAdeebMobileClient(
  url: string,
  anonKey: string,
  storage: AdeebSessionStore
): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'adeeb_auth',
    },
  });
}

/** يحوّل الأرقام العربية-الهندية (٠-٩) والفارسية إلى لاتينية (0-9) لتُعرض بخط Eras. */
export function toLatinDigits(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export type { User, Session, SupabaseClient } from '@supabase/supabase-js';

// أنواعُ قاعدةِ البيانات مولَّدةٌ من السكيمة الحيّة في `database.types.ts`.
// تُصدَّر من هنا وحدها كي يبقى للمشروع مصدرٌ واحدٌ لنوع القاعدة.
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './database.types';
export * from './radio';
