[
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "academic_number",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "national_id",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "college",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "major",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "degree",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "birth_date",
    "data_type": "date",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "committee",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "x_handle",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "instagram_handle",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "tiktok_handle",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "primary_color",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "secondary_color",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "order",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "linkedin_handle",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "admins_all_access",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "admins_delete_members",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "admins_insert_members",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "admins_read_all",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "admins_update_all",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))"
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "allow_account_activation",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(user_id IS NULL)",
    "with_check": "true"
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "users_read_own_data",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "table_name": "members",
    "column_name": "role",
    "data_type": "text",
    "policyname": "users_update_own_data",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  }
]