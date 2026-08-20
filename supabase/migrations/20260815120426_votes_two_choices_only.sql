-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815120426   الاسم: votes_two_choices_only

-- مفرداتُ الورقة صارت رأيين لا ثالثَ لهما، بعد محو الورقة الممتنعة الوحيدة بإذن المالك.
-- وكلُّ ورقةٍ تقع على مرشّح، فلا حاجةَ لقيدِ «الامتناعُ بلا مرشّح» ولا لفراغٍ في العمود.
ALTER TABLE election_votes DROP CONSTRAINT IF EXISTS election_votes_abstain_has_no_candidate;

ALTER TABLE election_votes DROP CONSTRAINT IF EXISTS election_votes_choice_check;
ALTER TABLE election_votes ADD CONSTRAINT election_votes_choice_check
  CHECK (vote_choice = ANY (ARRAY['approve'::text, 'reject'::text]));

ALTER TABLE election_votes ALTER COLUMN candidate_id SET NOT NULL;
