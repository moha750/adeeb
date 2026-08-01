import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  token: string;
  password: string;
  gender: 'male' | 'female';
  /**
   * حمولة النموذج كما يرسلها العميل. ثلاثة منها **لا تُكتب في member_details** —
   * لكلٍّ منها دفترٌ صادق في مكانٍ آخر، ونسخُها هنا هو ما جعل الدفترين يفترقان:
   *   phone        → يُكتب في profiles.phone (حقلٌ مفتوح للتعديل، فتصحيح العضو يُصان)
   *   email        → يُهمَل (حقلٌ معطَّل في النموذج، صدى لـ profiles.email — وهو بريد الدخول)
   *   committee_id → يُهمَل (select معطَّل، صدى لإسنادٍ تكتبه assign_position في user_roles)
   * الفرز هنا لا في العميل: هذه الدالّة هي البابُ الوحيد إلى member_details،
   * فمن حرسها حرس الجدول مهما أرسل أيّ عميلٍ — قديمُه ومخبَّؤه وقادمُه.
   */
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
    favorite_color?: string;
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

    // GET: التحقق من token وإرجاع بيانات application
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('member_onboarding_tokens')
        .select(`
          *,
          application:membership_applications(
            full_name,
            phone,
            email,
            degree,
            college,
            major,
            preferred_committee
          )
        `)
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

      return new Response(
        JSON.stringify({
          success: true,
          data: tokenData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // POST: إكمال البيانات
    const { token, password, gender, member_details }: OnboardingRequest = await req.json();

    if (!token || !password || !member_details) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (gender !== 'male' && gender !== 'female') {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing gender (must be male or female)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من token وجلب بيانات الطلب
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('member_onboarding_tokens')
      .select(`
        *,
        application:membership_applications(
          full_name,
          phone,
          email,
          degree,
          college,
          major,
          preferred_committee
        )
      `)
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

    // الأصداء الثلاثة تُقتلَع من الحمولة قبل الكتابة — لكلٍّ دفترٌ صادق في مكانٍ آخر
    const { phone, email: _emailEcho, committee_id: _committeeEcho, ...details } = member_details;

    // حفظ بيانات العضو (استخدام upsert لتجنب أخطاء التكرار)
    const { error: insertError } = await supabaseClient
      .from('member_details')
      .upsert({
        user_id: tokenData.user_id,
        ...details
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Insert member details error:', insertError);
      throw new Error('Failed to save member details');
    }

    // تفعيل الحساب + الجنس (مطلوب لحجز الأنشطة) + الجوّال في دفتره الصادق.
    // الجوّال هنا لا في member_details: النموذج يملأ الحقل من الطلب ثمّ يفتحه للتعديل،
    // فما يكتبه العضو تصحيحٌ متأخّرٌ مقصود. وكان يُكتب في عمودٍ لا يقرأه أحد فيُبتلَع —
    // منار احمد المليفي صحّحت رقمها في ٢٨ يونيو وظلّ النادي يحمل رقمها الأوّل.
    const { error: activateProfileError } = await supabaseClient
      .from('profiles')
      .update({ account_status: 'active', gender: gender, phone: phone })
      .eq('id', tokenData.user_id);

    // تُرفَع لا تُبلَع: هذه الكتابة تحمل الآن الجوّال، وقيدُ profiles_phone_check يردّ
    // ما ليس على صيغته — فلو سقطت صامتةً لخرج العضو بلا تفعيلٍ وبلا جوّال، وهو يحسبه تمّ.
    if (activateProfileError) {
      console.error('Profile activation error:', activateProfileError);
      throw new Error('Failed to activate profile');
    }

    // تفعيل الدور بعد إكمال البيانات
    const { error: activateRoleError } = await supabaseClient
      .from('user_roles')
      .update({ is_active: true })
      .eq('user_id', tokenData.user_id);

    if (activateRoleError) {
      console.error('Role activation error:', activateRoleError);
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
