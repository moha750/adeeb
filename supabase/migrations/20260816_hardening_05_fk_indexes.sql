-- ستّةٌ وخمسون مفتاحًا أجنبيًّا بلا فهرسٍ يغطّيه.
--
-- القصّة: المفتاحُ الأجنبيُّ يُفهرَس عند **المُشار إليه** تلقائيًّا (فهو مفتاحٌ أوّليّ أو
-- فريد)، ولا يُفهرَس عند **المُشير**. فيبقى عمودُ الإشارة بلا فهرس، ويُدفَع ثمنُه في موضعين:
--
-- ١. كلُّ حذفٍ أو تعديلِ مفتاحٍ في الجدول الأب يلزمه مسحُ الابن كلِّه للتحقّق من `ON DELETE`.
-- ٢. وكلُّ ضمٍّ (`join`) من الأب إلى الابن على هذا العمود يمسح الابنَ مسحًا كاملًا.
--
-- وأحرُّها المقيسة: `activity_reservations_user_id_fkey` — ٣٤٫٩ ألفَ تحديثٍ على الجدول،
-- وسياسةُ قراءته نفسُها تُرشِّح بـ`user_id = auth.uid()`.
--
-- **الملفُّ مولَّدٌ لا مكتوب.** والاستعلامُ الذي أخرجه (وهو الذي يُعاد به التحقّق، ويجب أن
-- يعود صفرَ صفوفٍ بعد التطبيق):
--
--   with fk as (
--     select c.conrelid::regclass::text as tbl, c.conname, c.conkey,
--            (select a.attname from pg_attribute a
--              where a.attrelid = c.conrelid and a.attnum = c.conkey[1]) as col
--     from pg_constraint c
--     join pg_class t on t.oid = c.conrelid
--     join pg_namespace n on n.oid = t.relnamespace
--     where c.contype = 'f' and n.nspname = 'public'
--   )
--   select * from fk where not exists (
--     select 1 from pg_index i
--     where i.indrelid = (fk.tbl)::regclass
--       and (i.indkey::int2[])[0:array_length(fk.conkey,1)-1] = fk.conkey);
--
-- الشرطُ الأخيرُ يقول: «يكفي فهرسٌ **يبدأ** بأعمدة المفتاح»، وهو حكمُ بوسترغرس نفسِه — فلا
-- يُنشَأ فهرسٌ لما هو مغطًّى ببادئةِ فهرسٍ قائم. والاستعلامُ أخرج ٥٦ مفتاحًا في ٣١ جدولًا،
-- وهو عددُ المستشار نفسُه وأسماؤه نفسُها، فالمجموعتان واحدة. وكلُّها **عمودٌ واحد**، فلا
-- مفتاحَ مركّبٌ يحتاج ترتيبَ أعمدةٍ يُتأمَّل فيه.
--
-- **التسمية** `idx_<جدول>_<عمود>` — هي الغالبةُ في القاعدة (١٢٧ فهرسًا من ١٧٦ على هذه
-- الصيغة، مقابل ٢١ على `<…>_idx`). وقِيس قبل الكتابة: لا اسمَ من الستّة والخمسين مأخوذٌ،
-- ولا واحدٌ منها يتجاوز ٦٣ بايتًا.
--
-- ═══ CONCURRENTLY: كيف يُطبَّق هذا الملفّ ═══════════════════════════════════════════════
--
-- **`create index concurrently` لا يجري داخل كتلة معاملة.** فلا `begin;` في هذا الملفّ،
-- ولا يُلصَق كلُّه في محرِّرِ SQL يلفّ ما فيه بمعاملةٍ واحدة (محرِّرُ Supabase يفعل).
-- **يُنفَّذ جملةً جملة.** وإن انقطعت جملةٌ في منتصفها بقي فهرسٌ **باطل** (`indisvalid=false`)
-- لا يستعمله المخطِّط ولا يمنع إعادةَ المحاولة إلّا باسمه؛ يُكشَف بـ:
--   select indexrelid::regclass from pg_index where not indisvalid;
-- ويُنظَّف بـ`drop index concurrently <اسمه>;` ثمّ يُعاد بناؤه.
--
-- **والحقُّ أنّ `concurrently` هنا أثقلُ من الحاجة، وهذا مقيس**: الجداولُ الستّةُ والثلاثون
-- كلُّها صغيرة — أكبرُها `profiles` ٣٣٥ صفًّا (١٢٠ ك.ب)، ثمّ `user_roles` ٢٣٦،
-- ثمّ `activity_reservations` ١٨٦ صفًّا (١٠٤ ك.ب). وبناءُ فهرسٍ على مئاتِ صفوفٍ يقاس
-- بأجزاءٍ من الثانية. فقفلُ `SHARE` الذي يأخذه البناءُ العاديّ (يمنع الكتابةَ لا القراءة)
-- يدوم لحظةً، بينما `concurrently` يمسح الجدولَ مرّتين وينتظر المعاملاتِ القائمة.
--
-- فلك طريقان، والثاني أوصى به القياس:
--   · **الجُمَلُ أدناه** كما هي: جملةً جملة، بلا معاملة، بلا قفلٍ يمنع كتابة.
--   · **أو** كتلةُ البديل في ذيل الملفّ: هي هي بلا `concurrently`، تُطبَّق دفعةً واحدةً
--     داخل معاملة، فإمّا أن تنزل الستّةُ والخمسون جميعًا وإمّا ألّا ينزل منها شيء.
--   ولا تُطبَّق الكتلتان معًا: `if not exists` تجعل الثانية بلا أثرٍ لو وقع ذلك، لكنّ
--   القصدَ أن يُختار طريقٌ واحد.
--
-- **الترحيلُ إضافيٌّ وقابلٌ للرجوع**: الفهرسُ لا يغيّر بيانًا ولا حكمَ سياسة، وإنّما يعطي
-- المخطِّطَ طريقًا أقصر. والرجوعُ `drop index concurrently if exists <اسمه>;` لكلٍّ منها.
--
-- (وسائرُ الفهارس: بلّغ المستشارُ عن ٢٥ فهرسًا «غير مستخدَم». **لا يُسقَط منها شيءٌ هنا**؛
--  عدّادُ الاستعمال أُعيد في 2025-12-08، والنافذةُ أقصرُ من أن يُحكَم بها على فهرسٍ بالموت.)

create index concurrently if not exists idx_activity_reservations_attendance_marked_by on public.activity_reservations (attendance_marked_by);  -- activity_reservations_attendance_marked_by_fkey
create index concurrently if not exists idx_activity_reservations_cancelled_by on public.activity_reservations (cancelled_by);  -- activity_reservations_cancelled_by_fkey
create index concurrently if not exists idx_activity_reservations_certificate_sent_by on public.activity_reservations (certificate_sent_by);  -- activity_reservations_certificate_sent_by_fkey
create index concurrently if not exists idx_activity_reservations_user_id on public.activity_reservations (user_id);  -- activity_reservations_user_id_fkey
create index concurrently if not exists idx_activity_reservations_whatsapp_confirmed_by on public.activity_reservations (whatsapp_confirmed_by);  -- activity_reservations_whatsapp_confirmed_by_fkey
create index concurrently if not exists idx_committee_supervision_assigned_by on public.committee_supervision (assigned_by);  -- committee_supervision_assigned_by_fkey
create index concurrently if not exists idx_committee_supervision_unit_id on public.committee_supervision (unit_id);  -- committee_supervision_unit_id_fkey
create index concurrently if not exists idx_committees_council_id on public.committees (council_id);  -- committees_council_id_fkey
create index concurrently if not exists idx_committees_department_id on public.committees (department_id);  -- committees_department_id_fkey
create index concurrently if not exists idx_councils_head_role_name on public.councils (head_role_name);  -- councils_head_role_name_fkey
create index concurrently if not exists idx_departments_council_id on public.departments (council_id);  -- departments_council_id_fkey
create index concurrently if not exists idx_election_audit_log_actor_id on public.election_audit_log (actor_id);  -- election_audit_log_actor_id_fkey
create index concurrently if not exists idx_election_candidates_reviewed_by on public.election_candidates (reviewed_by);  -- election_candidates_reviewed_by_fkey
create index concurrently if not exists idx_election_votes_voter_id on public.election_votes (voter_id);  -- election_votes_voter_id_fkey
create index concurrently if not exists idx_elections_created_by on public.elections (created_by);  -- elections_created_by_fkey
create index concurrently if not exists idx_elections_winner_candidate_id on public.elections (winner_candidate_id);  -- elections_winner_fk
create index concurrently if not exists idx_elections_winner_declared_by on public.elections (winner_declared_by);  -- elections_winner_declared_by_fkey
create index concurrently if not exists idx_experience_certificates_committee_id on public.experience_certificates (committee_id);  -- experience_certificates_committee_id_fkey
create index concurrently if not exists idx_experience_certificates_revoked_by on public.experience_certificates (revoked_by);  -- experience_certificates_revoked_by_fkey
create index concurrently if not exists idx_guess_word_sessions_current_word_id on public.guess_word_sessions (current_word_id);  -- guess_word_sessions_current_word_fk
create index concurrently if not exists idx_member_badges_granted_by on public.member_badges (granted_by);  -- member_badges_granted_by_fkey
create index concurrently if not exists idx_member_warnings_cancelled_by on public.member_warnings (cancelled_by);  -- member_warnings_cancelled_by_fkey
create index concurrently if not exists idx_member_warnings_committee_id on public.member_warnings (committee_id);  -- member_warnings_committee_id_fkey
create index concurrently if not exists idx_member_warnings_role_at_issue on public.member_warnings (role_at_issue);  -- member_warnings_role_at_issue_fkey
create index concurrently if not exists idx_membership_applications_decided_by on public.membership_applications (decided_by);  -- membership_applications_decided_by_fkey
create index concurrently if not exists idx_membership_applications_recommended_by on public.membership_applications (recommended_by);  -- membership_applications_recommended_by_fkey
create index concurrently if not exists idx_news_created_by on public.news (created_by);  -- news_created_by_fkey
create index concurrently if not exists idx_news_reviewed_by on public.news (reviewed_by);  -- news_reviewed_by_fkey
create index concurrently if not exists idx_news_collaboration_comments_parent_comment_id on public.news_collaboration_comments (parent_comment_id);  -- news_collaboration_comments_parent_comment_id_fkey
create index concurrently if not exists idx_news_writer_assignments_assigned_by on public.news_writer_assignments (assigned_by);  -- news_writer_assignments_assigned_by_fkey
create index concurrently if not exists idx_notifications_sender_id on public.notifications (sender_id);  -- notifications_sender_id_fkey
create index concurrently if not exists idx_notifications_target_committee_id on public.notifications (target_committee_id);  -- notifications_target_committee_id_fkey
create index concurrently if not exists idx_participation_certificates_issued_by on public.participation_certificates (issued_by);  -- participation_certificates_issued_by_fkey
create index concurrently if not exists idx_participation_certificates_revoked_by on public.participation_certificates (revoked_by);  -- participation_certificates_revoked_by_fkey
create index concurrently if not exists idx_profile_name_changes_changed_by on public.profile_name_changes (changed_by);  -- profile_name_changes_changed_by_fkey
create index concurrently if not exists idx_radio_episodes_created_by on public.radio_episodes (created_by);  -- radio_episodes_created_by_fkey
create index concurrently if not exists idx_radio_episodes_host_member_id on public.radio_episodes (host_member_id);  -- radio_episodes_host_member_id_fkey
create index concurrently if not exists idx_radio_shows_created_by on public.radio_shows (created_by);  -- radio_shows_created_by_fkey
create index concurrently if not exists idx_radio_shows_host_member_id on public.radio_shows (host_member_id);  -- radio_shows_host_member_id_fkey
create index concurrently if not exists idx_radio_shows_producing_committee_id on public.radio_shows (producing_committee_id);  -- radio_shows_producing_committee_id_fkey
create index concurrently if not exists idx_roles_home_committee_id on public.roles (home_committee_id);  -- roles_home_committee_id_fkey
create index concurrently if not exists idx_roles_prerequisite_role_name on public.roles (prerequisite_role_name);  -- roles_prerequisite_role_name_fkey
create index concurrently if not exists idx_surveys_archived_by on public.surveys (archived_by);  -- surveys_archived_by_fkey
create index concurrently if not exists idx_surveys_deleted_by on public.surveys (deleted_by);  -- surveys_deleted_by_fkey
create index concurrently if not exists idx_task_assignments_marked_by on public.task_assignments (marked_by);  -- task_assignments_marked_by_fkey
create index concurrently if not exists idx_tasks_created_by on public.tasks (created_by);  -- tasks_created_by_fkey
create index concurrently if not exists idx_user_roles_assigned_by on public.user_roles (assigned_by);  -- user_roles_assigned_by_fkey
create index concurrently if not exists idx_user_roles_department_id on public.user_roles (department_id);  -- user_roles_department_id_fkey
create index concurrently if not exists idx_user_specific_permissions_granted_by on public.user_specific_permissions (granted_by);  -- user_specific_permissions_granted_by_fkey
create index concurrently if not exists idx_user_specific_permissions_permission_id on public.user_specific_permissions (permission_id);  -- user_specific_permissions_permission_id_fkey
create index concurrently if not exists idx_volunteer_applications_attendance_by on public.volunteer_applications (attendance_by);  -- volunteer_applications_attendance_by_fkey
create index concurrently if not exists idx_volunteer_applications_decided_by on public.volunteer_applications (decided_by);  -- volunteer_applications_decided_by_fkey
create index concurrently if not exists idx_volunteer_applications_evaluated_by on public.volunteer_applications (evaluated_by);  -- volunteer_applications_evaluated_by_fkey
create index concurrently if not exists idx_volunteer_opportunities_committee_id on public.volunteer_opportunities (committee_id);  -- volunteer_opportunities_committee_id_fkey
create index concurrently if not exists idx_volunteer_opportunities_created_by on public.volunteer_opportunities (created_by);  -- volunteer_opportunities_created_by_fkey
create index concurrently if not exists idx_volunteers_ended_by on public.volunteers (ended_by);  -- volunteers_ended_by_fkey

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- البديلُ المعامَلاتيّ (بلا `concurrently`) — يُنفَّذ **بدلًا** ممّا سبق لا بعده.
-- عِلّتُه في الرأس: الجداولُ كلُّها مئاتُ صفوف، فالقفلُ لحظةٌ والذرّيّةُ مكسبٌ صافٍ.
-- انزع علاماتِ التعليق عن الكتلة كلِّها إن اخترتَه.
--
-- begin;
--
-- create index if not exists idx_activity_reservations_attendance_marked_by on public.activity_reservations (attendance_marked_by);  -- activity_reservations_attendance_marked_by_fkey
-- create index if not exists idx_activity_reservations_cancelled_by on public.activity_reservations (cancelled_by);  -- activity_reservations_cancelled_by_fkey
-- create index if not exists idx_activity_reservations_certificate_sent_by on public.activity_reservations (certificate_sent_by);  -- activity_reservations_certificate_sent_by_fkey
-- create index if not exists idx_activity_reservations_user_id on public.activity_reservations (user_id);  -- activity_reservations_user_id_fkey
-- create index if not exists idx_activity_reservations_whatsapp_confirmed_by on public.activity_reservations (whatsapp_confirmed_by);  -- activity_reservations_whatsapp_confirmed_by_fkey
-- create index if not exists idx_committee_supervision_assigned_by on public.committee_supervision (assigned_by);  -- committee_supervision_assigned_by_fkey
-- create index if not exists idx_committee_supervision_unit_id on public.committee_supervision (unit_id);  -- committee_supervision_unit_id_fkey
-- create index if not exists idx_committees_council_id on public.committees (council_id);  -- committees_council_id_fkey
-- create index if not exists idx_committees_department_id on public.committees (department_id);  -- committees_department_id_fkey
-- create index if not exists idx_councils_head_role_name on public.councils (head_role_name);  -- councils_head_role_name_fkey
-- create index if not exists idx_departments_council_id on public.departments (council_id);  -- departments_council_id_fkey
-- create index if not exists idx_election_audit_log_actor_id on public.election_audit_log (actor_id);  -- election_audit_log_actor_id_fkey
-- create index if not exists idx_election_candidates_reviewed_by on public.election_candidates (reviewed_by);  -- election_candidates_reviewed_by_fkey
-- create index if not exists idx_election_votes_voter_id on public.election_votes (voter_id);  -- election_votes_voter_id_fkey
-- create index if not exists idx_elections_created_by on public.elections (created_by);  -- elections_created_by_fkey
-- create index if not exists idx_elections_winner_candidate_id on public.elections (winner_candidate_id);  -- elections_winner_fk
-- create index if not exists idx_elections_winner_declared_by on public.elections (winner_declared_by);  -- elections_winner_declared_by_fkey
-- create index if not exists idx_experience_certificates_committee_id on public.experience_certificates (committee_id);  -- experience_certificates_committee_id_fkey
-- create index if not exists idx_experience_certificates_revoked_by on public.experience_certificates (revoked_by);  -- experience_certificates_revoked_by_fkey
-- create index if not exists idx_guess_word_sessions_current_word_id on public.guess_word_sessions (current_word_id);  -- guess_word_sessions_current_word_fk
-- create index if not exists idx_member_badges_granted_by on public.member_badges (granted_by);  -- member_badges_granted_by_fkey
-- create index if not exists idx_member_warnings_cancelled_by on public.member_warnings (cancelled_by);  -- member_warnings_cancelled_by_fkey
-- create index if not exists idx_member_warnings_committee_id on public.member_warnings (committee_id);  -- member_warnings_committee_id_fkey
-- create index if not exists idx_member_warnings_role_at_issue on public.member_warnings (role_at_issue);  -- member_warnings_role_at_issue_fkey
-- create index if not exists idx_membership_applications_decided_by on public.membership_applications (decided_by);  -- membership_applications_decided_by_fkey
-- create index if not exists idx_membership_applications_recommended_by on public.membership_applications (recommended_by);  -- membership_applications_recommended_by_fkey
-- create index if not exists idx_news_created_by on public.news (created_by);  -- news_created_by_fkey
-- create index if not exists idx_news_reviewed_by on public.news (reviewed_by);  -- news_reviewed_by_fkey
-- create index if not exists idx_news_collaboration_comments_parent_comment_id on public.news_collaboration_comments (parent_comment_id);  -- news_collaboration_comments_parent_comment_id_fkey
-- create index if not exists idx_news_writer_assignments_assigned_by on public.news_writer_assignments (assigned_by);  -- news_writer_assignments_assigned_by_fkey
-- create index if not exists idx_notifications_sender_id on public.notifications (sender_id);  -- notifications_sender_id_fkey
-- create index if not exists idx_notifications_target_committee_id on public.notifications (target_committee_id);  -- notifications_target_committee_id_fkey
-- create index if not exists idx_participation_certificates_issued_by on public.participation_certificates (issued_by);  -- participation_certificates_issued_by_fkey
-- create index if not exists idx_participation_certificates_revoked_by on public.participation_certificates (revoked_by);  -- participation_certificates_revoked_by_fkey
-- create index if not exists idx_profile_name_changes_changed_by on public.profile_name_changes (changed_by);  -- profile_name_changes_changed_by_fkey
-- create index if not exists idx_radio_episodes_created_by on public.radio_episodes (created_by);  -- radio_episodes_created_by_fkey
-- create index if not exists idx_radio_episodes_host_member_id on public.radio_episodes (host_member_id);  -- radio_episodes_host_member_id_fkey
-- create index if not exists idx_radio_shows_created_by on public.radio_shows (created_by);  -- radio_shows_created_by_fkey
-- create index if not exists idx_radio_shows_host_member_id on public.radio_shows (host_member_id);  -- radio_shows_host_member_id_fkey
-- create index if not exists idx_radio_shows_producing_committee_id on public.radio_shows (producing_committee_id);  -- radio_shows_producing_committee_id_fkey
-- create index if not exists idx_roles_home_committee_id on public.roles (home_committee_id);  -- roles_home_committee_id_fkey
-- create index if not exists idx_roles_prerequisite_role_name on public.roles (prerequisite_role_name);  -- roles_prerequisite_role_name_fkey
-- create index if not exists idx_surveys_archived_by on public.surveys (archived_by);  -- surveys_archived_by_fkey
-- create index if not exists idx_surveys_deleted_by on public.surveys (deleted_by);  -- surveys_deleted_by_fkey
-- create index if not exists idx_task_assignments_marked_by on public.task_assignments (marked_by);  -- task_assignments_marked_by_fkey
-- create index if not exists idx_tasks_created_by on public.tasks (created_by);  -- tasks_created_by_fkey
-- create index if not exists idx_user_roles_assigned_by on public.user_roles (assigned_by);  -- user_roles_assigned_by_fkey
-- create index if not exists idx_user_roles_department_id on public.user_roles (department_id);  -- user_roles_department_id_fkey
-- create index if not exists idx_user_specific_permissions_granted_by on public.user_specific_permissions (granted_by);  -- user_specific_permissions_granted_by_fkey
-- create index if not exists idx_user_specific_permissions_permission_id on public.user_specific_permissions (permission_id);  -- user_specific_permissions_permission_id_fkey
-- create index if not exists idx_volunteer_applications_attendance_by on public.volunteer_applications (attendance_by);  -- volunteer_applications_attendance_by_fkey
-- create index if not exists idx_volunteer_applications_decided_by on public.volunteer_applications (decided_by);  -- volunteer_applications_decided_by_fkey
-- create index if not exists idx_volunteer_applications_evaluated_by on public.volunteer_applications (evaluated_by);  -- volunteer_applications_evaluated_by_fkey
-- create index if not exists idx_volunteer_opportunities_committee_id on public.volunteer_opportunities (committee_id);  -- volunteer_opportunities_committee_id_fkey
-- create index if not exists idx_volunteer_opportunities_created_by on public.volunteer_opportunities (created_by);  -- volunteer_opportunities_created_by_fkey
-- create index if not exists idx_volunteers_ended_by on public.volunteers (ended_by);  -- volunteers_ended_by_fkey
--
-- commit;

