-- طُبّق ٢٠٢٦-١٠-١٩ بعد نشر f7b0c1f (الموقعُ ينادي reply_contact_message بأربعة معاملات):
-- الموقعُ الجديد ينادي reply_contact_message بأربعة معاملات (p_reply_to)، والقديمةُ بخمسة لا يناديها أحد.
drop function if exists reply_contact_message(uuid, uuid, text, text, text);
