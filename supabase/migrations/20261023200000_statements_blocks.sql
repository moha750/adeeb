-- البيانات: متنٌ من كتل وعنوانٌ أطول (٢٠٢٦-١٠-٢٣، ملاحظات محمد بعد المعاينة)
--  · العنوانُ قد يطول فيلتفّ إلى ثلاثة أسطر: حدُّه ١٢٠ حرفًا بدل ٦٠.
--  · المتنُ فقراتٌ وبنودٌ مرقّمة تُرقَّم تلقائيًّا («أولًا:»…): تُحفظ كتلًا (`blocks`) يُعاد الرسمُ منها،
--    و`body` نصُّها مقروءًا (البنودُ بأرقامها) للسجلّ والبحث.
begin;

alter table public.statements drop constraint statements_title_check;
alter table public.statements add constraint statements_title_check check (char_length(btrim(title)) between 2 and 120);
alter table public.statements add column blocks jsonb not null default '[]'::jsonb;
comment on column public.statements.blocks is 'المتنُ كتلًا [{kind: p|item, text}] — منه يُعاد رسمُ البيان؛ و`body` نصُّه مقروءًا.';

drop function public.issue_statement(uuid, text, text, text, jsonb, integer);

create or replace function public.issue_statement(
  p_actor uuid, p_title text, p_body text, p_blocks jsonb, p_signers text, p_signer_names jsonb, p_pages integer
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_year integer := extract(year from (now() at time zone 'Asia/Riyadh'))::integer;
  v_seq  integer;
  v_id   bigint;
begin
  if not exists (select 1 from get_user_permissions(p_actor) g where g.permission_key = 'issue_statements') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'إصدارُ البيانات للرئيسين وحدهما.');
  end if;
  p_title := btrim(coalesce(p_title, ''));
  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_title) < 2 or char_length(p_title) > 120 then
    return jsonb_build_object('ok', false, 'code', 'TITLE', 'message', 'العنوان بين حرفين ومئةٍ وعشرين حرفًا.');
  end if;
  if char_length(p_body) < 2 or char_length(p_body) > 8000 then
    return jsonb_build_object('ok', false, 'code', 'BODY', 'message', 'المتن فارغ أو أطول ممّا يُكتب في بيان.');
  end if;
  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) = 0 then
    return jsonb_build_object('ok', false, 'code', 'BODY', 'message', 'المتن فارغ.');
  end if;
  if p_signers not in ('president', 'ceo', 'both') then
    return jsonb_build_object('ok', false, 'code', 'SIGNERS', 'message', 'اختر من يوقّع البيان.');
  end if;

  perform pg_advisory_xact_lock(hashtext('statements.seq'), v_year);
  select coalesce(max(s.seq), 0) + 1 into v_seq from statements s where s.year = v_year;

  insert into statements (year, seq, title, body, blocks, signers, signer_names, pages, issued_by)
  values (v_year, v_seq, p_title, p_body, p_blocks, p_signers, coalesce(p_signer_names, '{}'::jsonb),
          greatest(1, least(20, coalesce(p_pages, 1))), p_actor)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'year', v_year, 'seq', v_seq);
end;
$function$;

revoke all on function public.issue_statement(uuid, text, text, jsonb, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.issue_statement(uuid, text, text, jsonb, text, jsonb, integer) to service_role;

commit;
