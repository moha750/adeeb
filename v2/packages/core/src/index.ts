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

// `toLatinDigits` في `./digits` (انظر سببَ فصله هناك)، ويبقى مُصدَّرًا من هنا لمن يستورده من الجذر.
export { toLatinDigits } from './digits';

export type { User, Session, SupabaseClient } from '@supabase/supabase-js';

// أنواعُ قاعدةِ البيانات مولَّدةٌ من السكيمة الحيّة في `database.types.ts`.
// تُصدَّر من هنا وحدها كي يبقى للمشروع مصدرٌ واحدٌ لنوع القاعدة.
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './database.types';
export * from './radio';
