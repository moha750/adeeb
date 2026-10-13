-- أيقونةُ الوحدة (المالك ٢٠٢٦-١٠-١٠: «نعم ضيف»).
--
-- لوحةُ المقاعد في «تعيين المناصب» ترسم في رأس كرت القسم وعنوان اللجنة أيقونتَها: لوحُ تصويرٍ للإنتاج
-- الإعلاميّ، وكاميرا للتصوير، وميكروفونٌ للرواة. وكانت معاينتُها تربطها بالاسم في الكود، والاسمُ يتبدّل
-- ويُنشأ غيرُه، فصار لكلّ وحدةٍ عمودُها: **مفتاحُ أيقونةٍ** تعرفه الواجهةُ في قائمتها (`unitIcons.tsx`).
--
-- والمفتاحُ نصٌّ لا تعدادٌ في القاعدة: القائمةُ في الواجهة، وما لا تعرفه منها يسقط إلى أيقونةٍ عامّة
-- (مبنى للقسم، وجمعٌ للجنة)، فلا يكسر مفتاحٌ مجهولٌ شاشة، ولا تُضاف أيقونةٌ بترحيل. والقيدُ على الشكل وحده:
-- حروفٌ لاتينيّةٌ صغيرةٌ وشرطات، كأسماء Phosphor (`film-slate`). والفارغُ أيقونةٌ عامّة.
--
-- وتُعبّأ الوحداتُ الحيّةُ بما اعتمده المالك في المعاينة (`/ui/seats`)، ووحدتا الاختبار فارغتان.

alter table public.departments add column if not exists icon text;
alter table public.committees add column if not exists icon text;

alter table public.departments drop constraint if exists departments_icon_key;
alter table public.departments add constraint departments_icon_key check (icon is null or icon ~ '^[a-z][a-z0-9-]{1,39}$');
alter table public.committees drop constraint if exists committees_icon_key;
alter table public.committees add constraint committees_icon_key check (icon is null or icon ~ '^[a-z][a-z0-9-]{1,39}$');

comment on column public.departments.icon is 'مفتاحُ أيقونة القسم في قائمة الواجهة (unitIcons). الفارغُ والمجهولُ أيقونةٌ عامّة.';
comment on column public.committees.icon is 'مفتاحُ أيقونة اللجنة في قائمة الواجهة (unitIcons). الفارغُ والمجهولُ أيقونةٌ عامّة.';

update public.departments d set icon = v.icon
from (values (1, 'film-slate'), (2, 'handshake'), (3, 'pen-nib'), (4, 'cpu')) as v(id, icon)
where d.id = v.id;

update public.committees c set icon = v.icon
from (values
  (1, 'calendar-star'), (2, 'microphone'), (3, 'feather'), (4, 'identification-badge'),
  (5, 'camera'), (6, 'paint-brush'), (7, 'megaphone'), (18, 'archive'), (24, 'code'),
  (22, 'users-three'), (23, 'seal-check'), (37, 'briefcase')
) as v(id, icon)
where c.id = v.id;
