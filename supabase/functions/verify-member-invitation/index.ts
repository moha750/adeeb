// ============================================
// Edge Function: verify-member-invitation
// ============================================
// الغرض: التحقق من صلاحية دعوة تفعيل عضو عادي
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

    console.log('🔍 Verifying member invitation token:', token.substring(0, 15) + '...');

    // جلب بيانات الدعوة مع بيانات العضو
    const { data: invitation, error: invitationError } = await supabase
      .from('member_invitations')
      .select(`
        *,
        members (
          id,
          full_name,
          email,
          phone,
          committee,
          college,
          major,
          degree,
          user_id,
          account_status
        )
      `)
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

    // التحقق من وجود بيانات العضو
    if (!invitation.members) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Member data not found' 
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
        .from('member_invitations')
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

    // التحقق من أن العضو لم يفعل حسابه مسبقاً
    if (invitation.members.user_id) {
      console.warn('⚠️ Account already activated');
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Account already activated',
          details: 'This account has already been activated. Please login instead.'
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // حساب الوقت المتبقي
    const timeRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60); // بالساعات

    console.log('✅ Invitation is valid');

    // إرجاع بيانات العضو
    return new Response(
      JSON.stringify({
        valid: true,
        member: {
          id: invitation.members.id,
          full_name: invitation.members.full_name,
          email: invitation.members.email,
          phone: invitation.members.phone,
          committee: invitation.members.committee,
          college: invitation.members.college,
          major: invitation.members.major,
          degree: invitation.members.degree
        },
        invitation: {
          id: invitation.id,
          expires_at: invitation.expires_at,
          hours_remaining: timeRemaining,
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
