# دليل إعداد نظام Push Notifications

## 📋 المحتويات
1. [توليد VAPID Keys](#1-توليد-vapid-keys)
2. [إعداد Supabase Edge Function](#2-إعداد-supabase-edge-function)
3. [تحديث ملف send-notifications.js](#3-تحديث-ملف-send-notificationsjs)
4. [اختبار النظام](#4-اختبار-النظام)
5. [دعم iOS و Android](#5-دعم-ios-و-android)

---

## 1. توليد VAPID Keys

VAPID Keys ضرورية لإرسال Push Notifications. استخدم أحد الطرق التالية:

### الطريقة 1: استخدام web-push CLI

```bash
npm install -g web-push
web-push generate-vapid-keys
```

سيعطيك:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xYjEB6LdoeKTHBWMi3_GvC2XJlcvxwjAq00zGgKI1VNSDAjH-ZkI8=
Private Key: UUxE4puxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### الطريقة 2: استخدام موقع ويب

زر: https://vapidkeys.com/

---

## 2. إعداد Supabase Edge Function

### الخطوة 1: إضافة Environment Variables

في Supabase Dashboard:
1. اذهب إلى **Project Settings** → **Edge Functions**
2. أضف المتغيرات التالية:

```
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xYjEB6LdoeKTHBWMi3_GvC2XJlcvxwjAq00zGgKI1VNSDAjH-ZkI8=
VAPID_PRIVATE_KEY=UUxE4puxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:admin@adeeb.club
```

### الخطوة 2: نشر Edge Function

```bash
# تأكد من تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref nnlhkfeybyhvlinbqqfa

# نشر الـ function
supabase functions deploy send-push-notification
```

### الخطوة 3: منح الصلاحيات

قم بتشغيل هذا SQL في Supabase SQL Editor:

```sql
-- منح صلاحيات استدعاء الـ Edge Function
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- السماح بقراءة جدول push_subscriptions
GRANT SELECT ON push_subscriptions TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON roles TO authenticated;
```

---

## 3. تحديث ملف send-notifications.js

### الخطوة 1: تحديث VAPID Public Key

في `admin/js/notifications-manager.js` السطر 288:

```javascript
// استبدل بالمفتاح الحقيقي الذي ولدته
const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xYjEB6LdoeKTHBWMi3_GvC2XJlcvxwjAq00zGgKI1VNSDAjH-ZkI8';
```

### الخطوة 2: إضافة استدعاء Edge Function

في `admin/js/send-notifications.js`، أضف هذه الدالة:

```javascript
/**
 * إرسال Push Notifications عبر Edge Function
 */
async function sendPushNotifications(notificationId) {
    try {
        const { data, error } = await window.sbClient.functions.invoke(
            'send-push-notification',
            {
                body: { notification_id: notificationId }
            }
        );

        if (error) throw error;

        console.log('✅ Push notifications sent:', data);
        return data;
    } catch (error) {
        console.error('❌ Error sending push notifications:', error);
        throw error;
    }
}
```

### الخطوة 3: استدعاء الدالة بعد إنشاء الإشعار

في دالة `sendNotification` بعد إدراج الإشعار في قاعدة البيانات:

```javascript
// بعد إنشاء الإشعار
const { data: notification, error } = await window.sbClient
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

if (error) throw error;

// إرسال Push Notifications
if (notificationData.is_push_enabled) {
    await sendPushNotifications(notification.id);
}
```

---

## 4. اختبار النظام

### الخطوة 1: تثبيت PWA

1. افتح الموقع في Chrome/Edge
2. اضغط على أيقونة التثبيت في شريط العنوان
3. أو من القائمة: **Install App**

### الخطوة 2: منح إذن الإشعارات

عند فتح التطبيق لأول مرة، سيطلب إذن الإشعارات - اضغط **Allow**.

### الخطوة 3: إرسال إشعار تجريبي

1. اذهب إلى لوحة التحكم
2. افتح قسم **إرسال الإشعارات**
3. املأ البيانات:
   - العنوان: "اختبار الإشعارات"
   - الرسالة: "هذا إشعار تجريبي"
   - الأولوية: عادي
   - فعّل: **إرسال Push Notification**
4. اختر الجمهور المستهدف
5. اضغط **إرسال**

### الخطوة 4: التحقق

- يجب أن يظهر الإشعار في شريط الإشعارات
- تحقق من Console للتأكد من عدم وجود أخطاء
- تحقق من Supabase Logs للـ Edge Function

---

## 5. دعم iOS و Android

### ✅ Android (Chrome, Edge, Firefox)

**يعمل بشكل كامل:**
- الإشعارات تصل حتى عند إغلاق التطبيق
- تعمل في الخلفية عبر Service Worker
- تظهر في شريط الإشعارات

**المتطلبات:**
- تثبيت PWA على الشاشة الرئيسية
- منح إذن الإشعارات

### ⚠️ iOS (Safari)

**يعمل مع قيود:**
- **iOS 16.4+** فقط
- يجب تثبيت PWA على الشاشة الرئيسية أولاً
- لا يعمل في Safari العادي
- قد لا تصل الإشعارات إذا كان التطبيق مغلقاً لفترة طويلة

**الخطوات للمستخدمين على iOS:**
1. افتح الموقع في Safari
2. اضغط على زر المشاركة (Share)
3. اختر **Add to Home Screen**
4. افتح التطبيق من الشاشة الرئيسية
5. امنح إذن الإشعارات

### 📊 جدول التوافق

| المنصة | المتصفح | الدعم | ملاحظات |
|--------|---------|-------|---------|
| Android | Chrome | ✅ كامل | يعمل بشكل ممتاز |
| Android | Firefox | ✅ كامل | يعمل بشكل ممتاز |
| Android | Edge | ✅ كامل | يعمل بشكل ممتاز |
| iOS 16.4+ | Safari (PWA) | ⚠️ محدود | يجب تثبيت PWA |
| iOS | Safari (Browser) | ❌ لا يعمل | غير مدعوم |
| Desktop | Chrome/Edge | ✅ كامل | يعمل بشكل ممتاز |
| Desktop | Firefox | ✅ كامل | يعمل بشكل ممتاز |

---

## 🔧 استكشاف الأخطاء

### المشكلة: لا تصل الإشعارات

**الحلول:**
1. تحقق من أن VAPID Keys صحيحة
2. تحقق من أن المستخدم منح إذن الإشعارات
3. تحقق من Supabase Logs للـ Edge Function
4. تحقق من Console للأخطاء

### المشكلة: خطأ 410 (Gone)

**السبب:** الاشتراك انتهت صلاحيته

**الحل:** النظام يقوم تلقائياً بتعطيل الاشتراكات المنتهية

### المشكلة: لا يعمل على iOS

**الحلول:**
1. تأكد من أن iOS 16.4 أو أحدث
2. تأكد من تثبيت PWA على الشاشة الرئيسية
3. افتح التطبيق من الشاشة الرئيسية (ليس Safari)
4. امنح إذن الإشعارات

---

## 📱 Service Worker

تأكد من وجود Service Worker في المسار الرئيسي:

**ملف: `/sw.js`**

```javascript
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon/android-icon-192x192.png',
    badge: data.badge || '/favicon/android-icon-192x192.png',
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    data: data.data
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

---

## 🎯 الخلاصة

بعد إتمام هذه الخطوات:
- ✅ الإشعارات تعمل على Android بشكل كامل
- ✅ الإشعارات تعمل على Desktop
- ⚠️ الإشعارات تعمل على iOS 16.4+ (مع قيود)
- ✅ النظام يدعم جميع أنواع الجمهور المستهدف
- ✅ تتبع حالة الاشتراكات وتعطيل المنتهية تلقائياً

---

## 📞 الدعم

في حال واجهت أي مشاكل:
1. تحقق من Supabase Logs
2. تحقق من Browser Console
3. تحقق من جدول `push_subscriptions` في قاعدة البيانات
4. راجع هذا الدليل مرة أخرى

**ملاحظة مهمة:** لا تنسى تحديث VAPID Keys في كل من:
- `notifications-manager.js` (Public Key)
- Supabase Environment Variables (Public & Private Keys)
