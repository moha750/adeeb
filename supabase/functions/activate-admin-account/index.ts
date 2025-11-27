// ============================================
// Edge Function: activate-admin-account
// ============================================
// الغرض: تفعيل حساب إداري جديد
// الصلاحيات: عامة (لكن تحتاج token صالح)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // معالجة CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // إنشاء Supabase client مع Service Role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // قراءة البيانات من الطلب
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Token and password are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من قوة كلمة المرور
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Password must be at least 8 characters' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔐 Starting admin account activation...');

    // 1. التحقق من صلاحية الدعوة
    const { data: invitation, error: invitationError } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      console.error('❌ Invalid invitation:', invitationError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid or expired invitation' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من انتهاء الصلاحية
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      await supabase
        .from('admin_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invitation has expired' 
        }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Invitation is valid');

    // 2. إنشاء حساب في Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true, // تأكيد البريد تلقائياً
      user_metadata: {
        full_name: invitation.full_name,
        phone: invitation.phone,
        position: invitation.position,
        admin_level: invitation.admin_level,
        admin_type: invitation.admin_type,
        role: 'admin',
        permissions: invitation.permissions || {}
      }
    });

    if (signUpError || !authData.user) {
      console.error('❌ Failed to create auth user:', signUpError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: signUpError?.message || 'Failed to create account' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Auth user created:', authData.user.id);

    // 3. إنشاء سجل في جدول admins
    const { error: adminInsertError } = await supabase
      .from('admins')
      .insert({
        user_id: authData.user.id,
        is_admin: true,
        position: invitation.position,
        admin_level: invitation.admin_level,
        admin_type: invitation.admin_type,
        permissions: invitation.permissions || {},
        email: invitation.email,
        full_name: invitation.full_name,
        phone: invitation.phone
      });

    if (adminInsertError) {
      console.error('❌ Failed to insert admin record:', adminInsertError);
      
      // حذف المستخدم من Auth إذا فشل إنشاء السجل
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create admin record' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Admin record created');

    // 4. تحديث حالة الدعوة
    const { error: updateInvitationError } = await supabase
      .from('admin_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateInvitationError) {
      console.warn('⚠️ Failed to update invitation status:', updateInvitationError);
    }

    console.log('✅ Invitation marked as accepted');

    // 5. إنشاء session للمستخدم
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email
    });

    if (sessionError) {
      console.warn('⚠️ Failed to generate session:', sessionError);
    }

    console.log('🎉 Admin account activated successfully!');

    // إرجاع النتيجة
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin account activated successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: invitation.full_name,
          position: invitation.position,
          admin_level: invitation.admin_level
        },
        admin_info: {
          position: invitation.position,
          admin_level: invitation.admin_level,
          admin_type: invitation.admin_type,
          permissions: invitation.permissions
        },
        redirect_to: '/admin/admin.html',
        // إرجاع بيانات تسجيل الدخول
        login_credentials: {
          email: invitation.email,
          // لا نرجع كلمة المرور للأمان
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
