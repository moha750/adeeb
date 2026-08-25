-- خمّن الكلمة — مولّدُ الرمز يُسمّي schema امتداده (م٠هـ)
-- طُبِّق ٢٠٢٦-٠٨-٢٥ بإذن المالك، عقب م٠د.
--
-- ## عطلٌ حقيقيٌّ أمسكه اختبارٌ حيّ، لا مراجعةُ نظر
-- كتب م٠أ مولّدَ الرمز بـ`gen_random_bytes(6)` ظنًّا أنّها كـ`gen_random_uuid()`.
-- وليست: الثانيةُ من نواة Postgres منذ الإصدار ١٣، والأولى من **pgcrypto** وحدها.
-- وpgcrypto في هذا المشروع مركَّبٌ في schema اسمُه `extensions` لا `public`.
--
-- والدالّةُ — كسائر دوالّ المستودع — تُثبّت `set search_path = public, pg_temp`،
-- وهو تثبيتٌ صحيحٌ يمنع اختطافَ الأسماء. لكنّه يُخفي `extensions` أيضًا، فلا تجد
-- الدالّةُ امتدادَها وتسقط بـ`42883: function gen_random_bytes(integer) does not exist`.
--
-- **وأثرُه أنّ الغرفةَ لا تُفتَح أصلًا**: `gw_create_session` تنادي المولّدَ في أوّل
-- خطوة. أي أنّ اللعبةَ كانت معطوبةً بالكامل بين تطبيق م٠أ وهذا الترحيل.
--
-- ## والعلاجُ تسميةٌ لا توسيع
-- يُنادى الامتدادُ **مؤهَّلًا بـschema** (`extensions.gen_random_bytes`) بدل أن
-- يُوسَّع `search_path` ليشمله. التوسيعُ يُعيد إلى الدالّة أسماءَ schema كاملٍ لم
-- تكن تراه، والتسميةُ تُعطيها ما تحتاجه وحدَه.
--
-- **الدرس: `set search_path` يقطع الامتدادات كما يقطع المخاطر.** كلُّ نداءٍ لدالّةِ
-- امتدادٍ داخل دالّةٍ مثبَّتة المسار يُكتَب مؤهَّلًا. ولا يُكشَف هذا بقراءة الكود:
-- يلزمه تشغيلٌ حيّ.

create or replace function public.gw_generate_session_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code  text;
  v_bytes bytea;
  v_tries integer := 0;
begin
  loop
    -- مؤهَّلٌ بـschema: pgcrypto خارج `public`، و`search_path` المثبَّت لا يبلغه.
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      -- الباقي من ٣٢ لا يُميل الاحتمال: ٢٥٦ تقبل القسمة على ٣٢ بلا كسر.
      v_code := v_code || substr(v_chars, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;

    if not exists (select 1 from guess_word_sessions where code = v_code) then
      return v_code;
    end if;

    v_tries := v_tries + 1;
    if v_tries > 50 then
      raise exception 'GW_CODE_GEN_FAILED: تعذّر توليد رمزٍ فريد';
    end if;
  end loop;
end;
$fn$;

revoke all on function public.gw_generate_session_code() from public, anon, authenticated;
