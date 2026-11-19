-- الانتخابات ٢٠٢٦، الدفعة ٨ (بإذن المالك ٢٠٢٦-١١-١٩: «طبّقها»، وصلاحيةٌ كاملةٌ بما ذُكر قبلها)
--
-- ١) **طلبُ الاستبعاد يسقط إن لم يُوافَق عليه خلال ٢٤ ساعة** (محمد: «إذا رُفع أمام القائدة ٢٤ ساعة وإلّا يبطل»).
--    والمراحلُ كلُّها ٢٤ ساعة: الموافقة، ثمّ إجابةُ المرشّح، ثمّ القرار. النظامُ (المادة ١٦) لا ينصّ على أجل الموافقة، فيُضاف في إصداره القادم.
--    مآلٌ جديد `expired` وحدثٌ في السجلّ `freeze_expired`، والكنّاسةُ نفسُها (`sweep_candidacy_deadlines`، كلَّ دقيقة) تُسقطه.
-- ٢) **لا «تزكية» في رسائل القاعدة**: صارت «تصويت الثقة»، كما في الواجهة كلّها (مستند «مصطلحات الانتخابات»).
-- ٣) **«الناخبون» صاروا «المصوّتين»** (محمد: «ما أعرف شنو معناته، مو مفهوم عندنا»).
--
-- النصوصُ تُستبدل في **التعريف الحيّ** لكلّ دالّة (`pg_get_functiondef`) لا في ملفّ ترحيلٍ سابق، فلا يُمحى ما رقّعته دفعاتٌ بعده؛
-- و`create or replace` يُبقي صلاحياتها كما هي. وكلُّ استبدالٍ يُشترط أن يقع، وإلّا رُدّ الترحيلُ كلُّه.

alter table public.election_freezes drop constraint election_freezes_outcome_check;
alter table public.election_freezes add constraint election_freezes_outcome_check check (outcome = any (array[
  'lifted', 'excluded', 'auto_excluded', 'auto_lifted', 'withdrawn', 'ended', 'declined', 'stale', 'election_cancelled', 'expired'
]));

create or replace function public.sweep_candidacy_deadlines()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r   record;
  v_n integer := 0;
begin
  -- مطلوبٌ تعديله مضت مهلته: ينتهي ترشّحه (المادة ١٤).
  for r in
    select ec.id from election_candidates ec join elections e on e.id = ec.election_id
    where ec.status = 'needs_edit' and ec.edit_due_at is not null and ec.edit_due_at <= now()
      and e.status in ('candidacy_open', 'candidacy_closed')
  loop
    perform public._end_candidacy(r.id, 'edit_expired', null);
    v_n := v_n + 1;
  end loop;

  -- طلب تجميدٍ لم يُوافَق عليه وقد خرج الانتخاب من الترشّح أو انتهى الترشّح: يسقط.
  update election_freezes f set status = 'closed', outcome = 'stale', decided_at = now()
   from elections e, election_candidates ec
   where e.id = f.election_id and ec.id = f.candidate_id and f.status = 'requested'
     and (e.status not in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed') or e.winner_candidate_id is not null or ec.status not in ('pending', 'approved', 'needs_edit'));

  -- طلبُ تجميدٍ مضت عليه ٢٤ ساعة ولم يُوافَق عليه: يسقط، ويُقيَّد في السجلّ (محمد ٢٠٢٦-١١-١٩).
  for r in
    select id, election_id, candidate_id from election_freezes
    where status = 'requested' and requested_at <= now() - interval '24 hours'
  loop
    update election_freezes set status = 'closed', outcome = 'expired', decided_at = now() where id = r.id;
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (r.election_id, null, 'freeze_expired', jsonb_build_object('candidate_id', r.candidate_id, 'freeze_id', r.id));
    v_n := v_n + 1;
  end loop;

  -- تجميدٌ في انتخابٍ أُلغي أو اكتمل: يُغلق بلا أثر.
  update election_freezes f set status = 'closed', outcome = 'election_cancelled', decided_at = now()
   from elections e
   where e.id = f.election_id and f.status <> 'closed' and e.status in ('cancelled', 'completed');

  -- مجمَّدٌ لم يُجب في مهلته: يُستبعد آليًّا (المادة ١٦).
  for r in select id from election_freezes where status = 'active' and answer_due <= now() loop
    perform public._exclude_frozen(r.id, null, 'auto_excluded', 'مضت مهلة الإجابة ولم يُجب');
    v_n := v_n + 1;
  end loop;

  -- أجاب ولم تقرّر الإدارة في أجلها: يُرفع التجميد آليًّا (المادة ١٦).
  for r in select id from election_freezes where status = 'answered' and decide_due <= now() loop
    perform public._lift_freeze(r.id, null, 'auto_lifted', 'مضى أجل القرار ولم تقرّر الإدارة');
    v_n := v_n + 1;
  end loop;

  -- بابٌ أُغلق ثمّ لم يبقَ فيه ترشّحٌ قائم: تعثّر (المادة ٢٥). ويُعاد فتحه بموعدٍ وسبب أو يُلغى.
  for r in
    select e.id from elections e
    where e.status = 'candidacy_closed' and e.archived_at is null and e.stalled_at is null
      and public._count_active_candidates(e.id) = 0
  loop
    update elections set stalled_at = now() where id = r.id;
    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (r.id, null, 'candidacy_stalled', jsonb_build_object('active_count', 0, 'after_close', true));
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$function$;

do $mig$
declare
  -- الدالّة، والنصُّ القديم، والجديد، وعددُ مرّاته المتوقَّع في تعريفها
  fixes constant text[][] := array[
    ['_stall_election',          'then ''سقطت التزكية''',                                  'then ''سقط تصويت الثقة''',                                  '1'],
    ['enforce_winner_declaration','سقطت التزكية: لم يغلب التأييدُ الاعتراض',               'سقط تصويت الثقة: لم يغلب التأييدُ الاعتراض',               '1'],
    ['_after_candidacy_lost',    'ويُعاد التصويت تزكيةً بموعدٍ يُعلَن',                    'ويُعاد التصويت تصويتَ ثقةٍ بموعدٍ يُعلَن',                  '1'],
    ['_after_candidacy_lost',    'افتح التصويت من أوّله تزكيةً بموعدٍ تحدّده',             'افتح التصويت من أوّله تصويتَ ثقةٍ بموعدٍ تحدّده',           '1'],
    ['enforce_vote_eligibility', 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد',              'الاعتراض لا يكون إلّا في تصويت الثقة على مرشّحٍ وحيد',      '1'],
    ['cast_vote',                'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد',              'الاعتراض لا يكون إلّا في تصويت الثقة على مرشّحٍ وحيد',      '1'],
    ['appoint_seat_holder',      'من سقطت تزكيته في هذا الانتخاب لا يُعيَّن عليه',          'من سقط تصويت الثقة عليه في هذا الانتخاب لا يُعيَّن عليه',  '1'],
    ['appoint_to_seat',          'من سقطت تزكيته في هذا الانتخاب لا يُكلَّف عليه',          'من سقط تصويت الثقة عليه في هذا الانتخاب لا يُكلَّف عليه',  '1'],
    ['set_election_deadline',    'فيُبلَّغ به ناخبو المقعد',                                'فيُبلَّغ به المصوّتون في المقعد',                           '1'],
    ['transition_election',      'فيُبلَّغ به ناخبو المقعد',                                'فيُبلَّغ به المصوّتون في المقعد',                           '1'],
    ['transition_election',      'فيُبلَّغ به الناخبون',                                    'فيُبلَّغ به المصوّتون',                                     '1'],
    ['open_revote',              'فيُبلَّغ به الناخبون',                                    'فيُبلَّغ به المصوّتون',                                     '1']
  ];
  i int;
  v_oid oid;
  v_def text;
  v_n int;
begin
  for i in 1 .. array_length(fixes, 1) loop
    select p.oid into strict v_oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fixes[i][1];
    v_def := pg_get_functiondef(v_oid);
    v_n := (char_length(v_def) - char_length(replace(v_def, fixes[i][2], ''))) / char_length(fixes[i][2]);
    if v_n <> fixes[i][4]::int then
      raise exception 'الدالّة %: وُجد النصّ «%» % مرّة، والمتوقَّع %', fixes[i][1], fixes[i][2], v_n, fixes[i][4];
    end if;
    execute replace(v_def, fixes[i][2], fixes[i][3]);
  end loop;
end
$mig$;
