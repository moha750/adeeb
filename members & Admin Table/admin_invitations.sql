[
  {
    "table_name": "admin_invitations",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "id",
    "data_type": "uuid",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "email",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "email",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "email",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "email",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "phone",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "position",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "position",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "position",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "position",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_level",
    "data_type": "integer",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_level",
    "data_type": "integer",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_level",
    "data_type": "integer",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_level",
    "data_type": "integer",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "admin_type",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "permissions",
    "data_type": "jsonb",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "permissions",
    "data_type": "jsonb",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "permissions",
    "data_type": "jsonb",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "permissions",
    "data_type": "jsonb",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invitation_token",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invitation_token",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invitation_token",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invitation_token",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "status",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "status",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "status",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "status",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_name",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_name",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_name",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_name",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_position",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_position",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_position",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "invited_by_position",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "notes",
    "data_type": "text",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "notes",
    "data_type": "text",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "notes",
    "data_type": "text",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "notes",
    "data_type": "text",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "Admins can read admin invitations",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM admins\n  WHERE ((admins.user_id = auth.uid()) AND (admins.is_admin = true))))",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct deletes to admin invitations",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": null
  },
  {
    "table_name": "admin_invitations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct updates to admin invitations",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admin_invitations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct writes to admin invitations",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "false"
  }
]