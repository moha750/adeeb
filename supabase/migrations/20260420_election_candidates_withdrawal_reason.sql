-- إضافة حقل سبب الانسحاب للمرشحين
-- السبب: عند انسحاب العضو من الترشح، يُطلب منه كتابة سبب الانسحاب للسجل الإداري

ALTER TABLE election_candidates
    ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT,
    ADD COLUMN IF NOT EXISTS withdrawn_at      TIMESTAMPTZ;
