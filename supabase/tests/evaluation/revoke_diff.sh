#!/bin/bash
# revoke_position قبل الاستخراج وبعده: الحالاتُ نفسُها على القاعدة نفسِها، والنتائجُ تُقارن حرفًا.
set -e; D=$(cd "$(dirname "$0")" && pwd); R=$(cd "$D/../../.." && pwd); export PGPASSWORD=pg
run() {
  "$D/reset.sh" $@ > /dev/null
  psql -q -v ON_ERROR_STOP=1 -h localhost -U postgres -d adeeb_test -f "$D/10_fixture.sql"
  psql -q -h localhost -U postgres -d adeeb_test -Atc "
    -- حالاتٌ: قائد، ونائب، ومنسّقٌ له تاريخ، ومنسّقٌ بلا تاريخ، وعضوٌ في مقعده الوحيد، ومكلَّف، ولجنةٌ مغلقة
    select revoke_position(u(1), u(10), 'committee_leader', 1)::text;
    select revoke_position(u(1), u(11), 'deputy_committee_leader', 1)::text;
    select revoke_position(u(1), u(40), 'department_head', null)::text;
    select revoke_position(u(1), u(41), 'department_head', null)::text;
    select revoke_position(u(1), u(21), 'committee_member', 2)::text;
    select revoke_position(u(1), u(15), 'qa_committee_leader', 23)::text;
    select revoke_position(u(1), u(16), 'committee_member', 4)::text;
    select revoke_position(u(1), u(30), 'committee_leader', 3)::text;
    select string_agg(concat_ws(',', right(user_id::text,2), role_name, committee_id, department_id, is_active, assigned_by is not null, notes), E'\n' order by user_id, role_name, committee_id) from user_roles;
    select string_agg(kind||' '||facts::text, E'\n' order by id) from notification_events;" 2>&1
}
A=$(run); B=$(run $R/supabase/migrations/*_evaluation_0{1,2,3}_*.sql)
if [ "$A" == "$B" ]; then echo "✓ revoke_position: النتائجُ والصفوفُ والإشعاراتُ متطابقة قبل الاستخراج وبعده"; echo "$A" | head -8; else diff <(echo "$A") <(echo "$B"); exit 1; fi
