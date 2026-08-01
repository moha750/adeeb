-- التواصل الاجتماعيّ: تطبيع التخزين على المعرّف المجرّد + قيدٌ يحرسه (بقرار المالك ٢٠٢٦-٠٧-١٦).
--
-- الداء: الأعمدة الأربعة خزّنت ثلاث صيغ معًا — `@معرّف` (٣٨) · رابط كامل بمعاملات تتبّع (٣٨) ·
-- معرّف مجرّد (١١٦). فكان كلّ قارئ يرقّع وحده: socialHref يقبل الصيغ الثلاث، والعرض يقصّ `^@`.
-- وأثره ظاهر للعين: ١٩ رابط لينكدإن تُعرض كاملةً بمعاملاتها كأنّها أسماء حسابات.
--
-- الدواء: صيغة واحدة (المعرّف مجرّدًا)، يفرضها القيد، ويولّدها المُطبِّع في vocab.ts — طبقتان تتطابقان
-- تعبيرًا بتعبير. ثمّ تُحذف الترقيعات: ما يبرّرها زال.
--
-- ما يُفرَّغ (٢٠ قيمة) — ليست حسابات، وكلّها تبني روابط مكسورة اليوم:
--   • ١٠ كتبوا أسماءهم بدل معرّفاتهم (`Hawra ALFARHAN` ⇐ linkedin.com/in/Hawra ALFARHAN).
--   • ٧ حشوٌ يملأ الحقل (`لا يوجد` · `لايوجد` · `برايفت`) — نفس نمط حشو الرقم الأكاديميّ.
--   • ٣ روابط X في أعمدة إنستغرام وتيك توك ولينكدإن لعضوة واحدة لصقت رابطها في الأربعة —
--     إفراغها بلا خسارة: الرابط نفسه محفوظ في عمود X ويُطبَّع إلى معرّفه هناك.
--
-- ما يبقى: ١٧٢ قيمة. ومنها سبيكة لينكدإن عربيّة مُرمَّزة (`%D8%B1…`) — صالحة ورابطها يعمل بها
-- كما هي، فالقيد يسمح بـ`%` عمدًا ولا تُفكّ الترميز (فكّها يُدخل حروفًا عربيّة في معرّف لاتينيّ).

begin;

-- المُطبِّع — نسخة SQL من socialHandle() في vocab.ts. مؤقّت: عمله في هذا الترحيل وحده، ثمّ يزول.
-- تنبيه لمن يعدّله: مجموعة المضيف **غير ملتقِطة** `(?:twitter|x)` عمدًا — لو التقطت لأعاد
-- substring أوّلَ مجموعة (`x`) بدل المعرّف، فأفسدت ٧ روابط صامتةً. (وقع فعلًا وأمسكه الاختبار.)
create or replace function pg_temp.norm_social(p text, x text) returns text language sql immutable as $$
  with s as (select btrim(regexp_replace(coalesce(x,''), '[‎‏‪-‮]', '', 'g')) as t),
  r as (select t, case p when 'twitter' then '(?:twitter|x)\.com' when 'instagram' then 'instagram\.com'
                         when 'tiktok' then 'tiktok\.com' else 'linkedin\.com' end as host from s),
  h as (
    select case
      when t = '' then null
      when (t ~* '^https?://' or t ~* '[a-z0-9-]+\.(com|co|me|net)') then
        case when t !~* host then null                                             -- رابط منصّة أخرى
             when p = 'linkedin' then substring(t from 'linkedin\.com/(?:in|pub)/([^/?#]+)')
             else substring(t from host || '/@?([^/?#]+)') end
      else regexp_replace(t, '^@+|@+$', '', 'g')                                   -- @ في الطرفين معًا
    end as v from r
  )
  select case when v is null or v = '' then null
              when v ~ '^[A-Za-z0-9._%-]+$' then v
              else null end from h;                                                -- اسمٌ أو حشو ⇒ ليس معرّفًا
$$;

update member_details set
  twitter_account   = pg_temp.norm_social('twitter',   twitter_account),
  instagram_account = pg_temp.norm_social('instagram', instagram_account),
  tiktok_account    = pg_temp.norm_social('tiktok',    tiktok_account),
  linkedin_account  = pg_temp.norm_social('linkedin',  linkedin_account)
where twitter_account is not null or instagram_account is not null
   or tiktok_account is not null or linkedin_account is not null;

-- القيد: معرّف مجرّد أو NULL — لا @ ولا مسافة ولا رابط ولا حروف عربيّة.
-- يحرس الأعمدة الأربعة معًا بقيد واحد: القاعدة واحدة، فلا تُنسخ أربعًا تفترق يومًا.
alter table member_details drop constraint if exists member_details_social_handle_check;
alter table member_details add constraint member_details_social_handle_check
  check (
    (twitter_account   is null or twitter_account   ~ '^[A-Za-z0-9._%-]+$')
    and (instagram_account is null or instagram_account ~ '^[A-Za-z0-9._%-]+$')
    and (tiktok_account    is null or tiktok_account    ~ '^[A-Za-z0-9._%-]+$')
    and (linkedin_account  is null or linkedin_account  ~ '^[A-Za-z0-9._%-]+$')
  );

commit;
