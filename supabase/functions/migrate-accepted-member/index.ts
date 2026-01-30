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
          html: `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
                .content { padding: 40px 30px; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #777; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header"><h1>🎉 مبروك العضوية!</h1></div>
                <div class="content">
                  <h2>عزيزي/عزيزتي ${application.full_name}،</h2>
                  <p>يسعدنا أن نبلغك بأنه تم قبولك رسمياً في <strong>نادي أدِيب الثقافي</strong>! 🎊</p>
                  <div style="text-align: center;">
                    <a href="${onboardingUrl}" class="cta-button">📝 إكمال البيانات الآن</a>
                  </div>
                  <p><strong>⚠️ مهم:</strong> الرابط صالح لمدة 7 أيام. ستقوم بإنشاء كلمة المرور الخاصة بك عند إكمال البيانات.</p>
                </div>
                <div class="footer">
                  <p>© 2026 نادي أدِيب الثقافي. جميع الحقوق محفوظة.</p>
                </div>
              </div>
            </body>
            </html>
          `
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
