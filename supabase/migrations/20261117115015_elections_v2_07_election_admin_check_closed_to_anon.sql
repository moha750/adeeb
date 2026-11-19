-- `has_election_admin_permission(uuid)` كانت مفتوحةً لغير المسجَّل (تحذير مستشار الأمان 0028):
-- يسأل بها أيُّ زائرٍ هل حسابٌ ما من مديري الانتخابات. تُغلق عنه وتبقى للمسجَّلين، فسياساتُ RLS
-- التي تستدعيها كلُّها للمسجَّلين.
--
-- إلّا سياسةً واحدة على جدول `notifications` القديم كانت لكلّ الأدوار، فلو سُحبت الصلاحيةُ وحدها سقط
-- استعلامُ `anon` على الجدول بـ«permission denied for function» بدل أن يرجع بلا صفوف (جُرِّب في معاملةٍ
-- أُلغيت). وغيرُ المسجَّل لا يرى منه شيئًا أصلًا (لا صفَّ موجَّهًا للجميع)، فتُقصر السياسةُ على المسجَّلين
-- ويبقى جوابُه كما كان: لا صفوف. والجدولُ نفسُه متروك، يُقرَّر حذفُه لاحقًا (المالك، 2026-11-17).
alter policy "Users can view their notifications" on public.notifications to authenticated;

revoke execute on function public.has_election_admin_permission(uuid) from public, anon;
-- المسجَّلون: لسياسات الانتخابات (المرشّحون والأصوات والسجلّ والتجميد والتعادل والحرمان وملفّات الترشّح)
grant execute on function public.has_election_admin_permission(uuid) to authenticated, service_role;
