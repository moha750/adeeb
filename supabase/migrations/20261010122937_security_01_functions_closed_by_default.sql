-- ══════════════════════════════════════════════════════════════════════════════
-- أمنٌ ٠١ (٢٠٢٦-١٠-١٠): الدالّةُ تُولد مغلقة، وما فُتح بلا حاجةٍ يُغلق
--
-- **الجذر**: الصلاحيّاتُ الافتراضيّة في Supabase تمنح `anon` و`authenticated` (و`PUBLIC` من
-- PostgreSQL نفسِه) حقَّ تنفيذ كلِّ دالّةٍ تُنشأ في `public`. فكلُّ دالّةٍ جديدة أو مُعادةِ الإنشاء
-- تولد منادًى عليها من الإنترنت. هكذا عادت `members_i_may_warn` و`warnings_for_reader` مفتوحتين
-- بعد أن أُغلق صنفُهما في ٢٠٢٦-٠٨-٠٦: تثقان بمعرّف الفاعل الذي يمرّره المنادي، فكان سجلُّ
-- الإنذارات وأرقامُ الجوّالات مقروءةً بلا دخول بمعرّف أحد الرئيسين.
--
-- **العلاج**:
--   ١) تُقلب القاعدةُ الافتراضيّة: الدالّةُ الجديدة لا يناديها إلّا `service_role` ومالكُها. ومن
--      أراد دالّةً للمتصفّح أو للزائر فـ`grant execute` صريحٌ في ترحيله، بسببٍ مكتوب.
--   ٢) تُغلق ٤٨ دالّةً مفتوحةً اليوم بلا حاجة: كلُّ نداءٍ لها في الموقع بمفتاح الخدمة، أو لا
--      نداءَ لها أصلًا. ومنها ما كان يُكتب به: `_send_election_notification` (إشعارٌ لكلّ الأعضاء
--      بنصٍّ يختاره أيُّ زائر)، و`confirm_user_email` (توثيقُ بريدِ أيّ حساب)،
--      و`library_reorder_pages` (عبثٌ بترتيب صفحات المكتبة)، و`log_activity` (سجلٌّ مزوَّر)،
--      و`get_user_notifications` (إشعاراتُ أيّ عضو).
--   ٣) ١٧ دالّةً تُنادى بعد الدخول وحده تُغلق عن الزائر.
--
-- **ما لا يُمَسّ**: دوالُّ سياسات RLS التي يقيّمها الزائر (`check_user_permission` بمُعامِلين،
-- `can_edit_member_data`، `news_role`، …)، وأبوابُ الموقع العامّة (`get_board_members`،
-- `verify_certificate`، …)، وكلُّ دالّةٍ تقرأ الفاعلَ من `auth.uid()`، ودوالُّ المنبّهات.
-- ══════════════════════════════════════════════════════════════════════════════

-- ١) الجذر: الدالّةُ الجديدة مغلقة
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

-- ٢) مغلقةٌ عن الجميع إلّا الخادم، و٣) للداخلين وحدهم
do $$
declare f text;
begin
  foreach f in array array[
    '_choice_weight(uuid, text)',
    '_count_active_candidates(uuid)',
    '_count_approved_candidates(uuid)',
    '_send_election_notification(uuid, text, text, text, text, text, uuid[], jsonb)',
    'calculate_average_rating(integer)',
    'calculate_nps_score(integer, integer)',
    'get_option_distribution(integer)',
    'can_change_name(uuid)',
    'can_manage_site_visits(uuid)',
    'can_view_site_visits(uuid)',
    'check_any_permission(uuid, text[], text)',
    'check_permission(uuid, text, text, jsonb)',
    'confirm_user_email(uuid)',
    'department_resolution_state(uuid)',
    'election_department(uuid)',
    'get_unread_notifications_count(uuid)',
    'get_user_notifications(uuid, integer)',
    'get_user_all_permissions(uuid)',
    'get_user_permissions(uuid)',
    'get_user_permissions_by_module(uuid, text)',
    'get_user_primary_role(uuid)',
    'get_vote_weight(uuid)',
    'position_title_of(uuid)',
    'grant_user_specific_permission(uuid, text, text, boolean, timestamp with time zone, uuid, text)',
    'is_confidence_election(uuid)',
    'is_sole_candidate(uuid, uuid)',
    'is_target_position_vacant(text, integer, integer)',
    'is_user_eligible_to_run(uuid, uuid)',
    'is_user_eligible_to_vote(uuid, uuid)',
    'seat_declared_by_unit(text, integer)',
    'library_reorder_pages(uuid, uuid[])',
    'log_activity(uuid, text, text, text, jsonb)',
    'log_activity(uuid, text, text, text, jsonb, text)',
    'members_i_may_warn(uuid)',
    'warnings_for_reader(uuid)',
    'sweep_election_deadlines()',
    'sweep_radio_schedule()',
    'admin_units_i_may_staff(uuid)',
    'get_member_election_signals(uuid)',
    'count_user_election_tabs(uuid)',
    'update_member_email(uuid, text)',
    'update_member_password(uuid, text)',
    'log_news_activity(uuid, text, jsonb)',
    'get_occupied_positions()',
    'is_club_president(uuid)',
    'is_warning_exempt(uuid)',
    'is_adeeb_member(uuid)',
    'check_user_permission(uuid, text, text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;

  foreach f in array array[
    'can_view_warnings_of(uuid, uuid)',
    'can_manage_tasks_of(uuid, integer)',
    'can_voter_read_election_file(uuid, text)',
    'has_election_view_permission(uuid, uuid)',
    'is_adeeb_staff(uuid)',
    'current_user_is_admin()',
    'task_committee(uuid)',
    'is_my_task(uuid)',
    'get_eligible_elections_for_user(uuid)',
    'get_votable_elections_for_user(uuid)',
    'get_election_voters_participation(uuid)',
    'get_candidates_with_identity(uuid)',
    'get_election_results(uuid)',
    'get_anonymized_candidates(uuid)',
    'get_election_audit_log(uuid)',
    'get_election_vote_detail(uuid)',
    'get_candidate_audit_trail(uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
