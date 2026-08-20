-- **الأرشيفُ للنادي، والدخولُ للشخص** — فصلُ `public` عن `auth.users`.
--
-- قرّر المالكُ في ١٩ أغسطس ٢٠٢٦ أن يكون لصاحب الحساب بابُ حذفٍ يمضي منه، وأن **يبقى أرشيفُ
-- النادي كاملًا لا يُشطب منه شيء**: من عمل عملًا فذاك عملُه باسمه، لا يُمحى لأنّه انصرف.
--
-- وبين الأمرين قيدٌ يمنع: `profiles.id` مربوطٌ بـ`auth.users(id)` بـ`on delete cascade`، فحذفُ
-- حسابِ المصادقة يهدم صفَّ الشخص ومعه كلُّ ما تفرّع عنه. وأشدُّ منه أنّ `member_details` —
-- وفيها الهويّةُ الوطنيّةُ وتاريخُ الميلاد والكليّةُ — معلَّقةٌ هي الأخرى بـ`auth.users` مباشرةً،
-- فتذهب مع الدخول.
--
-- فالعلاجُ في الجذر لا في العرَض: **كلُّ ما هو أرشيفٌ يتبع `profiles`، ولا يتبع `auth.users`
-- إلّا الدخولُ نفسُه.** فإذا حُذف حسابُ المصادقة مات الدخولُ وحدَه وبقي السجلُّ كما هو، وتحرّر
-- البريدُ فاستطاع صاحبُه أن يبدأ حسابًا جديدًا نظيفًا إن عاد.
--
-- وثمنُه المعلوم: لا شيءَ يضمن بعد اليوم أنّ لكلّ صفٍّ في `profiles` حسابَ مصادقةٍ حيًّا. وهذا
-- هو المقصود لا عَرَضٌ محتمَل: الصفُّ **سجلُّ شخصٍ عند النادي** لا ظِلٌّ لحساب. وقد كانت هذه
-- الحالُ قائمةً من قبلُ في الجهة المقابلة: تسعةَ عشرَ حسابَ مصادقةٍ بلا صفٍّ في `profiles`.
--
-- والترتيبُ في هذا الملفّ مقصود: تُنقَل التوابعُ أوّلًا وهي مستندةٌ إلى شيءٍ قائم، ثمّ يُفكّ
-- قيدُ `profiles` في آخر سطر.

begin;

-- ── ١. مَن أشّر ومَن ردّ ومَن أرسل — أعمدةُ الفاعلين ─────────────────────────────
-- `no action` كما كانت: الفاعلُ لا يُمحى من الواقعة، والصفُّ في `profiles` باقٍ أبدًا فلا
-- يُتصوَّر أن يُبلَغ هذا القيدُ أصلًا. وإنّما نُقل ليقول الصوابَ: الفاعلُ شخصٌ في السجلّ لا
-- حسابُ دخول.
alter table public.activity_reservations
  drop constraint activity_reservations_attendance_marked_by_fkey,
  add  constraint activity_reservations_attendance_marked_by_fkey
       foreign key (attendance_marked_by) references public.profiles(id);

alter table public.activity_reservations
  drop constraint activity_reservations_certificate_sent_by_fkey,
  add  constraint activity_reservations_certificate_sent_by_fkey
       foreign key (certificate_sent_by) references public.profiles(id);

alter table public.activity_reservations
  drop constraint activity_reservations_whatsapp_confirmed_by_fkey,
  add  constraint activity_reservations_whatsapp_confirmed_by_fkey
       foreign key (whatsapp_confirmed_by) references public.profiles(id);

alter table public.contact_messages
  drop constraint contact_messages_replied_by_fkey,
  add  constraint contact_messages_replied_by_fkey
       foreign key (replied_by) references public.profiles(id);

alter table public.notifications
  drop constraint notifications_sender_id_fkey,
  add  constraint notifications_sender_id_fkey
       foreign key (sender_id) references public.profiles(id) on delete set null;

-- ── ٢. بياناتُ العضويّة — أثقلُ ما يُنقَل ────────────────────────────────────────
-- `not valid` عن قصدٍ لا عن تهاون: في القاعدة اليومَ **خمسةُ صفوفٍ** في `member_details`
-- لأصحابِ حساباتٍ لا صفَّ لهم في `profiles` (بُرُدٌ عابرة من فبراير وأبريل ٢٠٢٦، وفيها
-- هويّاتٌ وطنيّة). فلو صُدّق القيدُ على الماضي لسقط الترحيل. و`not valid` يحرس ما يأتي
-- ويترك ما مضى موصوفًا لصاحب القرار: أيُنقّى الخمسةُ أم يُتركون؟ فإذا نُقّوا صُدّق القيدُ بـ
-- `alter table public.member_details validate constraint member_details_user_id_fkey;`
alter table public.member_details
  drop constraint member_details_user_id_fkey,
  add  constraint member_details_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete cascade not valid;

-- ── ٣. توابعُ الحساب — تمضي مع الصفّ لا مع الدخول ───────────────────────────────
alter table public.notification_reads
  drop constraint notification_reads_user_id_fkey,
  add  constraint notification_reads_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.user_specific_permissions
  drop constraint user_specific_permissions_user_id_fkey,
  add  constraint user_specific_permissions_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.user_specific_permissions
  drop constraint user_specific_permissions_granted_by_fkey,
  add  constraint user_specific_permissions_granted_by_fkey
       foreign key (granted_by) references public.profiles(id);

-- وفي `profile_name_changes` قيدان على العمود نفسِه بمعنًى واحد (`fk_user` وأخوه المولَّد)،
-- تكرارٌ قديمٌ لا نفعَ فيه. يُنقَل واحدٌ ويُعدَم الثاني.
alter table public.profile_name_changes drop constraint fk_user;

alter table public.profile_name_changes
  drop constraint profile_name_changes_user_id_fkey,
  add  constraint profile_name_changes_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.profile_name_changes
  drop constraint profile_name_changes_changed_by_fkey,
  add  constraint profile_name_changes_changed_by_fkey
       foreign key (changed_by) references public.profiles(id);

-- ── ٤. أثرُ الزيارة ─────────────────────────────────────────────────────────────
-- `set null` كما كانت: المشاهدةُ رقمٌ في إحصاءٍ لا واقعةَ شخص، فإن ذهب صاحبُها بقي الرقم.
alter table public.site_pageviews
  drop constraint site_pageviews_user_id_fkey,
  add  constraint site_pageviews_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.site_visitors
  drop constraint site_visitors_user_id_fkey,
  add  constraint site_visitors_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete set null;

-- والجدولُ `visitors` متروكٌ من عهد ما قبل التوحيد (١٤٩ صفًّا وُحِّدوا في `profiles`)، يُنقَل
-- معهم لئلّا يبقى معلَّقًا بـ`auth` وحدَه بعد أن هاجر كلُّ ما حوله.
alter table public.visitors
  drop constraint visitors_id_fkey,
  add  constraint visitors_id_fkey
       foreign key (id) references public.profiles(id) on delete cascade;

-- ── ٥. وآخرُ سطرٍ: يُفكّ القيدُ الأمّ ───────────────────────────────────────────
-- بعده يصير حذفُ حسابِ المصادقة فعلًا واحدًا لا يهدم شيئًا، ويصير `profiles` سجلَّ النادي
-- قائمًا بنفسه. ولا بديلَ يُوضَع مكانَه: الغيابُ هو المقصود.
alter table public.profiles drop constraint profiles_id_fkey;

comment on table public.profiles is
  'سجلُّ الأشخاص عند النادي. مستقلٌّ عن auth.users منذ 2026-08-19 (فكُّ profiles_id_fkey): الأرشيفُ للنادي والدخولُ للشخص، فحذفُ الحساب لا يمحو ما فُعل.';

commit;
