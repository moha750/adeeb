-- ══ حذفُ الوسوم من الأخبار (قرار المالك ٢٠٢٦-١٠-١٦) ══════════════════════════════════════════
--
-- **لا يُطبَّق قبل أن يُرفع الكودُ الذي لا يقرأ `tags`.** القاعدةُ واحدةٌ بين النسخة المحلّيّة والموقع الحيّ،
-- والنسخةُ المرفوعة حتى ٢٠٢٦-١٠-١٦ تطلب العمودَ في كلّ استعلامٍ عن الأخبار: حذفُه قبل الرفع يُسقط صفحاتها.
--
-- **لماذا تُحذف ولا تُترك نائمة؟** لم يُكتب وسمٌ في أيٍّ من الأخبار الستّة عشر، ولا صفحةَ لها ولا رابط. وعمودٌ نائمٌ
-- يُنسى فيصير دَينًا (المالك: «من الطبيعي أنني سأنساها»). **ولماذا لا تُفعَّل؟** لأنّ الوسمَ النصّيَّ الحرّ أضعفُ أداةٍ
-- لما يُراد منه مستقبلًا: يتشظّى («ليالي كفو» و«ليالي كفو 1446» و«كفو») ولا يعرف ما يشير إليه. والبديلُ المتّفقُ عليه
-- **ربطُ الخبر بما يغطّيه** (فعاليّتِه في `activities` أوّلًا)، ويُبنى في إعادة تصميم المحرّر.

begin;

alter table public.news drop constraint if exists news_tags_clean;
alter table public.news drop column if exists tags;

-- الحقولُ التي يُكلَّف بها الكاتب: «الوسوم» تخرج منها. (لا تكليفَ قائمٌ يحملها: صفرُ تكاليف يومَ الكتابة.)
alter table public.news_writer_assignments drop constraint if exists news_assigned_fields_known;
alter table public.news_writer_assignments add constraint news_assigned_fields_known check (
  jsonb_typeof(assigned_fields) = 'array'
  and assigned_fields <@ '["title", "summary", "content", "category", "authors", "image_url", "gallery_images", "cover_photographer", "gallery_photographers"]'::jsonb
);

-- والحقولُ الافتراضيّةُ للتكليف بلا «الوسوم» — توأمُ `DEFAULT_FIELDS` في `vocab.ts`. والجسدُ ما عدا ذلك منسوخٌ بحرفه.
create or replace function public.news_assign_writers(p_news uuid, p_actor uuid, p_writers uuid[], p_fields jsonb default null::jsonb, p_notes text default null::text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  fields jsonb := coalesce(p_fields, '["title","summary","content","authors"]'::jsonb);
  added int := 0;
  removed int := 0;
  w uuid;
begin
  if news_role(p_actor, p_news) <> 'chief' then
    raise exception 'news_denied' using hint = 'التكليف لرئيس التحرير وحده.';
  end if;

  -- من سقط من القائمة
  with gone as (
    delete from news_writer_assignments a
    where a.news_id = p_news
      and not (a.writer_id = any(coalesce(p_writers, '{}'::uuid[])))
    returning 1
  ) select count(*) into removed from gone;

  -- من بقي أو أُضيف — الحقول والملاحظة تُحدَّثان دائمًا، والحالة تُصان
  foreach w in array coalesce(p_writers, '{}'::uuid[]) loop
    insert into news_writer_assignments
      (news_id, writer_id, assigned_by, assigned_fields, assignment_notes, status)
    values (p_news, w, p_actor, fields, p_notes, 'pending')
    on conflict (news_id, writer_id) do update
      set assigned_fields  = excluded.assigned_fields,
          assignment_notes = excluded.assignment_notes,
          assigned_by      = excluded.assigned_by;
    added := added + 1;

    -- **التكليف هو المفتاح**: من كُلِّف فُتحت له غرفة التحرير. ولا يُسحب المفتاح
    -- آليًّا عند رفع التكليف — من كتب مرّةً فهو من أهلها، ورئيس التحرير يسحبه
    -- صراحةً من تبويب الصلاحيات إن أراد.
    insert into user_specific_permissions (user_id, permission_id, is_granted, granted_by)
    select w, p.id, true, p_actor from permissions p where p.permission_key = 'write_news'
      and not exists (
        select 1 from user_specific_permissions u
        where u.user_id = w and u.permission_id = p.id
      );
  end loop;

  -- الخبر يدخل مرحلة التكليف — ولا يُنزَل من مرحلةٍ أبعد بلغها بالفعل
  update news
     set workflow_status = case
           when added > 0 and workflow_status = 'draft' then 'assigned'
           when added = 0 and workflow_status = 'assigned' then 'draft'
           else workflow_status end,
         assigned_by = case when added > 0 then p_actor else assigned_by end,
         assigned_at = case when added > 0 then now() else assigned_at end
   where id = p_news;

  perform news_log(p_news, p_actor, 'assign',
    jsonb_build_object('writers', to_jsonb(coalesce(p_writers, '{}'::uuid[])),
                       'fields', fields, 'removed', removed));
  return format('كُلِّف %s كاتبًا، ورُفع %s تكليفًا.', added, removed);
end $function$;

-- الدالّةُ كانت لمفتاح الخدمة وحده (`postgres` و`service_role`)، و`create or replace` يحفظ المنح القائم.

commit;
