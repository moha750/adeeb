# Push Notifications Setup Guide

## نظرة عامة
يدعم نادي أديب الآن إرسال إشعارات Push للمستخدمين على أجهزتهم المختلفة (هواتف، أجهزة كمبيوتر، إلخ) باستخدام Web Push API.

## المتطلبات

### 1. توليد VAPID Keys
VAPID (Voluntary Application Server Identification) مطلوب لإرسال Push Notifications.

```bash
# باستخدام npm
npm install -g web-push
web-push generate-vapid-keys

# أو باستخدام أداة online
# https://vapidkeys.com/
```

ستحصل على:
- **Public Key**: استخدمها في `admin.js` (استبدل `YOUR_VAPID_PUBLIC_KEY_HERE`)
- **Private Key**: احفظها في Supabase Edge Function environment variables

### 2. تحديث admin.js
استبدل `YOUR_VAPID_PUBLIC_KEY_HERE` في `admin.js` بـ Public Key الخاص بك:
```javascript
const VAPID_PUBLIC_KEY = 'BKd0...your-actual-public-key...';
```

## إعداد قاعدة البيانات (Supabase)

### جدول push_subscriptions

```sql
-- إنشاء جدول الاشتراكات
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, endpoint)
);

-- تفعيل RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يقرأ اشتراكاته فقط
CREATE POLICY "Users can read own subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- سياسة الإدراج: المستخدم يضيف اشتراكاته
CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- سياسة التحديث: المستخدم يحدث اشتراكاته
CREATE POLICY "Users can update own subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- سياسة الحذف: المستخدم يحذف اشتراكاته
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- فهرس للأداء
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON public.push_subscriptions(active) WHERE active = true;
```

### جدول push_notifications (اختياري - لحفظ سجل الإشعارات)

```sql
-- جدول سجل الإشعارات المرسلة
CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- تفعيل RLS
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- الإداريون فقط يمكنهم القراءة/الكتابة
CREATE POLICY "Admins can manage notifications" ON public.push_notifications
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND is_admin = true
  ));
```

## Edge Functions

### 1. send-push-notification
إنشاء Edge Function لإرسال الإشعارات:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface SendRequest {
  user_ids?: string[]; // إرسال لمستخدمين محددين
  all_users?: boolean; // إرسال لجميع المستخدمين
  payload: PushPayload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: cors 
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@adeeb.club";
    
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
    
    // التحقق من أن المستدعي إداري
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const adminClient = createClient(url, service);
    
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
    
    const { data: adminRow } = await userClient
      .from("admins")
      .select("is_admin")
      .eq("user_id", caller.id)
      .maybeSingle();
      
    if (!adminRow?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
    
    const body: SendRequest = await req.json();
    const { user_ids, all_users, payload } = body;
    
    if (!payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
    
    // جلب الاشتراكات النشطة
    let query = adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("active", true);
    
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
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
    
    // Import web-push library
    const webpush = await import("npm:web-push@3.6.7");
    
    // تكوين VAPID
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // إرسال الإشعارات
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    for (const sub of subscriptions) {
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
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notification)
        );
        successCount++;
        results.push({ 
          user_id: sub.user_id, 
          status: "sent" 
        });
        
        // تحديث last_used_at
        await adminClient
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
          
      } catch (error: any) {
        failCount++;
        results.push({ 
          user_id: sub.user_id, 
          status: "failed", 
          error: error.message 
        });
        
        // إذا كان الاشتراك غير صالح، قم بتعطيله
        if (error.statusCode === 410) {
          await adminClient
            .from("push_subscriptions")
            .update({ active: false })
            .eq("id", sub.id);
        }
      }
    }
    
    // حفظ سجل الإشعار (اختياري)
    await adminClient
      .from("push_notifications")
      .insert({
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
      headers: { "Content-Type": "application/json", ...cors }
    });
    
  } catch (e: any) {
    return new Response(JSON.stringify({ 
      error: String(e?.message || e) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
});
```

### 2. نشر Edge Function

```bash
# من مجلد المشروع
supabase functions deploy send-push-notification

# إضافة Environment Variables في Supabase Dashboard
# Settings > Edge Functions > send-push-notification > Secrets
# VAPID_PRIVATE_KEY = your-private-key
# VAPID_PUBLIC_KEY = your-public-key  
# VAPID_SUBJECT = mailto:admin@adeeb.club
```

## إضافة واجهة إرسال الإشعارات في لوحة التحكم

يمكنك إضافة قسم في لوحة التحكم لإرسال الإشعارات:

```javascript
// في admin.js - إضافة دالة إرسال الإشعارات
async function sendPushNotification(userIds, title, body, url) {
  try {
    const response = await callFunction('send-push-notification', {
      method: 'POST',
      body: {
        user_ids: userIds, // أو all_users: true لإرسال للجميع
        payload: {
          title,
          body,
          url,
          icon: 'https://www.adeeb.club/LOGO.png',
          badge: 'https://www.adeeb.club/admin/icons/icon-72x72.png'
        }
      }
    });
    
    return response;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
}

// مثال على الاستخدام
// إرسال إشعار لجميع المستخدمين
await sendPushNotification(null, 'عنوان الإشعار', 'نص الإشعار', 'https://www.adeeb.club/');

// إرسال إشعار لمستخدمين محددين
await sendPushNotification(['user-id-1', 'user-id-2'], 'عنوان', 'نص', 'url');
```

## اختبار النظام

1. **تفعيل الإشعارات**: 
   - افتح لوحة التحكم
   - اذهب إلى قسم "ملفي"
   - اضغط على "تفعيل الإشعارات"
   - وافق على طلب الإذن

2. **إرسال إشعار تجريبي**:
   ```javascript
   // في Console من المتصفح
   await sendPushNotification(
     null, // أو ضع user IDs
     'إشعار تجريبي',
     'هذا إشعار تجريبي من نادي أديب',
     'https://www.adeeb.club/admin/admin.html'
   );
   ```

## ملاحظات مهمة

1. **HTTPS مطلوب**: Push Notifications تعمل فقط على HTTPS أو localhost
2. **دعم المتصفحات**: يعمل على Chrome, Firefox, Edge, Safari (محدود)
3. **حدود الإرسال**: بعض المتصفحات تضع حدود على عدد الإشعارات
4. **الخصوصية**: احصل على موافقة المستخدم قبل إرسال إشعارات تسويقية

## استكشاف الأخطاء

### الإشعارات لا تظهر
- تأكد من أن المتصفح يدعم Push API
- تأكد من أن الموقع يعمل على HTTPS
- تأكد من أن المستخدم منح الإذن
- تحقق من إعدادات الإشعارات في نظام التشغيل

### خطأ في الاشتراك
- تأكد من صحة VAPID Public Key
- تأكد من تسجيل Service Worker بنجاح
- تحقق من Console للأخطاء

### الإشعارات لا تُرسل من الخادم
- تأكد من صحة VAPID Private Key في Edge Function
- تحقق من logs في Supabase Dashboard
- تأكد من أن الجدول push_subscriptions موجود وبه بيانات

## الموارد

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
