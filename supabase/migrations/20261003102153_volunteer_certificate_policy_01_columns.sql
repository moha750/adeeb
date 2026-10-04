-- ════════════════════════════════════════════════════════════════════════════
-- سياسةُ شهادة المشاركة الجديدة (قرارُ المجلس الإداريّ ومحمّد، ٢٠٢٦-١٠-٠٣)
--
-- كان المديرُ يقرّر بعد الحضور «يستحقّ أو لا يستحقّ»، فيخرج من حضر وشارك بلا شهادة. والقرارُ الجديد:
--   ١. **كلُّ من حضر يأخذ شهادة مشاركة**، بلا سؤال استحقاق. وتُكتب فيها ساعاتُ تطوّعه.
--   ٢. **ومن تميّز يُرشَّح للتميّز** بجملةٍ تقول سببَه، فتصدر شهادتُه بختم «بتميّز» وفيها الجملة.
--   ٣. **والحجبُ استثناءٌ موثَّق** لمخالفةٍ صريحة، بفعلٍ منفصلٍ وسببٍ مكتوب، ويُرفع بفعلٍ آخر.
--      (ومن يدير التطوّع هم الموارد البشريّة والرئيسان أصلًا، فلا صلاحيةَ جديدة.)
--
-- والتغييرُ **إضافيٌّ لا يكسر الموقعَ المنشور** بالكود القديم: الأعمدةُ جديدة، و`evaluate_volunteer` باقٍ كما هو،
-- و`deserves_certificate` يبقى عمودَه: `false` صار «محجوبة» و`null` صار «جاهزة»، و`true` من الماضي جاهزةٌ كذلك.
-- ════════════════════════════════════════════════════════════════════════════

-- ١ ── التميّز على طلب المتطوّع (يُكتب على طلباته الحاضرة في الفرصة كلِّها، فالشهادةُ للفرصة لا للفترة)
alter table volunteer_applications
  add column if not exists distinction_note text,
  add column if not exists distinguished_by uuid references profiles(id),
  add column if not exists distinguished_at timestamptz;
alter table volunteer_applications drop constraint if exists application_distinction_note;
alter table volunteer_applications add constraint application_distinction_note
  check (distinction_note is null or char_length(btrim(distinction_note)) between 5 and 300);

-- ٢ ── لقطةُ الشهادة: ساعاتُ التطوّع (بلا ساعاتٍ للمرنة) وجملةُ التميّز
alter table participation_certificates
  add column if not exists hours numeric(6,1),
  add column if not exists distinction_note text;
