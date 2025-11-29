activate-member-account:

// Edge Function: activate-member-account
// يتحقق من صلاحية دعوة التفعيل ويُرجع بيانات العضو مع دوره
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // إنشاء Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // قراءة البيانات من الطلب
    const { token } = await req.json();
    console.log('🔍 Received token:', token?.substring(0, 15) + '...');
    if (!token) {
      return new Response(JSON.stringify({
        error: 'Token is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // جلب بيانات الدعوة مع بيانات العضو
    const { data: invitation, error: invitationError } = await supabase.from('member_invitations').select(`
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
          role
        )
      `).eq('invitation_token', token).eq('status', 'pending').single();
    console.log('📦 Query result:', {
      found: !!invitation,
      error: invitationError?.message,
      hasMembers: !!invitation?.members
    });
    if (invitationError || !invitation) {
      console.error('❌ Invitation not found or error:', invitationError);
      return new Response(JSON.stringify({
        error: 'Invalid or expired invitation',
        details: invitationError?.message || 'Not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // التحقق من وجود بيانات العضو
    if (!invitation.members) {
      return new Response(JSON.stringify({
        error: 'Member data not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // التحقق من انتهاء الصلاحية
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      // تحديث حالة الدعوة إلى منتهية
      await supabase.from('member_invitations').update({
        status: 'expired'
      }).eq('id', invitation.id);
      return new Response(JSON.stringify({
        error: 'Invitation has expired'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // التحقق من أن العضو لم يفعل حسابه مسبقاً
    if (invitation.members.user_id) {
      return new Response(JSON.stringify({
        error: 'Account already activated'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // إرجاع بيانات العضو مع الدور
    return new Response(JSON.stringify({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at
      },
      member: {
        id: invitation.members.id,
        full_name: invitation.members.full_name,
        email: invitation.members.email,
        phone: invitation.members.phone,
        committee: invitation.members.committee,
        college: invitation.members.college,
        major: invitation.members.major,
        degree: invitation.members.degree,
        role: invitation.members.role || 'member' // ← الدور
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

---------------

invite-admin:

// supabase/functions/invite-admin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  manager: 3
};
function normalizeAr(s) {
  if (!s) return "";
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "").replace(/\u0640/g, "");
  t = t.replace(/[أإآ]/g, "ا");
  t = t.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return t;
}
function levelFromPositionAr(position) {
  const p = normalizeAr(position);
  if (p.includes("رئيس") && p.includes("اديب")) return ADMIN.president;
  if (p.includes("نائب") && p.includes("الرئيس")) return ADMIN.vice;
  return ADMIN.manager;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // تحقق من أن المستدعي إداري عبر RLS
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const admin = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const { data: selfRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!selfRow?.is_admin) {
      return new Response(JSON.stringify({
        error: "Forbidden"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // حمولة الطلب
    const body = await req.json();
    const email = String(body?.email || "");
    const position = body?.position ?? null;
    const redirectTo = String(body?.redirectTo || "");
    let admin_level = Number(body?.admin_level);
    if (![
      1,
      2,
      3
    ].includes(admin_level)) admin_level = levelFromPositionAr(position);
    if (!email || !redirectTo) {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // إرسال الدعوة
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        position
      }
    });
    if (invErr) {
      return new Response(JSON.stringify({
        error: invErr.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const userId = invited?.user?.id;
    if (userId) {
      // تحديث ميتاداتا المستخدم
      const oldMeta = invited.user?.user_metadata || {};
      const newMeta = {
        ...oldMeta,
        position,
        role: "admin",
        admin_level
      };
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: newMeta
      });
      if (updErr) {
        return new Response(JSON.stringify({
          error: updErr.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
      // منح صلاحية إداري فعليًا في جدول admins (تجاوز RLS عبر Service Role)
      // محاولة مع عمود position ثم fallback بدونه إذا لم يكن موجودًا
      let upErr = null;
      let res = await admin.from("admins").upsert({
        user_id: userId,
        is_admin: true,
        position
      }).eq("user_id", userId);
      if (res.error) {
        const res2 = await admin.from("admins").upsert({
          user_id: userId,
          is_admin: true
        }).eq("user_id", userId);
        upErr = res2.error || null;
      }
      if (upErr) {
        return new Response(JSON.stringify({
          error: upErr.message || "Failed to upsert admin row"
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
    }
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});

---------------

list-admins:

// supabase/functions/list-admins/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};
// Helpers to derive admin level from Arabic position when metadata level is missing
const ADMIN = {
  president: 1,
  vice: 2,
  committee_leader: 3,
  admin_officer: 4,
  executive_president: 5
};
function normalizeAr(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
function levelFromPositionAr(position) {
  const p = normalizeAr(position);
  if (p.includes('رئيس') && (p.includes('النادي') || p.includes('اديب'))) return ADMIN.president;
  if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN.vice;
  if (p.includes('قائد')) return ADMIN.committee_leader;
  if (p.includes('مسؤول')) return ADMIN.admin_officer;
  if (p.includes('رئيس') && p.includes('تنفيذ')) return ADMIN.executive_president;
  return ADMIN.admin_officer;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors
    });
  }
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: cors
    });
  }
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // userClient للتحقق من هوية وصلاحية المستدعي تحت RLS
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    // adminClient لتجاوز RLS في قراءة قائمة الإداريين
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const { data: selfRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!selfRow?.is_admin) {
      return new Response(JSON.stringify({
        error: "Forbidden"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // القراءة عبر Service Role لتجاوز سياسة RLS
    const { data: rows, error } = await adminClient.from("admins").select("user_id, is_admin, created_at").eq("is_admin", true).order("created_at", {
      ascending: false
    });
    if (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // إلحاق البريد الإلكتروني + المسمى والمستوى الإداري لكل مستخدم
    const result = [];
    for (const r of rows || []){
      let email = undefined;
      let position = undefined;
      let admin_level = undefined;
      try {
        const { data: u } = await adminClient.auth.admin.getUserById(r.user_id);
        email = u?.user?.email || undefined;
        const md = u?.user?.user_metadata || {};
        position = typeof md.position === 'string' && md.position ? md.position : null;
        const mdLv = Number(md.admin_level);
        admin_level = Number.isFinite(mdLv) ? mdLv : null;
      } catch  {}
      // Fallback: try admins table "position" if metadata missing
      if (!position) {
        try {
          const { data: row } = await adminClient.from('admins').select('position').eq('user_id', r.user_id).maybeSingle();
          position = row && typeof row.position === 'string' ? row.position : null;
        } catch  {}
      }
      // Derive admin_level from position if still missing
      if (!Number.isFinite(admin_level)) {
        admin_level = levelFromPositionAr(position);
      }
      result.push({
        user_id: r.user_id,
        email,
        is_admin: r.is_admin,
        created_at: r.created_at,
        position,
        admin_level
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});

-----------------

send-member-invitation:

// Edge Function: send-member-invitation
// Purpose: Send activation invitation email to members
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
serve(async (req)=>{
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    // Verify user is authenticated using JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({
        success: false,
        message: `Authentication failed: ${userError.message}`
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: 'User not authenticated'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create authenticated client for subsequent requests
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Verify user is admin
    const { data: adminData, error: adminError } = await authenticatedClient.from('admins').select('user_id, is_admin').eq('user_id', user.id).eq('is_admin', true).maybeSingle();
    if (adminError) {
      console.error('Admin check error:', adminError);
      return new Response(JSON.stringify({
        success: false,
        message: `Admin verification failed: ${adminError.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!adminData) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Unauthorized: Admin access required'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse request body
    const body = await req.json();
    const { member_id, email, full_name, committee } = body;
    if (!member_id || !email || !full_name) {
      throw new Error('Missing required fields: member_id, email, full_name');
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    // Check if member already has an account
    const { data: memberData, error: memberError } = await authenticatedClient.from('members').select('user_id, account_status').eq('id', member_id).maybeSingle();
    if (memberError) {
      throw new Error(`Failed to fetch member: ${memberError.message}`);
    }
    if (memberData?.user_id) {
      throw new Error('Member account is already activated');
    }
    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7) // Valid for 7 days
    ;
    // Insert invitation record
    const { data: invitationData, error: invitationError } = await authenticatedClient.from('member_invitations').insert({
      member_id,
      email,
      invitation_token: token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id
    }).select('id').single();
    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }
    // Generate activation URL
    const activationUrl = `https://www.adeeb.club/members/activate.html?token=${token}`;
    // Prepare email content
    const emailHtml = `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>دعوة تفعيل حساب أديب</title>
  </head>
  <body style="margin:0;background:#f6f9fc;color:#274060;font-family:-apple-system,Segoe UI,Tahoma,Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;direction:rtl;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6eef7;">
            
            <!-- Header Gradient Bar -->
            <tr>
              <td style="height:4px;background:linear-gradient(135deg,#3d8fd6,#274060);"></td>
            </tr>
            
            <!-- Logo Section -->
            <tr>
              <td style="padding:24px 24px 8px 24px;text-align:center;">
                <img src="https://www.adeeb.club/adeeb-logo.png" alt="شعار نادي أدِيب" width="80" style="display:block;margin:0 auto 8px auto;" />
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.5;color:#274060;text-align:center;">مرحباً بك في نادي أديب!</h1>
                
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.9;color:#335c81;">
                  أهلاً أهلاً <strong>${full_name}</strong>،
                </p>
                
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.9;color:#335c81;">
                  منوّر منصة أديب.
                </p>
                
                ${committee ? `
                <div style="background:#f0f9ff;border-right:3px solid #3d8fd6;padding:12px 16px;border-radius:8px;margin:16px 0;">
                  <p style="margin:0;color:#274060;font-size:14px;font-weight:600;">
                    📋 لجنتك: <span style="font-weight:400;">${committee}</span>
                  </p>
                </div>
                ` : ''}
                
                <p style="margin:16px 0;font-size:15px;line-height:1.9;color:#335c81;">
                  لتفعيل حسابك وإنشاء كلمة مرور، يرجى الضغط على الزر أدناه:
                </p>
              </td>
            </tr>
            
            <!-- CTA Button -->
            <tr>
              <td align="center" style="padding:16px 24px;">
                <a href="${activationUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3d8fd6,#274060);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;box-shadow:0 2px 8px rgba(61,143,214,0.25);">
                  🔓 تفعيل الحساب
                </a>
              </td>
            </tr>
            
            <!-- Alternative Link -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.8;color:#5b708d;">
                  إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:
                </p>
                <div style="background:#f8fafc;border:1px solid #e6eef7;border-radius:8px;padding:10px;word-break:break-all;">
                  <a href="${activationUrl}" style="color:#3d8fd6;text-decoration:none;font-size:12px;">${activationUrl}</a>
                </div>
              </td>
            </tr>
            
            <!-- Warning Box -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <div style="background:#fff7ed;border-right:3px solid #f59e0b;padding:12px 16px;border-radius:8px;">
                  <p style="margin:0 0 6px 0;color:#92400e;font-size:13px;font-weight:600;">
                    ⏰ مهم:
                  </p>
                  <p style="margin:0;color:#78350f;font-size:13px;line-height:1.7;">
                    • هذا الرابط صالح لمدة <strong>7 أيام</strong> فقط<br>
                    • يمكن استخدامه <strong>مرة واحدة</strong> فقط<br>
                    • لا تشارك هذا الرابط مع أحد
                  </p>
                </div>
              </td>
            </tr>
            
            <!-- Features List -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <p style="margin:0 0 10px 0;font-size:14px;line-height:1.8;color:#335c81;font-weight:600;">
                  بعد التفعيل، ستتمكن من:
                </p>
                <ul style="margin:0;padding:0 0 0 20px;color:#5b708d;font-size:14px;line-height:1.9;">
                  <li>الوصول إلى لوحة التحكم الخاصة بك</li>
                  <li>تحديث بياناتك الشخصية</li>
                  <li>متابعة أنشطة النادي</li>
                </ul>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding:16px 24px 24px 24px;">
                <hr style="border:none;border-top:1px solid #e6eef7;margin:0 0 16px 0;" />
                
                <p style="margin:0 0 8px 0;font-size:13px;color:#274060;font-weight:600;text-align:center;">
                  نادي أديب - جامعة الملك فيصل
                </p>
                <p style="margin:0 0 12px 0;font-size:12px;color:#6b7d93;text-align:center;">
                  نادي ثقافي إبداعي يُثري المحتوى الثقافي والإبداعي
                </p>
                
                <div style="text-align:center;margin:12px 0;">
                  <a href="https://www.adeeb.club" style="color:#3d8fd6;text-decoration:none;margin:0 8px;font-size:12px;">🌐 الموقع</a>
                  <span style="color:#cbd5e1;">•</span>
                  <a href="https://twitter.com/AB_KFU" style="color:#3d8fd6;text-decoration:none;margin:0 8px;font-size:12px;">🐦 تويتر</a>
                  <span style="color:#cbd5e1;">•</span>
                  <a href="https://instagram.com/adeeb_kfu" style="color:#3d8fd6;text-decoration:none;margin:0 8px;font-size:12px;">📷 انستقرام</a>
                </div>
                
                <p style="margin:6px 0 0 0;font-size:11px;color:#94a3b8;text-align:center;">
                  للاستفسار: <a href="mailto:adeab.kfu@gmail.com" style="color:#3d8fd6;text-decoration:none;">adeab.kfu@gmail.com</a>
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;
    const emailText = `
مرحباً ${full_name}،

يسعدنا انضمامك لعائلة نادي أديب! تم إنشاء حساب خاص بك في منصة النادي.

${committee ? `لجنتك: ${committee}\n` : ''}

لتفعيل حسابك وإنشاء كلمة مرور، يرجى زيارة الرابط التالي:
${activationUrl}

⏰ مهم:
• هذا الرابط صالح لمدة 7 أيام فقط
• يمكن استخدامه مرة واحدة فقط
• لا تشارك هذا الرابط مع أحد

بعد التفعيل، ستتمكن من:
• الوصول إلى لوحة التحكم الخاصة بك
• تحديث بياناتك الشخصية
• متابعة أنشطة النادي
• التواصل مع أعضاء اللجنة

نادي أديب - جامعة الملك فيصل
https://www.adeeb.club

إذا لم تطلب هذه الدعوة، يرجى تجاهل هذا البريد.
    `;
    // Send email using Resend
    let emailId = null;
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'نادي أديب <noreply@adeeb.club>',
          to: [
            email
          ],
          subject: '🎉 دعوة تفعيل حساب نادي أديب',
          html: emailHtml,
          text: emailText
        })
      });
      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        console.error('Resend API error:', errorData);
        throw new Error(`Failed to send email: ${errorData.message || 'Unknown error'}`);
      }
      const resendData = await resendResponse.json();
      emailId = resendData.id;
    } else {
      console.warn('RESEND_API_KEY not configured, email not sent');
    }
    // Return success response
    const response = {
      success: true,
      message: 'Invitation sent successfully',
      invitation_id: invitationData.id,
      email_id: emailId || undefined
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Internal server error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: error.message.includes('Unauthorized') ? 401 : 400
    });
  }
});

---------------

send-push-notification:

// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors
    });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: cors
    });
  }
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@adeeb.club";
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // التحقق من أن المستدعي إداري
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const { data: adminRow } = await userClient.from("admins").select("is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) {
      return new Response(JSON.stringify({
        error: "Forbidden"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const body = await req.json();
    const { user_ids, all_users, payload } = body;
    if (!payload?.title || !payload?.body) {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // جلب الاشتراكات النشطة
    let query = adminClient.from("push_subscriptions").select("*").eq("active", true);
    if (user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }
    const { data: subscriptions, error: subError } = await query;
    if (subError) {
      throw subError;
    }
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        message: "No active subscriptions found",
        sent: 0
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    // Import web-push library
    const webpush = await import("npm:web-push@3.6.7");
    // تكوين VAPID
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    // إرسال الإشعارات
    let successCount = 0;
    let failCount = 0;
    const results = [];
    for (const sub of subscriptions){
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      const notification = {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "https://www.adeeb.club/LOGO.png",
        badge: payload.badge || "https://www.adeeb.club/admin/icons/icon-72x72.png",
        tag: payload.tag || `adeeb-${Date.now()}`,
        data: {
          ...payload.data,
          url: payload.url || "https://www.adeeb.club/admin/admin.html"
        },
        actions: payload.actions || []
      };
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(notification));
        successCount++;
        results.push({
          user_id: sub.user_id,
          status: "sent"
        });
        // تحديث last_used_at
        await adminClient.from("push_subscriptions").update({
          last_used_at: new Date().toISOString()
        }).eq("id", sub.id);
      } catch (error) {
        failCount++;
        results.push({
          user_id: sub.user_id,
          status: "failed",
          error: error.message
        });
        // إذا كان الاشتراك غير صالح، قم بتعطيله
        if (error.statusCode === 410) {
          await adminClient.from("push_subscriptions").update({
            active: false
          }).eq("id", sub.id);
        }
      }
    }
    // حفظ سجل الإشعار (اختياري)
    await adminClient.from("push_notifications").insert({
      title: payload.title,
      body: payload.body,
      data: payload,
      status: "sent",
      sent_at: new Date().toISOString(),
      created_by: caller.id
    });
    return new Response(JSON.stringify({
      message: "Notifications sent",
      sent: successCount,
      failed: failCount,
      results
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});


--------------

set-admin-level:

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  committee_leader: 3,
  admin_officer: 4,
  executive_president: 5
};
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: adminRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) return new Response(JSON.stringify({
      error: "Forbidden"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const body = await req.json();
    const user_id = String(body?.user_id || "");
    const newLevel = Number(body?.admin_level);
    const newPosition = body?.position ? String(body.position) : null;
    if (!user_id || ![
      ADMIN.vice,
      ADMIN.committee_leader,
      ADMIN.admin_officer,
      ADMIN.executive_president
    ].includes(newLevel)) {
      return new Response(JSON.stringify({
        error: "Invalid level"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const callerLevel = Number(caller.user_metadata?.admin_level ?? ADMIN.admin_officer);
    const canChange = callerLevel === ADMIN.president || callerLevel === ADMIN.vice && newLevel >= ADMIN.committee_leader;
    if (!canChange) return new Response(JSON.stringify({
      error: "Insufficient permissions to change levels"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (caller.id === user_id) return new Response(JSON.stringify({
      error: "Cannot change own level"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: tgt } = await adminClient.auth.admin.getUserById(user_id);
    if (!tgt?.user) return new Response(JSON.stringify({
      error: "Target not found"
    }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const targetLv = Number(tgt.user.user_metadata?.admin_level ?? ADMIN.admin_officer);
    if (targetLv === ADMIN.president) return new Response(JSON.stringify({
      error: "Cannot change president level"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const meta = {
      ...tgt.user.user_metadata || {},
      admin_level: newLevel
    };
    const { error: updErr } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: meta
    });
    if (updErr) return new Response(JSON.stringify({
      error: updErr.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (newPosition) {
      const { error: posErr } = await adminClient.from("admins").update({
        position: newPosition
      }).eq("user_id", user_id);
      if (posErr) {
        console.error("Failed to update position:", posErr);
      }
    }
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});

-------------

set-admin-perms:

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  manager: 3
};
const ALLOWED = [
  'stats',
  'home',
  'members',
  'idea-board',
  'profile',
  'works',
  'sponsors',
  'achievements',
  'board',
  'faq',
  'schedule',
  'idea_board',
  'chat',
  'todos',
  'testimonials',
  'admins',
  'membership_apps',
  'appointments',
  'push',
  'join',
  'forms'
];
function normalizeAr(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
function levelFromPositionAr(position) {
  const p = normalizeAr(position);
  if (p.includes('رئيس') && p.includes('اديب')) return ADMIN.president;
  if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN.vice;
  return ADMIN.manager;
}
async function getEffectiveLevel(adminClient, userId) {
  const { data: u } = await adminClient.auth.admin.getUserById(userId);
  const mdLv = Number(u?.user?.user_metadata?.admin_level);
  let pos = null;
  try {
    const { data: row } = await adminClient.from("admins").select("position").eq("user_id", userId).maybeSingle();
    pos = row?.position || null;
  } catch  {}
  const posLv = levelFromPositionAr(pos);
  const eff = posLv === ADMIN.president || posLv === ADMIN.vice ? posLv : Number.isFinite(mdLv) ? mdLv : ADMIN.manager;
  if (u?.user && eff !== mdLv && (eff === ADMIN.president || eff === ADMIN.vice)) {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...u.user.user_metadata || {},
        admin_level: eff
      }
    });
  }
  return eff;
}
function sanitizePerms(obj) {
  const o = {};
  for (const k of ALLOWED)o[k] = !!obj?.[k];
  return o;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: adminRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) return new Response(JSON.stringify({
      error: "Forbidden"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const body = await req.json();
    const user_id = String(body?.user_id || "");
    const rawPerms = body?.perms;
    if (!user_id || typeof rawPerms !== "object") {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const perms = sanitizePerms(rawPerms);
    const callerLevel = await getEffectiveLevel(adminClient, caller.id);
    const targetLevel = await getEffectiveLevel(adminClient, user_id);
    const isSelf = caller.id === user_id;
    if (targetLevel === ADMIN.president) return new Response(JSON.stringify({
      error: "Cannot manage president"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (callerLevel === ADMIN.manager) return new Response(JSON.stringify({
      error: "Insufficient role"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (callerLevel === ADMIN.vice && (isSelf || targetLevel !== ADMIN.manager)) {
      return new Response(JSON.stringify({
        error: "Vice can only manage managers"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    if (callerLevel === ADMIN.president && isSelf) {
      return new Response(JSON.stringify({
        error: "President cannot change own perms"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    if (targetLevel === ADMIN.manager) perms.admins = false;
    const { data: tgt } = await adminClient.auth.admin.getUserById(user_id);
    if (!tgt?.user) return new Response(JSON.stringify({
      error: "Target not found"
    }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const newMeta = {
      ...tgt.user.user_metadata || {},
      admin_perms: perms
    };
    const { error: updErr } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: newMeta
    });
    if (updErr) return new Response(JSON.stringify({
      error: updErr.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});

------------------

toggle-admin:

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  manager: 3
};
function normalizeAr(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
function levelFromPositionAr(position) {
  const p = normalizeAr(position);
  if (p.includes('رئيس') && p.includes('اديب')) return ADMIN.president;
  if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN.vice;
  return ADMIN.manager;
}
async function getEffectiveLevel(adminClient, userId) {
  const { data: u } = await adminClient.auth.admin.getUserById(userId);
  const mdLv = Number(u?.user?.user_metadata?.admin_level);
  let pos = null;
  try {
    const { data: row } = await adminClient.from("admins").select("position").eq("user_id", userId).maybeSingle();
    pos = row?.position || null;
  } catch  {}
  const posLv = levelFromPositionAr(pos);
  const eff = posLv === ADMIN.president || posLv === ADMIN.vice ? posLv : Number.isFinite(mdLv) ? mdLv : ADMIN.manager;
  if (u?.user && eff !== mdLv && (eff === ADMIN.president || eff === ADMIN.vice)) {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...u.user.user_metadata || {},
        admin_level: eff
      }
    });
  }
  return eff;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: adminRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) return new Response(JSON.stringify({
      error: "Forbidden"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const body = await req.json();
    const user_id = String(body?.user_id || "");
    const make_admin = body?.make_admin === true;
    if (!user_id || typeof body?.make_admin !== "boolean") {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const callerLv = await getEffectiveLevel(adminClient, caller.id);
    const targetLv = await getEffectiveLevel(adminClient, user_id);
    const isSelf = caller.id === user_id;
    if (isSelf) return new Response(JSON.stringify({
      error: "Cannot change own admin status"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (make_admin) {
      if (callerLv !== ADMIN.president) {
        return new Response(JSON.stringify({
          error: "Only president can grant admin"
        }), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
    } else {
      if (targetLv === ADMIN.president) return new Response(JSON.stringify({
        error: "Cannot remove president"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
      if (callerLv === ADMIN.manager) return new Response(JSON.stringify({
        error: "Insufficient role"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
      if (callerLv === ADMIN.vice && targetLv !== ADMIN.manager) {
        return new Response(JSON.stringify({
          error: "Vice can only remove managers"
        }), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
    }
    const { error } = await adminClient.from("admins").upsert({
      user_id,
      is_admin: make_admin
    }).eq("user_id", user_id);
    if (error) return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
