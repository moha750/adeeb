-- ══════════════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب م١٥: عدّادا البرنامج المشتقّان
--
-- ⚠️ مكتوبٌ ينتظر إذنَ المالك. لا يُنفَّذ إلّا بكلمته.
-- ⚠️ **ويُشحَن مع الكود**: بلا تعديل `getPublicShows` في `radio/data.ts` تبقى
--    المخاطرةُ كاملةً والمكسبُ صفرًا.
--
-- ## العطلُ الذي يعالجه
-- ‏`/radio` اليومَ **يمسح جدولَ الحلقات كلَّه** ليعدّ حلقات كلّ برنامجٍ في
-- جافاسكربت (`sb.from("radio_episodes").select("show_id")` ثمّ `Map`). وعند
-- ثلاث حلقاتٍ لا يُحَسّ، وعند تسعة آلافٍ مسحٌ كاملٌ في كلّ فتحةِ صفحة.
-- وهذا صنفُ عطلٍ لا يظهر في التطوير: يبقى صحيحًا تمامًا حتّى يبلغ الجدولُ
-- حجمًا، ثمّ يسقط دفعةً بلا إنذار.
--
-- ## وشرطُ «منشورة» يُنقَل من سياسة القراءة نفسِها
-- ‏`status = 'published'` وحدَه. ولمَ لا `publish_at <= now()` معه؟ لأنّ
-- `sweep_radio_schedule` (كلَّ دقيقة) يقلب المجدولةَ إلى منشورةٍ **ويُفرِغ**
-- `publish_at`، فلا تصير حلقةٌ مرئيّةً إلّا بتعديلٍ يُشغِّل المُشغِّل. وقِيس
-- على الإنتاج (٢٠٢٦-٠٨-٣٠): صفرُ صفوفٍ منشورةٍ بموعدٍ منتظر.
--
-- ولو أُدخل `now()` في الحسبة لصار العدّادُ يهرم بمرور الوقت بلا تعديل، وهو
-- ما لا يصلحه مُشغِّل.
-- ══════════════════════════════════════════════════════════════════════════════

begin;

alter table public.radio_shows
  add column if not exists episodes_count   integer     not null default 0,
  add column if not exists last_episode_at  timestamptz;

comment on column public.radio_shows.episodes_count is
  'عددُ الحلقات المنشورة، يحفظه مُشغِّل. خلَفُ مسحِ جدول الحلقات كلِّه في getPublicShows.';
comment on column public.radio_shows.last_episode_at is
  'موعدُ أحدثِ حلقةٍ منشورة. عليه يُرتَّب فهرسُ البرامج بدل عمود order الذي يُسحَب بيد.';

create or replace function public.radio_recount_show_episodes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shows uuid[];
  v_show  uuid;
begin
  /* البرنامجان معًا: حلقةٌ تُنقَل من برنامجٍ إلى آخر تُنقص هذا وتزيد ذاك. */
  v_shows := array_remove(array[new.show_id, old.show_id], null);
  foreach v_show in array v_shows loop
    update public.radio_shows s
       set episodes_count = (
             select count(*) from public.radio_episodes e
              where e.show_id = v_show and e.status = 'published'
           ),
           last_episode_at = (
             select max(coalesce(e.published_at, e.created_at)) from public.radio_episodes e
              where e.show_id = v_show and e.status = 'published'
           )
     where s.id = v_show;
  end loop;
  return null;
end;
$$;

drop trigger if exists radio_episodes_recount_show on public.radio_episodes;
/* الشرطُ يمنع نداءً بلا سبب: تعديلُ عنوانٍ أو تفريغٍ لا يمسّ العدّاد. */
create trigger radio_episodes_recount_show
  after insert or delete on public.radio_episodes
  for each row execute function public.radio_recount_show_episodes();

drop trigger if exists radio_episodes_recount_show_upd on public.radio_episodes;
create trigger radio_episodes_recount_show_upd
  after update of status, show_id, published_at on public.radio_episodes
  for each row execute function public.radio_recount_show_episodes();

/* ══ ملءُ القائم ══════════════════════════════════════════════════════════════ */
update public.radio_shows s
   set episodes_count = coalesce(x.n, 0),
       last_episode_at = x.last_at
  from (
    select sh.id,
           count(e.id) filter (where e.status = 'published') as n,
           max(coalesce(e.published_at, e.created_at)) filter (where e.status = 'published') as last_at
      from public.radio_shows sh
      left join public.radio_episodes e on e.show_id = sh.id
     group by sh.id
  ) x
 where s.id = x.id;

commit;
