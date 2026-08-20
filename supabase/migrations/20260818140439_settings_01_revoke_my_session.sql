-- **إنهاءُ جلسةٍ بعينها** — أخو `my_sessions` في الغرفة نفسها (تبويب الإعدادات).
--
-- كان الخروجُ عندنا الكلَّ أو لا شيء: من نسي جلستَه في حاسب الجامعة لم يملك إلّا أن يُخرج
-- نفسَه من أجهزته كلِّها. وهذا بابُ الفعل المفرد.
--
-- **وحراستُه حراسةُ أخيه**: `auth.sessions` خارج مخطّطات واجهة البيانات فلا يبلغه عميل،
-- والدالّةُ `SECURITY DEFINER` لا تمسّ إلّا صفَّ `auth.uid()` — فالمعرّفُ الممرَّر **مرشّحٌ
-- لا إذن**: يُقرن بشرط `user_id = auth.uid()` في جملة الحذف نفسِها، فمن مرّر معرّفَ جلسةِ
-- غيره خرج بصفرٍ محذوف لا بجلسةٍ مقتولة. ومن ناداها بمفتاح الخدمة (حيث `auth.uid()` فارغة)
-- لم يحذف شيئًا كذلك.
--
-- ورموزُ التحديث تموت معها بلا سطرٍ ههنا: `auth.refresh_tokens.session_id` مفتاحٌ أجنبيٌّ
-- بـ`on delete cascade` — فالحذفُ واحدٌ وأثرُه اثنان.
--
-- وتُعيد **عدد ما حُذف** لا `void`: الشاشةُ تفرّق بين «أُنهيت» و«لم تعد موجودة» (جلسةٌ ماتت
-- بين الرسم والضغط) — فتقول الصدقَ في الحالين ولا تدّعي فعلًا لم يقع.
create or replace function public.revoke_my_session(p_session_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path to 'auth', 'public'
as $$
declare
  v_deleted integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  delete from auth.sessions s
  where s.id = p_session_id
    and s.user_id = auth.uid();

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.revoke_my_session(uuid) from public, anon;
grant execute on function public.revoke_my_session(uuid) to authenticated;

comment on function public.revoke_my_session(uuid) is
  'إنهاء جلسةٍ واحدة لصاحبها نفسه (auth.sessions) — لتبويب الإعدادات. المعرّف مرشّحٌ لا إذن: يُقرن بـauth.uid() في الحذف. تُعيد عدد ما حُذف.';
