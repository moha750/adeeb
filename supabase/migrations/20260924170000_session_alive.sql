-- ═══════════════════════════════════════════════════════════════════════════
-- حياةُ الجلسة — تُسأل عنها القاعدةُ بدل خادم المصادقة
--
-- كان كلُّ طلبٍ ينادي `auth.getUser()` مرّتين (في الحارس `proxy.ts` ثمّ في
-- `getSessionAdmin`)، وهو **نداءُ شبكةٍ دائمًا** إلى GoTrue. وفائدتُه الأمنيّةُ
-- الوحيدةُ التي لا يُغني عنها التحقّقُ المحلّيّ من توقيع الرمز هي واحدة:
-- أن يعرف أنّ الجلسة **أُبطِلت** قبل أن ينتهي عمرُ الرمز (`jwt_exp` = ٣٦٠٠).
--
-- فنُقلت تلك الفائدةُ وحدَها إلى هنا: `loadIdentity` يضرب القاعدةَ أصلًا بمفتاح
-- الخدمة في كلّ طلبٍ للوحة (`profiles` + `get_user_permissions` في `Promise.all`)،
-- فيركب هذا الفحصُ **الموجةَ نفسَها** ولا يكلّف مللي ثانيةً واحدة. والنتيجة:
-- نداءان محذوفان بالكامل، والإبطالُ يبقى **فوريًّا** كما كان.
--
-- والإبطالُ حذفُ صفٍّ لا تعليمُ راية: `revoke_my_session` تحذف من `auth.sessions`،
-- و`signOut({scope:'global'})` تحذف صفوفَ الحساب كلَّها. فوجودُ الصفّ = حياةُ الجلسة.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.session_alive(p_user uuid, p_session uuid)
returns boolean
language sql
stable
security definer
-- `search_path` مثبَّتٌ كأخواتها (`my_sessions`, `revoke_my_session`): دالّةٌ
-- بامتياز المالك بلا مسارٍ مثبَّتٍ تُخطَف بجدولٍ يُزرع في مسارٍ أسبق.
set search_path to 'auth', 'public'
as $function$
  select exists (
    select 1
    from auth.sessions s
    where s.id = p_session
      and s.user_id = p_user
      -- `not_after` صندوقُ الوقت (مُطفأٌ اليوم: `sessions_timebox` = 0)، ويُحترَم
      -- ههنا كي لا يحتاج تفعيلُه يومًا تعديلًا في هذا الموضع.
      and (s.not_after is null or s.not_after > now())
  );
$function$;

-- **المنحُ يُنزَع أوّلًا**: بوستجرس يمنح `execute` لـ`public` تلقائيًّا عند الإنشاء،
-- فلولا هذا السطر لَقرأ كلُّ زائرٍ مجهولٍ حياةَ أيّ جلسةٍ يعرف معرّفَها.
revoke all on function public.session_alive(uuid, uuid) from public, anon, authenticated;
grant execute on function public.session_alive(uuid, uuid) to service_role;

comment on function public.session_alive(uuid, uuid) is
  'هل جلسةُ هذا المستخدم ما زالت حيّة؟ لمفتاح الخدمة وحده — يركب موجةَ loadIdentity كي يبقى إبطالُ الجلسة فوريًّا بعد أن صار التحقّق من الرمز محلّيًّا.';
