// ============================================
// Edge Function: activate-member-account
// ============================================
// الغرض: تفعيل حساب عضو عادي
// الصلاحيات: عامة (لا تحتاج مصادقة)

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
    // إنشاء Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // قراءة البيانات من الطلب
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: token and password' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Verifying member invitation token...');

    // 1. التحقق من الدعوة
    const { data: invitation, error: invError } = await adminClient
      .from('member_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (invError || !invitation) {
      console.error('❌ Invitation not found or invalid:', invError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid or expired invitation',
          details: invError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. التحقق من انتهاء الصلاحية
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      console.error('❌ Invitation expired');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invitation has expired',
          details: 'Please request a new invitation' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. التحقق من أن العضو غير مفعل
    const { data: existingMember } = await adminClient
      .from('members')
      .select('user_id, is_active')
      .eq('id', invitation.member_id)
      .single();

    if (existingMember?.user_id) {
      console.error('❌ Member already activated');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Account already activated',
          details: 'This member account is already active' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Invitation is valid. Creating user account...');

    // 4. إنشاء حساب المستخدم في Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: invitation.full_name,
        role: 'member'
      }
    });

    if (authError || !authData.user) {
      console.error('❌ Failed to create user:', authError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create user account',
          details: authError?.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log(`✅ User created successfully. ID: ${userId}`);

    // 5. تحديث سجل العضو
    // استخدام SQL مباشر لتجاوز triggers
    const { data: updatedMember, error: updateError } = await adminClient.rpc('activate_member_account', {
      p_member_id: invitation.member_id,
      p_user_id: userId
    });

    if (updateError) {
      console.error('❌ Failed to update member via RPC:', updateError);
      
      // محاولة التحديث المباشر كخطة بديلة
      const { data: fallbackData, error: fallbackError } = await adminClient
        .from('members')
        .update({
          user_id: userId,
          account_activated_at: new Date().toISOString()
        })
        .eq('id', invitation.member_id)
        .select()
        .single();
      
      if (fallbackError) {
        console.error('❌ Fallback update also failed:', fallbackError);
        
        // حذف المستخدم من Auth إذا فشل تحديث members
        await adminClient.auth.admin.deleteUser(userId);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to update member record',
            details: fallbackError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('✅ Member updated via fallback method');
    } else {
      console.log('✅ Member updated successfully via RPC');
    }

    // 6. تحديث حالة الدعوة
    const { error: invUpdateError } = await adminClient
      .from('member_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (invUpdateError) {
      console.warn('⚠️ Failed to update invitation status:', invUpdateError);
      // لا نفشل العملية بسبب هذا
    }

    console.log('✅ Member account activated successfully!');

    // 7. إرجاع النتيجة
    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        member_id: invitation.member_id,
        email: invitation.email,
        message: 'Account activated successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
