-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260804100605   الاسم: slaughter_membership_registration_system

-- نحرُ نظام تسجيل العضويّة من جذوره (٢٠٢٦-٠٨-٠٤)
--
-- كان نصفَ نظام: جانبُ المتقدّم حيًّا وكونسولُ الإدارة لم يُبنَ قطّ. وقرّر المالك إغلاق باب
-- الانضمام، فبقاءُ آلةٍ لا تُدار ولا تُفتَح ديْنٌ لا أصل. وقد صُدِّرت بياناتُها كلُّها (٨٩٢ صفًّا
-- من ٢٤ جدولًا) إلى جهاز المالك قبل هذا الترحيل، وأُكِّد وصولُها.
--
-- وخلَفُ بابِه الوحيدِ الباقي (`/onboarding`) هو `/complete` — يُنشئ سجلَّ `member_details`
-- بالجلسة لا بتوكن. انظر ترحيل `execute_pending_onboarding_status`.

-- ═══ ١) مِزلاجٌ خارج المجال: مُشغِّلٌ على `committees` يكتب في جدولٍ سيسقط ═══
drop trigger if exists trigger_auto_add_committee_to_available on public.committees;

-- ═══ ٢) عمودا الانتساب في `profiles` — لا يقرؤهما كودُ V2، ومرجعُهما يسقط ═══
alter table public.profiles drop column if exists source_application_id;
alter table public.profiles drop column if exists source_interview_id;

-- ═══ ٣) الجداول الأربعة والعشرون ═══
drop table if exists
  public.invitation_usages,
  public.membership_invitations,
  public.archived_membership_invitations,
  public.member_onboarding_tokens,
  public.membership_accepted_members,
  public.archived_membership_accepted_members,
  public.interview_slots,
  public.interview_slots_archive,
  public.archived_interview_slots,
  public.interview_sessions,
  public.interview_sessions_archive,
  public.archived_interview_sessions,
  public.membership_interviews,
  public.membership_interviews_archive,
  public.archived_membership_interviews,
  public.membership_applications,
  public.membership_applications_archive,
  public.archived_membership_applications,
  public.membership_cycle_snapshots,
  public.membership_cycles,
  public.archived_membership_cycles,
  public.membership_registration_archives,
  public.membership_available_committees,
  public.membership_settings
cascade;

-- ═══ ٤) الدوالّ — لا يُسقطها CASCADE لأنّ بوستغرس لا يتتبّع أجسامَها ═══
drop function if exists public.archive_invitations_with_cycle(p_cycle_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone);
drop function if exists public.archive_membership_cycle(p_cycle_name text, p_cycle_year integer, p_cycle_season text, p_description text, p_archived_by uuid);
drop function if exists public.archive_single_invitation(p_invitation_id uuid);
drop function if exists public.auto_add_committee_to_available();
drop function if exists public.book_interview_slot(p_slot_id uuid, p_application_id uuid);
drop function if exists public.book_interview_slot(p_slot_id uuid, p_booker_name text, p_booker_phone text);
drop function if exists public.calculate_archived_cycle_stats(p_cycle_id uuid);
drop function if exists public.cancel_booking(p_slot_id uuid, p_phone text);
drop function if exists public.cancel_booking(p_slot_id uuid, p_application_id uuid);
drop function if exists public.cancel_booking_by_phone(p_phone text, p_session_id uuid, p_reason text);
drop function if exists public.cancel_existing_booking(p_slot_id uuid, p_application_id uuid);
drop function if exists public.cancel_interview_admin(p_interview_id uuid, p_slot_id uuid);
drop function if exists public.cancel_interview_booking(p_slot_id uuid, p_application_id uuid);
drop function if exists public.cancel_interview_slot(p_slot_id uuid, p_reason text);
drop function if exists public.cleanup_expired_invitations();
drop function if exists public.create_cycle_snapshot(p_cycle_id uuid, p_snapshot_type text, p_created_by uuid, p_notes text);
drop function if exists public.create_membership_archive();
drop function if exists public.create_membership_cycle(p_cycle_name text, p_cycle_year integer, p_cycle_season text, p_description text, p_created_by uuid);
drop function if exists public.delete_archived_cycle(p_cycle_id uuid);
drop function if exists public.generate_interview_slots(p_session_id uuid, p_session_date date, p_start_time time without time zone, p_end_time time without time zone, p_slot_duration integer);
drop function if exists public.generate_interview_slots(p_session_id uuid);
drop function if exists public.generate_member_number();
drop function if exists public.generate_session_token();
drop function if exists public.get_archived_cycle_details(p_cycle_id uuid);
drop function if exists public.get_available_slots(p_session_id uuid);
drop function if exists public.get_existing_booking(p_phone text, p_session_id uuid);
drop function if exists public.get_existing_booking_details(p_phone text, p_session_id uuid);
drop function if exists public.get_session_statistics(p_session_id uuid);
drop function if exists public.mark_acceptance_message_sent(p_interview_id uuid);
drop function if exists public.record_invitation_usage(p_invitation_id uuid, p_application_id uuid, p_email text, p_name text, p_committee_id integer, p_ip_address inet, p_user_agent text);
drop function if exists public.submit_membership_application(p jsonb, p_invitation_id uuid);
drop function if exists public.trigger_create_interview_on_booking();
drop function if exists public.update_committee_applicants_count();
drop function if exists public.update_cycle_statistics(p_cycle_id uuid);
drop function if exists public.validate_invitation(p_code text);
drop function if exists public.validate_phone_for_booking(p_phone text, p_session_id uuid);
drop function if exists public.validate_phone_for_booking(p_session_token text, p_phone text);

-- دوالّ المُشغِّلات التي لم تُسمِّ جداولَها في أجسامها (فلم تظهر في المسح أعلاه).
-- و`update_updated_at_column` **تبقى** — تخدم سبعةَ جداولَ حيّة سواها.
drop function if exists public.auto_generate_member_number();
drop function if exists public.auto_normalize_phone();
drop function if exists public.trigger_generate_slots();
drop function if exists public.trigger_generate_token();
drop function if exists public.update_accepted_members_updated_at();
drop function if exists public.update_cycles_updated_at();
drop function if exists public.update_interviews_updated_at();
drop function if exists public.update_membership_applications_updated_at();
drop function if exists public.update_membership_archives_updated_at();
drop function if exists public.update_membership_settings_updated_at();

-- ═══ ٥) الصلاحيّات الخمس — أبوابٌ لغرفٍ لم تُبنَ ولن تُبنى ═══
delete from role_permissions where permission_id in (
  select id from permissions where permission_key in
    ('manage_registration','approve_applications','manage_interviews','view_applications','gift_membership'));
delete from user_specific_permissions where permission_id in (
  select id from permissions where permission_key in
    ('manage_registration','approve_applications','manage_interviews','view_applications','gift_membership'));
delete from permissions where permission_key in
  ('manage_registration','approve_applications','manage_interviews','view_applications','gift_membership');
