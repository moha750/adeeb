-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: عدّادُ المستمعين إلى جانب الاستماعات
--
-- الرقمان يجيبان سؤالين: **«كم مرّةً سُمعت»** و**«كم إنسانًا وصلها»**. والفرقُ
-- بينهما هو الفائدة: ١٢ من ١٠ يعني لا أحد يعيد، و٣٠ من ١٠ يعني **يعيدونها**،
-- وتلك أقوى إشارةِ جودةٍ تصل صاحبَ البرنامج.
--
-- ويُميَّز المستمعُ **بعلامةٍ تُولَّد في متصفّحه** (لا حسابَ ولا بريد): الأولى
-- تُحتسَب والباقيةُ لا. وهي العلامةُ نفسُها التي بُنيت للإعجاب، فالكلفةُ صفر.
--
-- **ولا تُحفَظ العلامةُ عندنا نصًّا**: تُخزَّن بصمتُها (`sha256`) فقط. والغرضُ
-- عدُّ المختلفين لا معرفةُ من هم، فلا نحتفظ بما لا نحتاجه.
-- ══════════════════════════════════════════════════════════════════════

alter table public.radio_episodes
  add column listeners integer not null default 0;

comment on column public.radio_episodes.listeners is
  'عددُ الأجهزة المختلفة التي سمعت الحلقة. الاستماعاتُ في plays، والفرقُ بينهما يقول أيُعيدونها.';

alter table public.radio_episodes
  add constraint radio_episodes_listeners_check check (listeners >= 0);

-- صفٌّ لكلّ (حلقة، بصمة) مرّةً واحدة. والمفتاحُ المركّب هو الحارس: لا يُعَدّ
-- الجهازُ مرّتين ولو بلّغ ألفًا.
create table if not exists public.radio_episode_listeners (
  episode_id uuid not null references public.radio_episodes(id) on delete cascade,
  device_hash text not null,
  first_at timestamptz not null default now(),
  primary key (episode_id, device_hash)
);

alter table public.radio_episode_listeners enable row level security;
-- لا أحدَ يقرؤها ولا يكتبها مباشرةً: البابُ الدالّةُ وحدها.
comment on table public.radio_episode_listeners is
  'بصماتُ الأجهزة التي سمعت كلّ حلقة — لعدّ المختلفين لا لمعرفتهم. لا تُقرأ إلّا بالتجميع.';

/**
 * البلاغُ الموحّد: يزيد الاستماعةَ **دائمًا**، ويزيد المستمعَ **أوّلَ مرّةٍ فقط**.
 *
 * فالاستماعاتُ تعدّ كلَّ مرّةٍ تبدأ (قرار المالك)، والمستمعون يعدّون الأجهزةَ
 * المختلفة. ودالّةٌ واحدةٌ لهما كي لا يفترق الرقمان بنداءٍ ينجح وآخرَ يفشل.
 */
create or replace function public.bump_episode_play(
  p_episode uuid,
  p_plain boolean default false,
  p_device text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_ok boolean;
begin
  update public.radio_episodes e
  set plays = e.plays + 1,
      plays_plain = e.plays_plain + case when p_plain then 1 else 0 end
  where e.id = p_episode
    and e.status = 'published'
    and exists (select 1 from public.radio_shows s where s.id = e.show_id and s.status = 'published');

  get diagnostics v_ok = row_count;
  if v_ok = 0 or p_device is null or length(p_device) < 8 then return; end if;

  -- العلامةُ تُبصَم ولا تُحفَظ نصًّا: نعدّ المختلفين ولا نعرف من هم.
  insert into public.radio_episode_listeners (episode_id, device_hash)
  values (p_episode, encode(sha256(p_device::bytea), 'hex'))
  on conflict do nothing;

  if found then
    update public.radio_episodes set listeners = listeners + 1 where id = p_episode;
  end if;
end;
$$;

revoke all on function public.bump_episode_play(uuid, boolean, text) from public;
grant execute on function public.bump_episode_play(uuid, boolean, text) to anon, authenticated;

-- تُسقَط النسخةُ القديمة ذاتُ الوسيطين كي لا يبقى بابان لفعلٍ واحد.
drop function if exists public.bump_episode_play(uuid, boolean);
