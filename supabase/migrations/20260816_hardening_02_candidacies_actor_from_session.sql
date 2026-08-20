-- الفاعلُ يُقرأ من الجلسة لا من مُدخَل — وبقيت هذه وحدَها.
--
-- القصّة: في حملة `p_actor` (٢٠٢٦-٠٨-٠٦) قِيست في القاعدة تسعٌ وثلاثون دالّةً تُصدّق من
-- يقول إنّه الفاعل، فنُزع النداءُ عن ثلاثٍ وثلاثين وصارت القاعدةُ واحدة: **الفاعلُ من
-- `auth.uid()` لا من مُدخَل**. و`get_user_candidacies(p_user)` فاتت الحملة: هي مصرَّحٌ
-- بتنفيذها لـ`authenticated` **ولـ`anon` كذلك** (قِيس في `proacl`)، وتقبل معرّفَ أيّ إنسان،
-- وتردّ عليه ترشُّحَه كاملًا: بيانَه وملفَّه وملاحظةَ المراجعة وتاريخَ نظرها. أي أنّ زائرًا
-- بلا حساب يستطيع أن يقرأ بيانَ ترشُّحِ عضوٍ وسببَ رفضه إن عرف معرّفَه.
--
-- والعلاج: الموضوعُ يُشتقّ من الجلسة، ولا يُقرأ ترشُّحُ غيرِك إلّا بقدرةٍ تُفحَص في القاعدة.
--
-- **ثلاثةُ أبوابٍ لا أكثر** (وكلُّها أبوابٌ **قائمةٌ اليوم**، لم يُخترع منها باب):
--
-- ١. **أنت** — `p_user` فارغٌ أو مساوٍ لـ`auth.uid()`. هذا بابُ `/dashboard/elections/my`
--    (`elections/member-data.ts:240`، عميلُ الجلسة).
--
-- ٢. **المعايِن كعضو** — الشاشةُ نفسُها أثناء «المعاينة كـ»: الهويّةُ تُستعار في **طبقة
--    التطبيق** وحدها، فـ`getCurrentAdmin().id` يصير المُعايَنَ بينما `auth.uid()` يبقى
--    المعايِنَ (`lib/view-as.ts` و`reference_view_as_identity_limit`). فلو قيل «الموضوعُ
--    هو `auth.uid()` دائمًا» لانكسرت المعاينة: يرى المعايِنُ ترشُّحاتِ نفسِه في شاشة غيره.
--    فيُفتَح البابُ **بالقدرة نفسِها التي تفتح المعاينة أصلًا**: `manage_permissions`
--    (`VIEW_AS_CAP` في `lib/view-as.ts`). فلا قدرةَ جديدة، ولا رتبةَ عدديّة — من ملك أن
--    يستعير الهويّةَ كاملةً ملك أن يقرأ بها، ومن لم يملكها لم يملك شيئًا.
--
-- ٣. **مفتاحُ الخدمة** — `getMyScope` في `lib/myScope.ts:72` ينادي
--    `get_member_election_signals(p_user)` بعميلِ **الخدمة**، وهي بدورها تنادي هذه الدالّة
--    (وهي وحدُها مُناديها في القاعدة كلِّها؛ قِيس على `pg_proc.prosrc`). ومع مفتاح الخدمة
--    `auth.uid()` **فارغ** لأنّ الرمزَ لا `sub` فيه. فلو رُدّت هنا لسقطت إشارةُ
--    `hasCandidacy` عن كلّ عضو، فاختفى بابُ «سِجلّ ترشُّحي» من قائمة التنقّل للجميع.
--    فيُعرَف الخادمُ من دعواه في الرمز الموقَّع: `auth.role() = 'service_role'`.
--
-- ومن دخل بلا رمزٍ أصلًا (`anon`) لم يعد له باب: يُردّ عند العتبة.
--
-- **ما تغيّر في المتن**: سطرُ الاشتقاق وحده. الاستعلامُ ومخرجاتُه وشرطُ `can_edit`/`can_withdraw`
-- كما هي حرفًا بحرف. وزِيدت `pg_temp` إلى آخر الطريق (عِلّتُها في الترحيل ٠١).

create or replace function public.get_user_candidacies(p_user uuid default null::uuid)
returns table(
  candidate_id uuid,
  election_id uuid,
  election_status text,
  election_archived_at timestamp with time zone,
  target_role_name text,
  target_committee_id integer,
  target_committee_ar text,
  target_department_id integer,
  target_department_ar text,
  candidate_number integer,
  candidate_status text,
  statement_ar text,
  file_url text,
  file_name text,
  review_note_ar text,
  reviewed_at timestamp with time zone,
  submitted_at timestamp with time zone,
  candidacy_end timestamp with time zone,
  can_withdraw boolean,
  can_edit boolean
)
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    -- صاحبُ الجلسة: هو الحقيقةُ، والمُدخَلُ دعوى.
    v_self uuid := auth.uid();
    v_user uuid;
begin
    if v_self is null then
        -- لا جلسة: لا يُقبل إلّا الخادمُ نفسُه، وهو يسمّي موضوعَه (`getMyScope`).
        if coalesce(auth.role(), '') = 'service_role' then
            v_user := p_user;
        else
            raise exception 'لا جلسةَ لك.' using errcode = '42501';
        end if;
    else
        v_user := coalesce(p_user, v_self);
        -- ترشُّحُ غيرِك لا يُقرأ إلّا بقدرة استعارة الهويّة نفسِها (المعاينة كعضو).
        if v_user <> v_self and not check_user_permission(v_self, 'manage_permissions') then
            raise exception 'ترشُّحُ غيرِك ليس لك أن تقرأه.' using errcode = '42501';
        end if;
    end if;

    if v_user is null then
        raise exception 'لم يُسمَّ صاحبُ الترشُّح.' using errcode = '42501';
    end if;

    return query
    select
        ec.id,
        e.id,
        e.status,
        e.archived_at,
        e.target_role_name,
        e.target_committee_id,
        c.committee_name_ar,
        e.target_department_id,
        d.name_ar,
        ec.candidate_number,
        ec.status,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.review_note_ar,
        ec.reviewed_at,
        ec.submitted_at,
        e.candidacy_end,
        (ec.status in ('pending','approved','needs_edit')
          and e.status in ('candidacy_open','candidacy_closed')
          and e.archived_at is null) as can_withdraw,
        (ec.status in ('pending','needs_edit')
          and e.status = 'candidacy_open'
          and e.archived_at is null) as can_edit
    from election_candidates ec
    join elections e on e.id = ec.election_id
    left join committees  c on c.id = e.target_committee_id
    left join departments d on d.id = e.target_department_id
    where ec.user_id = v_user
    order by ec.submitted_at desc;
end;
$function$;

comment on function public.get_user_candidacies(uuid) is
  'سِجلُّ ترشُّحاتِ صاحب الجلسة — ولغيره لا يُقرأ إلّا بقدرة manage_permissions (المعاينة كعضو) أو بمفتاح الخدمة (20260816).';

-- والزائرُ بلا حساب لا شأنَ له بهذا البابِ أصلًا: المتنُ يردّه، وهذان السطران يُغلقان البابَ
-- قبل المتن فلا يُنادى.
--
-- **ولا يكفي نزعُها عن `anon` وحده**: في `proacl` منحتان تُوصلانه، منحةُ الاسم (`anon=X`)
-- ومنحةُ العموم (`=X`، أي PUBLIC وهو كلُّ دور). فتُنزَعان معًا. و`authenticated` و
-- `service_role` و`postgres` لكلٍّ منها منحةٌ **باسمها** في `proacl` (قِيس قبل الكتابة)،
-- فلا تمسّها نزعُ العموم.
--
-- ولا يقطع النزعُ نداءَ `get_member_election_signals` لها: تلك `SECURITY DEFINER` مالكُها
-- `postgres`، فالتنفيذُ داخلها يجري باسمه وله منحةٌ باسمه.
--
-- الرجوع:
--   grant execute on function public.get_user_candidacies(uuid) to public;
--   grant execute on function public.get_user_candidacies(uuid) to anon;
revoke execute on function public.get_user_candidacies(uuid) from public;
revoke execute on function public.get_user_candidacies(uuid) from anon;
