-- يُطبَّق **بعد نشر الدفعة** التي فيها ترحيل 20261018080000_adeeb_account_three_faces:
-- الموقعُ الجديد ينادي reply_contact_message بأربعة معاملات (p_reply_to)، والقديمةُ بخمسة لا يناديها أحد.
drop function if exists reply_contact_message(uuid, uuid, text, text, text);
