-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: النسختان تايم لاينٌ واحد، لا ملفّان بينهما إزاحة
--
-- تبيّن عند أوّل رفعٍ حقيقيّ أنّ المنتج يصدّر **التايم لاين نفسه** بكتم مسار
-- الموسيقى، فالنسختان متساويتا المدّة عيّنةً بعيّنة (‏١٢٨٥ث و١٢٨٥ث)، والمجرّدةُ
-- تبدأ بصمتٍ مكانَ المقدّمة الموسيقيّة.
--
-- وهذا **أمتنُ** من قصّ المجرّدة: التطابقُ يصير ضمانةً في التصدير لا رقمًا يصونه
-- إنسان. فلو أُعيد قصُّ مقدّمةٍ يومًا، أو حملت حلقةٌ موسيقى **تحت** الكلام لا في
-- مقدّمته وحدها، بقي المبدّل دقيقًا. أمّا نموذجُ الإزاحة فينحرف حينها **صامتًا**:
-- لا يُعطب ولا يُشتكى منه، ويبدو مضبوطًا وليس كذلك.
--
-- فيتبدّل معنى الرقم ولا تتبدّل قيمتُه (‏١٠٫٦٣٣ث):
--   كان: الفرقُ بين مدّتَي ملفّين، يُطرح ويُجمع عند كلّ قفزة.
--   صار: **بداية الحديث** على تايم لاين مشترك. والتبديلُ يصير `t ← t` دقيقًا
--        بلا حساب، ولا يُستعمل الرقمُ إلّا لشيءٍ واحد: ألّا يجلس المستمعُ في
--        صمتٍ إن بدأ بالنسخة المجرّدة قبل أن يبدأ الكلام.
--
-- والاسمُ يتبع المعنى، فلا يبقى عمودٌ يقول غيرَ ما يفعل.
-- ══════════════════════════════════════════════════════════════════════

alter table public.radio_station rename column music_lead_seconds to talk_starts_at;
alter table public.radio_episodes rename column music_lead_seconds to talk_starts_at;

alter table public.radio_station rename constraint radio_station_lead_check to radio_station_talk_start_check;
alter table public.radio_episodes rename constraint radio_episodes_lead_check to radio_episodes_talk_start_check;

comment on column public.radio_station.talk_starts_at is
  'ثانيةُ بدء الحديث على التايم لاين المشترك (طولُ المقدّمة الموسيقيّة). ترثها الحلقةُ ما لم تُصرّح بغيرها.';
comment on column public.radio_episodes.talk_starts_at is
  'تجاوزٌ لبداية الحديث الموروثة من radio_station. فارغٌ = ارِث.';

-- والنسختان تايم لاينٌ واحد، فتساوي المدّتين شرطٌ بنيويّ لا مصادفة.
-- يُحرَس هنا لأنّ اختلافَهما يعني تصديرًا مقصوصًا أو ملفًّا رُفع في غير موضعه،
-- وكلاهما يجعل المبدّلَ يكذب. والتسامحُ ثانيتان: المدّتان تُخزَّنان ثوانيَ صحيحة.
alter table public.radio_episodes
  add constraint radio_episodes_takes_aligned
    check (
      audio_music_seconds is null
      or audio_plain_seconds is null
      or abs(audio_music_seconds - audio_plain_seconds) <= 2
    );
