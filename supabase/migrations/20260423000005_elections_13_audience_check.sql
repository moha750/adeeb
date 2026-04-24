-- =============================================
-- تحديث CHECK constraint على target_audience ليشمل أنواع الانتخابات
-- =============================================

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_target_audience_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_target_audience_check
    CHECK (target_audience = ANY (ARRAY[
        'all',
        'members',
        'committee_leaders',
        'admins',
        'specific_users',
        'specific_committee',
        'election_voters',
        'election_candidates',
        'election_participants'
    ]));
