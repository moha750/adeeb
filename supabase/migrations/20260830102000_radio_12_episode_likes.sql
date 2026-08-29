-- ══════════════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب م١٢: الإعجابُ يُربَط بحساب
--
-- ⚠️ مكتوبٌ ينتظر إذنَ المالك. لا يُنفَّذ إلّا بكلمته.
--
-- ## لماذا
-- الإعجابُ اليومَ عدّادٌ عامٌّ على الحلقة يرفعه أيُّ أحد، وذاكرتُه في متصفّح
-- الضاغط. ورفضته لجنةُ الجرد **بالإجماع** (٠ من ٣): رقمٌ بلا هويّةٍ يفسده
-- أوّلُ عابثٍ ولا يُكتشَف، ثمّ يُبنى عليه قرار.
--
-- ## والقائمُ يُحذَف لا يُحفَظ (قرارُ المالك ٢٠٢٦-٠٨-٣٠)
-- «إذا كانت الإعجابات بلا هويّة أحذفها لأننا نريد أن نبني على نظيف.»
-- فالعدّادُ يُصفَّر ولا يُنقَل إلى عمودٍ جانبيّ: رقمٌ لا يُعرَف من صنعه ليس
-- بيانًا يُحفَظ، وحفظُه في زاويةٍ يُبقيه ليُجمَع يومًا بلا أن يُعرَف أصلُه.
-- والمحذوفُ ستّةَ عشرَ إعجابًا (قِيست ٢٠٢٦-٠٨-٣٠).
--
-- ⚠️ **ويُشحَن مع الكود** (صُحّح ٢٠٢٦-٠٨-٣٠ بعد مراجعة): محوُ الأرقام لا
--    يدوم ما دام الكاتبُ القديمُ مفتوحًا للمجهول. فبين تطبيقِ هذا ونزولِ الكود
--    ضغطةُ مجهولٍ واحدةٌ ترفع `likes` فوق عدد الصفوف، ولا يُصحَّح إلّا إن أعجب
--    صاحبُ حسابٍ بتلك الحلقة بعينها.
--
-- ## والدالّةُ القديمةُ تبقى حيّةً في هذا الملفّ
-- `bump_episode_like` ينادُيها `LikeEpisode.tsx:54` بنصٍّ (`sb.rpc("...")`)،
-- ولا يمسك سقوطَها `tsc` ولا CI ولا حارسٌ من حرّاسنا: يموت الزرُّ على الإنتاج
-- صامتًا. فإعدامُها **ترحيلٌ باسمه بعد نزول الكود الجديد** (أقرّه المالك)،
-- وههنا تبقى تعمل كما هي.
-- ══════════════════════════════════════════════════════════════════════════════

begin;

/* ══ ١) الجدول ═══════════════════════════════════════════════════════════════ */
create table if not exists public.radio_episode_likes (
  user_id    uuid not null references auth.users(id)            on delete cascade,
  episode_id uuid not null references public.radio_episodes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create index if not exists radio_episode_likes_episode_idx
  on public.radio_episode_likes (episode_id);

comment on table public.radio_episode_likes is
  'من أُعجب بأيّ حلقة. اشتراكٌ حيٌّ يتبع auth.users، والعدّادُ على radio_episodes مشتقٌّ منه لا مصدرٌ له.';

/* ══ ٢) العدّادُ يُحسَب من الجدول ═════════════════════════════════════════════
   ويبقى على `radio_episodes.likes` كي تقرأه القراءاتُ العامّة بلا انضمام.
   وحسبةٌ كاملةٌ لا زيادةٌ بواحد: الزيادةُ تنجو من السباق مرّةً وتخطئ مرّة،
   والحسبةُ صادقةٌ دائمًا وثمنُها لا شيءَ عند هذه الأحجام. */
create or replace function public.radio_recount_likes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ep uuid := coalesce(new.episode_id, old.episode_id);
begin
  update public.radio_episodes e
     set likes = (select count(*) from public.radio_episode_likes l where l.episode_id = v_ep)
   where e.id = v_ep;
  return null;
end;
$$;

drop trigger if exists radio_episode_likes_recount on public.radio_episode_likes;
create trigger radio_episode_likes_recount
  after insert or delete on public.radio_episode_likes
  for each row execute function public.radio_recount_likes();

/* ══ ٣) الحراسة ═══════════════════════════════════════════════════════════════
   **والمنحُ بالعمود**: لو مُنح الإدراجُ على الجدول كلِّه لكتب المتصفّحُ
   `created_at` بيده. وهو ههنا أقلُّ ضررًا منه في المتابعة، لكنّ القاعدةَ واحدة. */
alter table public.radio_episode_likes enable row level security;

drop policy if exists radio_episode_likes_own_read on public.radio_episode_likes;
create policy radio_episode_likes_own_read
  on public.radio_episode_likes for select
  using ((select auth.uid()) = user_id);

drop policy if exists radio_episode_likes_own_insert on public.radio_episode_likes;
create policy radio_episode_likes_own_insert
  on public.radio_episode_likes for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists radio_episode_likes_own_delete on public.radio_episode_likes;
create policy radio_episode_likes_own_delete
  on public.radio_episode_likes for delete
  using ((select auth.uid()) = user_id);

revoke all on public.radio_episode_likes from anon, authenticated;
grant select                          on public.radio_episode_likes to authenticated;
grant insert (user_id, episode_id)    on public.radio_episode_likes to authenticated;
grant delete                          on public.radio_episode_likes to authenticated;

/* ══ ٤) بابُ الكتابة القديم يُغلَق دون أن يُهدَم ══════════════════════════════
   الإعدامُ مؤجَّلٌ بأمر المالك إلى ما بعد نزول الكود، لكنّ **إبقاءَ المنح**
   يعني أنّ المحوَ أدناه لا يدوم: `bump_episode_like` ممنوحةٌ اليومَ لـ`anon`
   و`authenticated`، وتكتب على العمود نفسِه الذي صار المُشغِّلُ يملكه.

   فيُنزَع المنحُ وتبقى الدالّةُ قائمةً لـ`service_role`: الزرُّ القديمُ يردّ
   خطأً بدل أن يفسد الرقم — **والخطأُ أهونُ من رقمٍ كاذبٍ لا يُكتشَف**. */
revoke execute on function public.bump_episode_like(uuid, boolean) from anon, authenticated;

/* ══ ٥) الأرقامُ المجهولةُ تُمحى ══════════════════════════════════════════════
   بأمر المالك: «إذا كانت الإعجابات بلا هوية أحذفها لأننا نريد أن نبني على
   نظيف». ولا تُنقَل إلى عمودٍ جانبيّ: رقمٌ لا يُعرَف من صنعه ليس بيانًا يُحفَظ. */
update public.radio_episodes set likes = 0 where likes <> 0;

commit;
