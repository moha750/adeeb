-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815173603   الاسم: volunteer_opportunity_open_seats

-- العددُ المطلوب: مخصَّصٌ أو مفتوح (قرار المالك ١٥ أغسطس ٢٠٢٦).
-- و«المفتوح» يُكتب `null` لا رقمًا كبيرًا: الغيابُ يقول «لا سقف» بلا كذبٍ في العدّ.
alter table public.volunteer_opportunities alter column seats drop not null;
alter table public.volunteer_opportunities drop constraint if exists volunteer_opportunities_seats_check;
alter table public.volunteer_opportunities add constraint volunteer_opportunities_seats_check
  check (seats is null or seats > 0);

-- والقبولُ لا يعدّ مقاعدَ لفرصةٍ بلا سقف، ويبقى القفلُ على حاله (الترتيبُ محروسٌ لا العدّ وحده)
create or replace function public.decide_volunteer_application(
  p_id uuid, p_accept boolean, p_reason text default null
) returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
  v_opp   volunteer_opportunities%rowtype;
  v_taken integer;
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
    return jsonb_build_object('ok', false, 'code', 'ALREADY_DECIDED', 'message', 'حُسم هذا التقديم من قبل.');
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

    return jsonb_build_object('ok', true, 'status', 'accepted', 'message', 'قُبل المتطوّع في الفرصة.');
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
$$;
