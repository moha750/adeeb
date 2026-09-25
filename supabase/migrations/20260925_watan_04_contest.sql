-- «ركضة وطن» — مسابقةُ أكواب oos: نافذةٌ زمنيّةٌ لا يُحسَب خارجها شيء
--
-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-٠٩-٢٥ عصرًا (باسم `watan_04_contest`)، وبعده صُفّرت نتائجُ التجربة بكلمة
-- المالك. قرارُ المالك ٢٠٢٦-٠٩-٢٥: جاء راعٍ (مقهى oos)، والكوبُ مكانَ
-- المصّاص، والجوائزُ لأكثر ثلاثةٍ يجمعون الأكواب (٣٠ و٢٠ و١٠ ريالات رصيدًا في محفظة oos)،
-- و«ستبدأ المسابقة عصر يوم الجمعة الساعة ٣ عصرًا وتنتهي يوم الأحد الساعة ٦ مساءً»، ثمّ في اليوم نفسه
-- «سيتم تأجيل افتتاح المسابقة إلى الساعة ٦ مساء» — فالنافذةُ من الجمعة ٦ م إلى الأحد ٦ م.
--
-- ## النافذةُ في القاعدة لا في الجهاز
-- صفٌّ واحدٌ في `watan_contest`، و`watan_finish_run` يسأله عند كلّ جولة: ما بدأت تذكرتُه قبل
-- الافتتاح، أو انتهى بعد الإقفال، يُحفَظ بعلامة `out` **ولا يُضاف إلى اللوحة**. فالحكمُ بساعة
-- الخادم، واللعبةُ تعرض النافذةَ وحدَها. واللعبُ لا يُمنع خارجها: من جاء قبل الافتتاح يتدرّب.
--
-- ## واللوحةُ من الافتتاح
-- وما سبق الافتتاحَ من نتائج التجربة يُصفَّر مرّةً بأمرٍ منفصلٍ عن هذا الترحيل، بكلمة المالك
-- (الأسماءُ باقيةٌ ورموزُها، والنتائجُ وحدَها تُمحى). والنافذةُ نفسُها تضمن ألّا يُضاف بعده
-- شيءٌ قبل الافتتاح.
--
-- ## وتعديلُ الموعد
--   update public.watan_contest set ends_at = '2026-09-27 18:00+03' where id = 1;

begin;

create table if not exists public.watan_contest (
  id         smallint primary key default 1 check (id = 1),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  check (ends_at > starts_at)
);
alter table public.watan_contest enable row level security;
revoke all on table public.watan_contest from public, anon, authenticated;

insert into public.watan_contest (id, starts_at, ends_at)
values (1, '2026-09-25 18:00:00+03', '2026-09-27 18:00:00+03')
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at;

-- علامةٌ جديدة: `out` جولةٌ خارج النافذة، محفوظةٌ غيرُ محسوبة
alter table public.watan_runs drop constraint if exists watan_runs_flag_check;
alter table public.watan_runs add constraint watan_runs_flag_check
  check (flag in ('cap', 'cap_ok', 'mismatch', 'fast', 'expired', 'out'));

-- النافذةُ للعرض: اللعبةُ ولوحةُ الصدارة تقولان متى تبدأ ومتى تنتهي
create or replace function public.watan_contest_window()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('startsAt', starts_at, 'endsAt', ends_at) from watan_contest where id = 1;
$$;

create or replace function public.watan_finish_run(
  p_token_hash text, p_user uuid, p_run uuid, p_ticks integer, p_dist integer,
  p_candies integer, p_input text, p_flag text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player uuid; v_issued timestamptz; v_status text;
  v_counted boolean; v_best integer; v_total integer;
  v_start timestamptz; v_end timestamptz;
begin
  v_player := watan_pid(p_token_hash, p_user);
  select r.issued_at, r.status into v_issued, v_status
    from watan_runs r
   where r.id = p_run and r.player_id = v_player
     for update;
  if v_issued is null then return jsonb_build_object('status', 'missing'); end if;
  if v_status <> 'open' then return jsonb_build_object('status', 'closed'); end if;

  if now() - v_issued > interval '3 hours' then
    update watan_runs set status = 'void', flag = 'expired', ended_at = now() where id = p_run;
    return jsonb_build_object('status', 'expired');
  end if;

  if extract(epoch from (now() - v_issued)) * 1.02 + 2 < p_ticks / 60.0 then
    update watan_runs
       set status = 'void', flag = 'fast', ended_at = now(),
           ticks = p_ticks, dist = p_dist, candies = p_candies, input = p_input
     where id = p_run;
    return jsonb_build_object('status', 'fast');
  end if;

  -- خارج النافذة: تُحفَظ ولا تُحسَب. بدأت قبل الافتتاح ← `before`، وانتهت بعد الإقفال ← `after`
  select c.starts_at, c.ends_at into v_start, v_end from watan_contest c where c.id = 1;
  if v_start is not null and (v_issued < v_start or now() > v_end) then
    update watan_runs
       set status = 'done', ended_at = now(), ticks = p_ticks, dist = p_dist,
           candies = p_candies, input = p_input, flag = 'out'
     where id = p_run;
    update watan_players set last_seen_at = now() where id = v_player
    returning best_dist, candy_total into v_best, v_total;
    return jsonb_build_object('status', 'ok', 'counted', false,
                              'window', case when now() > v_end then 'after' else 'before' end,
                              'best_dist', v_best, 'candy_total', v_total);
  end if;

  v_counted := p_flag is distinct from 'cap';
  update watan_runs
     set status = 'done', ended_at = now(), ticks = p_ticks, dist = p_dist,
         candies = p_candies, input = p_input, flag = p_flag
   where id = p_run;

  update watan_players
     set runs = runs + 1,
         best_at     = case when v_counted and p_dist > best_dist then now() else best_at end,
         best_dist   = case when v_counted then greatest(best_dist, p_dist) else best_dist end,
         candy_at    = case when v_counted and p_candies > 0 then now() else candy_at end,
         candy_total = case when v_counted then candy_total + p_candies else candy_total end,
         last_seen_at = now()
   where id = v_player
  returning best_dist, candy_total into v_best, v_total;

  return jsonb_build_object('status', 'ok', 'counted', v_counted,
                            'best_dist', v_best, 'candy_total', v_total);
end $$;

revoke execute on function
  public.watan_contest_window(),
  public.watan_finish_run(text, uuid, uuid, integer, integer, integer, text, text)
from public, anon, authenticated;

grant execute on function
  public.watan_contest_window(),
  public.watan_finish_run(text, uuid, uuid, integer, integer, integer, text, text)
to service_role;

commit;
