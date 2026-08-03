-- ═══════════════════════════════════════════════════════════════════════════
-- شهادة الخبرة — م٥: التحقّق العلنيّ
--
-- من بيده الورقة يسأل: «أهذه من أدِيب؟». فصفحةٌ علنيّة تجيب — والجواب أدنى ما يكفي.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- ١) الرقم المرجعيّ يصير **غير قابلٍ للتخمين**
--
-- كان `ADEEB-EXP-2026-0001` متسلسلًا محضًا — ومن عدّ ١، ٢، ٣ حصد أسماء الأعضاء ومناصبهم
-- من صفحة التحقّق. فيُلحَق به **رمزٌ عشوائيّ** (ستّ عشريّات = ١٦.٧ مليون احتمال لكلّ رقم):
-- التسلسلُ يبقى للسجلّ، والرمزُ يحرس البابَ العلنيّ. ولا يُبطِل هذا ما صدر قبله — القديم
-- يبقى صالحًا في السجلّ، وإنّما لا يُقرأ من الباب العلنيّ إلّا من حمل رمزه.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.issue_certificate(
  p_actor    uuid,
  p_user     uuid,
  p_name     text default null,
  p_position text default null
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_today    date := (now() at time zone 'Asia/Riyadh')::date;
  v_joined   date;
  v_name     text;
  v_title    text;
  v_role     text;
  v_committee integer;
  v_serial   text;
  v_id       uuid;
begin
  select p.joined_date,
         coalesce(nullif(btrim(coalesce(p_name, '')), ''),
                  nullif(btrim(md.full_name_triple), ''),
                  btrim(p.full_name))
  into v_joined, v_name
  from profiles p
  left join member_details md on md.user_id = p.id
  where p.id = p_user;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;

  -- **ولا يُشترط أن تكون العضويّة سارية**: أكثرُ من يطلب شهادةَ خبرةٍ من غادر.
  if not can_issue_certificate(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إصدار شهادةٍ لهذا العضو.');
  end if;

  if v_joined is null then
    return jsonb_build_object('ok', false, 'code', 'NO_JOIN_DATE',
      'message', 'لا تاريخَ انضمامٍ مسجَّلٌ لهذا العضو — سجّله أوّلًا فالشهادة تبدأ منه.');
  end if;

  v_title := coalesce(nullif(btrim(coalesce(p_position, '')), ''), position_title_of(p_user));
  if v_title is null or v_title = '' then
    return jsonb_build_object('ok', false, 'code', 'NO_POSITION',
      'message', 'لا منصبَ مسجَّلٌ لهذا العضو — اكتب المسمّى في النافذة.');
  end if;

  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'NO_NAME', 'message', 'اسمُ العضو ناقص.');
  end if;

  select ur.role_name, ur.committee_id into v_role, v_committee
  from user_roles ur
  where ur.user_id = p_user
  order by ur.is_active desc, ur.assigned_at desc
  limit 1;

  -- تسلسلٌ للسجلّ + رمزٌ عشوائيّ يحرس الباب العلنيّ
  v_serial := 'ADEEB-EXP-' || extract(year from v_today)::text || '-'
              || lpad(nextval('experience_certificate_serial_seq')::text, 4, '0') || '-'
              || upper(encode(gen_random_bytes(3), 'hex'));

  insert into experience_certificates
    (user_id, issued_by, serial, holder_name, position_title, period_from, period_to, role_at_issue, committee_id)
  values
    (p_user, p_actor, v_serial, v_name, v_title, v_joined, v_today, v_role, v_committee)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'issue_certificate', 'profile', p_user::text,
          jsonb_build_object('certificate_id', v_id, 'serial', v_serial,
                             'position', v_title, 'from', v_joined, 'to', v_today));

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'serial', v_serial,
    'holder_name', v_name, 'position_title', v_title,
    'period_from', v_joined, 'period_to', v_today,
    'message', format('صدرت الشهادة برقم %s.', v_serial)
  );
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- ٢) الباب العلنيّ — سؤالٌ واحد وجوابٌ أدنى
--
-- يُسأل بالرقم كاملًا (بالرمز)، فيُجيب: أصحيحةٌ أم مبطَلةٌ أم لا وجود لها، ومعها ما على
-- الورقة نفسها لا أكثر (الاسم والمسمّى والفترة). **ولا استعلامَ بغير الرقم**: لا اسمٌ
-- يُبحَث به، ولا سردٌ يُطلَب — فالباب يؤكّد ورقةً بيد صاحبها ولا يكشف سجلًّا.
--
-- والمقارنة تتجاهل حالة الحروف والفراغ، فمن نسخ الرقم بيده لا يُردّ لفارقٍ لا يراه.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.verify_certificate(p_serial text)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select jsonb_build_object(
       'found', true,
       'valid', c.status = 'valid',
       'serial', c.serial,
       'holder_name', c.holder_name,
       'position_title', c.position_title,
       'period_from', c.period_from,
       'period_to', c.period_to,
       'issued_on', c.created_at::date,
       'revoked_on', c.revoked_at::date
     )
     from experience_certificates c
     where upper(btrim(c.serial)) = upper(btrim(p_serial))),
    jsonb_build_object('found', false)
  );
$$;

comment on function public.verify_certificate(text) is
  'الباب العلنيّ للتحقّق من شهادة خبرة — بالرقم كاملًا وحده، ويُجيب بما على الورقة لا أكثر.';

grant execute on function public.verify_certificate(text) to anon, authenticated;
