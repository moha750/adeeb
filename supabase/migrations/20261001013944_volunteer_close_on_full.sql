-- ════════════════════════════════════════════════════════════════════════
-- النسخة: 20261001013944   الاسم: volunteer_close_on_full
--
-- **قبولُ آخرِ مقعدٍ يُنهي التقديم** (أمرُ المالك ٢٠٢٦-١٠-٠١). كانت الفرصةُ تبقى «متاحة للتقديم» بعد
-- اكتمال عددها: يقدّم عليها المتطوّعون ولا سبيلَ إلى قبولهم (`NO_SEATS`). فإذا قُبل من يملأ آخرَ مقعدٍ
-- في فرصةٍ مفتوحةٍ أُغلق تقديمُها في المعاملة نفسِها (`status = 'closed'`)، وقالت الرسالةُ ذلك. والطلباتُ
-- المعلّقةُ ساعتَها تبقى لمراجعة المشرف. والفرصةُ بلا سقف (`seats is null`) لا تُغلق بعدد.
--
-- ومعه تصحيحُ لفظ «حُسم» في رسالة `ALREADY_DECIDED` إلى «رُوجع» (اللفظُ الذي اعتمده المالك في اللوحة).
-- الجسمُ ما سواهما مطابقٌ لتعريف القاعدة الحيّ (`pg_get_functiondef`) قبل التعديل.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.decide_volunteer_application(p_id uuid, p_accept boolean, p_reason text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor  uuid := auth.uid();
  v_app    volunteer_applications%rowtype;
  v_opp    volunteer_opportunities%rowtype;
  v_taken  integer;
  v_closed boolean := false;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED', 'message', 'لا جلسة.');
  end if;
  if not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;

  select * into v_app from volunteer_applications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_DECIDED', 'message', 'رُوجع هذا التقديم من قبل.');
  end if;

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id for update;

  if p_accept then
    -- لا عدَّ لفرصةٍ مفتوحة: `seats is null` يعني لا سقف
    if v_opp.seats is not null then
      select count(*) into v_taken from volunteer_applications
      where opportunity_id = v_app.opportunity_id and status = 'accepted';
      if v_taken >= v_opp.seats then
        return jsonb_build_object('ok', false, 'code', 'NO_SEATS',
          'message', format('اكتمل عددُ المطلوبين (%s).', v_opp.seats));
      end if;
    end if;

    update volunteer_applications
    set status = 'accepted', decided_by = v_actor, decided_at = now(),
        decision_reason = nullif(btrim(coalesce(p_reason,'')), '')
    where id = p_id;

    -- آخرُ مقعد: يُنهي التقديمَ في المعاملة نفسِها (والصفُّ مقفولٌ بـ`for update` أعلاه)
    if v_opp.seats is not null and v_opp.status = 'open' and v_taken + 1 >= v_opp.seats then
      update volunteer_opportunities
      set status = 'closed', closed_at = now(), updated_at = now()
      where id = v_opp.id;
      v_closed := true;
    end if;

    return jsonb_build_object('ok', true, 'status', 'accepted', 'closed', v_closed,
      'message', case when v_closed
        then format('قُبل المتطوّع، واكتمل العدد (%s) فانتهى التقديم.', v_opp.seats)
        else 'قُبل المتطوّع في الفرصة.' end);
  end if;

  if btrim(coalesce(p_reason, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED',
      'message', 'اكتب سببَ الرفض. الرفضُ الصامت أثقلُ على صاحبه.');
  end if;

  update volunteer_applications
  set status = 'rejected', decided_by = v_actor, decided_at = now(), decision_reason = btrim(p_reason)
  where id = p_id;

  return jsonb_build_object('ok', true, 'status', 'rejected', 'message', 'رُفض التقديم بسببه المكتوب.');
end;
$function$;
