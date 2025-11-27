members Table:

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

board_members table:

[
  {
    "table_name": "board_members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "name",
    "data_type": "text",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "name",
    "data_type": "text",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "name",
    "data_type": "text",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "position",
    "data_type": "text",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "position",
    "data_type": "text",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "position",
    "data_type": "text",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "image_url",
    "data_type": "text",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "image_url",
    "data_type": "text",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "image_url",
    "data_type": "text",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "twitter_url",
    "data_type": "text",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "twitter_url",
    "data_type": "text",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "twitter_url",
    "data_type": "text",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "linkedin_url",
    "data_type": "text",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "linkedin_url",
    "data_type": "text",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "linkedin_url",
    "data_type": "text",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "email",
    "data_type": "text",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "order",
    "data_type": "integer",
    "policyname": "board_members_select_all",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  },
  {
    "table_name": "board_members",
    "column_name": "order",
    "data_type": "integer",
    "policyname": "board_members_write_authenticated",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "table_name": "board_members",
    "column_name": "order",
    "data_type": "integer",
    "policyname": "public can read board members",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "true",
    "with_check": null
  }
]

members_with_account_status table:

[
  {
    "table_name": "members_with_account_status",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "email",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "phone",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "committee",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "college",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "major",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "degree",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "account_status_ar",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "pending_invitations_count",
    "data_type": "bigint",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_account_status",
    "column_name": "last_invitation_sent",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  }
]

members_with_roles table:

[
  {
    "table_name": "members_with_roles",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "email",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "phone",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "committee",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "college",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "major",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "degree",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "avatar_url",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "role",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "account_status",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "account_activated_at",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "role_ar",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "account_status_ar",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "is_admin",
    "data_type": "boolean",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "pending_invitations_count",
    "data_type": "bigint",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  },
  {
    "table_name": "members_with_roles",
    "column_name": "last_invitation_sent",
    "data_type": "timestamp with time zone",
    "policyname": null,
    "cmd": null,
    "roles": null,
    "qual": null,
    "with_check": null
  }
]

admins table:

[
  {
    "table_name": "admins",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "user_id",
    "data_type": "uuid",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "is_admin",
    "data_type": "boolean",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "is_admin",
    "data_type": "boolean",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "position",
    "data_type": "text",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "position",
    "data_type": "text",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "member_id",
    "data_type": "uuid",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "member_id",
    "data_type": "uuid",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  }
]