-- أعضاءُ إدارة الموارد البشرية يرون التطوّع (٢٠٢٦-٠٩-٢٤)
--
-- «سجلّ المتطوّعين» و«الفرص التطوّعيّة» غرفتان بقفلٍ واحد `manage_volunteering`،
-- ولم يكن يملكه من الموارد إلّا القائد (hr_committee_leader) — ومقعدُه اليوم خالٍ،
-- فكانت الإدارةُ كلُّها (ثمانيةُ أعضاءٍ نشطين بدور hr_admin_member) لا ترى تطوّعًا.
-- والتطوّعُ عملُ الموارد بطبيعته: هو طريقُ العضويّة، ومنحُ العضويّة قدرةٌ يملكونها أصلًا
-- (manage_membership_applications). فيُمنح العضوُ القفلَ نفسَه.
--
-- والقفلُ واحدٌ لا ينقسم: من دخل السجلَّ فتح الفرصَ وقبِل المتطوّعين وأشّر حضورَهم
-- وقيّمهم وأصدر شهاداتِ المشاركة. لا توجد قدرةُ «اطّلاعٍ فقط» على التطوّع.
-- وسياساتُ RLS على volunteers/volunteer_* تسأل هذه القدرةَ نفسَها، فالبابُ والصفوفُ
-- يُفتحان معًا بلا تغييرٍ ثانٍ.

insert into public.role_permissions (role_name, permission_id)
select 'hr_admin_member', id from public.permissions where permission_key = 'manage_volunteering'
on conflict (role_name, permission_id) do nothing;
