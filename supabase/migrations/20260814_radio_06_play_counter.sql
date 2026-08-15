-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: عدّادُ الاستماع يعدّ فعلًا
--
-- كان `plays` عمودًا صفرًا أبدًا: لا شيء يزيده ولا شيء يعرضه. وههنا يُوصَل.
--
-- **ويُحتسَب بعد نصف دقيقةِ سماعٍ حقيقيّ**، لا عند فتح الصفحة ولا عند ضغط
-- التشغيل: مقدّمةُ البرنامج عشرُ ثوانٍ، فمن بلغ الثلاثين سمع كلامًا لا
-- افتتاحيّة. ولو حُسب الفتحُ لصار العدّادُ يمدح كذبًا ويُبنى عليه قرارٌ باطل.
--
-- **ولكلّ استماعةٍ تبدأ عدّةٌ** (قرار المالك ٢٠٢٦-٠٨-١٤): من عاد وشغّلها ثانيةً
-- فقد سمعها مرّتين حقًّا. والإيقافُ والاستئنافُ في الجلسة نفسها ليسا بدايةً
-- جديدة، فلا يُحتسبان مرّتين.
--
-- **وعمودٌ ثانٍ للمجرّدة**: الإذاعةُ تُروَّج بأنّها تعطي ما لا تعطيه المنصّات،
-- فهذا الرقمُ وحدَه يقول أتُستعمَل الميزةُ أم بُنيت لأنفسنا. ويُنسَب للنسخة
-- العاملة **لحظةَ بلوغ الحدّ**، فمن بدّل بعدها لا يُعاد حسابُه.
-- ══════════════════════════════════════════════════════════════════════

alter table public.radio_episodes
  add column plays_plain integer not null default 0;

comment on column public.radio_episodes.plays is
  'عددُ الاستماعات: تُزاد واحدةً بعد نصف دقيقةِ سماعٍ حقيقيّ، لكلّ استماعةٍ تبدأ.';
comment on column public.radio_episodes.plays_plain is
  'كم من تلك الاستماعات كان بالنسخة المجرّدة لحظةَ بلوغ الحدّ.';

alter table public.radio_episodes
  add constraint radio_episodes_plays_plain_check check (plays_plain >= 0);

/**
 * البلاغُ من متصفّح الزائر، والزائرُ لا حسابَ له.
 *
 * **ولا يُفتَح للعموم عمودُ العدّاد نفسُه**: لو سُمح بالتحديث المباشر لأمكن
 * ضبطُه على أيّ رقم. فالبابُ دالّةٌ **تزيد واحدًا ولا تقبل مقدارًا**، ولا تمسّ
 * إلّا حلقةً منشورةً في برنامجٍ منشور.
 *
 * ويبقى العبثُ الآليّ ممكنًا لمن قصده (الموقع مفتوح)، وهذا مقبولٌ لعدّادٍ
 * داخليٍّ يُسترشَد به، وغيرُ مقبولٍ لو بُني عليه قرارٌ ماليّ أو أُعلن رقمًا رسميًّا.
 */
create or replace function public.bump_episode_play(p_episode uuid, p_plain boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  update public.radio_episodes e
  set plays = e.plays + 1,
      plays_plain = e.plays_plain + case when p_plain then 1 else 0 end
  where e.id = p_episode
    and e.status = 'published'
    and exists (select 1 from public.radio_shows s where s.id = e.show_id and s.status = 'published');
$$;

revoke all on function public.bump_episode_play(uuid, boolean) from public;
grant execute on function public.bump_episode_play(uuid, boolean) to anon, authenticated;
