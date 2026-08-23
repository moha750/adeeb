-- ديبو — الحذفُ عند صاحبه، وسجلُّ اللوحة يبقى (م٤)
--
-- حكمُ المالك بحروفه ٢٠٢٦-٠٨-٢١: **«المستخدم لمّا يحذف المحادثة تُحذف من عند المستخدم
-- فقط، ويبقى سجلُّها في لوحة التحكّم كما هي»**. وهذا يردّ ما كان في `deebo_03_owner_hides`
-- بعد أن نقضه `deebo_04_delete_means_delete` (طُبِّق ٢٠٢٦-٠٨-٢٠ على فهمٍ آخرَ لكلامه).
--
-- ولمَ لا يُحذف الصفُّ حقًّا: غرفةُ `/dashboard/deebo` تُقرأ لتُعرَف بمَ يُسأل النادي وأين
-- تكذب معرفةُ ديبو، وسجلٌّ يمحوه من سُئل عنه سجلٌّ لا يُبنى عليه. والكلمةُ في الواجهة
-- تبقى «حذف» لأنّها كذلك عند صاحبها: يذهب من دَرَجه ومن أن يفتحه أو يكمل الكلام فيه.

begin;

-- ═══ (١) وقتُ الحذف عند صاحبه ═══════════════════════════════════════════════
alter table public.deebo_conversations
  add column if not exists hidden_at timestamptz;

comment on column public.deebo_conversations.hidden_at is
  'حذف صاحبُها المحادثةَ من سجلّه في هذا الوقت. تختفي من دَرَجه ويبقى سجلُّها في اللوحة (حكم المالك ٢٠٢٦-٠٨-٢١).';

-- ═══ (٢) ولا حذفَ حقيقيًّا من المتصفّح ══════════════════════════════════════
-- سياسةٌ تسمح بالحذف تجعل الحكمَ زينةً: من نادى القاعدةَ مباشرةً محا الصفَّ فعلًا.
drop policy if exists deebo_conv_own_delete on public.deebo_conversations;

-- ═══ (٣) والمحذوفةُ عنده تخرج من عينه ═══════════════════════════════════════
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

-- ═══ (٤) والفعلُ دالّةٌ ضيّقةٌ لا امتيازَ تحديثٍ مفتوح ═════════════════════
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
  'يحذف محادثةَ صاحب الجلسة من سجلّه (ويبقى سجلُّها في اللوحة). يردّ false إن لم تكن له أو حُذفت قبلُ.';

revoke all on function public.deebo_hide_conversation(uuid) from public, anon;
grant execute on function public.deebo_hide_conversation(uuid) to authenticated;

commit;
