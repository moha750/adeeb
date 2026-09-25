-- «دربك خضر»: اسمُ اللعبة الجديد بدل «ركضة وطن» (قرارُ المالك ٢٠٢٦-٠٩-٢٥، قبل الإطلاق).
-- «أحبّ الشغل النظيف»: فلا يبقى الاسمُ القديم في الجداول ولا الدوالّ ولا القيود ولا الفهارس ولا رسائل الخطأ.
-- إعادةُ تسميةٍ لا غير: البياناتُ والامتيازاتُ (postgres وservice_role وحدهما) وRLS بلا سياسة كما هي،
-- فـ`alter ... rename` يُبقي الملكيّةَ والامتيازات، و`create or replace` يُبقيها للدالّة القائمة.
-- والترحيلاتُ السابقة سجلٌّ لما جرى بأسمائها يومَها، فلا تُعدَّل.

-- ١) الجداول
alter table public.watan_players rename to darb_players;
alter table public.watan_runs    rename to darb_runs;
alter table public.watan_contest rename to darb_contest;

-- ٢) القيود (قيدُ المفتاح والتفرّد يحمل فهرسَه معه في إعادة التسمية)
alter table public.darb_contest rename constraint watan_contest_check to darb_contest_check;
alter table public.darb_contest rename constraint watan_contest_id_check to darb_contest_id_check;
alter table public.darb_contest rename constraint watan_contest_pkey to darb_contest_pkey;
alter table public.darb_players rename constraint watan_players_best_dist_check to darb_players_best_dist_check;
alter table public.darb_players rename constraint watan_players_candy_total_check to darb_players_candy_total_check;
alter table public.darb_players rename constraint watan_players_nickname_check to darb_players_nickname_check;
alter table public.darb_players rename constraint watan_players_nickname_key_check to darb_players_nickname_key_check;
alter table public.darb_players rename constraint watan_players_nickname_key_key to darb_players_nickname_key_key;
alter table public.darb_players rename constraint watan_players_pkey to darb_players_pkey;
alter table public.darb_players rename constraint watan_players_runs_check to darb_players_runs_check;
alter table public.darb_players rename constraint watan_players_token_hash_check to darb_players_token_hash_check;
alter table public.darb_players rename constraint watan_players_token_hash_key to darb_players_token_hash_key;
alter table public.darb_players rename constraint watan_players_user_id_fkey to darb_players_user_id_fkey;
alter table public.darb_players rename constraint watan_players_user_id_key to darb_players_user_id_key;
alter table public.darb_runs rename constraint watan_runs_candies_check to darb_runs_candies_check;
alter table public.darb_runs rename constraint watan_runs_dist_check to darb_runs_dist_check;
alter table public.darb_runs rename constraint watan_runs_flag_check to darb_runs_flag_check;
alter table public.darb_runs rename constraint watan_runs_pkey to darb_runs_pkey;
alter table public.darb_runs rename constraint watan_runs_player_id_fkey to darb_runs_player_id_fkey;
alter table public.darb_runs rename constraint watan_runs_seed_check to darb_runs_seed_check;
alter table public.darb_runs rename constraint watan_runs_status_check to darb_runs_status_check;
alter table public.darb_runs rename constraint watan_runs_ticks_check to darb_runs_ticks_check;

-- ٣) الفهارس التي لا قيدَ وراءها
alter index public.watan_board_candy_idx rename to darb_board_candy_idx;
alter index public.watan_board_dist_idx rename to darb_board_dist_idx;
alter index public.watan_runs_flag_idx rename to darb_runs_flag_idx;
alter index public.watan_runs_player_idx rename to darb_runs_player_idx;

-- ٤) الوصف
comment on table public.darb_players is 'دربك خضر — لاعبٌ باسمٍ مستعار وبصمةِ رمزِ جهازه، أو بحسابه في أدِيب.';
comment on table public.darb_runs is 'دربك خضر — جولةٌ من تذكرتها إلى نهايتها. النتيجةُ ما حسبه الخادمُ بإعادتها.';

-- ٥) الدوالّ: الاسمُ أوّلًا (يُبقي الامتيازات)، ثمّ الجسمُ بأسماء الجداول ورسائل الخطأ الجديدة
alter function public.watan_approve_run(p_run uuid) rename to darb_approve_run;
alter function public.watan_board(p_kind text, p_limit integer) rename to darb_board;
alter function public.watan_contest_window() rename to darb_contest_window;
alter function public.watan_finish_run(p_token_hash text, p_user uuid, p_run uuid, p_ticks integer, p_dist integer, p_candies integer, p_input text, p_flag text) rename to darb_finish_run;
alter function public.watan_me(p_token_hash text, p_user uuid) rename to darb_me;
alter function public.watan_pid(p_token_hash text, p_user uuid) rename to darb_pid;
alter function public.watan_register(p_token_hash text, p_user uuid, p_nickname text, p_key text) rename to darb_register;
alter function public.watan_run_ticket(p_token_hash text, p_user uuid, p_run uuid) rename to darb_run_ticket;
alter function public.watan_start_run(p_token_hash text, p_user uuid, p_seed bigint, p_core text) rename to darb_start_run;

-- الأجسامُ تُعاد من تعريفها الحيّ نفسِه باستبدال الاسم وحدَه، فلا يُنسخ منطقُها بيدٍ فيزلّ حرف.
-- و`create or replace` على الدالّة القائمة (بعد تسميتها) يُبقي مالكَها وامتيازاتِها وإعداداتِها.
do $$
declare r record;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'darb\_%'
  loop
    execute replace(pg_get_functiondef(r.oid), 'watan_', 'darb_');
  end loop;
end $$;

-- ٦) الفحص: لا يبقى أثر، وإلّا أُلغي الترحيلُ كلُّه
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relname like 'watan%') then
    raise exception 'بقيت علاقةٌ بالاسم القديم';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and (p.proname like 'watan%' or p.prosrc like '%watan%')) then
    raise exception 'بقيت دالّةٌ بالاسم القديم';
  end if;
  if exists (select 1 from pg_constraint where conname like 'watan%') then
    raise exception 'بقي قيدٌ بالاسم القديم';
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like 'darb\_%') <> 9 then
    raise exception 'الدوالُّ ليست تسعًا';
  end if;
end $$;
