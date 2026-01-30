import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationRequest {
  interview_id: string;
  committee_id?: number;
  send_welcome_email?: boolean;
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

    // استخدام Service Role للتحقق من المستخدم
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid or expired token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من صلاحيات المستخدم
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role:roles(role_level)')
      .eq('user_id', adminUser.id)
      .eq('is_active', true)
      .single();

    if (rolesError || !userRoles || !userRoles.role || userRoles.role.role_level < 7) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions - Admin role required (level 7+)',
          user_id: adminUser.id,
          has_roles: !!userRoles,
          role_level: userRoles?.role?.role_level || 0
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { interview_id, committee_id, send_welcome_email = true }: MigrationRequest = await req.json();

    if (!interview_id) {
      throw new Error('interview_id is required');
    }

    const { data: interview, error: interviewError } = await supabaseClient
      .from('membership_interviews')
      .select(`
        *,
        application:membership_applications(*)
      `)
      .eq('id', interview_id)
      .eq('result', 'accepted')
      .is('migrated_to_user_id', null)
      .single();

    if (interviewError || !interview) {
      throw new Error('Interview not found or already migrated');
    }

    const application = interview.application;
    if (!application) {
      throw new Error('Application data not found');
    }

    // إنشاء مستخدم بدون كلمة مرور - سيقوم بإنشائها في صفحة member-onboarding
    const { data: authData, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email: application.email,
      email_confirm: true,
      user_metadata: {
        full_name: application.full_name,
        phone: application.phone,
        source: 'membership_migration',
        migrated_from_interview_id: interview_id
      }
    });

    if (createUserError || !authData.user) {
      throw new Error(`Failed to create auth user: ${createUserError?.message}`);
    }

    const newUserId = authData.user.id;

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: application.full_name,
        email: application.email,
        phone: application.phone,
        account_status: 'active',
        source_application_id: application.id,
        source_interview_id: interview_id,
        joined_date: new Date().toISOString().split('T')[0]
      });

    if (profileError) {
      await supabaseClient.auth.admin.deleteUser(newUserId);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    const finalCommitteeId = committee_id || await getCommitteeIdByName(
      supabaseClient, 
      application.preferred_committee
    );

    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role_id: 9, // عضو لجنة
        committee_id: finalCommitteeId,
        is_active: true,
        assigned_by: adminUser.id,
        notes: `تم الترحيل من نتائج العضوية - المقابلة: ${interview_id}`
      });

    if (roleError) {
      await supabaseClient.auth.admin.deleteUser(newUserId);
      await supabaseClient.from('profiles').delete().eq('id', newUserId);
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    const { error: updateInterviewError } = await supabaseClient
      .from('membership_interviews')
      .update({
        migrated_to_user_id: newUserId,
        migrated_at: new Date().toISOString(),
        migration_notes: `تم الترحيل بواسطة ${adminUser.email}`
      })
      .eq('id', interview_id);

    if (updateInterviewError) {
      console.error('Failed to update interview migration status:', updateInterviewError);
    }

    await supabaseClient
      .from('activity_log')
      .insert({
        user_id: adminUser.id,
        action: 'migrate_member',
        entity_type: 'user',
        entity_id: newUserId,
        details: {
          interview_id,
          application_id: application.id,
          member_name: application.full_name,
          committee_id: finalCommitteeId
        }
      });

    // إرسال الإيميل الترحيبي
    if (send_welcome_email) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        // إلغاء الترحيل إذا لم يكن RESEND_API_KEY موجود
        await supabaseClient.auth.admin.deleteUser(newUserId);
        await supabaseClient.from('profiles').delete().eq('id', newUserId);
        await supabaseClient.from('user_roles').delete().eq('user_id', newUserId);
        throw new Error('RESEND_API_KEY not configured - cannot send welcome email');
      }

      // إنشاء token للرابط
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // حفظ token
      const { error: tokenError } = await supabaseClient
        .from('member_onboarding_tokens')
        .insert({
          user_id: newUserId,
          token: token,
          interview_id: interview_id,
          application_id: application.id,
          expires_at: expiresAt.toISOString(),
          sent_to_email: application.email,
          is_used: false
        });

      if (tokenError) {
        await supabaseClient.auth.admin.deleteUser(newUserId);
        await supabaseClient.from('profiles').delete().eq('id', newUserId);
        await supabaseClient.from('user_roles').delete().eq('user_id', newUserId);
        throw new Error(`Failed to create onboarding token: ${tokenError.message}`);
      }

      const onboardingUrl = `https://adeeb.club/member-onboarding?token=${token}`;

      // إرسال الإيميل
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'نادي أدِيب <noreply@adeeb.club>',
          to: [application.email],
          subject: '🎉 مبروك! تم قبولك في نادي أدِيب',
          html: `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(135deg,#f8f9fa 0%,#e6f0f9 100%);margin:0;padding:20px;line-height:1.6}.email-wrapper{max-width:650px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.1),0 5px 15px rgba(39,64,96,0.2);border:1px solid rgba(255,255,255,0.3)}.email-header{background:linear-gradient(135deg,#f8f9fa 0%,#e6f0f9 100%);padding:40px 30px;text-align:center;border-bottom:1px solid rgba(61,143,214,0.15);position:relative}.email-header::before{content:"";position:absolute;top:0;right:0;width:100%;height:5px;background:linear-gradient(90deg,#3d8fd6,#274060)}.logo-container{width:100px;height:100px;margin:0 auto 20px;background:linear-gradient(135deg,#3d8fd6,#274060);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(61,143,214,0.3)}.logo-icon{font-size:50px;color:white}.email-header h1{color:#274060;font-size:32px;margin-bottom:10px;font-weight:bold}.email-header p{color:#64748b;font-size:16px}.email-content{padding:40px 35px;background:white}.greeting{color:#274060;font-size:20px;font-weight:600;margin-bottom:20px}.email-content p{color:#475569;line-height:1.8;font-size:16px;margin-bottom:20px}.info-card{background:linear-gradient(135deg,rgba(61,143,214,0.05),rgba(61,143,214,0.02));border:1px solid rgba(61,143,214,0.15);border-right:4px solid #3d8fd6;padding:25px;margin:25px 0;border-radius:12px}.info-card-title{color:#274060;font-size:18px;font-weight:bold;margin-bottom:12px;display:flex;align-items:center;gap:10px}.info-card p{margin:0;color:#64748b;font-size:15px}.cta-container{text-align:center;margin:35px 0}.cta-button{display:inline-block;background:linear-gradient(135deg,#3d8fd6,#274060);color:white!important;padding:18px 45px;text-decoration:none;border-radius:12px;font-weight:bold;font-size:18px;box-shadow:0 8px 20px rgba(61,143,214,0.25);transition:all 0.3s ease}.warning-card{background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.05));border:1px solid rgba(245,158,11,0.25);border-right:4px solid #f59e0b;padding:20px;margin:25px 0;border-radius:12px}.warning-card-title{color:#92400e;font-size:17px;font-weight:bold;margin-bottom:12px;display:flex;align-items:center;gap:8px}.warning-card ul{margin:12px 0 0 0;padding-right:25px;color:#92400e}.warning-card li{margin-bottom:8px;line-height:1.6}.data-list-title{color:#274060;font-size:18px;font-weight:bold;margin:30px 0 15px 0}.data-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0}.data-item{background:#f8fafc;padding:12px 15px;border-radius:8px;border:1px solid #e2e8f0;color:#475569;font-size:14px;display:flex;align-items:center;gap:8px}.data-item-icon{color:#3d8fd6;font-size:16px}.closing-message{margin-top:40px;padding-top:30px;border-top:2px solid #e2e8f0;color:#475569;font-size:16px}.signature{margin-top:25px;color:#274060;font-weight:600}.email-footer{background:linear-gradient(135deg,#f8f9fa 0%,#e6f0f9 100%);padding:30px;text-align:center;border-top:1px solid rgba(61,143,214,0.15)}.email-footer p{color:#64748b;font-size:14px;margin:8px 0}.email-footer .copyright{color:#274060;font-weight:600;margin-bottom:10px}.email-footer .disclaimer{font-size:12px;color:#94a3b8;margin-top:15px}@media only screen and (max-width:600px){.email-wrapper{margin:10px;border-radius:16px}.email-header,.email-content,.email-footer{padding:25px 20px}.email-header h1{font-size:26px}.data-grid{grid-template-columns:1fr}.cta-button{padding:15px 35px;font-size:16px}}</style></head><body><div class="email-wrapper"><div class="email-header"><div class="logo-container"><div class="logo-icon">🎓</div></div><h1>مبروك العضوية!</h1><p>مرحباً بك في عائلة نادي أدِيب</p></div><div class="email-content"><div class="greeting">عزيزي/عزيزتي ${application.full_name}،</div><p>يسعدنا ويشرفنا أن نبلغك بأنه تم قبولك رسمياً في <strong>نادي أدِيب</strong>! 🎊</p><p>نحن متحمسون لانضمامك إلى عائلتنا، ونتطلع إلى مساهماتك القيّمة في مسيرة النادي.</p><div class="info-card"><div class="info-card-title"><span>📋</span><span>الخطوة التالية</span></div><p>لإكمال عملية التسجيل وتفعيل حسابك بشكل كامل، يرجى تعبئة بياناتك الشخصية والأكاديمية من خلال الرابط أدناه. هذه الخطوة ضرورية للاستفادة من جميع خدمات النادي.</p></div><div class="cta-container"><a href="${onboardingUrl}" class="cta-button">✨ إكمال البيانات الآن</a></div><div class="warning-card"><div class="warning-card-title"><span>⚠️</span><span>معلومات مهمة</span></div><ul><li>الرابط صالح لمدة <strong>7 أيام</strong> من تاريخ استلام هذا الإيميل</li><li>يجب تعبئة جميع البيانات المطلوبة لتفعيل حسابك بالكامل</li><li>في حال انتهاء صلاحية الرابط، يرجى التواصل مع إدارة النادي</li><li>تأكد من صحة جميع البيانات المدخلة قبل الإرسال</li></ul></div><div class="data-list-title">📝 البيانات المطلوبة:</div><div class="data-grid"><div class="data-item"><span class="data-item-icon">👤</span><span>الاسم الثلاثي الكامل</span></div><div class="data-item"><span class="data-item-icon">📱</span><span>رقم الجوال</span></div><div class="data-item"><span class="data-item-icon">🆔</span><span>رقم الهوية الوطنية</span></div><div class="data-item"><span class="data-item-icon">🎓</span><span>رقم السجل الأكاديمي</span></div><div class="data-item"><span class="data-item-icon">📧</span><span>البريد الإلكتروني</span></div><div class="data-item"><span class="data-item-icon">📚</span><span>الدرجة العلمية</span></div><div class="data-item"><span class="data-item-icon">🏛️</span><span>الكلية والتخصص</span></div><div class="data-item"><span class="data-item-icon">📅</span><span>تاريخ الميلاد</span></div><div class="data-item"><span class="data-item-icon">👥</span><span>اللجنة المفضلة</span></div><div class="data-item"><span class="data-item-icon">🌐</span><span>حسابات التواصل (اختياري)</span></div></div><div class="closing-message"><p>نحن في نادي أدِيب نؤمن بقوة الثقافة والمعرفة في بناء مجتمع واعٍ ومبدع. انضمامك إلينا يعزز هذه الرسالة ويثري مسيرتنا.</p><p>نتطلع إلى رؤيتك في فعالياتنا وأنشطتنا القادمة! 🌟</p><div class="signature">مع أطيب التحيات،<br><strong>لجنة الموارد البشرية</strong></div></div></div><div class="email-footer"><p class="copyright">© 2026 نادي أدِيب. جميع الحقوق محفوظة.</p><p>نادي طلابي ثقافي يهدف إلى نشر الثقافة والمعرفة</p><p class="disclaimer">إذا لم تقم بالتقديم لنادي أدِيب، يرجى تجاهل هذا الإيميل.</p></div></div></body></html>`
        })
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Failed to send email:', errorText);
        
        // إلغاء الترحيل إذا فشل الإيميل
        await supabaseClient.auth.admin.deleteUser(newUserId);
        await supabaseClient.from('profiles').delete().eq('id', newUserId);
        await supabaseClient.from('user_roles').delete().eq('user_id', newUserId);
        await supabaseClient.from('member_onboarding_tokens').delete().eq('token', token);
        
        throw new Error(`Failed to send welcome email: ${errorText}`);
      }

      console.log(`Welcome email sent successfully to: ${application.email}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        email: application.email,
        message: 'تم ترحيل العضو بنجاح وإرسال الإيميل'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
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

async function getCommitteeIdByName(client: any, committeeName: string): Promise<number | null> {
  if (!committeeName) return null;
  
  const { data, error } = await client
    .from('committees')
    .select('id')
    .eq('committee_name_ar', committeeName)
    .single();
  
  if (error || !data) return null;
  return data.id;
}
