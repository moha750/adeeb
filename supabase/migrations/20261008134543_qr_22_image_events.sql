-- السجلُّ يقيّد استبدالَ صورة الباركود (م٢٢، تتمّةُ م٢١)
--
-- كتبديل الوجهة: من استبدل صورةَ ملصقٍ مطبوع غيّر ما يراه الناس، فيُعرَف من فعل ومتى، وتفتح
-- عينُ الإشراف الصورةَ الجديدة («بدّل الصورة» في سجلّها).
--
-- ✅ **مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-٠٨** بإذن المالك بعد م٢١ بدقيقة، واختُبر في معاملةٍ مُلغاة:
--    استبدالُ المسار يكتب واقعةَ `image` بالمسارين.
--
-- ومنفصلٌ عن م٢١ لأنّ قيدَ أنواع الواقعة لا يُوسَّع إلّا بإسقاطه وإعادته، وكان المظنونُ أنّ أداةَ
-- الوكيل تحبس ما فيه إسقاطٌ بانتظار تأكيدٍ لا يصل. فلم تحبسه هذه المرّة، ويبقى الفصلُ نافعًا:
-- م٢١ إضافةٌ محضة. وترتيبُهما لازم: الدالّةُ تكتب `image` فلا تُبدَّل قبل أن يقبلها القيد.

begin;

alter table public.qr_link_events drop constraint if exists qr_link_events_kind_check;
alter table public.qr_link_events add constraint qr_link_events_kind_check
  check (kind in ('target', 'title', 'active', 'spec', 'delete', 'owner', 'schedule', 'tags', 'campaign', 'image'));

-- نصُّ الدالّة كما هو في القاعدة (قُرئ ٢٠٢٦-١٠-٠٨)، وأُضيف إليه فرعُ الصورة وحدَه.
create or replace function public.qr_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (old.id, auth.uid(), 'delete', old.target_url, null);
    return old;
  end if;

  if new.target_url is distinct from old.target_url then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'target', old.target_url, new.target_url);
  end if;
  if new.image_path is distinct from old.image_path then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'image', old.image_path, new.image_path);
  end if;
  if new.title is distinct from old.title then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'title', old.title, new.title);
  end if;
  if new.active is distinct from old.active then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'active', old.active::text, new.active::text);
  end if;
  if new.tags is distinct from old.tags then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'tags',
            array_to_string(old.tags, '، '), array_to_string(new.tags, '، '));
  end if;
  if new.campaign_id is distinct from old.campaign_id then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'campaign',
            (select c.name from public.qr_campaigns c where c.id = old.campaign_id),
            (select c.name from public.qr_campaigns c where c.id = new.campaign_id));
  end if;
  if new.spec is distinct from old.spec then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'spec', null, null);
  end if;

  return new;
end;
$$;

commit;
