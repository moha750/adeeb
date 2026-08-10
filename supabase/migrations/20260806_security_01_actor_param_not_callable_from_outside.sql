-- ══════════════════════════════════════════════════════════════════════════════
-- 🚨 **مَن يقول إنّه الفاعل، ليس الفاعل** — سدُّ انتحالِ هويّةٍ كامل
--
-- تسعٌ وثلاثون دالّةً في القاعدة تأخذ الفاعلَ **مُدخَلًا من المنادي** (`p_actor`) ثمّ تفحص
-- صلاحيّتَه — **ولا واحدةٌ منها تتحقّق أنّ المنادي هو من يدّعي**. وكانت مفتوحةً للنداء
-- بالمفتاح العلنيّ (افتراضُ PostgreSQL أنّ الدالّة تُنفَّذ لـ`PUBLIC`، وPostgREST يعرضها).
--
-- **وسلسلةُ الاستغلال كانت مكتملة**: صفحةُ الهبوط تنشر معرّفات المجلس (`get_board_members`
-- تُرجع `id`)، فيأخذ أيُّ زائرٍ معرّفَ الرئيس ثمّ ينادي `assign_position(p_actor => الرئيس,
-- p_user => نفسه)` فيمنح نفسَه أيَّ منصب. ومثلُها إنهاءُ عضويّةٍ وإصدارُ إنذارٍ وسحبُ الكشف.
--
-- **أُثبت حيًّا (٢٠٢٦-٠٨-٠٦، بدالّة قراءةٍ فقط)**: نداءٌ بمفتاح الزائر بلا جلسة —
--   `can_end_membership(p_actor => الرئيس, p_target => عضو)` → **true**
--   `can_end_membership(p_actor => null,   p_target => عضو)` → false
-- فالقاعدةُ صدّقت الادّعاء لمجرّد كتابة المعرّف.
--
-- **العلاج**: تُنزَع صلاحيّةُ النداء عن `public`/`anon`/`authenticated` — فلا تُنادى إلّا
-- بمفتاح الخدمة من الخادم، بعد أن يكون هو قد تحقّق من صاحب الجلسة. وهذا هو الواقع أصلًا:
-- فُحص كلُّ موضعِ نداءٍ في V2 فإذا كلُّها `createAdeebServiceClient`.
--
-- **وتُستثنى ستٌّ تستعملها سياساتُ RLS نفسُها** (`can_edit_member_data` · `can_manage_tasks_of`
-- · `can_open_newsroom` · `can_view_certificate_of` · `can_view_warnings_of` · `news_role`) —
-- لأنّ تعبيرَ السياسة يُقيَّم بحقّ المستخدم، فقفلُها يكسر الحراسةَ التي جاءت لتحميها. وهي
-- تُرجع نعم/لا فقط، فتسريبُها **معلومةٌ لا سلطة** — وتُحرَس بحارسٍ داخليّ في جولةٍ تالية.
--
-- **ولا يُمَسّ ما يناديه المتصفّح**: `book_activity_seat` · `cancel_activity_reservation` ·
-- `create_my_account_profile` — كلُّها تقرأ `auth.uid()` ولا تأخذ فاعلًا، فهي سليمةٌ بطبعها.
-- وهذا هو **العلاجُ الجذريّ لمن يكتب دالّةً جديدة**: اقرأ الفاعلَ من الجلسة لا من المُدخَل.
-- ══════════════════════════════════════════════════════════════════════════════

do $$
declare r record; n int := 0;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace
    where n2.nspname = 'public' and p.prokind = 'f'
      and pg_get_function_identity_arguments(p.oid) ilike '%p_actor%'
      and p.proname not in (
        'can_edit_member_data', 'can_manage_tasks_of', 'can_open_newsroom',
        'can_view_certificate_of', 'can_view_warnings_of', 'news_role'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    n := n + 1;
  end loop;
  raise notice 'أُقفلت % دالّة', n;
end $$;
