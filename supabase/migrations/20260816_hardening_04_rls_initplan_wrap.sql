-- ١١٣ سياسةً تُعيد تقييم `auth.uid()` لكلّ صفٍّ تُقرأ — والحكمُ واحدٌ فلا يُعاد حسابُه.
--
-- القصّة: حين تُكتب `auth.uid()` عاريةً في شرط سياسة، لا يعرف المخطِّطُ أنّها قيمةٌ واحدة
-- للاستعلام كلِّه، فيُدرجها في **مرشِّح الصفّ**: تُنادى مرّةً لكلّ صفٍّ يمرّ. وإذا لُفَّت في
-- استعلامٍ قياسيّ `(select auth.uid())` صارت `InitPlan` تُحسب **مرّةً واحدة** قبل المسح
-- وتُبَثّ قيمتُها. القيمةُ هي هي، والحكمُ هو هو، وإنّما يسقط تكرارُ الحساب.
-- (مستشارُ Supabase يسمّيها `auth_rls_initplan`، وعدَّها اليومَ ١١٣.)
--
-- **هذا الملفُّ أداءٌ محضٌ، لا يغيّر سلوكًا.** لا سياسةَ تُضاف ولا تُحذف، ولا اسمَ يتبدّل،
-- ولا دورَ ولا أمرَ ولا «متساهلة/مقيِّدة». وهي دعوى تُبرهَن لا تُقال، وبرهانُها في أداتين:
--
-- **الأولى: `alter policy` لا `drop`+`create`.** الاسمُ والأمرُ (SELECT/INSERT/…) والأدوارُ
-- وكونُها PERMISSIVE أو RESTRICTIVE **لا تُذكر في هذا الملفّ أصلًا**، و`alter policy` لا
-- يملك تغييرَها. فالشيءُ الوحيدُ الذي يُسلَّم للقاعدة هو نصُّ الشرط. وما لا يُكتب لا يُكسَر.
-- (وسياسةُ UPDATE التي لم يُكتب لها `with check` تبقى بلا واحدة، فيبقى شرطُ `using` هو
-- شرطَ الفحص كما كان — لُفَّ الاثنان لفًّا واحدًا لأنّهما نصٌّ واحد.)
--
-- **الثانية: الملفُّ مولَّدٌ لا مكتوب.** لم تُلمَس سياسةٌ بيد. وهذا هو الاستعلامُ الذي
-- أخرجه بحرفه، ويُعاد به الاشتقاقُ والتدقيق:
--
--   with hit as (
--     select schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
--     from pg_policies
--     where schemaname = 'public'
--       and (coalesce(qual,'')||' '||coalesce(with_check,'')) ~  'auth\.(uid|role|jwt|email)\(\)'
--       and (coalesce(qual,'')||' '||coalesce(with_check,'')) !~ '\(\s*SELECT auth\.'
--   ), gen as (
--     select tablename, cmd, policyname,
--       format('-- %s · %s · %s%s'||chr(10)||'alter policy %I on %I.%I%s%s;',
--         tablename, cmd, lower(permissive),
--         case when array_length(roles,1) is not null then ' · to '||array_to_string(roles,', ') else '' end,
--         policyname, schemaname, tablename,
--         case when qual is null then ''
--              else chr(10)||'  using ('      || regexp_replace(qual,       'auth\.(uid|role|jwt|email)\(\)', '(select auth.\1())', 'g') || ')' end,
--         case when with_check is null then ''
--              else chr(10)||'  with check (' || regexp_replace(with_check, 'auth\.(uid|role|jwt|email)\(\)', '(select auth.\1())', 'g') || ')' end
--       ) as stmt
--     from hit
--   )
--   select string_agg(stmt, chr(10)||chr(10) order by tablename, cmd, policyname) from gen;
--
-- الشرطُ الثاني في `hit` (`!~ '\(\s*SELECT auth\.'`) يستثني ما لُفَّ من قبل، فلا يُلَفّ
-- لفًّا ثانيًا. وهو استثنى **أربعَ** سياسات؛ ١١٧ تمسّ `auth.*` ناقصَ ٤ = ١١٣، وهو عددُ
-- المستشار نفسُه، فالمجموعتان واحدة.
--
-- **ما فُحص قبل التوليد** (لئلّا تكون جراحةُ النصّ عمياء):
--   · لا `auth.` في أيّ شرطٍ إلّا وهي إحدى الأربع `uid()`/`role()`/`jwt()`/`email()` — قِيس
--     بعدِّ ما سواها، فكان صفرًا. فلا نصَّ حرفيًّا يحمل `auth.` فيُصاب بالبديل.
--   · لا `current_setting` في أيٍّ منها، فلا يبقى بعد اللفِّ نداءٌ لكلّ صفّ.
--   · لا اقتباسَ مضاعف ولا `$$` ولا شرطةٌ مائلةٌ عكسيّةٌ في أيّ نصّ.
--   · أسماءُ السياسات: منها سبعَ عشرةَ فيها مسافاتٌ أو حروفٌ عربيّة (وبعضُ العربيّة مقصوصٌ
--     عند ثلاثةٍ وستّين بايتًا يومَ أُنشئ) — ولذلك كُتبت كلُّها بـ`%I` أي `quote_ident`،
--     فتخرج مقتبسةً كما هي بايتًا ببايت.
--   · ١١٢ سياسةً فيها `auth.uid()` وواحدةٌ فيها `auth.role()` (على `committee_supervision`)،
--     ولا `jwt()` ولا `email()`.
--
-- **الحصيلة**: ١١٣ جملةً، ٥٥ جدولًا، ١٧٣ نداءً لُفَّ، وصفرُ نداءٍ عارٍ بقي في المخرَج.
--
-- **طريقُ البحث وقتَ التطبيق**: نصوصُ الشروط هنا مأخوذةٌ من `pg_get_expr`، وهي تُؤهِّل
-- بالمخطَّط ما لا يُرى في طريق جلسةِ التوليد. وكان طريقُها `"$user", public, extensions`
-- (وهو طريقُ `postgres` القياسيّ في هذا المشروع). فيُطبَّق الملفُّ بجلسةٍ طريقُها هو هو —
-- وهو الحالُ إن طُبِّق بـ`postgres` من محرِّر SQL أو من الـMCP.
--
-- **الرجوع**: عكسُ اللفِّ نصّيّ. تُلتقط السياساتُ الملفوفة وتُعاد كما كانت:
--   regexp_replace(qual, '\( SELECT (auth\.(uid|role|jwt|email)\(\)) AS \w+\)', '\1', 'g')
-- وكذلك `with_check`، ثمّ `alter policy` بها. والأسلمُ من ذلك: لقطةُ `pg_policies` قبل
-- التطبيق تُحفَظ، فمنها يُعاد النصُّ الأصليُّ بلا اشتقاق:
--   select tablename, policyname, cmd, permissive, roles, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename, policyname;
--
-- **التحقّقُ بعد التطبيق**: يجب أن يعود صفرًا:
--   select count(*) from pg_policies
--   where schemaname = 'public'
--     and (coalesce(qual,'')||' '||coalesce(with_check,'')) ~  'auth\.(uid|role|jwt|email)\(\)'
--     and (coalesce(qual,'')||' '||coalesce(with_check,'')) !~ '\(\s*SELECT auth\.';
-- ثمّ يُعاد مستشارُ الأداء، فتسقط `auth_rls_initplan` كلُّها.
--
-- الملفُّ كلُّه معاملةٌ واحدة: إمّا أن تنزل الـ١١٣ جميعًا وإمّا ألّا ينزل منها شيء.
-- (`alter policy` يأخذ قفلًا على الجدول، والجداولُ هنا كلُّها صغيرة — أكبرُها ٣٣٥ صفًّا.)

begin;

-- achievements · ALL · permissive · to authenticated
alter policy achievements_write_website on public.achievements
  using (check_user_permission((select auth.uid()), 'manage_achievements'::text))
  with check (check_user_permission((select auth.uid()), 'manage_achievements'::text));

-- activities · DELETE · permissive · to authenticated
alter policy activities_admin_delete on public.activities
  using (check_user_permission((select auth.uid()), 'manage_activities'::text));

-- activities · INSERT · permissive · to authenticated
alter policy activities_admin_insert on public.activities
  with check (check_user_permission((select auth.uid()), 'manage_activities'::text));

-- activities · SELECT · permissive · to anon, authenticated
alter policy activities_select_published on public.activities
  using (((is_published = true) OR check_user_permission((select auth.uid()), 'manage_activities'::text)));

-- activities · UPDATE · permissive · to authenticated
alter policy activities_admin_update on public.activities
  using (check_user_permission((select auth.uid()), 'manage_activities'::text));

-- activity_log · SELECT · permissive · to public
alter policy activity_log_select_admin_policy on public.activity_log
  using (check_user_permission((select auth.uid()), 'view_watchtower'::text));

-- activity_log · SELECT · permissive · to public
alter policy activity_log_select_own_policy on public.activity_log
  using ((user_id = (select auth.uid())));

-- activity_reservations · SELECT · permissive · to authenticated
alter policy reservations_select_own on public.activity_reservations
  using (((user_id = (select auth.uid())) OR check_user_permission((select auth.uid()), 'manage_activities'::text)));

-- comment_likes · DELETE · permissive · to public
alter policy "المستخدمون يمكنهم حذف إعجاباتهم ل" on public.comment_likes
  using (((select auth.uid()) = user_id));

-- comment_likes · INSERT · permissive · to public
alter policy "المستخدمون يمكنهم إضافة إعجاب للت" on public.comment_likes
  with check ((((select auth.uid()) = user_id) OR (guest_identifier IS NOT NULL)));

-- committee_supervision · ALL · permissive · to public
alter policy committee_supervision_modify on public.committee_supervision
  using (check_user_permission((select auth.uid()), 'manage_positions'::text))
  with check (check_user_permission((select auth.uid()), 'manage_positions'::text));

-- committee_supervision · SELECT · permissive · to public
alter policy committee_supervision_select on public.committee_supervision
  using (((select auth.role()) = 'authenticated'::text));

-- committees · ALL · permissive · to public
alter policy committees_modify on public.committees
  using (check_user_permission((select auth.uid()), 'manage_committees'::text));

-- committees · SELECT · permissive · to public
alter policy committees_select on public.committees
  using (((is_active = true) OR check_user_permission((select auth.uid()), 'manage_committees'::text)));

-- contact_messages · SELECT · permissive · to authenticated
alter policy contact_messages_select_admin on public.contact_messages
  using (check_user_permission((select auth.uid()), 'manage_contact'::text));

-- contact_messages · UPDATE · permissive · to authenticated
alter policy contact_messages_update_admin on public.contact_messages
  using (check_user_permission((select auth.uid()), 'manage_contact'::text))
  with check (check_user_permission((select auth.uid()), 'manage_contact'::text));

-- councils · ALL · permissive · to public
alter policy councils_admin_write on public.councils
  using (check_user_permission((select auth.uid()), 'manage_positions'::text));

-- departments · ALL · permissive · to public
alter policy departments_modify_president on public.departments
  using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.is_active = true) AND (ur.role_name = 'club_president'::text)))));

-- election_audit_log · SELECT · permissive · to authenticated
alter policy audit_select_admin on public.election_audit_log
  using (has_election_admin_permission((select auth.uid())));

-- election_audit_log · SELECT · permissive · to authenticated
alter policy audit_select_viewer on public.election_audit_log
  using (((election_id IS NOT NULL) AND has_election_view_permission((select auth.uid()), election_id)));

-- election_candidates · DELETE · permissive · to authenticated
alter policy candidates_delete_admin on public.election_candidates
  using (has_election_admin_permission((select auth.uid())));

-- election_candidates · INSERT · permissive · to authenticated
alter policy candidates_insert_self on public.election_candidates
  with check ((user_id = (select auth.uid())));

-- election_candidates · SELECT · permissive · to authenticated
alter policy candidates_select_admin on public.election_candidates
  using (has_election_admin_permission((select auth.uid())));

-- election_candidates · SELECT · permissive · to authenticated
alter policy candidates_select_own on public.election_candidates
  using ((user_id = (select auth.uid())));

-- election_candidates · SELECT · permissive · to authenticated
alter policy candidates_select_viewer on public.election_candidates
  using (has_election_view_permission((select auth.uid()), election_id));

-- election_candidates · UPDATE · permissive · to authenticated
alter policy candidates_update_admin on public.election_candidates
  using (has_election_admin_permission((select auth.uid())))
  with check (has_election_admin_permission((select auth.uid())));

-- election_candidates · UPDATE · permissive · to authenticated
alter policy candidates_update_self on public.election_candidates
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

-- election_votes · INSERT · permissive · to authenticated
alter policy votes_insert_self on public.election_votes
  with check ((voter_id = (select auth.uid())));

-- election_votes · SELECT · permissive · to authenticated
alter policy votes_select_admin on public.election_votes
  using (has_election_admin_permission((select auth.uid())));

-- election_votes · SELECT · permissive · to authenticated
alter policy votes_select_self on public.election_votes
  using ((voter_id = (select auth.uid())));

-- elections · DELETE · permissive · to authenticated
alter policy elections_delete_admin on public.elections
  using (has_election_admin_permission((select auth.uid())));

-- elections · INSERT · permissive · to authenticated
alter policy elections_insert_admin on public.elections
  with check (has_election_admin_permission((select auth.uid())));

-- elections · SELECT · permissive · to authenticated
alter policy elections_select_all on public.elections
  using (is_adeeb_member((select auth.uid())));

-- elections · UPDATE · permissive · to authenticated
alter policy elections_update_admin on public.elections
  using (has_election_admin_permission((select auth.uid())))
  with check (has_election_admin_permission((select auth.uid())));

-- experience_certificates · SELECT · permissive · to public
alter policy experience_certificates_select on public.experience_certificates
  using (can_view_certificate_of((select auth.uid()), user_id));

-- faq · ALL · permissive · to authenticated
alter policy faq_write_website on public.faq
  using (check_user_permission((select auth.uid()), 'manage_faq'::text))
  with check (check_user_permission((select auth.uid()), 'manage_faq'::text));

-- guess_word_answers · SELECT · permissive · to anon, authenticated
alter policy gw_answers_select on public.guess_word_answers
  using ((check_user_permission((select auth.uid()), 'manage_games'::text) OR (EXISTS ( SELECT 1
   FROM (guess_word_words w
     JOIN guess_word_sessions s ON ((s.id = w.session_id)))
  WHERE ((w.id = guess_word_answers.word_id) AND (s.status = 'finished'::text))))));

-- guess_word_players · SELECT · permissive · to anon, authenticated
alter policy gw_players_select on public.guess_word_players
  using (((is_kicked = false) OR check_user_permission((select auth.uid()), 'manage_games'::text)));

-- guess_word_words · SELECT · permissive · to anon, authenticated
alter policy gw_words_select on public.guess_word_words
  using ((check_user_permission((select auth.uid()), 'manage_games'::text) OR (EXISTS ( SELECT 1
   FROM guess_word_sessions s
  WHERE ((s.id = guess_word_words.session_id) AND (s.current_word_id = guess_word_words.id)))) OR (EXISTS ( SELECT 1
   FROM guess_word_sessions s
  WHERE ((s.id = guess_word_words.session_id) AND (s.status = 'finished'::text))))));

-- member_details · INSERT · permissive · to public
alter policy "المسؤولون يمكنهم إدراج بيانات الأ" on public.member_details
  with check (check_user_permission((select auth.uid()), 'manage_member_data'::text));

-- member_details · INSERT · permissive · to public
alter policy "المستخدمون يمكنهم إنشاء بياناتهم " on public.member_details
  with check (((select auth.uid()) = user_id));

-- member_details · SELECT · permissive · to public
alter policy committee_leaders_can_read_members_details on public.member_details
  using ((EXISTS ( SELECT 1
   FROM (user_roles leader_ur
     JOIN user_roles member_ur ON ((member_ur.committee_id = leader_ur.committee_id)))
  WHERE ((leader_ur.user_id = (select auth.uid())) AND (leader_ur.is_active = true) AND (leader_ur.role_name = ANY (ARRAY['committee_leader'::text, 'deputy_committee_leader'::text])) AND (member_ur.user_id = member_details.user_id) AND (member_ur.is_active = true) AND (leader_ur.committee_id IS NOT NULL)))));

-- member_details · SELECT · permissive · to public
alter policy "المسؤولون يمكنهم قراءة جميع البيا" on public.member_details
  using (check_user_permission((select auth.uid()), 'view_members'::text));

-- member_details · SELECT · permissive · to public
alter policy "المستخدمون يمكنهم قراءة بياناتهم " on public.member_details
  using (((select auth.uid()) = user_id));

-- member_details · UPDATE · permissive · to public
alter policy "المسؤولون يمكنهم تحديث بيانات الأ" on public.member_details
  using (can_edit_member_data((select auth.uid()), user_id));

-- member_details · UPDATE · permissive · to public
alter policy "المستخدمون يمكنهم تحديث بياناتهم " on public.member_details
  using (((select auth.uid()) = user_id));

-- member_evaluations · INSERT · permissive · to public
alter policy member_evaluations_insert_policy on public.member_evaluations
  with check (check_user_permission((select auth.uid()), 'manage_member_data'::text));

-- member_evaluations · SELECT · permissive · to public
alter policy member_evaluations_select_admin_policy on public.member_evaluations
  using (check_user_permission((select auth.uid()), 'view_department_reports'::text));

-- member_evaluations · SELECT · permissive · to public
alter policy member_evaluations_select_own_policy on public.member_evaluations
  using ((user_id = (select auth.uid())));

-- member_evaluations · UPDATE · permissive · to public
alter policy member_evaluations_update_policy on public.member_evaluations
  using ((evaluator_id = (select auth.uid())));

-- member_warnings · SELECT · permissive · to authenticated
alter policy member_warnings_select on public.member_warnings
  using (can_view_warnings_of((select auth.uid()), user_id));

-- membership_applications · SELECT · permissive · to authenticated
alter policy membership_applications_select on public.membership_applications
  using (((user_id = (select auth.uid())) OR check_user_permission((select auth.uid()), 'manage_membership_applications'::text)));

-- news · DELETE · permissive · to public
alter policy news_delete on public.news
  using ((news_role((select auth.uid()), id) = 'chief'::text));

-- news · INSERT · permissive · to public
alter policy news_insert on public.news
  with check ((can_open_newsroom((select auth.uid())) AND (created_by = (select auth.uid()))));

-- news · SELECT · permissive · to public
alter policy news_select on public.news
  using (((workflow_status = 'published'::text) OR (news_role((select auth.uid()), id) <> 'none'::text)));

-- news · UPDATE · permissive · to public
alter policy news_update on public.news
  using ((news_role((select auth.uid()), id) = ANY (ARRAY['chief'::text, 'writer'::text])))
  with check ((news_role((select auth.uid()), id) = ANY (ARRAY['chief'::text, 'writer'::text])));

-- news_activity_log · SELECT · permissive · to public
alter policy news_activity_log_select on public.news_activity_log
  using ((news_role((select auth.uid()), news_id) <> 'none'::text));

-- news_collaboration_comments · INSERT · permissive · to public
alter policy news_collaboration_comments_insert on public.news_collaboration_comments
  with check (((user_id = (select auth.uid())) AND (news_role((select auth.uid()), news_id) <> 'none'::text)));

-- news_collaboration_comments · SELECT · permissive · to public
alter policy news_collaboration_comments_select on public.news_collaboration_comments
  using (((deleted_at IS NULL) AND (news_role((select auth.uid()), news_id) <> 'none'::text)));

-- news_collaboration_comments · UPDATE · permissive · to public
alter policy news_collaboration_comments_update on public.news_collaboration_comments
  using (((user_id = (select auth.uid())) OR (news_role((select auth.uid()), news_id) = 'chief'::text)))
  with check (((user_id = (select auth.uid())) OR (news_role((select auth.uid()), news_id) = 'chief'::text)));

-- news_likes · DELETE · permissive · to public
alter policy news_likes_delete on public.news_likes
  using ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));

-- news_likes · INSERT · permissive · to public
alter policy news_likes_insert on public.news_likes
  with check (((EXISTS ( SELECT 1
   FROM news n
  WHERE ((n.id = news_likes.news_id) AND (n.workflow_status = 'published'::text)))) AND ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))) OR (((select auth.uid()) IS NULL) AND (user_id IS NULL) AND (guest_identifier IS NOT NULL)))));

-- news_public_comments · DELETE · permissive · to public
alter policy news_public_comments_delete on public.news_public_comments
  using (((user_id = (select auth.uid())) OR (news_role((select auth.uid()), news_id) = 'chief'::text)));

-- news_public_comments · INSERT · permissive · to public
alter policy news_public_comments_insert on public.news_public_comments
  with check (((is_approved = false) AND (EXISTS ( SELECT 1
   FROM news n
  WHERE ((n.id = news_public_comments.news_id) AND (n.workflow_status = 'published'::text)))) AND ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (guest_name IS NULL)) OR (((select auth.uid()) IS NULL) AND (user_id IS NULL) AND (guest_name IS NOT NULL)))));

-- news_public_comments · SELECT · permissive · to public
alter policy news_public_comments_select on public.news_public_comments
  using ((is_approved OR (user_id = (select auth.uid())) OR (news_role((select auth.uid()), news_id) = 'chief'::text)));

-- news_public_comments · UPDATE · permissive · to public
alter policy news_public_comments_update on public.news_public_comments
  using ((((user_id = (select auth.uid())) AND (NOT is_approved)) OR (news_role((select auth.uid()), news_id) = 'chief'::text)))
  with check ((((user_id = (select auth.uid())) AND (NOT is_approved)) OR (news_role((select auth.uid()), news_id) = 'chief'::text)));

-- news_writer_assignments · ALL · permissive · to public
alter policy news_writer_assignments_write on public.news_writer_assignments
  using ((news_role((select auth.uid()), news_id) = 'chief'::text))
  with check ((news_role((select auth.uid()), news_id) = 'chief'::text));

-- news_writer_assignments · SELECT · permissive · to public
alter policy news_writer_assignments_select on public.news_writer_assignments
  using (((writer_id = (select auth.uid())) OR (news_role((select auth.uid()), news_id) = 'chief'::text)));

-- news_writer_assignments · UPDATE · permissive · to public
alter policy news_writer_assignments_respond on public.news_writer_assignments
  using ((writer_id = (select auth.uid())))
  with check ((writer_id = (select auth.uid())));

-- newsletter_subscribers · DELETE · permissive · to authenticated
alter policy newsletter_subscribers_delete_admin on public.newsletter_subscribers
  using (check_user_permission((select auth.uid()), 'manage_newsletter'::text));

-- newsletter_subscribers · SELECT · permissive · to authenticated
alter policy newsletter_subscribers_select_admin on public.newsletter_subscribers
  using (check_user_permission((select auth.uid()), 'manage_newsletter'::text));

-- newsletter_subscribers · UPDATE · permissive · to authenticated
alter policy newsletter_subscribers_update_admin on public.newsletter_subscribers
  using (check_user_permission((select auth.uid()), 'manage_newsletter'::text))
  with check (check_user_permission((select auth.uid()), 'manage_newsletter'::text));

-- notification_reads · INSERT · permissive · to public
alter policy "Users can mark notifications as read" on public.notification_reads
  with check ((user_id = (select auth.uid())));

-- notification_reads · SELECT · permissive · to public
alter policy "Users can view their own reads" on public.notification_reads
  using ((user_id = (select auth.uid())));

-- notifications · DELETE · permissive · to public
alter policy "Club president can delete notifications" on public.notifications
  using (check_user_permission((select auth.uid()), 'manage_notifications'::text));

-- notifications · INSERT · permissive · to public
alter policy "Club president can create notifications" on public.notifications
  with check (check_user_permission((select auth.uid()), 'manage_notifications'::text));

-- notifications · SELECT · permissive · to public
alter policy "Users can view their notifications" on public.notifications
  using (((target_audience = 'all'::text) OR ((target_audience = 'specific_users'::text) AND ((select auth.uid()) = ANY (target_user_ids))) OR ((target_audience = 'members'::text) AND (EXISTS ( SELECT 1
   FROM member_details
  WHERE (member_details.user_id = (select auth.uid()))))) OR ((target_audience = 'committee_leaders'::text) AND check_user_permission((select auth.uid()), 'view_pending_members'::text)) OR ((target_audience = 'admins'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND ur.is_active AND (ur.role_name = ANY (ARRAY['club_president'::text, 'president_advisor'::text])))))) OR ((target_audience = 'election_admins'::text) AND has_election_admin_permission((select auth.uid()))) OR ((target_audience = 'specific_committee'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.committee_id = notifications.target_committee_id))))) OR ((target_audience = 'election_voters'::text) AND (target_election_id IS NOT NULL) AND (is_top_admin_role((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM elections e
  WHERE ((e.id = notifications.target_election_id) AND (((e.target_committee_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = (select auth.uid())) AND (ur.committee_id = e.target_committee_id) AND ur.is_active)))) OR ((e.target_department_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM (user_roles ur
             JOIN committees c2 ON ((c2.id = ur.committee_id)))
          WHERE ((ur.user_id = (select auth.uid())) AND (c2.department_id = e.target_department_id) AND ur.is_active)))))))))) OR ((target_audience = 'election_candidates'::text) AND (target_election_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM election_candidates ec
  WHERE ((ec.election_id = notifications.target_election_id) AND (ec.user_id = (select auth.uid())) AND (ec.status = ANY (ARRAY['pending'::text, 'approved'::text, 'needs_edit'::text])))))) OR ((target_audience = 'election_participants'::text) AND (target_election_id IS NOT NULL) AND (is_top_admin_role((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM election_candidates ec
  WHERE ((ec.election_id = notifications.target_election_id) AND (ec.user_id = (select auth.uid())) AND (ec.status = ANY (ARRAY['pending'::text, 'approved'::text, 'needs_edit'::text, 'withdrawn'::text, 'rejected'::text]))))) OR (EXISTS ( SELECT 1
   FROM elections e
  WHERE ((e.id = notifications.target_election_id) AND (((e.target_committee_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = (select auth.uid())) AND (ur.committee_id = e.target_committee_id) AND ur.is_active)))) OR ((e.target_department_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM (user_roles ur
             JOIN committees c2 ON ((c2.id = ur.committee_id)))
          WHERE ((ur.user_id = (select auth.uid())) AND (c2.department_id = e.target_department_id) AND ur.is_active))))))))))));

-- notifications · UPDATE · permissive · to public
alter policy "Club president can update notifications" on public.notifications
  using (check_user_permission((select auth.uid()), 'manage_notifications'::text));

-- participation_certificates · SELECT · permissive · to public
alter policy participation_certificates_select on public.participation_certificates
  using (((user_id = (select auth.uid())) OR check_user_permission((select auth.uid()), 'manage_volunteering'::text)));

-- permissions · ALL · permissive · to public
alter policy permissions_admin_all on public.permissions
  using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.is_active = true) AND (ur.role_name = 'club_president'::text)))));

-- profile_name_changes · INSERT · permissive · to public
alter policy "Users can insert their own name changes" on public.profile_name_changes
  with check (((select auth.uid()) = user_id));

-- profile_name_changes · SELECT · permissive · to public
alter policy "Users can view their own name changes" on public.profile_name_changes
  using (((select auth.uid()) = user_id));

-- profiles · DELETE · permissive · to public
alter policy profiles_delete on public.profiles
  using (check_user_permission((select auth.uid()), 'manage_member_data'::text));

-- profiles · INSERT · permissive · to authenticated
alter policy profiles_insert_policy on public.profiles
  with check (check_user_permission((select auth.uid()), 'manage_member_data'::text));

-- profiles · SELECT · permissive · to authenticated
alter policy profiles_select on public.profiles
  using (((id = (select auth.uid())) OR is_adeeb_member((select auth.uid()))));

-- profiles · UPDATE · permissive · to public
alter policy profiles_update_admin on public.profiles
  using (can_edit_member_data((select auth.uid()), id));

-- profiles · UPDATE · permissive · to public
alter policy profiles_update_own on public.profiles
  using ((id = (select auth.uid())));

-- radio_episodes · ALL · permissive · to authenticated
alter policy radio_episodes_admin_write on public.radio_episodes
  using (check_user_permission((select auth.uid()), 'manage_radio'::text))
  with check (check_user_permission((select auth.uid()), 'manage_radio'::text));

-- radio_show_platforms · ALL · permissive · to authenticated
alter policy radio_platforms_admin_write on public.radio_show_platforms
  using (check_user_permission((select auth.uid()), 'manage_radio'::text))
  with check (check_user_permission((select auth.uid()), 'manage_radio'::text));

-- radio_shows · ALL · permissive · to authenticated
alter policy radio_shows_admin_write on public.radio_shows
  using (check_user_permission((select auth.uid()), 'manage_radio'::text))
  with check (check_user_permission((select auth.uid()), 'manage_radio'::text));

-- radio_station · ALL · permissive · to authenticated
alter policy radio_station_admin_write on public.radio_station
  using (check_user_permission((select auth.uid()), 'manage_radio'::text))
  with check (check_user_permission((select auth.uid()), 'manage_radio'::text));

-- role_permissions · ALL · permissive · to public
alter policy role_permissions_admin_all on public.role_permissions
  using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.is_active = true) AND (ur.role_name = 'club_president'::text)))));

-- roles · ALL · permissive · to public
alter policy roles_modify on public.roles
  using (check_user_permission((select auth.uid()), 'manage_positions'::text));

-- site_settings · ALL · permissive · to authenticated
alter policy "Allow admins to manage settings" on public.site_settings
  using (check_user_permission((select auth.uid()), 'manage_website'::text))
  with check (check_user_permission((select auth.uid()), 'manage_website'::text));

-- sponsors · ALL · permissive · to authenticated
alter policy sponsors_write_website on public.sponsors
  using (check_user_permission((select auth.uid()), 'manage_sponsors'::text))
  with check (check_user_permission((select auth.uid()), 'manage_sponsors'::text));

-- task_assignments · SELECT · permissive · to authenticated
alter policy task_assignments_select on public.task_assignments
  using (((user_id = (select auth.uid())) OR check_user_permission((select auth.uid()), 'view_members'::text) OR can_manage_tasks_of((select auth.uid()), task_committee(task_id))));

-- tasks · SELECT · permissive · to authenticated
alter policy tasks_select on public.tasks
  using ((can_manage_tasks_of((select auth.uid()), committee_id) OR check_user_permission((select auth.uid()), 'view_members'::text) OR is_my_task(id) OR may_see_open_call(id)));

-- testimonials · ALL · permissive · to public
alter policy testimonials_admin_all on public.testimonials
  using (check_user_permission((select auth.uid()), 'manage_website'::text));

-- user_roles · DELETE · permissive · to public
alter policy user_roles_delete on public.user_roles
  using (check_user_permission((select auth.uid()), 'manage_positions'::text));

-- user_roles · INSERT · permissive · to authenticated
alter policy user_roles_insert on public.user_roles
  with check (check_user_permission((select auth.uid()), 'manage_positions'::text));

-- user_roles · SELECT · permissive · to authenticated
alter policy user_roles_select_all on public.user_roles
  using (is_adeeb_member((select auth.uid())));

-- user_roles · SELECT · permissive · to public
alter policy user_roles_select_own on public.user_roles
  using ((user_id = (select auth.uid())));

-- user_roles · UPDATE · permissive · to authenticated
alter policy user_roles_update on public.user_roles
  using (check_user_permission((select auth.uid()), 'manage_positions'::text))
  with check (check_user_permission((select auth.uid()), 'manage_positions'::text));

-- user_specific_permissions · ALL · permissive · to authenticated
alter policy usp_manage_president on public.user_specific_permissions
  using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.is_active = true) AND (ur.role_name = 'club_president'::text)))));

-- user_specific_permissions · SELECT · permissive · to authenticated
alter policy usp_select_own on public.user_specific_permissions
  using ((user_id = (select auth.uid())));

-- visitors · INSERT · permissive · to authenticated
alter policy visitors_insert_self on public.visitors
  with check (((select auth.uid()) = id));

-- visitors · SELECT · permissive · to authenticated
alter policy visitors_select_self on public.visitors
  using ((((select auth.uid()) = id) OR check_user_permission((select auth.uid()), 'view_site_stats'::text)));

-- visitors · UPDATE · permissive · to authenticated
alter policy visitors_update_self on public.visitors
  using (((select auth.uid()) = id))
  with check (((select auth.uid()) = id));

-- volunteer_applications · SELECT · permissive · to public
alter policy volunteer_applications_select on public.volunteer_applications
  using (check_user_permission((select auth.uid()), 'manage_volunteering'::text));

-- volunteer_opportunities · SELECT · permissive · to public
alter policy volunteer_opportunities_select on public.volunteer_opportunities
  using ((check_user_permission((select auth.uid()), 'manage_volunteering'::text) OR ((status <> 'draft'::text) AND is_active_volunteer((select auth.uid())))));

-- volunteer_preferences · SELECT · permissive · to public
alter policy volunteer_preferences_select on public.volunteer_preferences
  using (((user_id = (select auth.uid())) OR check_user_permission((select auth.uid()), 'manage_volunteering'::text)));

-- volunteers · SELECT · permissive · to public
alter policy volunteers_select on public.volunteers
  using (((user_id = (select auth.uid())) OR check_user_permission((select auth.uid()), 'manage_volunteering'::text)));

-- works · ALL · permissive · to authenticated
alter policy works_write_website on public.works
  using (check_user_permission((select auth.uid()), 'manage_works'::text))
  with check (check_user_permission((select auth.uid()), 'manage_works'::text));

commit;
