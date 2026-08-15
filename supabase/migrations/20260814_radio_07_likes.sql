-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: إعجابُ الحلقة
--
-- **بلا حساب**: جمهورُ الإذاعة أكثرُه غيرُ أعضاء، واشتراطُ الحساب على زرِّ
-- إعجابٍ يعني صفرَ إعجابات. والذاكرةُ في متصفّح الزائر: يُعجَب مرّةً ويُلغى
-- بضغطةٍ ثانية.
--
-- والصدقُ فيه كالصدق في العدّاد: **تقريبيّ**. من مسح متصفّحَه أعجب ثانيةً، ومن
-- قصد العبثَ آليًّا بلغه. رقمٌ يُسترشَد به لا يُبنى عليه قرار.
--
-- والدالّةُ **تقبل زائدَ واحدٍ أو ناقصَ واحد لا غير**، ولا تنزل بالعدّاد تحت
-- الصفر، ولا تمسّ إلّا حلقةً منشورةً في برنامجٍ منشور.
-- ══════════════════════════════════════════════════════════════════════

alter table public.radio_episodes
  add column likes integer not null default 0;

comment on column public.radio_episodes.likes is
  'إعجاباتُ الحلقة. بلا حساب، والذاكرةُ في متصفّح الزائر، فالرقمُ تقريبيٌّ يُسترشَد به.';

alter table public.radio_episodes
  add constraint radio_episodes_likes_check check (likes >= 0);

create or replace function public.bump_episode_like(p_episode uuid, p_up boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_likes integer;
begin
  update public.radio_episodes e
  set likes = greatest(0, e.likes + case when p_up then 1 else -1 end)
  where e.id = p_episode
    and e.status = 'published'
    and exists (select 1 from public.radio_shows s where s.id = e.show_id and s.status = 'published')
  returning e.likes into v_likes;

  -- يردّ العددَ بعد التغيير، فيعرض الزرُّ الحقيقةَ لا تخمينَه.
  return coalesce(v_likes, 0);
end;
$$;

revoke all on function public.bump_episode_like(uuid, boolean) from public;
grant execute on function public.bump_episode_like(uuid, boolean) to anon, authenticated;
