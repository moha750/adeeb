-- **إنهاءُ العضويّة يُفرِّغ المقعد** — سدُّ ثغرةٍ كشفها سؤالُ المالك في ٢٠ أغسطس ٢٠٢٦.
--
-- كان في النظام فعلان يُخرجان الإنسانَ من النادي، ولهما أثران مختلفان:
--
--   • **إنهاءُ العضويّة بالسلطة** (`terminate_membership` ← `_apply_termination`): يجعل الحالَ
--     `suspended` **ويترك المقعدَ باسم صاحبه** في الهيكل.
--   • **قبولُ طلب الخروج** (بُني ٢٠٢٦-٠٨-٢٠): يُنهي العضويّةَ **ويُطفئ المقاعد**.
--
-- فكان في القاعدة خمسون إنسانًا خرجوا من النادي وأسماؤهم في مقاعدهم: لجانٌ تعدّ أعضاءً
-- ليسوا أعضاءَ، وشجرةٌ تقول ما ليس كذلك. وهو عطبٌ صامتٌ لأنّه لا يصرخ في شاشة.
--
-- **والعلاج في الأصل لا في الفروع**: الإطفاءُ ينزل في `_apply_termination` نفسِها، وهي المعبَر
-- الذي تمرّ منه كلُّ إنهاءات العضويّة (بالسلطة · بالطلب · بالإنذار الثالث · بحذف الحساب).
-- فيصير للفعل أثرٌ واحدٌ مهما اختلف بابُه.
--
-- **وأثرٌ لازمٌ يُعرَف قبل أن يُفاجئ**: `restore_membership` بعد اليوم لا تكفي وحدَها لإعادة
-- عضوٍ — لأنّ حارسَ «لا عضويّةَ حيّةٌ بلا مقعد» (٢٠٢٦-٠٨-٢٠) يردّ إحياءَ عضويّةِ من لا مقعدَ له.
-- فالترتيبُ صار: **يُسنَد المقعدُ أوّلًا ثمّ تُعاد العضويّة**.

create or replace function public._apply_termination(p_actor uuid, p_user uuid, p_reason text, p_source text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'suspended', termination_reason = p_reason, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  -- **والمقعدُ يخلو مع صاحبه** (2026-08-20): من خرج من النادي لا يبقى اسمُه في الهيكل.
  -- إطفاءٌ لا حذفٌ صلب، كسائر نزع المناصب في هذا المستودع.
  update user_roles set is_active = false
  where user_id = p_user and is_active;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'terminate_membership', 'profile', p_user::text,
          jsonb_build_object('reason', p_reason, 'source', p_source));
end;
$function$;

comment on function public._apply_termination(uuid, uuid, text, text) is
  'المعبَرُ الواحد لإنهاء العضويّة: يجعل الحالَ suspended، ويُطفئ مقاعدَ صاحبها، ويكتب السطرَ في السجلّ (2026-08-20).';
