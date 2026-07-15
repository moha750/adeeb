-- تناظر أوزان التصويت: إدارة الضمان والجودة بإزاء إدارة الموارد البشرية.
--
-- الخلل:
--   جدول election_vote_weights يحمل صفَّين لإدارة الموارد البشرية
--   (hr_committee_leader = 3.0، hr_admin_member = 2.5)، ولا صفَّ
--   لنظيرَيهما في إدارة الضمان والجودة رغم تطابق role_level و council_type.
--
--   و get_vote_weight يحسم الغياب هكذا:
--       SELECT COALESCE(MAX(evw.weight), 1.0) ... LEFT JOIN election_vote_weights
--   فمن لا صفَّ له يسقط إلى 1.0 — وهو وزن العضو المبتدئ (role_level=3).
--
-- الأثر المقيس على الإنتاج بتاريخ 2026-07-15:
--       club_president      (10) -> 4.0
--       hr_committee_leader  (8) -> 3.0
--       qa_committee_leader  (8) -> 1.0   ← قائد إدارة يصوّت كعضو
--       committee_member     (3) -> 1.0
--
-- التشخيص: هذا سطر منسيّ لا سياسة مقصودة. لو أُريد للضمان وزن 1.0
--   لكُتب صفٌّ قيمته 1.0؛ لكن لا صفَّ أصلًا — والغياب هو العلّة.
--
-- الإصلاح: صفّان يطابقان نظيرَيهما في الموارد البشرية تمامًا.
--   إضافيّ صرف: لا يغيّر صفًّا قائمًا، ولا يمسّ دالّة، ولا يكسر الموقع القديم.

insert into election_vote_weights (role_name, weight, description_ar) values
  ('qa_committee_leader', 3.0, 'قائد إدارة الضمان والجودة'),
  ('qa_admin_member',     2.5, 'عضو الضمان والجودة')
on conflict (role_name) do nothing;
