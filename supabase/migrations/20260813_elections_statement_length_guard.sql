-- حدُّ بيان الترشّح في القاعدة نفسها: ١٠٠–٤٠٠٠ حرفًا بعد التشذيب.
--
-- تريغر لا قيد CHECK عمدًا: القيدُ يُعاد فحصُه عند أيّ تحديثٍ للصفّ، وفي القاعدة خمسةُ
-- بياناتٍ قديمةٍ دون الحدّ (اثنان منها `pending` في انتخابين مفتوحين)، فيقفل القيدُ
-- اعتمادَها ورفضَها — وهما تحديثُ حالةٍ لا مساسَ فيه بالبيان. والتريغر يوقظه كتابةُ
-- البيان وحدها: القديمُ يبقى يُقرأ ويُراجَع، ومن أعاد كتابته لزمه الحدُّ الجديد.
--
-- والحدّان مكتوبان في الويب كذلك (`elections/vocab.ts`) رسالةً للكاتب قبل الإرسال؛
-- وهذه هي الكلمةُ الأخيرة: تحرس كلَّ بابٍ يكتب، دالّةً كان أو كتابةً مباشرة.

create or replace function public.enforce_candidacy_statement_length()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_len integer := length(btrim(coalesce(new.statement_ar, '')));
begin
  if v_len < 100 then
    raise exception 'بيان الترشّح قصيرٌ جدًّا (١٠٠ حرفٍ على الأقلّ).' using errcode = 'check_violation';
  end if;
  if v_len > 4000 then
    raise exception 'بيان الترشّح طويلٌ جدًّا (٤٠٠٠ حرفٍ حدًّا أقصى).' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.enforce_candidacy_statement_length() is
  'حارسُ طول بيان الترشّح (١٠٠–٤٠٠٠ بعد التشذيب) — يوقظه إنشاءُ البيان أو إعادةُ كتابته لا تحديثُ حالة المرشّح.';

drop trigger if exists trg_candidacy_statement_insert on public.election_candidates;
create trigger trg_candidacy_statement_insert
  before insert on public.election_candidates
  for each row
  execute function public.enforce_candidacy_statement_length();

drop trigger if exists trg_candidacy_statement_update on public.election_candidates;
create trigger trg_candidacy_statement_update
  before update of statement_ar on public.election_candidates
  for each row
  when (new.statement_ar is distinct from old.statement_ar)
  execute function public.enforce_candidacy_statement_length();
