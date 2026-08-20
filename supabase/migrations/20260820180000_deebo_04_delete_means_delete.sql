-- ديبو — الحذفُ حذفٌ من كلّ مكان (م٣، ونقضٌ لم٢ في يومه)
--
-- كلمةُ المالك ٢٠٢٦-٠٨-٢٠ بعد أن رأى م٢ نازلةً: **«حذفك للمحادثة يعني حذفها من كلّ
-- مكان»**. فما كتبناه صباحًا (تخرج من سجلّ صاحبها وتبقى في سجلّ اللوحة باسمه) يُنقض
-- كلُّه، ويعود الحذفُ إلى معناه الواحد: يذهب الصفُّ ورسائلُه، ولا يبقى له أثرٌ في غرفة
-- اللوحة ولا في غيرها.
--
-- ولا يبقى من م٢ عمودٌ معطَّلٌ ولا دالّةٌ لا تُنادى: عمودٌ لا يُقرأ يصير بعد شهرين لغزًا
-- يُسأل عنه، ودالّةُ إخفاءٍ باقيةٌ بابٌ ثانٍ لفعلٍ أُلغي. والجدولُ فارغٌ (نُظِّف بأمره
-- في اليوم نفسِه) فلا صفَّ يُفقَد بإسقاط العمود.
--
-- والحدُّ الذي لم يتغيّر: **الكتابةُ خادميّةٌ محضة** (لا إدراجَ ولا تحديثَ لأحد)،
-- والقراءةُ والحذفُ لصاحب الصفّ وحده، وغرفةُ اللوحة تقرأ الكلَّ بـ`manage_deebo`.

begin;

-- ═══ (١) الحذفُ يعود لصاحبه ═════════════════════════════════════════════════
drop policy if exists deebo_conv_own_delete on public.deebo_conversations;
create policy deebo_conv_own_delete on public.deebo_conversations
  for delete to authenticated
  using (user_id = auth.uid());

-- ═══ (٢) والقراءةُ بلا شرط الإخفاء ══════════════════════════════════════════
drop policy if exists deebo_conv_own_read on public.deebo_conversations;
create policy deebo_conv_own_read on public.deebo_conversations
  for select to authenticated
  using (user_id = auth.uid());

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

-- ═══ (٣) وأثرُ م٢ يُرفع ═════════════════════════════════════════════════════
drop function if exists public.deebo_hide_conversation(uuid);
alter table public.deebo_conversations drop column if exists hidden_at;

commit;
