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
  },
  {
    "table_name": "admins",
    "column_name": "admin_level",
    "data_type": "integer",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "admin_level",
    "data_type": "integer",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "permissions",
    "data_type": "jsonb",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "permissions",
    "data_type": "jsonb",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "email",
    "data_type": "text",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "email",
    "data_type": "text",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "full_name",
    "data_type": "text",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "table_name": "admins",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "No direct writes",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "false",
    "with_check": "false"
  },
  {
    "table_name": "admins",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "policyname": "Read own admin row",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  }
]