-- ديبو — الإزالةُ من سجلّ صاحبها لا من سجلّ النادي (م٢)
--
-- سألني المالكُ ٢٠٢٦-٠٨-٢٠: «لو المستخدم حذف محادثته، تُحذف من لوحة التحكّم؟» وأجاب هو:
-- **«تُحذف من سجلّ المستخدم وتبقى في السجلّ باسمه»**. فهذا الترحيلُ ينقض فعلَ م١ ولا
-- ينقض حكمَه: الصفُّ يخرج من درج صاحبه ويبقى في غرفة اللوحة موسومًا به.
--
-- ## ولمَ لا يُحذف حقًّا
-- غرفةُ `/dashboard/deebo` تُقرأ لتُعرَف «بمَ يُسأل النادي» وأين تكذب معرفةُ ديبو. وسجلٌّ
-- يمحوه من سُئل عنه سجلٌّ لا يُبنى عليه. وثمنُه صدقُ الكلمة في الواجهة: الزرُّ لم يعد
-- يقول «احذف» بل **«أزِلها من سجلّي»**، ومعه سطرٌ مكشوفٌ في الجزيرة يقول إنّ نصَّها يبقى
-- عندنا. فالمقايضةُ تُعلَن قبل النقر لا تُكتشَف بعده.
--
-- ## وثلاثةُ حدودٍ لا تتزحزح
--   · **الزائرُ المجهول يبقى مجهولًا**: هذا كلُّه في صفوف أصحاب الحسابات وحدَها، ومحادثةُ
--     المجهول لا صاحبَ لها أصلًا ولا سِجلَّ له عندنا يُخفي منه شيئًا.
--   · **الخروجُ من أديب يُجرّدها ولا يُبقي الاسم**: `on delete set null` في م١ باقيةٌ كما
--     هي، فمن أنهى حسابَه عادت محادثاتُه مجهولةً — الاسمُ يبقى ما بقي صاحبُه.
--   · **وحدُّ السنة باقٍ**: `deebo_purge_owned(365)` يحذف المملوكةَ بعد سنةٍ من آخر كلمة،
--     مخفيّةً كانت أو ظاهرة. فالبقاءُ «في السجلّ» بقاءٌ في مدّة الحفظ لا إلى الأبد.

begin;

-- ═══ (١) وقتُ الإزالة ═══════════════════════════════════════════════════════
-- وقتٌ لا عَلَمٌ منطقيّ: «متى أزالها» خبرٌ يُقرأ في اللوحة (ومتى تكرّر فهو إشارةُ حرج)،
-- و`true` لا تقول شيئًا من ذلك.
alter table public.deebo_conversations
  add column if not exists hidden_at timestamptz;

comment on column public.deebo_conversations.hidden_at is
  'أزال صاحبُها المحادثةَ من سجلّه في هذا الوقت. تختفي من دَرَجه وتبقى في سجلّ اللوحة باسمه (قرار المالك ٢٠٢٦-٠٨-٢٠).';

-- ═══ (٢) لا حذفَ من المتصفّح بعد اليوم ══════════════════════════════════════
-- سياسةُ الحذف في م١ كانت تنفيذَ القرار القديم. وإبقاؤها مع زرٍّ يُخفي يعني أنّ الحكم
-- الجديد زينةٌ في الواجهة: من نادى القاعدةَ مباشرةً حذف صفَّه فعلًا (درسُ Turnstile:
-- ما دامت السياسةُ تسمح فالدرعُ زينة).
drop policy if exists deebo_conv_own_delete on public.deebo_conversations;

-- ═══ (٣) والمخفيّةُ تخرج من عين صاحبها ══════════════════════════════════════
-- الحارسُ في القاعدة لا في الاستعلام: لو نُخِلت في الشاشة وحدَها لبقي المِنفذُ المباشر
-- يفتحها ويكمل الكلام فيها. (وسياسةُ `manage_deebo` تبقى كما هي: اللوحةُ ترى الكلَّ.)
drop policy if exists deebo_conv_own_read on public.deebo_conversations;
create policy deebo_conv_own_read on public.deebo_conversations
  for select to authenticated
  using (user_id = auth.uid() and hidden_at is null);

drop policy if exists deebo_msg_own_read on public.deebo_messages;
create policy deebo_msg_own_read on public.deebo_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.deebo_conversations c
      where c.id = deebo_messages.conversation_id
        and c.user_id = auth.uid()
        and c.hidden_at is null
    )
  );

-- ═══ (٤) والإزالةُ دالّةٌ لا تحديثٌ مفتوح ═══════════════════════════════════
-- م١ حكمت: «لا سياسةَ إدراجٍ ولا تحديثٍ لأحد». ومنحُ `update` لصاحب الصفّ ينقضها ويفتح
-- له عمودًا آخرَ يعبث به (العنوان، العدّاد، الرموز). فبابٌ واحدٌ ضيّقٌ يفعل شيئًا واحدًا،
-- والفاعلُ فيه من `auth.uid()` لا من مُدخَل (درسُ `p_actor` المسدود).
create or replace function public.deebo_hide_conversation(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_done boolean;
begin
  update public.deebo_conversations
     set hidden_at = now()
   where id = p_id
     and user_id = auth.uid()
     and hidden_at is null
  returning true into v_done;

  return coalesce(v_done, false);
end;
$$;

comment on function public.deebo_hide_conversation(uuid) is
  'يُخفي محادثةَ صاحب الجلسة من سجلّه (ولا يحذفها: سجلّ اللوحة يبقى). يردّ false إن لم تكن له أو كانت مخفيّةً أصلًا.';

revoke all on function public.deebo_hide_conversation(uuid) from public, anon;
grant execute on function public.deebo_hide_conversation(uuid) to authenticated;

commit;
