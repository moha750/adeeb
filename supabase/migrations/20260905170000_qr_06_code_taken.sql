-- «هل هذا الرمزُ مأخوذ؟» يُسأل قبل الضغط لا بعده (م٤)
--
-- ## العلّة
-- الرمزُ المختارُ يُردّ اليومَ **بعد** الضغط على «ابدأ بتصميم الباركود»: يُملأ النموذجُ كلُّه
-- ثمّ يُقال «مأخوذ». والسؤالُ يُجاب قبل ذلك بحرف.
--
-- ## ولمَ دالّةٌ لا استعلامٌ من الشاشة
-- سياسةُ `qr_links` **own-row**: كلٌّ يرى رموزَه هو. فاستعلامُ الشاشة عن رمزٍ يملكه غيرُه
-- يرجع فارغًا، فتقول الشاشةُ «متاح» ثمّ يردّه قيدُ التفرّد عند الحفظ — أسوأُ من لا فحص.
--
-- ## وما تكشفه: لا شيء
-- ترجع `true/false` عن **وجود** رمزٍ لا غير: لا عنوانَ ولا مالكَ ولا وجهة. وهذا معلومٌ
-- أصلًا لمن زار `‎/q/<code>` ورأى تحويلًا أو صفحةَ «غير متاح». فلا تُسرَّب بها معلومة.

begin;

create or replace function public.qr_code_taken(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.qr_links where code = lower(btrim(p_code)));
$$;

comment on function public.qr_code_taken(text) is
  'هل الرمزُ مستعمَل؟ للفحص اللحظيّ في شاشة الإنشاء. ترجع وجودًا لا بيانات، وسياسةُ own-row تمنع الاستعلامَ المباشر.';

revoke all on function public.qr_code_taken(text) from public, anon;
grant execute on function public.qr_code_taken(text) to authenticated;

commit;
