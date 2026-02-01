import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMemberRequest {
  email: string;
  password: string;
  full_name: string;
  committee_id: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // التحقق من Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من المستخدم
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من صلاحيات المستخدم (admin level 8+)
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role:roles(role_level)')
      .eq('user_id', adminUser.id)
      .eq('is_active', true)
      .single();

    if (rolesError || !userRoles || !userRoles.role || userRoles.role.role_level < 8) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name, committee_id }: CreateMemberRequest = await req.json();

    if (!email || !password || !full_name || !committee_id) {
      throw new Error('Missing required fields');
    }

    // إنشاء المستخدم باستخدام admin.createUser مع email_confirm: true
    const { data: authData, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        source: 'direct_admin_creation'
      }
    });

    if (createUserError || !authData.user) {
      throw new Error(`Failed to create user: ${createUserError?.message}`);
    }

    const newUserId = authData.user.id;

    // تأكيد البريد الإلكتروني بشكل صريح (ضمان إضافي)
    try {
      await supabaseClient.auth.admin.updateUserById(newUserId, {
        email_confirm: true
      });
    } catch (confirmError) {
      console.warn('Email confirmation warning:', confirmError);
    }

    // إنشاء الملف الشخصي
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: full_name,
        email: email,
        account_status: 'active',
        joined_date: new Date().toISOString().split('T')[0]
      });

    if (profileError) {
      await supabaseClient.auth.admin.deleteUser(newUserId);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // تعيين دور العضو
    const { data: memberRole } = await supabaseClient
      .from('roles')
      .select('id')
      .eq('role_level', 5)
      .single();

    if (memberRole) {
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: newUserId,
          role_id: memberRole.id,
          committee_id: committee_id,
          is_active: true,
          assigned_by: adminUser.id,
          notes: 'تم الإنشاء مباشرة من لوحة التحكم'
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }
    }

    // إنشاء token لإكمال التسجيل
    const token_uuid = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: tokenError } = await supabaseClient
      .from('member_onboarding_tokens')
      .insert({
        user_id: newUserId,
        token: token_uuid,
        sent_to_email: email,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
    }

    // تسجيل النشاط
    await supabaseClient
      .from('activity_log')
      .insert({
        user_id: adminUser.id,
        action: 'create_member_directly',
        entity_type: 'user',
        entity_id: newUserId,
        details: {
          member_name: full_name,
          committee_id: committee_id,
          email: email
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        token: token_uuid,
        message: 'تم إنشاء العضو بنجاح'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Create member error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
