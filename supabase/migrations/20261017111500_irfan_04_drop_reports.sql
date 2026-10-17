-- ═══════════════════════════════════════════════════════════════════════════
-- «عِرفان» ٤ (٢٠٢٦-١٠-١٧) — **البلاغُ وقائمةُ التغطية يُحذفان من جذورهما**.
--
-- قرارُ المالك بعد أن رأى الغرفةَ منشورة: «لم تصلها رسائل بعد، أزلها، ليس لها داعي، وما لا يليق في
-- تبليغ الرسالة كذلك أزلها»، ثمّ: «فحذفها حتى من قاعدة البيانات». حُذفا من الواجهة يومَها (`ff71c8a`)،
-- وبقيت أدواتُهما هنا لأنّ طلبَ تطبيق الحذف كان يُلغى قبل أن يصله. والإزالةُ إزالةٌ لا إخفاء.
--
-- فسياسةُ القراءة تعود «المرسلُ والمستلمُ وحدهما» (كان الرئيسان يقرآن المُبلَّغ عنه)، وتسقط دوالُّ
-- البلاغ والتغطية والرئاسة، وعمودا البلاغ.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists irfan_messages_read on public.irfan_messages;
create policy irfan_messages_read on public.irfan_messages
  for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));

drop function if exists public.report_irfan(bigint, text);
drop function if exists public.irfan_uncovered(integer);
drop function if exists public.irfan_is_president(uuid);

alter table public.irfan_messages drop constraint if exists irfan_messages_note_len;
alter table public.irfan_messages drop column if exists report_note;
alter table public.irfan_messages drop column if exists reported_at;

comment on table public.irfan_messages is
  'رسائلُ «عِرفان». يقرؤها مرسلُها ومستلمُها وحدهما. لا كتابةَ من المتصفّح: الإرسالُ بـ`send_irfan`.';
