-- بابُ قوقل وأبل يُفتح **للقائمين وحدهم** — والقفلُ في القاعدة لا في الشاشة.
--
-- تفعيلُ OAuth يعيد فتح بابِ **التسجيل الذاتيّ** الذي نُحر في ٢٠٢٦-٠٨-٠٤: أيّ غريبٍ بحساب
-- قوقل يصير له صفٌّ في `auth.users` وجلسةٌ حيّة، ثمّ تسوقه بوّابةُ اللوحة إلى `/complete`
-- فيكتب لنفسه صفَّ `member_details`. لا عضويّةَ تُمنَح ولا قدرة — لكنه بابٌ لم نفتحه.
--
-- والعضو القائم **لا يُنشَأ بل يُربَط**: تضمّ Supabase هويّةَ قوقل/أبل إلى الحساب صاحبِ
-- البريد نفسِه متى كان مؤكَّدًا (والنشطون كلُّهم مؤكَّدون — فُحص يوم كتابة هذا الملفّ).
-- فهذا الخطّاف **لا يمرّ به عضوٌ قطّ**: لا يبلغه إلّا من لا حساب له في أديب.
--
-- ولا يمسّ إنشاءَ الإدارة بحال: مزوّدُه `email` فيُمرَّر بلا سؤال — القفلُ مقصورٌ على
-- المزوّدَين الاجتماعيَّين، فلا يُغيّر سلوكًا قائمًا ولا يحبس بابًا مفتوحًا.
--
-- **الوصل**: يُنادى من `hook_before_user_created` في إعداد المصادقة، ومصدرُ ذلك الإعداد
-- `v2/scripts/auth-config.mjs` لا لوحةُ Supabase. ونصُّ الرفض بالعربيّة في
-- `v2/apps/web/src/lib/authErrors.ts` — يُرجَع هنا **رمزًا لاتينيًّا ثابتًا** لا جملةً:
-- الرمز يعبُر إعادةَ التوجيه بلا ترميزٍ يشوّهه، والعبارةُ تبقى في مصدر النصوص الواحد.

create or replace function public.hook_block_oauth_signup(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  provider text := event -> 'user' -> 'app_metadata' ->> 'provider';
  email    text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  -- ليس مزوّدًا اجتماعيًّا؟ فليس شأنَ هذا القفل (إنشاءُ الإدارة بالبريد يمرّ من هنا).
  if provider is null or provider not in ('google', 'apple') then
    return '{}'::jsonb;
  end if;

  -- **بريد أبل المخفيّ** يُسمّى بعينه: من اختار «إخفاء بريدي» جاءنا بعنوان تحويلٍ
  -- عشوائيّ لا يطابق عضوًا بحال — ولو كان عضوًا صادقًا. فرفضٌ عامٌّ يقول له «لا حساب لك»
  -- كذبٌ يُقلقه، والصوابُ أن يُدلّ على الزرّ الذي ضغطه.
  if email like '%@privaterelay.appleid.com' then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'adeeb_oauth_hidden_email')
    );
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'adeeb_oauth_no_account')
  );
end;
$$;

-- الصلاحيّات: يُنفّذها حارسُ المصادقة وحده — ولا تُعرَض لعميلٍ بحال.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_block_oauth_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_block_oauth_signup(jsonb) from authenticated, anon, public;
