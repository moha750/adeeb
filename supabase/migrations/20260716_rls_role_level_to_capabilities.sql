-- ═══════════════════════════════════════════════════════════════════════════
-- إعدام role_level من سياسات RLS → قدرات مُسمّاة (check_user_permission)
-- ═══════════════════════════════════════════════════════════════════════════
-- كلّ سياسة: DROP ثمّ CREATE، مع استبدال شرط role_level بالقدرة الدلاليّة.
-- البدائيّة: check_user_permission(uid, key) — SECURITY DEFINER، تمرّ عبر role_id بالاسم.
--
-- تصحيحات بق مقصودة (كان الترقيم يخفيها):
--   • faq/sponsors/works: كان `role_level <= 5` يمنح التعديل لعضو اللجنة والنائب → manage_website.
--   • profiles SELECT: كان ينتهي بـ`OR true` (مقروء للعموم) → نُبقيه true صراحةً بلا فحصٍ ميّت.
-- تضييقات دلاليّة مقصودة (القدرة أدقّ من الرقم):
--   • member_details: قراءة ≥7(٨) → view_members(٥)؛ كتابة → manage_member_data(٤).
--   • user_roles/roles/councils: → manage_positions (رئيس النادي).
--   • membership_accepted_members SELECT: ≥5(١١) → view_pending_members(٨).
-- قدرة جديدة: manage_games (لعبة خمّن الكلمة) — تُمنح للخمسة (صفّ ≥8) فلا يتغيّر واقعها.
--
-- مستثنى هنا (يُعالَج منفصلًا): notifications SELECT (تعبير جمهور ضخم — تبديلٌ دقيقٌ لاحقًا).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── قدرة جديدة: إدارة الألعاب ─────────────────────────────────────────────
insert into permissions (permission_key, permission_name_ar, category)
select 'manage_games', 'إدارة الألعاب', 'admin'
where not exists (select 1 from permissions where permission_key = 'manage_games');

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r cross join permissions p
where p.permission_key = 'manage_games'
  and r.role_name in ('club_president','president_advisor','executive_council_president','hr_committee_leader','qa_committee_leader')
  and not exists (select 1 from role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);

-- ── activities → manage_activities ────────────────────────────────────────
drop policy "activities_admin_delete" on public.activities;
create policy "activities_admin_delete" on public.activities as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_activities'));
drop policy "activities_admin_insert" on public.activities;
create policy "activities_admin_insert" on public.activities as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_activities'));
drop policy "activities_admin_update" on public.activities;
create policy "activities_admin_update" on public.activities as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_activities'));
drop policy "activities_select_published" on public.activities;
create policy "activities_select_published" on public.activities as permissive for select to anon, authenticated
  using ((is_published = true) or check_user_permission(auth.uid(), 'manage_activities'));

-- ── activity_log → view_watchtower ────────────────────────────────────────
drop policy "activity_log_select_admin_policy" on public.activity_log;
create policy "activity_log_select_admin_policy" on public.activity_log as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_watchtower'));

-- ── activity_reservations → manage_activities (مع إبقاء ملكيّة الزائر/العضو) ─
drop policy "reservations_select_own" on public.activity_reservations;
create policy "reservations_select_own" on public.activity_reservations as permissive for select to authenticated
  using ((visitor_id = auth.uid()) or (member_user_id = auth.uid()) or check_user_permission(auth.uid(), 'manage_activities'));

-- ── admin_impersonation_logs → impersonate_users ──────────────────────────
drop policy "Club president can insert impersonation logs" on public.admin_impersonation_logs;
create policy "Club president can insert impersonation logs" on public.admin_impersonation_logs as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'impersonate_users'));
drop policy "Club president can view all impersonation logs" on public.admin_impersonation_logs;
create policy "Club president can view all impersonation logs" on public.admin_impersonation_logs as permissive for select to public
  using (check_user_permission(auth.uid(), 'impersonate_users'));
drop policy "Club president can update impersonation logs" on public.admin_impersonation_logs;
create policy "Club president can update impersonation logs" on public.admin_impersonation_logs as permissive for update to public
  using (check_user_permission(auth.uid(), 'impersonate_users'));

-- ── archives (interviews/slots) → قراءة view_membership_archives · كتابة manage_interviews ─
drop policy "Allow admins to insert archived sessions" on public.archived_interview_sessions;
create policy "Allow admins to insert archived sessions" on public.archived_interview_sessions as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admins to read archived sessions" on public.archived_interview_sessions;
create policy "Allow admins to read archived sessions" on public.archived_interview_sessions as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow admins to insert archived slots" on public.archived_interview_slots;
create policy "Allow admins to insert archived slots" on public.archived_interview_slots as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admins to read archived slots" on public.archived_interview_slots;
create policy "Allow admins to read archived slots" on public.archived_interview_slots as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));

-- ── archives (membership) → قراءة view_membership_archives · كتابة manage_registration/interviews ─
drop policy "Allow admins to insert archived accepted members" on public.archived_membership_accepted_members;
create policy "Allow admins to insert archived accepted members" on public.archived_membership_accepted_members as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Allow admins to read archived accepted members" on public.archived_membership_accepted_members;
create policy "Allow admins to read archived accepted members" on public.archived_membership_accepted_members as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow admins to insert archived applications" on public.archived_membership_applications;
create policy "Allow admins to insert archived applications" on public.archived_membership_applications as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Allow admins to read archived applications" on public.archived_membership_applications;
create policy "Allow admins to read archived applications" on public.archived_membership_applications as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow admins to insert archived cycles" on public.archived_membership_cycles;
create policy "Allow admins to insert archived cycles" on public.archived_membership_cycles as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Allow admins to read archived cycles" on public.archived_membership_cycles;
create policy "Allow admins to read archived cycles" on public.archived_membership_cycles as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow admins to insert archived interviews" on public.archived_membership_interviews;
create policy "Allow admins to insert archived interviews" on public.archived_membership_interviews as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admins to read archived interviews" on public.archived_membership_interviews;
create policy "Allow admins to read archived interviews" on public.archived_membership_interviews as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Super admins can delete archived invitations" on public.archived_membership_invitations;
create policy "Super admins can delete archived invitations" on public.archived_membership_invitations as permissive for delete to public
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Admins can view archived invitations" on public.archived_membership_invitations;
create policy "Admins can view archived invitations" on public.archived_membership_invitations as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));

-- ── committees → manage_committees ────────────────────────────────────────
drop policy "committees_modify" on public.committees;
create policy "committees_modify" on public.committees as permissive for all to public
  using (check_user_permission(auth.uid(), 'manage_committees'));
drop policy "committees_select" on public.committees;
create policy "committees_select" on public.committees as permissive for select to public
  using ((is_active = true) or check_user_permission(auth.uid(), 'manage_committees'));

-- ── contact_messages → manage_contact ─────────────────────────────────────
drop policy "contact_messages_select_admin" on public.contact_messages;
create policy "contact_messages_select_admin" on public.contact_messages as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_contact'));
drop policy "contact_messages_update_admin" on public.contact_messages;
create policy "contact_messages_update_admin" on public.contact_messages as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_contact'))
  with check (check_user_permission(auth.uid(), 'manage_contact'));

-- ── councils → manage_positions ───────────────────────────────────────────
drop policy "councils_admin_write" on public.councils;
create policy "councils_admin_write" on public.councils as permissive for all to public
  using (check_user_permission(auth.uid(), 'manage_positions'));

-- ── faq/sponsors/works → manage_website [تصحيح بق `<= 5`] ─────────────────
drop policy "faq_modify_authorized" on public.faq;
create policy "faq_modify_authorized" on public.faq as permissive for all to authenticated
  using ((auth.uid() = created_by) or check_user_permission(auth.uid(), 'manage_website'));
drop policy "sponsors_modify_authorized" on public.sponsors;
create policy "sponsors_modify_authorized" on public.sponsors as permissive for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_website'));
drop policy "works_modify_authorized" on public.works;
create policy "works_modify_authorized" on public.works as permissive for all to authenticated
  using ((auth.uid() = created_by) or check_user_permission(auth.uid(), 'manage_website'));

-- ── guess_word_* → manage_games (مع إبقاء رؤية حالة اللعبة) ───────────────
drop policy "gw_answers_select" on public.guess_word_answers;
create policy "gw_answers_select" on public.guess_word_answers as permissive for select to anon, authenticated
  using (check_user_permission(auth.uid(), 'manage_games') or (exists ( select 1
    from (guess_word_words w join guess_word_sessions s on ((s.id = w.session_id)))
    where ((w.id = guess_word_answers.word_id) and (s.status = 'finished'::text)))));
drop policy "gw_players_select" on public.guess_word_players;
create policy "gw_players_select" on public.guess_word_players as permissive for select to anon, authenticated
  using ((is_kicked = false) or check_user_permission(auth.uid(), 'manage_games'));
drop policy "gw_words_select" on public.guess_word_words;
create policy "gw_words_select" on public.guess_word_words as permissive for select to anon, authenticated
  using (check_user_permission(auth.uid(), 'manage_games')
    or (exists ( select 1 from guess_word_sessions s
      where ((s.id = guess_word_words.session_id) and (s.current_word_id = guess_word_words.id))))
    or (exists ( select 1 from guess_word_sessions s
      where ((s.id = guess_word_words.session_id) and (s.status = 'finished'::text)))));

-- ── impersonation_sessions → impersonate_users ────────────────────────────
drop policy "Presidents can create impersonation sessions" on public.impersonation_sessions;
create policy "Presidents can create impersonation sessions" on public.impersonation_sessions as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'impersonate_users'));
drop policy "Presidents can view all impersonation sessions" on public.impersonation_sessions;
create policy "Presidents can view all impersonation sessions" on public.impersonation_sessions as permissive for select to public
  using (check_user_permission(auth.uid(), 'impersonate_users'));
drop policy "Presidents can update impersonation sessions" on public.impersonation_sessions;
create policy "Presidents can update impersonation sessions" on public.impersonation_sessions as permissive for update to public
  using (check_user_permission(auth.uid(), 'impersonate_users'));

-- ── interview_sessions / interview_slots → manage_interviews ──────────────
drop policy "Allow admin delete sessions" on public.interview_sessions;
create policy "Allow admin delete sessions" on public.interview_sessions as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admin create sessions" on public.interview_sessions;
create policy "Allow admin create sessions" on public.interview_sessions as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admin read all sessions" on public.interview_sessions;
create policy "Allow admin read all sessions" on public.interview_sessions as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admin update sessions" on public.interview_sessions;
create policy "Allow admin update sessions" on public.interview_sessions as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admin insert slots" on public.interview_slots;
create policy "Allow admin insert slots" on public.interview_slots as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admin read all slots" on public.interview_slots;
create policy "Allow admin read all slots" on public.interview_slots as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "Allow admin update slots" on public.interview_slots;
create policy "Allow admin update slots" on public.interview_slots as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));

-- ── archives (interviews/applications) → view_membership_archives ─────────
drop policy "Allow read sessions archive for level 7+" on public.interview_sessions_archive;
create policy "Allow read sessions archive for level 7+" on public.interview_sessions_archive as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow read slots archive for level 7+" on public.interview_slots_archive;
create policy "Allow read slots archive for level 7+" on public.interview_slots_archive as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow read applications archive for level 7+" on public.membership_applications_archive;
create policy "Allow read applications archive for level 7+" on public.membership_applications_archive as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));
drop policy "Allow read interviews archive for level 7+" on public.membership_interviews_archive;
create policy "Allow read interviews archive for level 7+" on public.membership_interviews_archive as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_membership_archives'));

-- ── invitation_usages → view_applications ─────────────────────────────────
drop policy "Admins can view invitation usages" on public.invitation_usages;
create policy "Admins can view invitation usages" on public.invitation_usages as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_applications'));

-- ── member_details → قراءة view_members · كتابة manage_member_data ────────
drop policy "المسؤولون يمكنهم إدراج بيانات الأ" on public.member_details;
create policy "المسؤولون يمكنهم إدراج بيانات الأ" on public.member_details as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_member_data'));
drop policy "المسؤولون يمكنهم قراءة جميع البيا" on public.member_details;
create policy "المسؤولون يمكنهم قراءة جميع البيا" on public.member_details as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_members'));
drop policy "المسؤولون يمكنهم تحديث بيانات الأ" on public.member_details;
create policy "المسؤولون يمكنهم تحديث بيانات الأ" on public.member_details as permissive for update to public
  using (check_user_permission(auth.uid(), 'manage_member_data'));

-- ── member_evaluations → كتابة manage_member_data · قراءة view_department_reports ─
drop policy "member_evaluations_insert_policy" on public.member_evaluations;
create policy "member_evaluations_insert_policy" on public.member_evaluations as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_member_data'));
drop policy "member_evaluations_select_admin_policy" on public.member_evaluations;
create policy "member_evaluations_select_admin_policy" on public.member_evaluations as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_department_reports'));

-- ── member_onboarding_tokens → manage_registration ────────────────────────
drop policy "member_onboarding_tokens_delete_admin" on public.member_onboarding_tokens;
create policy "member_onboarding_tokens_delete_admin" on public.member_onboarding_tokens as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "member_onboarding_tokens_insert_admin" on public.member_onboarding_tokens;
create policy "member_onboarding_tokens_insert_admin" on public.member_onboarding_tokens as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "member_onboarding_tokens_select_admin" on public.member_onboarding_tokens;
create policy "member_onboarding_tokens_select_admin" on public.member_onboarding_tokens as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "member_onboarding_tokens_update_admin" on public.member_onboarding_tokens;
create policy "member_onboarding_tokens_update_admin" on public.member_onboarding_tokens as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'))
  with check (check_user_permission(auth.uid(), 'manage_registration'));

-- ── membership_accepted_members → approve/view_pending (مع إبقاء فرع check_permission) ─
drop policy "allow_superadmin_delete_accepted_members" on public.membership_accepted_members;
create policy "allow_superadmin_delete_accepted_members" on public.membership_accepted_members as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "allow_admin_insert_accepted_members" on public.membership_accepted_members;
create policy "allow_admin_insert_accepted_members" on public.membership_accepted_members as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'approve_applications') or check_permission(auth.uid(), 'membership.manage'::text));
drop policy "allow_users_select_accepted_members" on public.membership_accepted_members;
create policy "allow_users_select_accepted_members" on public.membership_accepted_members as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'view_pending_members') or check_permission(auth.uid(), 'membership.view'::text));
drop policy "allow_admin_update_accepted_members" on public.membership_accepted_members;
create policy "allow_admin_update_accepted_members" on public.membership_accepted_members as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'approve_applications') or check_permission(auth.uid(), 'membership.manage'::text));

-- ── membership_available_committees → manage_registration (مع إبقاء check_permission) ─
drop policy "allow_admin_delete_membership_available_committees" on public.membership_available_committees;
create policy "allow_admin_delete_membership_available_committees" on public.membership_available_committees as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.delete'::text));
drop policy "allow_admin_insert_membership_available_committees" on public.membership_available_committees;
create policy "allow_admin_insert_membership_available_committees" on public.membership_available_committees as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text));
drop policy "allow_authenticated_select_all_membership_available_committees" on public.membership_available_committees;
create policy "allow_authenticated_select_all_membership_available_committees" on public.membership_available_committees as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text));
drop policy "allow_admin_update_membership_available_committees" on public.membership_available_committees;
create policy "allow_admin_update_membership_available_committees" on public.membership_available_committees as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text))
  with check (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text));

-- ── membership_cycle_snapshots → كتابة manage_registration · قراءة view_membership_archives ─
drop policy "allow_superadmin_delete_snapshots" on public.membership_cycle_snapshots;
create policy "allow_superadmin_delete_snapshots" on public.membership_cycle_snapshots as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "allow_admin_insert_snapshots" on public.membership_cycle_snapshots;
create policy "allow_admin_insert_snapshots" on public.membership_cycle_snapshots as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "allow_admin_select_snapshots" on public.membership_cycle_snapshots;
create policy "allow_admin_select_snapshots" on public.membership_cycle_snapshots as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'view_membership_archives'));

-- ── membership_cycles → كتابة manage_registration · قراءة view_pending_members ─
drop policy "Allow delete cycles for level 10" on public.membership_cycles;
create policy "Allow delete cycles for level 10" on public.membership_cycles as permissive for delete to public
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "allow_superadmin_delete_cycles" on public.membership_cycles;
create policy "allow_superadmin_delete_cycles" on public.membership_cycles as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "allow_admin_insert_cycles" on public.membership_cycles;
create policy "allow_admin_insert_cycles" on public.membership_cycles as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Allow read cycles for level 7+" on public.membership_cycles;
create policy "Allow read cycles for level 7+" on public.membership_cycles as permissive for select to public
  using (check_user_permission(auth.uid(), 'view_pending_members'));
drop policy "allow_admin_select_cycles" on public.membership_cycles;
create policy "allow_admin_select_cycles" on public.membership_cycles as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'view_pending_members'));
drop policy "allow_admin_update_cycles" on public.membership_cycles;
create policy "allow_admin_update_cycles" on public.membership_cycles as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));

-- ── membership_interviews → manage_interviews ─────────────────────────────
drop policy "allow_superadmin_delete_interviews" on public.membership_interviews;
create policy "allow_superadmin_delete_interviews" on public.membership_interviews as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "allow_admin_insert_interviews" on public.membership_interviews;
create policy "allow_admin_insert_interviews" on public.membership_interviews as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "allow_admin_select_interviews" on public.membership_interviews;
create policy "allow_admin_select_interviews" on public.membership_interviews as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));
drop policy "allow_admin_update_interviews" on public.membership_interviews;
create policy "allow_admin_update_interviews" on public.membership_interviews as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_interviews'));

-- ── membership_invitations → manage_registration ──────────────────────────
drop policy "Super admins can delete invitations" on public.membership_invitations;
create policy "Super admins can delete invitations" on public.membership_invitations as permissive for delete to public
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Admins can create invitations" on public.membership_invitations;
create policy "Admins can create invitations" on public.membership_invitations as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Admins can view invitations" on public.membership_invitations;
create policy "Admins can view invitations" on public.membership_invitations as permissive for select to public
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "Admins can update invitations" on public.membership_invitations;
create policy "Admins can update invitations" on public.membership_invitations as permissive for update to public
  using (check_user_permission(auth.uid(), 'manage_registration'));

-- ── membership_registration_archives → كتابة manage_registration · قراءة view_membership_archives (مع check_permission) ─
drop policy "allow_superadmin_delete_membership_archives" on public.membership_registration_archives;
create policy "allow_superadmin_delete_membership_archives" on public.membership_registration_archives as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration'));
drop policy "allow_admin_insert_membership_archives" on public.membership_registration_archives;
create policy "allow_admin_insert_membership_archives" on public.membership_registration_archives as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text));
drop policy "allow_authenticated_select_membership_archives" on public.membership_registration_archives;
create policy "allow_authenticated_select_membership_archives" on public.membership_registration_archives as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'view_membership_archives') or check_permission(auth.uid(), 'membership.view'::text));
drop policy "allow_admin_update_membership_archives" on public.membership_registration_archives;
create policy "allow_admin_update_membership_archives" on public.membership_registration_archives as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text));

-- ── membership_settings → manage_registration (مع check_permission) ───────
drop policy "allow_admin_update_membership_settings" on public.membership_settings;
create policy "allow_admin_update_membership_settings" on public.membership_settings as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text))
  with check (check_user_permission(auth.uid(), 'manage_registration') or check_permission(auth.uid(), 'membership.settings'::text));

-- ── newsletter_subscribers → manage_newsletter ────────────────────────────
drop policy "newsletter_subscribers_delete_admin" on public.newsletter_subscribers;
create policy "newsletter_subscribers_delete_admin" on public.newsletter_subscribers as permissive for delete to authenticated
  using (check_user_permission(auth.uid(), 'manage_newsletter'));
drop policy "newsletter_subscribers_select_admin" on public.newsletter_subscribers;
create policy "newsletter_subscribers_select_admin" on public.newsletter_subscribers as permissive for select to authenticated
  using (check_user_permission(auth.uid(), 'manage_newsletter'));
drop policy "newsletter_subscribers_update_admin" on public.newsletter_subscribers;
create policy "newsletter_subscribers_update_admin" on public.newsletter_subscribers as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_newsletter'))
  with check (check_user_permission(auth.uid(), 'manage_newsletter'));

-- ── notifications (write) → manage_notifications ──────────────────────────
drop policy "Club president can delete notifications" on public.notifications;
create policy "Club president can delete notifications" on public.notifications as permissive for delete to public
  using (check_user_permission(auth.uid(), 'manage_notifications'));
drop policy "Club president can create notifications" on public.notifications;
create policy "Club president can create notifications" on public.notifications as permissive for insert to public
  with check (check_user_permission(auth.uid(), 'manage_notifications'));
drop policy "Club president can update notifications" on public.notifications;
create policy "Club president can update notifications" on public.notifications as permissive for update to public
  using (check_user_permission(auth.uid(), 'manage_notifications'));
-- (سياسة SELECT «Users can view their notifications» تُعالَج منفصلًا — تعبير جمهور ضخم)

-- ── profiles → manage_member_data (قراءة عامّة مُبقاة صراحةً) ──────────────
drop policy "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles as permissive for delete to public
  using (check_user_permission(auth.uid(), 'manage_member_data'));
drop policy "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles as permissive for insert to authenticated
  with check ((id = auth.uid()) or check_user_permission(auth.uid(), 'manage_member_data'));
drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles as permissive for select to public
  using (true);
drop policy "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles as permissive for update to public
  using (check_user_permission(auth.uid(), 'manage_member_data'));

-- ── roles / user_roles → manage_positions ─────────────────────────────────
drop policy "roles_modify" on public.roles;
create policy "roles_modify" on public.roles as permissive for all to public
  using (check_user_permission(auth.uid(), 'manage_positions'));
drop policy "user_roles_delete" on public.user_roles;
create policy "user_roles_delete" on public.user_roles as permissive for delete to public
  using (check_user_permission(auth.uid(), 'manage_positions'));
drop policy "user_roles_insert" on public.user_roles;
create policy "user_roles_insert" on public.user_roles as permissive for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_positions'));
drop policy "user_roles_update" on public.user_roles;
create policy "user_roles_update" on public.user_roles as permissive for update to authenticated
  using (check_user_permission(auth.uid(), 'manage_positions'))
  with check (check_user_permission(auth.uid(), 'manage_positions'));

-- ── site_settings → manage_website ────────────────────────────────────────
drop policy "Allow admins to manage settings" on public.site_settings;
create policy "Allow admins to manage settings" on public.site_settings as permissive for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_website'))
  with check (check_user_permission(auth.uid(), 'manage_website'));

-- ── visitors → view_site_stats (مع إبقاء رؤية النفس) ──────────────────────
drop policy "visitors_select_self" on public.visitors;
create policy "visitors_select_self" on public.visitors as permissive for select to authenticated
  using ((auth.uid() = id) or check_user_permission(auth.uid(), 'view_site_stats'));
