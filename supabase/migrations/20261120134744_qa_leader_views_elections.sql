-- قائدُ الضمان والجودة يرى الانتخابات (بإذن محمد ٢٠٢٦-١١-٢٠: «نعم»)
--
-- هو من المجلس الإداريّ الذي يحسم التعادل (المادة ٢٦)، والقاعدةُ تعدّه فيه (`_council_members`) وتقبل اختيارَه
-- (`choose_in_tie`)، لكنّ منصبَه بلا `view_election_candidates` فلا تُفتح له صفحةُ الانتخاب التي يختار منها.
-- والقدرةُ اطّلاعٌ: المرشّحون والسجلّ. و«مَن صوّت لمن» والنتائجُ الحيّة تبقى للمديرين الثلاثة (`has_election_admin_permission`).
-- وللقائد وحده: عضوا الضمان والتنفيذيّة ليسا ممّن يحسم التعادل.

insert into public.role_permissions (role_name, permission_id)
select 'qa_committee_leader', p.id from public.permissions p
where p.permission_key = 'view_election_candidates'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_name = 'qa_committee_leader' and rp.permission_id = p.id
  );
