-- الباركودُ لا يموت بموت حساب صاحبه: يؤول إلى «أَدِيب» (م٦)
--
-- ## العلّة، بكلمة المالك
-- «عندما يُحذف حسابُ صاحب الباركود، هل تنتقل ملكيّتُه لأَدِيب؟» — لا. المفتاحُ
-- `ON DELETE CASCADE`، فيُحذف الحسابُ فتذهب باركوداتُه ومسحاتُها كلُّها، **وتموت ملصقاتٌ
-- مطبوعةٌ في الشارع** لا ذنبَ لها. والنقلُ اليدويُّ يحتاج من يتذكّره قبل الحذف.
--
-- ## والعلاج: محفّزٌ يسبق الحذف
-- الملصقُ أثرُ نادٍ لا أثرُ فرد. فقبل أن يُحذف الصفُّ في `auth.users` تُنقَل باركوداتُه
-- إلى حساب النادي، وتُقيَّد الواقعةُ في السجلّ بنوع `owner` كما يُقيَّد النقلُ اليدويّ.
--
-- · **قبل الحذف لا بعده**: بعد الحذف يكون الصفُّ قد ذهب بالـcascade، فلا شيءَ يُنقَل.
-- · **وحسابُ النادي يُعرَف بدوره لا ببريده**: `adeeb_admin` في `user_roles` — فلو تبدّل
--   البريدُ أو أُنشئ حسابٌ ثانٍ بقي المرجعُ صحيحًا. وإن لم يوجد الدورُ (قاعدةٌ محلّيّةٌ
--   بلا حسابِ نادٍ) فلا يُعطَّل الحذفُ: تُترَك الباركوداتُ للسلوك القديم.
-- · **ولا يُنقَل باركودُ أَدِيب إلى نفسه**: لو حُذف حسابُ النادي نفسُه (وهو ما لا يقع
--   عادةً) فلا وجهةَ للنقل، فيمضي الحذفُ كما كان.

begin;

create or replace function public.qr_bequeath_to_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid;
  v_moved integer;
begin
  select ur.user_id into v_club
  from public.user_roles ur
  where ur.role_name = 'adeeb_admin' and ur.is_active
    and ur.user_id <> old.id
  limit 1;

  if v_club is null then
    return old;  -- لا حسابَ نادٍ: يمضي الحذفُ بسلوكه القديم ولا يُعطَّل
  end if;

  update public.qr_links set owner_id = v_club, updated_at = now() where owner_id = old.id;
  get diagnostics v_moved = row_count;

  if v_moved > 0 then
    -- الفاعلُ هو من نفّذ الحذف إن كان معلومًا، وإلّا فالنظام (كنسٌ مجدول): `actor_id` يقبل NULL.
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    select l.id, auth.uid(), 'owner', old.id::text, v_club::text
    from public.qr_links l
    where l.owner_id = v_club and l.updated_at >= now() - interval '1 second';
  end if;

  return old;
end;
$$;

comment on function public.qr_bequeath_to_club() is
  'قبل حذف حساب: تنتقل باركوداتُه إلى حساب النادي (دور adeeb_admin) بدل أن تُحذف معه، وتُقيَّد الواقعة.';

drop trigger if exists trg_qr_bequeath_to_club on auth.users;
create trigger trg_qr_bequeath_to_club
  before delete on auth.users
  for each row execute function public.qr_bequeath_to_club();

commit;
