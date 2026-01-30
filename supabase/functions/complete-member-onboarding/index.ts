import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  token: string;
  password: string;
  member_details: {
    full_name_triple: string;
    phone: string;
    national_id: string;
    academic_record_number: string;
    email: string;
    birth_date: string;
    academic_degree: string;
    college?: string;
    major?: string;
    committee_id: number;
    twitter_account?: string;
    instagram_account?: string;
    tiktok_account?: string;
    linkedin_account?: string;
  };
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

    const { token, password, member_details }: OnboardingRequest = await req.json();

    if (!token || !password || !member_details) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('member_onboarding_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.is_used) {
      return new Response(
        JSON.stringify({ error: 'Token already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تحديث كلمة مرور المستخدم
    const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
      tokenData.user_id,
      { password: password }
    );

    if (passwordError) {
      console.error('Password update error:', passwordError);
      throw new Error('Failed to update password');
    }

    // حفظ بيانات العضو
    const { error: insertError } = await supabaseClient
      .from('member_details')
      .insert({
        user_id: tokenData.user_id,
        ...member_details
      });

    if (insertError) {
      console.error('Insert member details error:', insertError);
      throw new Error('Failed to save member details');
    }

    // تحديث token كمستخدم
    const { error: updateTokenError } = await supabaseClient
      .from('member_onboarding_tokens')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('token', token);

    if (updateTokenError) {
      console.error('Token update error:', updateTokenError);
    }

    // تسجيل النشاط
    await supabaseClient
      .from('activity_log')
      .insert({
        user_id: tokenData.user_id,
        action: 'complete_onboarding',
        entity_type: 'user',
        entity_id: tokenData.user_id,
        details: {
          token: token,
          completed_at: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Onboarding completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Onboarding error:', error);
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
