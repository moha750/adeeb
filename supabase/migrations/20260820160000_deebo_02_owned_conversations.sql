-- ديبو — المحادثةُ تصير لصاحبها (م١)
--
-- بإذن المالك ٢٠٢٦-٠٨-٢٠، وسؤالُه: «هل نقدر أن تكون هناك محادثاتٌ مخزَّنةٌ للمستخدم مثل
-- GPT أو Claude؟ وهل نستطيع أن نجعل ديبو يتعرّف على المستخدم لو كان يملك حسابًا؟».
--
-- ## وهذا **نقضٌ معلَنٌ لسطرٍ في م٠** لا سهوٌ عنه
-- كُتب هناك: «ولا عمودَ لاسمٍ ولا بريدٍ ولا معرّف عضو. ديبو للزائر المجهول». وكان صحيحًا
-- يومَه: لم يكن لديبو بابٌ إلّا للزائر. واليومَ صار له بابان، فالسطرُ يُقيَّد لا يُلغى:
--   · **الزائرُ المجهول يبقى مجهولًا كما كان**: بصمةٌ تدور كلَّ يوم، ولا صاحبَ لصفّه،
--     ومحادثتُه تبقى في جهازه وحده (قرارُ المالك) فلا سِجلَّ له عندنا يُفتح.
--   · **ومن دخل بحسابه فقد اختار أن يُعرَف**: صفُّه يُختَم به، وهو وحده يقرؤه، وهو وحده
--     يحذفه. وهذه هي بعينها مقايضةُ «سجلُّ محادثاتي» في كلّ مساعدٍ يعرفه.
--
-- ## والحدُّ الزمنيُّ يخصّ **الربطَ بالشخص** لا السجلَّ كلَّه
-- بقي حكمُ م٠ على محادثات المجهولين: **لا حذفَ بعد أجل**. وأمّا محادثةُ صاحبِ الحساب
-- فتُحذف بعد سنةٍ من آخر كلمةٍ فيها (قرارُ المالك اليوم) — هي وحدَها، ولا تُمسّ أختُها
-- المجهولة. وسنةٌ لأنّ ما مضى عليه عامٌ لم يعد سِجلًّا يعود إليه صاحبُه.
--
-- ## والكتابةُ تبقى خادميّةً محضة
-- لا سياسةَ إدراجٍ ولا تحديثٍ لأحد (درسُ Turnstile: ما دامت سياسةٌ تسمح بإدراجٍ من
-- المتصفّح فالدرعُ زينة). المِنفذُ `/api/deebo` وحدَه يكتب بمفتاح الخدمة. والجديدُ
-- سياستان للقراءة وواحدةٌ للحذف، كلُّها **مقصورةٌ على صاحب الصفّ**.

begin;

-- ═══ (١) صاحبُ المحادثة وعنوانُها ═══════════════════════════════════════════
-- `on delete set null` لا `cascade`: الخروجُ من أديب يُنهي الحساب ولا يمحو ما تعلّمناه
-- من الأسئلة (عُرفُ الأرشيف في المستودع)، فتعود المحادثةُ مجهولةً كأختها.
alter table public.deebo_conversations
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- العنوانُ يُشتقّ من أوّل سؤالٍ للزائر ويكتبه المِنفذ. ولا نستهلك نموذجًا لتسميةِ محادثة:
-- أوّلُ سؤالٍ هو موضوعُها في العادة، وثمنُ تسميةٍ «أذكى» رحلةٌ ثانيةٌ إلى المزوّد.
alter table public.deebo_conversations
  add column if not exists title text;

-- فهرسُ الدرج: محادثاتي بترتيب الأحدث. جزئيٌّ لأنّ أكثر الصفوف بلا صاحب.
create index if not exists deebo_conversations_owner_idx
  on public.deebo_conversations (user_id, last_at desc)
  where user_id is not null;

-- ═══ (٢) صاحبُها يقرؤها ويحذفها، ولا أحدَ سواه ══════════════════════════════
-- (وسياسةُ `manage_deebo` القائمةُ تبقى كما هي: غرفةُ اللوحة تقرأ الكلَّ للإدارة.)
drop policy if exists deebo_conv_own_read on public.deebo_conversations;
create policy deebo_conv_own_read on public.deebo_conversations
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists deebo_conv_own_delete on public.deebo_conversations;
create policy deebo_conv_own_delete on public.deebo_conversations
  for delete to authenticated
  using (user_id = auth.uid());

-- والرسائلُ تتبع محادثتَها: لا سياسةَ حذفٍ لها لأنّ حذفَ الأمّ يجرفها (`on delete cascade`)،
-- فبابٌ ثانٍ للحذف بابٌ ثانٍ للخطأ.
drop policy if exists deebo_msg_own_read on public.deebo_messages;
create policy deebo_msg_own_read on public.deebo_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.deebo_conversations c
      where c.id = deebo_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- ═══ (٣) الحذفُ بعد سنة — للمملوكةِ وحدَها ══════════════════════════════════
-- دالّةٌ تُنادى من `pg_cron` كأخواتها في المستودع (`cleanup_pageviews_older_than`)، وتردّ
-- عددَ ما حذفت كي يُقرأ في سجلّ المهمّة. و`user_id is not null` شرطٌ **جوهريّ** لا احتياط:
-- بدونه تجرف الدالّةُ سجلَّ المجهولين الذي أمر المالكُ بإبقائه في م٠.
create or replace function public.deebo_purge_owned(p_days integer default 365)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'مدّةُ الحفظ يجب أن تكون يومًا فأكثر';
  end if;

  with gone as (
    delete from public.deebo_conversations
    where user_id is not null
      and last_at < now() - make_interval(days => p_days)
    returning 1
  )
  select count(*) into v_count from gone;

  return v_count;
end;
$$;

comment on function public.deebo_purge_owned(integer) is
  'يحذف محادثاتِ أصحاب الحسابات التي مضى على آخر كلمةٍ فيها المدّةُ المعطاة (سنةٌ افتراضًا). ولا يمسّ محادثاتِ المجهولين (م٠: لا حذفَ بعد أجل).';

-- لا تُنفَّذ إلّا بمفتاح الخدمة أو من المهمّة: `security definer` تتجاوز RLS، فمنحُها
-- لـ`authenticated` يعني «احذف محادثاتِ الناس كلِّهم».
revoke all on function public.deebo_purge_owned(integer) from public, anon, authenticated;

-- ═══ (٤) المهمّةُ الشهريّة ══════════════════════════════════════════════════
-- على عُرف `site-visits-monthly-cleanup`: أوّلَ كلّ شهرٍ في ساعةٍ خاليةٍ (٤:٢٠ فجرًا).
select cron.unschedule('deebo-owned-conversations-purge')
where exists (select 1 from cron.job where jobname = 'deebo-owned-conversations-purge');

select cron.schedule(
  'deebo-owned-conversations-purge',
  '20 4 1 * *',
  $$select public.deebo_purge_owned(365);$$
);

commit;
