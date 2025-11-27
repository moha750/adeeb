// ============================================
// Edge Function: verify-admin-invitation
// ============================================
// الغرض: التحقق من صلاحية دعوة تفعيل إداري
// الصلاحيات: عامة (لا تحتاج مصادقة)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// أسماء المستويات الإدارية بالعربية
const ADMIN_LEVELS = {
  1: 'رئيس النادي',
  2: 'نائب الرئيس',
  3: 'قائد لجنة',
  4: 'مسؤول إداري',
  5: 'رئيس تنفيذي'
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
    // إنشاء Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // قراءة البيانات من الطلب
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Token is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 Verifying admin invitation token:', token.substring(0, 15) + '...');

    // جلب بيانات الدعوة
    const { data: invitation, error: invitationError } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      console.error('❌ Invitation not found or error:', invitationError);
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Invalid or expired invitation',
          details: invitationError?.message || 'Not found'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من انتهاء الصلاحية
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      console.warn('⏰ Invitation expired');
      
      // تحديث حالة الدعوة إلى منتهية
      await supabase
        .from('admin_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Invitation has expired',
          expired_at: invitation.expires_at
        }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من أن البريد الإلكتروني غير مستخدم
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === invitation.email);

    if (emailExists) {
      console.warn('⚠️ Email already registered');
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Email already registered',
          details: 'This email is already associated with an account. Please login instead.'
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // حساب الوقت المتبقي
    const timeRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60); // بالساعات

    // تحويل الصلاحيات إلى قائمة مقروءة
    const permissions = invitation.permissions || {};
    const permissionsList = Object.entries(permissions)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    console.log('✅ Admin invitation is valid');

    // إرجاع بيانات الإداري
    return new Response(
      JSON.stringify({
        valid: true,
        admin: {
          full_name: invitation.full_name,
          email: invitation.email,
          phone: invitation.phone,
          position: invitation.position,
          admin_level: invitation.admin_level,
          admin_level_ar: ADMIN_LEVELS[invitation.admin_level] || 'غير محدد',
          admin_type: invitation.admin_type,
          permissions: permissions,
          permissions_list: permissionsList,
          permissions_count: permissionsList.length
        },
        invitation: {
          id: invitation.id,
          expires_at: invitation.expires_at,
          hours_remaining: timeRemaining,
          invited_by_name: invitation.invited_by_name,
          invited_by_position: invitation.invited_by_position,
          notes: invitation.notes,
          created_at: invitation.created_at
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
        valid: false,
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
