#!/bin/bash
# دورةُ تقييمٍ كاملة على القاعدة المحلّيّة: فتحٌ، وأوراق، وإغلاق، وحكمٌ بدالّة الكود، واستبعاد، وتصحيح.
set -e
D=$(cd "$(dirname "$0")" && pwd)
R=$(cd "$D/../../.." && pwd)
export PGPASSWORD=pg
Q="psql -q -v ON_ERROR_STOP=1 -h localhost -U postgres -d adeeb_test"
A() { $Q -Atc "$1"; }
# يتحقّق: «الوصف» «الاستعلام» «المتوقَّع»
eq() { local got; got=$(A "$2"); if [ "$got" != "$3" ]; then echo "✗ $1"; echo "   متوقَّع: $3"; echo "   وُجد:    $got"; exit 1; else echo "✓ $1"; fi; }
as() { echo "set test.uid = '$(printf '00000000-0000-0000-0000-%012d' "$1")';"; }
# يحكم بدالّة الكود نفسِها (score.ts) على مجاميع القاعدة، ويُخرج JSON الأحكام
judge() {
  A "select coalesce(json_agg(row_to_json(t)), '[]') from evaluation_tally($1${2:+, $2}) t" \
  | node --experimental-strip-types --no-warnings -e '
      import("'$R'/v2/apps/web/src/lib/evaluation/score.ts").then(m => {
        let s=""; process.stdin.on("data", d => s += d).on("end", () => {
          const rows = JSON.parse(s); const out = rows.map(m.recordFor);
          process.stdout.write(JSON.stringify(process.argv[1] === "one" ? out[0] : out));
        });
      });' "${2:+one}"
}

"$D/reset.sh" $R/supabase/migrations/*_evaluation_0{1,2,3}_*.sql > /dev/null
$Q -f "$D/10_fixture.sql"
# للاختبار وحده: تحريرُ نافذة الدورة من موعدها كي تُفتح «الآن»
A "alter table evaluation_cycles drop constraint evaluation_cycles_window" > /dev/null

echo "── قبل الموعد"
A "select evaluation_tick()" > /dev/null
eq "دورةٌ واحدةٌ منتظِرة في 21 يناير 2027" "select due_on||' '||status from evaluation_cycles" "2027-01-21 scheduled"
eq "الدورةُ تُفتح منتصفَ ليل الرياض" "select to_char(opens_at at time zone 'UTC','YYYY-MM-DD HH24:MI')||' '||to_char(closes_at at time zone 'UTC','YYYY-MM-DD HH24:MI') from evaluation_cycles" "2027-01-20 21:00 2027-01-23 21:00"

echo "── الفتح"
A "update evaluation_cycles set opens_at = now() - interval '1 hour', closes_at = now() + interval '2 days'" > /dev/null
A "select evaluation_tick()" > /dev/null
eq "مفتوحة" "select status from evaluation_cycles where id = 1" "open"
eq "المقيَّمون: القائدُ والنائبُ ومنسّقان وقائدٌ وحيد؛ وقائدُ التأليف مستثنى (أقلّ من 4 أسابيع)" \
   "select string_agg(right(user_id::text,2)||':'||role_name||coalesce(':'||excluded,''), ' ' order by user_id) from evaluation_targets" \
   "10:committee_leader 11:deputy_committee_leader 20:committee_leader:recent 30:committee_leader 40:department_head 41:department_head"
eq "مقيِّمو قائد التصوير: المجلس (الرئيسان وقائد الموارد والمشرفان ومكلَّفُ الضمان) والأعضاء (النائب والأعضاء ومنسّق القسم)، ومن له الشقّان ففي المجلس" \
   "select string_agg(right(rater_id::text,2)||e.part, ' ' order by e.part, rater_id) from evaluation_electorate e join evaluation_targets t on t.id=e.target_id where t.user_id=u(10)" \
   "01council 02council 03council 05council 06council 15council 11members 12members 13members 14members 41members"
eq "لا يدخل المعلَّقُ ولا حسابُ النادي ولا عضوُ اللجنة المغلقة" \
   "select count(*) from evaluation_electorate where rater_id in (u(17), u(99), u(16))" "0"
eq "مقيِّمو منسّق الإنتاج: كلُّ من في لجنتَي قسمه، والأربعةُ وحدهم من المجلس (لا مشرفين)" \
   "select members_eligible||' '||council_eligible from evaluation_targets where user_id=u(41)" "8 4"
eq "قائدٌ وحيدٌ في لجنته: مقيِّمُه من الأعضاء منسّقُ قسمه وحده" \
   "select members_eligible||' '||council_eligible from evaluation_targets where user_id=u(30)" "1 4"
eq "إشعارُ الفتح لكلّ من في اللقطة" "select kind||' '||jsonb_array_length(facts->'raters') from notification_events" "evaluation.opened 17"

echo "── الأوراق"
T10=$(A "select id from evaluation_targets where user_id=u(10)")
T11=$(A "select id from evaluation_targets where user_id=u(11)")
T20=$(A "select id from evaluation_targets where user_id=u(20)")
T30=$(A "select id from evaluation_targets where user_id=u(30)")
T40=$(A "select id from evaluation_targets where user_id=u(40)")
T41=$(A "select id from evaluation_targets where user_id=u(41)")
sub() { A "$(as $1) select evaluation_submit($2, $3, $4, $5)->>'message'"; }
eq "أوراقُ العضو 12: قائدُه ونائبُه ومنسّقُ قسمه" "$(as 12) select count(*)||' '||bool_or(done) from evaluation_my_sheets()" "3 false"
eq "ورقةٌ ناقصة تُرفض" "$(as 12) select evaluation_submit($T10, array[3,3,3], null, null)->>'message'" "قيّم كلَّ البنود من 1 إلى 5."
eq "درجةٌ خارج المقياس تُرفض" "$(as 12) select evaluation_submit($T10, array[3,3,3,3,3,3,6], null, null)->>'message'" "قيّم كلَّ البنود من 1 إلى 5."
eq "ليس في اللقطة" "$(as 22) select evaluation_submit($T10, array[3,3,3,3,3,3,3], null, null)->>'message'" "ليس لك تقييمٌ لهذا المنصب."
eq "المستثنى لا يُقيَّم" "$(as 21) select evaluation_submit($T20, array[3,3,3,3,3,3,3], null, null)->>'message'" "ليس لك تقييمٌ لهذا المنصب."
eq "ولا يقيّم أحدٌ نفسه" "$(as 10) select count(*) from evaluation_my_sheets() where target_id=$T10" "0"
eq "بلا جلسة" "set test.uid = ''; select evaluation_submit($T10, array[3,3,3,3,3,3,3], null, null)->>'message'" "سجّل الدخول ثمّ أعِد المحاولة."
# قائد التصوير: الأعضاء 11 12 13 (3 من 6 = نصفهم) بمجموع 49+49+49 → 147/315 ... والمجلس 01 02
eq "ورقة" "$(as 12) select evaluation_submit($T10, array[2,2,2,2,2,2,2], 'التواصل', '') ->>'message'" "وصل تقييمُك."
eq "لا تُعاد" "$(as 12) select evaluation_submit($T10, array[5,5,5,5,5,5,5], null, null)->>'message'" "قيّمتَ هذا المنصب من قبل، والتقييمُ لا يُعاد."
sub 13 $T10 "array[2,2,2,2,2,2,2]" "null" "'ينظّم أكثر'" > /dev/null
sub 11 $T10 "array[2,2,2,2,2,2,2]" "'الالتزام'" "null" > /dev/null
eq "ورقةُ المجلس بخمسة بنود، ولا سؤالَ مفتوحًا فيها" "$(as 1) select evaluation_submit($T10, array[2,2,2,2,2], 'يُسقَط', 'يُسقَط')->>'message'" "وصل تقييمُك."
sub 2 $T10 "array[2,2,2,2,2]" null null > /dev/null
eq "نصُّ المجلس لا يُحفظ" "select count(*) from evaluation_ballots where part='council' and (keep_text is not null or change_text is not null)" "0"
# النائب 11: ورقتان من ستّة مؤهّلين (لا نصاب) وورقةُ مجلس → المجلسُ وحده
sub 12 $T11 "array[5,5,5,5,5,5,5]" null null > /dev/null
sub 13 $T11 "array[5,5,5,5,5,5,5]" null null > /dev/null
sub 3  $T11 "array[4,4,4,4,4]" null null > /dev/null
# منسّق الإنتاج 41: 5 من 9 (فوق النصف) بأدنى الدرجات، ولا مجلس → يُستبعد ولا لجنةَ سابقةَ له
for r in 10 12 14 21 22; do sub $r $T41 "array[1,1,1,1,1,1,1]" null null > /dev/null; done
# منسّق الفعاليات 40: لا أوراق → لا نتيجة
# قائد التنظيم 30: يترك منصبه أثناء الأيام الثلاثة
sub 40 $T30 "array[1,1,1,1,1,1,1]" null null > /dev/null
eq "إشاراتُ العضو 14: له ورقةٌ باقية" "$(as 14) select evaluation_signals_for(u(14))->>'canRate'||' '||(evaluation_signals_for(u(14))->>'pending')" "true 2"

echo "── ترك المنصب أثناء الأيام الثلاثة"
eq "نزعُ قائد التنظيم بالباب المعتاد" "select revoke_position(u(1), u(30), 'committee_leader', 3)->>'code'" "RETURNED"
eq "ورقتُه لم تعد مفتوحة" "$(as 1) select evaluation_submit($T30, array[3,3,3,3,3], null, null)->>'message'" "لم يعد هذا التقييم مفتوحًا."

echo "── الإغلاق"
A "update evaluation_cycles set closes_at = now() + interval '12 hours'" > /dev/null
A "select evaluation_tick()" > /dev/null
eq "التذكيرُ قبل الإغلاق بيوم: لمن بقيت له أوراق" "select count(*) from notification_events where kind='evaluation.reminder'" "1"
A "update evaluation_cycles set closes_at = now() - interval '1 minute'" > /dev/null
A "select evaluation_tick()" > /dev/null
eq "مغلقة" "select status from evaluation_cycles where id=1" "closed"
eq "من ترك منصبه: لا نتيجة" "select verdict||' '||cancelled from evaluation_targets where id=$T30" "no_result seat_ended"
eq "لا تُرسل ورقةٌ بعد الإغلاق" "$(as 14) select evaluation_submit($T10, array[3,3,3,3,3,3,3], null, null)->>'message'" "لم يعد هذا التقييم مفتوحًا."

echo "── الحكم (score.ts) والتنفيذ"
RES=$(judge 1)
echo "   $RES" | head -c 600; echo
A "select evaluation_record(1, '[]'::jsonb)" > /dev/null 2>&1 && { echo "✗ حكمٌ ناقص قُبل"; exit 1; } || echo "✓ حكمٌ ناقصٌ يُرفض كلُّه"
STALE=$(echo "$RES" | sed 's/"mSum":42/"mSum":43/')
A "select evaluation_record(1, '$STALE'::jsonb)" > /dev/null 2>&1 && { echo "✗ مجاميعُ قديمة قُبلت"; exit 1; } || echo "✓ مجاميعُ لا تطابق الحاضرةَ تُرفض"
FORGED=$(echo "$RES" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);for(const x of r) if(x.verdict==="removed") x.verdict="kept";process.stdout.write(JSON.stringify(r))})')
A "select evaluation_record(1, '$FORGED'::jsonb)" > /dev/null 2>&1 && { echo "✗ «باقٍ» لمن نتيجتُه دون الحدّ قُبل"; exit 1; } || echo "✓ القيدُ يرفض «باقٍ» لمن نتيجتُه 40% أو أقلّ ولو أخطأ الكود"
eq "التنفيذ" "select evaluation_record(1, '$RES'::jsonb)::text" '{"ok": true, "removed": 1, "awaitingReturn": 1}'
eq "الأحكام" "select string_agg(right(user_id::text,2)||':'||coalesce(verdict,'-')||':'||coalesce(branch,'-')||':'||coalesce(final_num||'/'||final_den,'-'), ' ' order by user_id) from evaluation_targets" \
   "10:removed:both:2/5 11:kept:council_only:4/5 20:-:-:- 30:no_result:-:- 40:no_result:none:- 41:removed:members_only:1/5"
eq "قائد التصوير عاد عضوًا في لجنته، ومقعدُه أُطفئ" \
   "select string_agg(role_name||':'||committee_id||':'||is_active, ' ' order by role_name) from user_roles where user_id=u(10)" \
   "committee_leader:1:false committee_member:1:true"
eq "منسّق الإنتاج ينتظر لجنةً، ومقعدُه باقٍ حتّى تُختار" \
   "select t.awaiting_return||' '||ur.is_active from evaluation_targets t join user_roles ur on ur.id=t.seat_id where t.id=$T41" "true true"
eq "سجلُّ النشاط بلا فاعلٍ بشريّ" "select count(*)||' '||bool_and(user_id is null) from activity_log where action_type='evaluation_removal'" "1 true"
eq "الإشعارات" "select string_agg(kind, ' ' order by kind) from (select distinct kind from notification_events where kind like 'evaluation.%') k" \
   "evaluation.awaiting_return evaluation.opened evaluation.reminder evaluation.removed evaluation.result"
A "select evaluation_tick()" > /dev/null
eq "الدورةُ منفَّذة، والتاليةُ تُنشأ" "select string_agg(due_on||':'||status, ' ' order by due_on) from evaluation_cycles" "2027-01-21:executed 2027-04-21:scheduled"

echo "── نتيجتي (المسألة ٣) وإجاباتُ السؤال المفتوح"
eq "قائد التصوير: الأعضاء 3 أوراق فتظهر، والمجلس ورقتان فيُخفى" \
   "$(as 10) select verdict||' '||final_num||'/'||final_den||' '||coalesce(members_num||'/'||members_den,'-')||' '||coalesce(council_num||'/'||council_den,'-')||' '||comments from evaluation_my_results()" \
   "removed 2/5 2/5 - 3"
eq "الإجاباتُ بلا أسماء" "$(as 10) select count(*) from evaluation_my_comments($T10)" "3"
eq "ولا يقرأ أحدٌ إجاباتِ غيره" "$(as 12) select count(*) from evaluation_my_comments($T10)" "0"
eq "ولا يقرأ المتصفّحُ الأوراق" "set role authenticated; select has_table_privilege('evaluation_ballots','select')" "f"

echo "── مهلةُ الانتخاب (المسألة ١)"
A "insert into elections (target_role_name, target_committee_id) values ('committee_leader', 1)" > /dev/null 2>&1 \
  && { echo "✗ فُتح انتخابٌ في المهلة"; exit 1; } || echo "✓ لا يُفتح انتخابُ مقعد قائد التصوير قبل 7 أيام"
A "insert into elections (target_role_name, target_committee_id) values ('deputy_committee_leader', 2)" > /dev/null && echo "✓ وغيرُه يُفتح"

echo "── اختيارُ لجنة المنسّق (المسألة ٤)"
eq "بلا قدرة يُرفض" "select evaluation_choose_return(u(12), $T41, 2)->>'message'" "لا تملك إدارة تقييم القيادات."
eq "لجنةٌ مغلقة تُرفض" "select evaluation_choose_return(u(3), $T41, 4)->>'message'" "اختر لجنةً قائمة."
eq "قائدُ الموارد يختار" "select evaluation_choose_return(u(3), $T41, 2)->>'message'" "نُفّذ الاستبعاد."
eq "عاد عضوًا في التأليف" "select string_agg(role_name||':'||coalesce(committee_id::text,'-')||':'||is_active, ' ' order by role_name) from user_roles where user_id=u(41)" \
   "committee_member:2:true department_head:-:false"

echo "── التصحيح: إخراجُ مقيِّمٍ دخل خطأً يقلب الحكم فيُعاد (م١٠/3)"
eq "بلا سبب يُرفض" "select evaluation_correct_rater(u(3), $T10, u(12), 'remove', null, '')->>'message'" "اكتب سبب التصحيح."
eq "إخراجُ العضو 12" "select evaluation_correct_rater(u(3), $T10, u(12), 'remove', null, 'لم يكن في اللجنة يوم الفتح')->>'needsRecompute'" "true"
ONE=$(judge 1 $T10)
eq "الحكمُ المصحَّح: ورقتان من خمسة (لا نصاب) فالمجلسُ وحده 40% فيبقى مستبعَدًا" \
   "select evaluation_apply_correction(u(3), '$ONE'::jsonb, 'إبطالُ ورقة العضو 12')->>'verdict'" "removed"
eq "وإخراجُ العضو 14" "select evaluation_correct_rater(u(3), $T10, u(14), 'remove', null, 'تصحيح')->>'ok'" "true"
eq "وإدخالُ العضو 20 وقد سقط خطأً" "select evaluation_correct_rater(u(3), $T10, u(20), 'add', 'members', 'كان عضوًا في التصوير يوم الفتح')->>'ok'" "true"
# اختبارُ القلب: نُعيد العضو 12 ونُخرج ورقتَي المجلس فيصير الأعضاء وحدهم (6/15 = 40%) … نختار بدلًا منه حالةً واضحة:
A "update evaluation_ballots set scores = '{5,5,5,5,5}' where target_id=$T10 and part='council'" > /dev/null
ONE=$(judge 1 $T10)
eq "تصحيحُ الحساب يقلبه «باقيًا» فيُعاد إلى مقعده" \
   "select evaluation_apply_correction(u(3), '$ONE'::jsonb, 'خطأ في الحساب')->>'outcome'" "restored"
eq "عاد قائدًا، وأُطفئ مقعدُ العضو" "select string_agg(role_name||':'||is_active, ' ' order by role_name) from user_roles where user_id=u(10)" "committee_leader:true committee_member:false"
A "insert into elections (target_role_name, target_committee_id) values ('committee_leader', 1)" > /dev/null && echo "✓ لا مهلةَ لمقعدٍ عاد صاحبُه"

echo "── التصحيح العكسيّ (المسألة ٥): باقٍ نزلت نتيجتُه فيُستبعد"
A "update evaluation_ballots set scores = '{1,1,1,1,1}' where target_id=$T11 and part='council'" > /dev/null
A "update evaluation_ballots set scores = '{1,1,1,1,1,1,1}' where target_id=$T11 and part='members'" > /dev/null
ONE=$(judge 1 $T11)
eq "النائب: من باقٍ إلى مستبعَد" "select evaluation_apply_correction(u(1), '$ONE'::jsonb, 'إعادة الحساب')->>'outcome'" "removed"
eq "عاد النائبُ عضوًا في لجنته" "select string_agg(role_name||':'||is_active, ' ' order by role_name) from user_roles where user_id=u(11)" "committee_member:true deputy_committee_leader:false"

echo "── إعادةٌ تتعذّر لأنّ المقعد شُغل (المسألة ١)"
A "update evaluation_targets set removed_at = now() - interval '8 days' where id=$T11" > /dev/null
A "select assign_position(u(1), u(13), 'deputy_committee_leader', 1)" > /dev/null 2>&1 || \
  A "update user_roles set is_active=false where user_id=u(13) and role_name='committee_member'; insert into user_roles (user_id, role_name, committee_id) values (u(13), 'deputy_committee_leader', 1)" > /dev/null
A "update evaluation_ballots set scores = '{5,5,5,5,5}' where target_id=$T11 and part='council'" > /dev/null
A "update evaluation_ballots set scores = '{5,5,5,5,5,5,5}' where target_id=$T11 and part='members'" > /dev/null
ONE=$(judge 1 $T11)
eq "يُصحَّح السجلّ ولا يُعاد" "select evaluation_apply_correction(u(3), '$ONE'::jsonb, 'خطأ')->>'outcome'" "occupied"
eq "والإشعارُ يصله بالتصحيح" "select count(*) from notification_events where kind='evaluation.corrected'" "4"

echo "── revoke_position بعد الاستخراج: كما كانت"
eq "منسّق الفعاليات يُنزع فيعود إلى آخر لجنةٍ كان عضوًا فيها" "select revoke_position(u(1), u(40), 'department_head', null)->>'returned_committee_id'" "3"
eq "المنصبُ الوحيد بلا لجنةٍ يُرفض كما كان" "select revoke_position(u(1), u(41), 'committee_member', 2)->>'code'" "SOLE_SEAT"

echo "── الشقّان: من اجتمع له الشقّان فله ورقةٌ في المجلس"
eq "لا مقيِّمَ في الشقّين لمقيَّمٍ واحد" "select count(*) from (select target_id, rater_id from evaluation_electorate group by 1,2 having count(*)>1) x" "0"

echo
echo "كلُّه سليم."
