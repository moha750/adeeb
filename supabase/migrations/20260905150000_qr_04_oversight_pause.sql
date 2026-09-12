-- عينُ الإشراف تُوقف الباركود المشبوه، ولا تملك غيرَ ذلك (م٢)
--
-- ## العلّة
-- غرفةُ الإشراف (٢٠٢٦-٠٩-٠٥) ترى ولا تفعل: تعرض كلَّ باركودات النادي ووجهاتِها وسجلَّ
-- تغييرها. فإن رأى المشرفُ ملصقًا حُوِّلت وجهتُه إلى صفحةِ تصيّد، لا يملك إلّا أن يتّصل
-- بصاحبه. والوقتُ بين الرؤية والفعل هو الضرر كلُّه.
--
-- ## ولمَ دالّةٌ لا سياسةُ تعديل
-- امتيازُ `authenticated` على `qr_links` **بالأعمدة**: الاسمُ والوجهةُ والوصفةُ والحالُ.
-- فلو فُتحت للمشرف سياسةُ UPDATE على صفوف الناس لملك تبديلَ **وجهاتهم وأسمائهم** أيضًا،
-- وهو ما رُفض صراحةً يومَ بُنيت الغرفة: **الإشرافُ رؤيةٌ لا سلطةٌ على صفّ غيره**.
--
-- فبابٌ واحدٌ ضيّق: دالّةٌ تفحص القدرةَ وتكتب **عمودًا واحدًا** (`active`) ولا تمسّ غيرَه.
-- ولا سياسةَ كتابةٍ جديدةً البتّة، فما لم تسمح به الدالّةُ يبقى ممنوعًا.
--
-- ## والفعلُ يُقيَّد باسم فاعله
-- `security definer` تبدّل الامتيازَ ولا تبدّل `auth.uid()`، فمحفّزُ السجلّ يكتب الواقعةَ
-- باسم المشرف لا باسم النظام. والإيقافُ لا الحذف: الملصقُ في الشارع يُردّ قاصدُه بأدب،
-- وصاحبُه يُراجَع، والأثرُ كلُّه محفوظ.

begin;

create or replace function public.qr_admin_set_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hit boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.check_user_permission(auth.uid(), 'oversee_qr') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.qr_links
     set active = p_active, updated_at = now()
   where id = p_id;

  get diagnostics v_hit = row_count;
  return v_hit;
end;
$$;

comment on function public.qr_admin_set_active(uuid, boolean) is
  'إيقافُ باركودٍ أو تشغيلُه من غرفة الإشراف. تفحص قدرةَ oversee_qr وتكتب عمودَ active وحدَه، والمحفّزُ يقيّد الواقعةَ باسم الفاعل.';

revoke all on function public.qr_admin_set_active(uuid, boolean) from public, anon;
grant execute on function public.qr_admin_set_active(uuid, boolean) to authenticated;

commit;
