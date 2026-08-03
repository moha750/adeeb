-- ═══════════════════════════════════════════════════════════════════════════
-- شهادة الخبرة — م١: المرايا التي تقرؤها الغرفة
--
-- الترشيح في القاعدة لا في الواجهة: كلُّ مرآةٍ تسأل الحَكَم عن كلّ صفّ، فما يصل الشاشةَ
-- هو ما يبلغه صاحبُها لا أكثر. (نسق `warnings_for_reader` نفسه.)
-- ═══════════════════════════════════════════════════════════════════════════

-- السجلّ كما يراه القارئ — شهاداتُه هو، وشهاداتُ من يبلغهم إن كان مُصدِرًا
create or replace function public.certificates_for_reader(p_actor uuid)
returns table (
  id uuid,
  user_id uuid,
  member_name text,
  member_avatar text,
  member_gender text,
  member_status text,
  member_phone text,
  serial text,
  holder_name text,
  position_title text,
  period_from date,
  period_to date,
  status text,
  created_at timestamptz,
  issuer_name text,
  revoked_at timestamptz,
  revoke_reason text,
  revoker_name text,
  may_manage boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    c.id, c.user_id,
    m.full_name, m.avatar_url, m.gender, m.account_status, m.phone,
    c.serial, c.holder_name, c.position_title, c.period_from, c.period_to,
    c.status, c.created_at,
    iss.full_name, c.revoked_at, c.revoke_reason, rev.full_name,
    can_issue_certificate(p_actor, c.user_id)
  from experience_certificates c
  join profiles m on m.id = c.user_id
  left join profiles iss on iss.id = c.issued_by
  left join profiles rev on rev.id = c.revoked_by
  where can_view_certificate_of(p_actor, c.user_id)
  order by c.created_at desc;
$$;

-- بِركةُ الاختيار في نافذة الإصدار: من يبلغهم المُصدِر، ومعهم ما تحتاجه الورقة
-- (الاسمُ الذي سيُرسَم، والمسمّى، وتاريخ الانضمام) — فلا تركّب الواجهة اللقطة بيدها.
create or replace function public.certificate_targets(p_actor uuid)
returns table (
  user_id uuid,
  name text,
  suggested_name text,
  avatar text,
  gender text,
  phone text,
  account_status text,
  position_title text,
  joined_date date,
  issued_count integer
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.full_name,
    -- الاسم المقترَح: الثلاثيّ إن وُجد وإلّا المسجَّل (قرار المالك)، وللمُصدِر تصحيحُه
    coalesce(nullif(btrim(md.full_name_triple), ''), btrim(p.full_name)),
    p.avatar_url,
    p.gender,
    p.phone,
    p.account_status,
    position_title_of(p.id),
    p.joined_date,
    (select count(*)::int from experience_certificates c where c.user_id = p.id and c.status = 'valid')
  from profiles p
  left join member_details md on md.user_id = p.id
  where can_issue_certificate(p_actor, p.id)
    and p.account_status <> 'pending_onboarding'   -- من لم يُكمل بياناته ليس له خبرةٌ تُشهَد بعد
  order by p.full_name;
$$;

revoke all on function public.certificates_for_reader(uuid) from public, anon;
revoke all on function public.certificate_targets(uuid) from public, anon;
grant execute on function public.certificates_for_reader(uuid) to authenticated;
grant execute on function public.certificate_targets(uuid) to authenticated;
