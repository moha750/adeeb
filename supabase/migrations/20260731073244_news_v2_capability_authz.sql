-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731073244   الاسم: news_v2_capability_authz

-- ════════════════════════════════════════════════════════════════════
--  منصّة أخبار أدِيب V2 — الترحيل الأوّل: التفويض
--
--  جداول الأخبار كانت آخر جزيرةٍ رتبيّة في القاعدة: سياساتها تفحص
--  role_name IN ('club_president','committee_leader','committee_deputy')
--  — وهو المبدأ الذي أُعدم في ترحيل الصلاحيات القدراتيّ. هذا الترحيل
--  يُنهي الجزيرة: **قدرةٌ لا رتبة**، وحَكَمٌ واحد تقرؤه كلّ سياسة.
-- ════════════════════════════════════════════════════════════════════


-- ── ١) توحيد `check_user_permission` مع `get_user_permissions` ────────
--
-- كانتا تقولان قولين مختلفين عن الشيء نفسه: اللوحة تقرأ القدرات من
-- `get_user_permissions` (تحسب المنح الفرديّ والحظر الفرديّ)، وRLS تقرؤها من
-- `check_user_permission` (تتجاهلهما). فمن مُنح قدرةً فرديّة رآها اللوحةُ
-- وأنكرتها القاعدة — بابٌ يُفتح على غرفةٍ مقفلة.
--
-- الجذر: مصدرٌ واحد للجواب. والأثر اليوم صفر (user_specific_permissions فارغ).

create or replace function public.check_user_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    -- المنح: من الدور أو فرديًّا
    (
      exists (
        select 1 from user_roles ur
        join role_permissions rp on rp.role_id = ur.role_id
        join permissions p on p.id = rp.permission_id
        where ur.user_id = p_user_id and ur.is_active
          and p.permission_key = p_permission_key
      )
      or exists (
        select 1 from user_specific_permissions usp
        join permissions p on p.id = usp.permission_id
        where usp.user_id = p_user_id and usp.is_granted
          and (usp.expires_at is null or usp.expires_at > now())
          and p.permission_key = p_permission_key
      )
    )
    -- والحظر الفرديّ يعلو على المنح — كما في `get_user_permissions` (EXCEPT)
    and not exists (
      select 1 from user_specific_permissions usp
      join permissions p on p.id = usp.permission_id
      where usp.user_id = p_user_id and usp.is_granted = false
        and (usp.expires_at is null or usp.expires_at > now())
        and p.permission_key = p_permission_key
    );
$$;

comment on function public.check_user_permission(uuid, text) is
  'هل يملك المستخدم هذه القدرة؟ الجواب نفسه الذي تعطيه get_user_permissions: '
  'منحٌ من الدور أو فرديّ، والحظر الفرديّ يعلو عليهما. تقرؤها RLS في كلّ الأنظمة.';


-- ── ٢) قدرة الكاتب ───────────────────────────────────────────────────
--
-- `manage_news` قدرة **رئيس التحرير**: يرى كلّ الأخبار، يكلّف، يراجع، ينشر، يحذف.
-- و`write_news` قدرة **الكاتب**: يدخل الغرفة ويرى تكاليفه وحدها.
--
-- ولا تُمنح `write_news` لدورٍ مشترك (committee_member دورٌ واحد لكلّ اللجان،
-- فمنحُه يسرّبها إلى كلّ عضوٍ في النادي). تُمنح **بالتكليف** — انظر الترحيل الثالث.

insert into permissions (permission_key, permission_name_ar, description, category)
values ('write_news', 'كتابة الأخبار',
        'الدخول إلى غرفة التحرير وتحرير الأخبار المُكلَّف بها', 'news')
on conflict (permission_key) do nothing;

-- رئيس التحرير كاتبٌ أيضًا — من يملك الغرفة يكتب فيها.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r cross join permissions p
where p.permission_key = 'write_news'
  and r.role_name in ('club_president', 'president_advisor')
on conflict do nothing;


-- ── ٣) الحَكَم الواحد ────────────────────────────────────────────────
--
-- كلّ سياسةٍ على كلّ جدول أخبار تسأل هذه الدالّة وحدها. فمن أراد تغيير من
-- يرى ماذا غيّرها هنا مرّةً واحدة — لا في تسع سياساتٍ متفرّقة تنحرف عن بعضها.

create or replace function public.news_role(p_actor uuid, p_news uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    -- رئيس التحرير: سلطةٌ على كلّ خبر، مهما كانت لجنته وحالته
    when p_actor is not null and check_user_permission(p_actor, 'manage_news') then 'chief'
    -- الكاتب: مَن كُلِّف بهذا الخبر (ولم يعتذر)، أو من أنشأه
    when p_actor is not null and (
      exists (
        select 1 from news_writer_assignments a
        where a.news_id = p_news and a.writer_id = p_actor and a.status <> 'declined'
      )
      or exists (select 1 from news n where n.id = p_news and n.created_by = p_actor)
    ) then 'writer'
    else 'none'
  end;
$$;

comment on function public.news_role(uuid, uuid) is
  'دور الفاعل في هذا الخبر — الحَكَم الواحد لكلّ سياسات RLS على جداول الأخبار. '
  'chief = قدرة manage_news · writer = تكليفٌ حيّ أو إنشاء · none = لا شأن له.';

/** هل يدخل هذا الفاعل غرفة التحرير أصلًا؟ (باب الغرفة لا باب الخبر) */
create or replace function public.can_open_newsroom(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_actor is not null
     and (check_user_permission(p_actor, 'manage_news')
       or check_user_permission(p_actor, 'write_news'));
$$;


-- ── ٤) إسقاط السياسات الرتبيّة كلّها ─────────────────────────────────
--
-- بالاسم المقروء من القاموس لا بالكتابة اليدويّة — فأسماء السياسات العربيّة
-- مقصوصةٌ عند ٦٣ بايتًا («صلاحيات الحقو») ولا تُكتب بيدٍ بلا خطأ.

do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'news', 'news_activity_log', 'news_collaboration_comments', 'news_comments',
    'news_field_permissions', 'news_likes', 'news_public_comments', 'news_writer_assignments'
  ] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;


-- ── ٥) إعادة التأسيس: الخبر ──────────────────────────────────────────

-- القراءة: المنشور للعامّة، وما دونه لمن له فيه دور.
create policy news_select on public.news for select
  using (status = 'published' or news_role(auth.uid(), id) <> 'none');

-- الإنشاء: لمن يدخل الغرفة — والخبر يُختم باسمه فلا يُنسب إلى غيره.
create policy news_insert on public.news for insert
  with check (can_open_newsroom(auth.uid()) and created_by = auth.uid());

-- التعديل: رئيس التحرير أو كاتبُ الخبر. (وحرّاس التحوّل في الترحيل الثالث.)
create policy news_update on public.news for update
  using (news_role(auth.uid(), id) in ('chief', 'writer'))
  with check (news_role(auth.uid(), id) in ('chief', 'writer'));

-- الحذف: رئيس التحرير وحده.
create policy news_delete on public.news for delete
  using (news_role(auth.uid(), id) = 'chief');

-- ملاحظة أمنيّة: أُسقطت سياسة «Allow public to update views counter» — كانت تسمح
-- لأيّ زائرٍ مجهول بتعديل **أيّ عمود** في أيّ خبرٍ منشور (العنوان والمتن معًا)،
-- لا العدّاد وحده. عدّ المشاهدات يجري الآن بدالّةٍ لا تلمس غيره:

create or replace function public.news_bump_views(p_news uuid)
returns void
language sql
volatile
security definer
set search_path to 'public'
as $$
  update news set views = coalesce(views, 0) + 1
  where id = p_news and status = 'published';
$$;
grant execute on function public.news_bump_views(uuid) to anon, authenticated;


-- ── ٦) إعادة التأسيس: التكليفات ──────────────────────────────────────

create policy news_writer_assignments_select on public.news_writer_assignments for select
  using (writer_id = auth.uid() or news_role(auth.uid(), news_id) = 'chief');

-- التكليف فعلُ رئيس التحرير وحده — لا يُكلّف أحدٌ نفسه.
create policy news_writer_assignments_write on public.news_writer_assignments for all
  using (news_role(auth.uid(), news_id) = 'chief')
  with check (news_role(auth.uid(), news_id) = 'chief');

-- إلّا قبولَ التكليف أو الاعتذار عنه: ذاك فعلُ الكاتب على صفّه وحده.
create policy news_writer_assignments_respond on public.news_writer_assignments for update
  using (writer_id = auth.uid())
  with check (writer_id = auth.uid());


-- ── ٧) إعادة التأسيس: صلاحيات الحقول ─────────────────────────────────
-- (جدولٌ لم يُستعمل قطّ — يُحرَس بالحَكَم نفسه ريثما يُسقَط بموت V1.)

create policy news_field_permissions_select on public.news_field_permissions for select
  using (writer_id = auth.uid() or news_role(auth.uid(), news_id) <> 'none');

create policy news_field_permissions_write on public.news_field_permissions for all
  using (news_role(auth.uid(), news_id) = 'chief')
  with check (news_role(auth.uid(), news_id) = 'chief');


-- ── ٨) إعادة التأسيس: تعليقات التعاون (داخليّة) ──────────────────────

create policy news_collaboration_comments_select on public.news_collaboration_comments for select
  using (deleted_at is null and news_role(auth.uid(), news_id) <> 'none');

create policy news_collaboration_comments_insert on public.news_collaboration_comments for insert
  with check (user_id = auth.uid() and news_role(auth.uid(), news_id) <> 'none');

-- التعديل لصاحب التعليق، والإخفاء (deleted_at) له أو لرئيس التحرير.
create policy news_collaboration_comments_update on public.news_collaboration_comments for update
  using (user_id = auth.uid() or news_role(auth.uid(), news_id) = 'chief')
  with check (user_id = auth.uid() or news_role(auth.uid(), news_id) = 'chief');


-- ── ٩) إعادة التأسيس: سجلّ النشاط ────────────────────────────────────
-- سجلٌّ لا يُكتب بيد: التريغرات وحدها تكتبه (الترحيل الثاني)، فلا سياسة كتابة.

create policy news_activity_log_select on public.news_activity_log for select
  using (news_role(auth.uid(), news_id) <> 'none');


-- ── ١٠) إعادة التأسيس: الإعجابات ─────────────────────────────────────

create policy news_likes_select on public.news_likes for select using (true);

-- الإعجاب للمنشور وحده، وباسم صاحبه: لا يُعجِب أحدٌ نيابةً عن غيره.
create policy news_likes_insert on public.news_likes for insert
  with check (
    exists (select 1 from news n where n.id = news_id and n.status = 'published')
    and ((auth.uid() is not null and user_id = auth.uid())
      or (auth.uid() is null and user_id is null and guest_identifier is not null))
  );

-- ملاحظة أمنيّة: السياسة القديمة كانت `... or auth.uid() is null` — أي أنّ أيّ
-- زائرٍ مجهول يحذف إعجاب **أيّ** مستخدم. الآن: صاحبُه وحده، والضيف ببصمته.
create policy news_likes_delete on public.news_likes for delete
  using (auth.uid() is not null and user_id = auth.uid());


-- ── ١١) إعادة التأسيس: تعليقات الجمهور ───────────────────────────────

create policy news_public_comments_select on public.news_public_comments for select
  using (is_approved or user_id = auth.uid() or news_role(auth.uid(), news_id) = 'chief');

-- ملاحظة أمنيّة: السياسة القديمة `with check (true)` كانت تسمح للمعلِّق بأن يضع
-- `is_approved = true` بيده — فينشر تعليقه بلا مراجعة. الآن الإقرار ممنوعٌ عند الإدخال.
create policy news_public_comments_insert on public.news_public_comments for insert
  with check (
    is_approved = false
    and exists (select 1 from news n where n.id = news_id and n.status = 'published')
    and ((auth.uid() is not null and user_id = auth.uid() and guest_name is null)
      or (auth.uid() is null and user_id is null and guest_name is not null))
  );

-- الإقرار والرفض لرئيس التحرير؛ وتعديل نصّه لصاحبه ما دام غير مُقَرّ.
create policy news_public_comments_update on public.news_public_comments for update
  using ((user_id = auth.uid() and not is_approved) or news_role(auth.uid(), news_id) = 'chief')
  with check ((user_id = auth.uid() and not is_approved) or news_role(auth.uid(), news_id) = 'chief');

create policy news_public_comments_delete on public.news_public_comments for delete
  using (user_id = auth.uid() or news_role(auth.uid(), news_id) = 'chief');


-- ── ١٢) الجدول المهجور: news_comments ────────────────────────────────
-- تعليقاتٌ عامّة كرّرها `news_public_comments` وحلّ محلّها (٠ صفوف مقابل ٤).
-- لا يُسقَط قبل موت V1 (مسجَّل في قائمة الموت) — ويُقفَل الآن فلا يُكتب فيه شيء.

create policy news_comments_select on public.news_comments for select
  using (is_approved = true);

