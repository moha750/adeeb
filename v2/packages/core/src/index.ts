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

/** يحوّل الأرقام العربية-الهندية (٠-٩) والفارسية إلى لاتينية (0-9) لتُعرض بخط Eras. */
export function toLatinDigits(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export type { User, Session, SupabaseClient } from '@supabase/supabase-js';

// ملاحظة: أنواع قاعدة البيانات (Database) ستُولَّد لاحقًا من Supabase الحيّة
// عبر `supabase gen types typescript` وتوضع هنا لتأمين الأنواع طرفًا لطرف.
