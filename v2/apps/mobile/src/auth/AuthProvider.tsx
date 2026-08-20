import type { Session, User } from "@adeeb/core";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

/**
 * جلسةُ المستخدِم في التطبيق.
 *
 * **وليست جلسةَ الموقع.** الرمزُ يعيش في Keychain الجهاز لا في كعكةِ متصفّح، فمن دخل
 * هنا لم يدخل هناك والعكس. وهذا مقصود: التطبيقُ جهازٌ شخصيٌّ والمتصفّحُ قد يكون مشتركًا.
 *
 * وما نحفظه من الملفّ الشخصيّ قليلٌ عمدًا: الاسمُ والجنسُ وهل له سجلُّ عضويّة. الجنسُ
 * تحديدًا شرطُ الحجز في الفعاليّات المقسومة، فيُقرأ مرّةً هنا لا في كلّ شاشة.
 */

export type Profile = {
  id: string;
  fullName: string | null;
  gender: "male" | "female" | null;
  /** له صفٌّ في `member_details` — أي أنّه عضوٌ لا زائرٌ فحسب */
  isMember: boolean;
};

type Api = {
  /** `undefined` ما دامت الجلسةُ تُقرأ من المخزن، فلا تومض شاشةُ الدخول لمن هو داخل */
  session: Session | null | undefined;
  user: User | null;
  profile: Profile | null;
  /** يُعاد قراءةُ الملفّ بعد إنشائه أو تعديله */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function useAuth(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth خارج AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    /**
     * يُقرأ بمفتاح anon: سياسةُ `profiles_select` تسمح لصاحب الصفّ بقراءة صفّه.
     * ولا مفتاحَ خدمةٍ هنا ولا يجوز: هو سرٌّ لا يُشحَن في حزمةِ تطبيق.
     */
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, gender, member_details(user_id)")
      .eq("id", userId)
      .maybeSingle();

    if (!data) {
      setProfile(null);
      return;
    }
    const row = data as {
      id: string;
      full_name: string | null;
      gender: "male" | "female" | null;
      member_details: unknown[] | null;
    };
    setProfile({
      id: row.id,
      fullName: row.full_name,
      gender: row.gender,
      isMember: Array.isArray(row.member_details) && row.member_details.length > 0,
    });
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session?.user.id);
    });

    // كلُّ تبدّلٍ في الجلسة (دخولٌ، خروجٌ، تجديدُ رمز) يمرّ من هنا لا من كلّ شاشة
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const api = useMemo<Api>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
