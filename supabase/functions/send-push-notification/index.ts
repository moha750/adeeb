import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // استخدام Service Role للوصول الكامل لقاعدة البيانات
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // جلب بيانات الإشعار
    const { data: notification, error: notifError } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (notifError || !notification) {
      return new Response(
        JSON.stringify({ error: "Notification not found", details: notifError?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // التحقق من تفعيل Push
    if (!notification.is_push_enabled) {
      return new Response(
        JSON.stringify({ message: "Push notifications disabled for this notification" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // تحديد المستخدمين المستهدفين
    let targetUserIds: string[] = [];

    if (notification.target_audience === "all") {
      // جلب جميع المستخدمين النشطين
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("status", "active");
      targetUserIds = users?.map((u) => u.id) || [];
    } else if (notification.target_audience === "specific_users") {
      targetUserIds = notification.target_user_ids || [];
    } else if (notification.target_audience === "members") {
      const { data: members } = await supabaseAdmin
        .from("member_details")
        .select("user_id");
      targetUserIds = members?.map((m) => m.user_id) || [];
    } else if (notification.target_audience === "committee_leaders") {
      const { data: leaders } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, roles!inner(role_name)")
        .eq("roles.role_name", "committee_leader");
      targetUserIds = leaders?.map((l) => l.user_id) || [];
    } else if (notification.target_audience === "admins") {
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, roles!inner(role_name)")
        .in("roles.role_name", ["admin", "super_admin"]);
      targetUserIds = admins?.map((a) => a.user_id) || [];
    } else if (notification.target_audience === "specific_committee") {
      const { data: members } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("committee_id", notification.target_committee_id);
      targetUserIds = members?.map((m) => m.user_id) || [];
    }

    // جلب اشتراكات Push للمستخدمين المستهدفين
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds)
      .eq("is_active", true);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // إعداد VAPID
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@adeeb.club";

    // إعداد payload الإشعار
    const payload: NotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: "/favicon/android-icon-192x192.png",
      badge: "/favicon/android-icon-192x192.png",
      tag: `notification-${notification.id}`,
      requireInteraction: notification.priority === "urgent",
      data: {
        url: notification.action_url,
        notification_id: notification.id,
      },
    };

    // إرسال الإشعارات
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          // استخدام web-push library
          const webpush = await import("npm:web-push@3.6.6");
          
          webpush.setVapidDetails(
            VAPID_SUBJECT,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          );

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );

          return { success: true, user_id: sub.user_id };
        } catch (error) {
          console.error(`Failed to send to ${sub.user_id}:`, error);
          
          // إذا كان الاشتراك غير صالح، قم بتعطيله
          if (error.statusCode === 410) {
            await supabaseAdmin
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
          }
          
          return { success: false, user_id: sub.user_id, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    return new Response(
      JSON.stringify({
        message: "Push notifications sent",
        total: results.length,
        successful,
        failed,
        results: results.map((r) => r.status === "fulfilled" ? r.value : { success: false }),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
