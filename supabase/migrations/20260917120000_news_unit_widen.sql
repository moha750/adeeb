-- ═══════════════════════════════════════════════════════════════════════════
-- جهةُ الخبر تتّسع: من «اللجنة» وحدها إلى الهيكلة كلِّها (٢٠٢٦-٠٩-١٧)
--
-- كان `news.committee_id` وحدَه يقول صاحبَ الخبر، فلا يُنسَب خبرٌ إلى قسمٍ ولا إلى
-- مجلس — وهما في الهيكلة فوق اللجنة لا خارجها. فطلب المالكُ توسيعَه.
--
-- **والنمطُ ليس جديدًا**: نظامُ الفعاليّات يحمل المعنى نفسَه بعمودين
-- (`organizing_committee_id` / `organizing_department_id`) وNULL تعني «النادي كلّه».
-- فهذا الترحيل يمدّ النمطَ نفسَه إلى الأخبار ويضيف المجلس، ويحرس **حصريّةَ القوس**
-- بقيدٍ صريح: عمودٌ واحدٌ يُضبَط لا اثنان، فلا يقع صفٌّ يقول إنّه لقسمٍ ولجنةٍ معًا.
--
-- ولا صفَّ يتبدّل: الخمسةَ عشرَ خبرًا القائمة كلُّها منسوبةٌ إلى لجانٍ، وعمودُها باقٍ
-- بمكانه واسمه — وإنّما يُضاف إليه أخوان فارغان.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.news
  add column if not exists department_id integer references public.departments(id) on delete set null,
  add column if not exists council_id    text    references public.councils(id)    on delete set null;

comment on column public.news.committee_id  is 'جهةُ الخبر إن كانت لجنةً أو إدارة — واحدٌ من الثلاثة على الأكثر (news_one_unit).';
comment on column public.news.department_id is 'جهةُ الخبر إن كانت قسمًا.';
comment on column public.news.council_id    is 'جهةُ الخبر إن كانت مجلسًا. والثلاثةُ فارغةً تعني: خبرُ النادي كلِّه.';

-- قوسٌ حصريّ: الخبرُ يُنسَب إلى جهةٍ واحدةٍ أو إلى لا جهة (النادي).
alter table public.news drop constraint if exists news_one_unit;
alter table public.news add constraint news_one_unit
  check (num_nonnulls(committee_id, department_id, council_id) <= 1);

-- فهرسا المفتاحين الجديدين — على سَنن ترحيل التحصين ٢٠٢٦-٠٨-١٦: كلُّ مفتاحٍ أجنبيٍّ
-- يُنخَل به تُفهرَس عمودُه، فلا يمسح الترشيحُ بالجهة الجدولَ كلَّه حين يكبر.
create index if not exists idx_news_department_id on public.news(department_id) where department_id is not null;
create index if not exists idx_news_council_id    on public.news(council_id)    where council_id    is not null;

-- ── دالّةُ الميلاد تقبل الجهةَ الثلاثيّة ────────────────────────────────────
-- تُسقَط أوّلًا ثمّ تُنشأ: زيادةُ معاملٍ تصنع **توقيعًا ثانيًا** لا تستبدل الأوّل،
-- فيبقى الأصلُ حيًّا ويصير النداءُ ملتبسًا بين نسختين.
drop function if exists public.news_create(uuid, text, integer, text);

create or replace function public.news_create(
  p_actor      uuid,
  p_title      text,
  p_committee  integer default null,
  p_category   text    default 'coverage',
  p_department integer default null,
  p_council    text    default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_id uuid;
begin
  if not can_open_newsroom(p_actor) then
    raise exception 'news_denied' using hint = 'لست من أهل غرفة التحرير.';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'news_title_required' using hint = 'عنوان الخبر مطلوب.';
  end if;

  -- يُولَد مسودّةً دائمًا؛ والمتن فارغٌ ينتظر كاتبه (والعمود NOT NULL فيُملأ بفراغ).
  -- والجهةُ تمرّ كما جاءت: قيدُ `news_one_unit` يردّ اجتماعَ اثنتين، والمفاتيحُ
  -- الأجنبيّة تردّ ما لا وجودَ له.
  insert into news (title, content, workflow_status, category,
                    committee_id, department_id, council_id, created_by)
  values (btrim(p_title), '', 'draft', coalesce(p_category, 'coverage'),
          p_committee, p_department, p_council, p_actor)
  returning id into new_id;

  perform news_log(new_id, p_actor, 'create', jsonb_build_object('title', btrim(p_title)));
  return new_id;
end $function$;

-- والمنحُ يُعاد كما كان بالضبط: الإسقاطُ يأخذ معه صلاحيّاتِ الدالّة، ثمّ **تمنحها
-- الامتيازاتُ الافتراضيّة في Supabase لـ`anon` و`authenticated`** بمجرّد إنشائها في
-- `public` (وهو ما وقع فعلًا عند التطبيق فأُمسك). و`revoke from public` لا يمسّهما
-- لأنّهما دوران مسمَّيان لا PUBLIC، فيُسمَّيان صراحةً.
--
-- والفرقُ ليس شكليًّا: الفاعلُ في هذه الدالّة **مُدخَلٌ** (`p_actor`) لا `auth.uid()`،
-- فمن ملك تنفيذَها ملك أن يقول «أنا رئيسُ التحرير» بمعرّفِ غيره — وهي عينُ ثغرة
-- `p_actor` التي سُدَّت في ٢٠٢٦-٠٨-٠٦. فالبابُ يُغلَق على مفتاح الخدمة وحده.
revoke all on function public.news_create(uuid, text, integer, text, integer, text) from anon, authenticated, public;
grant execute on function public.news_create(uuid, text, integer, text, integer, text) to service_role;
