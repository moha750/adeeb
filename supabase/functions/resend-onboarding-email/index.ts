import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendRequest {
  user_id: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role:roles(role_level)')
      .eq('user_id', adminUser.id)
      .eq('is_active', true)
      .single();

    if (!userRoles || !userRoles.role || userRoles.role.role_level < 7) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id }: ResendRequest = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // جلب بيانات المستخدم
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    // التحقق من وجود token قديم
    const { data: existingToken } = await supabaseClient
      .from('member_onboarding_tokens')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_used', false)
      .single();

    let token_value: string;
    let expiresAt: Date;

    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      // استخدام token موجود وصالح
      token_value = existingToken.token;
      expiresAt = new Date(existingToken.expires_at);
      console.log(`✅ Using existing valid token for user: ${user_id}`);
    } else {
      // إنشاء token جديد
      token_value = crypto.randomUUID();
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // حذف tokens القديمة
      await supabaseClient
        .from('member_onboarding_tokens')
        .delete()
        .eq('user_id', user_id);

      // إنشاء token جديد
      const { error: tokenError } = await supabaseClient
        .from('member_onboarding_tokens')
        .insert({
          user_id: user_id,
          token: token_value,
          expires_at: expiresAt.toISOString(),
          sent_to_email: profile.email,
          is_used: false
        });

      if (tokenError) {
        throw new Error(`Failed to create token: ${tokenError.message}`);
      }

      console.log(`✅ Created new token for user: ${user_id}`);
    }

    const onboardingUrl = `https://adeeb.club/member-onboarding?token=${token_value}`;

    // إرسال الإيميل
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,sans-serif;background:#f8f9fa;padding:20px;line-height:1.6}
.wrapper{max-width:650px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.1)}
.header{background:linear-gradient(135deg,#f8f9fa 0%,#e6f0f9 100%);padding:40px 30px;text-align:center;border-bottom:1px solid rgba(61,143,214,0.15);position:relative}
.header::before{content:"";position:absolute;top:0;right:0;width:100%;height:5px;background:linear-gradient(90deg,#3d8fd6,#274060)}
.logo{width:100px;height:100px;margin:0 auto 20px;background:linear-gradient(135deg,#3d8fd6,#274060);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(61,143,214,0.3);font-size:50px;color:#fff}
.header h1{color:#274060;font-size:32px;margin-bottom:10px;font-weight:bold}
.header p{color:#64748b;font-size:16px}
.content{padding:40px 35px;background:#fff}
.greeting{color:#274060;font-size:20px;font-weight:600;margin-bottom:20px}
.content p{color:#475569;line-height:1.8;font-size:16px;margin-bottom:20px}
.card{background:linear-gradient(135deg,rgba(61,143,214,0.05),rgba(61,143,214,0.02));border:1px solid rgba(61,143,214,0.15);border-right:4px solid #3d8fd6;padding:25px;margin:25px 0;border-radius:12px}
.card-title{color:#274060;font-size:18px;font-weight:bold;margin-bottom:12px}
.card p{margin:0;color:#64748b;font-size:15px}
.cta{text-align:center;margin:35px 0}
.btn{display:inline-block;background:linear-gradient(135deg,#3d8fd6,#274060);color:#fff!important;padding:18px 45px;text-decoration:none;border-radius:12px;font-weight:bold;font-size:18px;box-shadow:0 8px 20px rgba(61,143,214,0.25)}
.warning{background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.05));border:1px solid rgba(245,158,11,0.25);border-right:4px solid #f59e0b;padding:20px;margin:25px 0;border-radius:12px}
.warning-title{color:#92400e;font-size:17px;font-weight:bold;margin-bottom:12px}
.warning ul{margin:12px 0 0 0;padding-right:25px;color:#92400e}
.warning li{margin-bottom:8px;line-height:1.6}
.footer{background:linear-gradient(135deg,#f8f9fa 0%,#e6f0f9 100%);padding:30px;text-align:center;border-top:1px solid rgba(61,143,214,0.15)}
.footer p{color:#64748b;font-size:14px;margin:8px 0}
.copyright{color:#274060;font-weight:600;margin-bottom:10px}
.disclaimer{font-size:12px;color:#94a3b8;margin-top:15px}
@media only screen and (max-width:600px){
.wrapper{margin:10px;border-radius:16px}
.header,.content,.footer{padding:25px 20px}
.header h1{font-size:26px}
.btn{padding:15px 35px;font-size:16px}
}
</style>
</head>
<body>
<div class="wrapper">
<div class="header">
<div class="logo">🎓</div>
<h1>مبروك العضوية!</h1>
<p>مرحباً بك في عائلة نادي أدِيب</p>
</div>
<div class="content">
<div class="greeting">أدِيبنا/أدِيبتنا ${profile.full_name}،</div>
<p>يسعدنا ويشرفنا أن نبلغك بأنه تم قبولك رسمياً في <strong>نادي أدِيب</strong>! 🎊</p>
<p>نحن متحمسون لانضمامك إلى عائلتنا الثقافية، ونتطلع إلى مساهماتك القيّمة في مسيرة النادي.</p>
<div class="card">
<div class="card-title">📋 الخطوة التالية</div>
<p>لإكمال عملية التسجيل وتفعيل حسابك بشكل كامل، يرجى تعبئة بياناتك الشخصية والأكاديمية من خلال الرابط أدناه.</p>
</div>
<div class="cta">
<a href="${onboardingUrl}" class="btn">✨ إكمال البيانات الآن</a>
</div>
<div class="warning">
<div class="warning-title">⚠️ معلومات مهمة</div>
<ul>
<li>الرابط صالح لمدة <strong>7 أيام</strong> من تاريخ استلام هذا الإيميل</li>
<li>يجب تعبئة جميع البيانات المطلوبة لتفعيل حسابك بالكامل</li>
<li>ستقوم بإنشاء كلمة المرور الخاصة بك عند إكمال البيانات</li>
</ul>
</div>
<p style="margin-top:30px;padding-top:30px;border-top:2px solid #e2e8f0">نحن في نادي أدِيب نؤمن بقوة الثقافة والمعرفة في بناء مجتمع واعٍ ومبدع. نتطلع إلى رؤيتك في فعالياتنا القادمة! 🌟</p>
<p style="margin-top:20px;color:#274060;font-weight:600">مع أطيب التحيات،<br><strong>لجنة الموارد البشرية - نادي أدِيب</strong></p>
</div>
<div class="footer">
<p class="copyright">© 2026 نادي أدِيب. جميع الحقوق محفوظة.</p>
<p>نادي طلابي ثقافي يهدف إلى نشر الثقافة والمعرفة</p>
<p class="disclaimer">إذا لم تقم بالتقديم لنادي أدِيب، يرجى تجاهل هذا الإيميل.</p>
</div>
</div>
</body>
</html>`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'نادي أدِيب <noreply@adeeb.club>',
        to: [profile.email],
        subject: '🎉 مبروك! تم قبولك في نادي أدِيب',
        html: emailHtml
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log(`✅ Onboarding email resent successfully to: ${profile.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: profile.email,
        message: 'تم إعادة إرسال رابط التسجيل بنجاح'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Resend email error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
