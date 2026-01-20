/**
 * نظام تتبع زيارات موقع نادي أديب
 * يقوم بتسجيل الزيارات بشكل مجهول مع احترام خصوصية المستخدم
 */

(function() {
    'use strict';

    const TRACKER_CONFIG = {
        enabled: true,
        storageKey: 'adeeb_visitor_id',
        sessionKey: 'adeeb_session_id',
        lastVisitKey: 'adeeb_last_visit',
        visitDurationKey: 'adeeb_visit_start',
        minDuration: 3, // الحد الأدنى لمدة الزيارة بالثواني
        trackInterval: 30000, // تحديث مدة الزيارة كل 30 ثانية
    };

    class VisitTracker {
        constructor() {
            this.visitorId = null;
            this.sessionId = null;
            this.visitStartTime = null;
            this.isTracking = false;
            this.trackingInterval = null;
            this.supabaseClient = null;
        }

        async init() {
            if (!TRACKER_CONFIG.enabled) {
                console.log('[VisitTracker] Tracking is disabled');
                return;
            }

            try {
                // التحقق من توفر Supabase
                if (!window.sbClient) {
                    console.warn('[VisitTracker] Supabase client not available');
                    return;
                }

                this.supabaseClient = window.sbClient;

                // الحصول على أو إنشاء معرف الزائر
                this.visitorId = this.getOrCreateVisitorId();
                
                // الحصول على أو إنشاء معرف الجلسة
                this.sessionId = this.getOrCreateSessionId();

                // تسجيل الزيارة
                await this.trackVisit();

                // بدء تتبع مدة الزيارة
                this.startDurationTracking();

                // تسجيل نهاية الزيارة عند مغادرة الصفحة
                this.setupUnloadHandler();

                console.log('[VisitTracker] Initialized successfully');
            } catch (error) {
                console.error('[VisitTracker] Initialization error:', error);
            }
        }

        getOrCreateVisitorId() {
            let visitorId = localStorage.getItem(TRACKER_CONFIG.storageKey);
            
            if (!visitorId) {
                // إنشاء معرف فريد للزائر
                visitorId = this.generateUUID();
                localStorage.setItem(TRACKER_CONFIG.storageKey, visitorId);
            }

            return visitorId;
        }

        getOrCreateSessionId() {
            let sessionId = sessionStorage.getItem(TRACKER_CONFIG.sessionKey);
            
            if (!sessionId) {
                // إنشاء معرف فريد للجلسة
                sessionId = this.generateUUID();
                sessionStorage.setItem(TRACKER_CONFIG.sessionKey, sessionId);
            }

            return sessionId;
        }

        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        async trackVisit() {
            try {
                this.visitStartTime = Date.now();
                sessionStorage.setItem(TRACKER_CONFIG.visitDurationKey, this.visitStartTime.toString());

                const visitData = this.collectVisitData();

                // إرسال البيانات إلى Supabase
                const { data, error } = await this.supabaseClient
                    .from('site_visits')
                    .insert([visitData])
                    .select();

                if (error) {
                    console.error('[VisitTracker] Error tracking visit:', error);
                } else {
                    this.isTracking = true;
                    console.log('[VisitTracker] Visit tracked successfully');
                }

                // حفظ وقت آخر زيارة
                localStorage.setItem(TRACKER_CONFIG.lastVisitKey, new Date().toISOString());

            } catch (error) {
                console.error('[VisitTracker] Error in trackVisit:', error);
            }
        }

        collectVisitData() {
            const parser = new UAParser();
            const uaResult = parser.getResult();

            return {
                // معلومات الصفحة
                page_url: window.location.href,
                page_title: document.title,
                page_path: window.location.pathname,
                referrer: document.referrer || null,

                // معلومات الزائر
                visitor_id: this.visitorId,
                session_id: this.sessionId,

                // معلومات تقنية
                user_agent: navigator.userAgent,
                browser_name: uaResult.browser.name || 'Unknown',
                browser_version: uaResult.browser.version || 'Unknown',
                os_name: uaResult.os.name || 'Unknown',
                os_version: uaResult.os.version || 'Unknown',
                device_type: this.getDeviceType(uaResult),
                device_vendor: uaResult.device.vendor || null,

                // معلومات الشاشة
                screen_width: window.screen.width,
                screen_height: window.screen.height,

                // الطابع الزمني
                visited_at: new Date().toISOString()
            };
        }

        getDeviceType(uaResult) {
            if (uaResult.device.type === 'mobile') return 'mobile';
            if (uaResult.device.type === 'tablet') return 'tablet';
            if (uaResult.device.type === 'desktop' || !uaResult.device.type) return 'desktop';
            return 'unknown';
        }

        startDurationTracking() {
            // تحديث مدة الزيارة بشكل دوري
            this.trackingInterval = setInterval(() => {
                this.updateVisitDuration();
            }, TRACKER_CONFIG.trackInterval);
        }

        async updateVisitDuration() {
            if (!this.isTracking || !this.visitStartTime) return;

            try {
                const duration = Math.floor((Date.now() - this.visitStartTime) / 1000);

                if (duration >= TRACKER_CONFIG.minDuration) {
                    // تحديث مدة الزيارة في قاعدة البيانات
                    const { error } = await this.supabaseClient
                        .from('site_visits')
                        .update({ visit_duration: duration })
                        .eq('session_id', this.sessionId)
                        .eq('page_path', window.location.pathname)
                        .order('visited_at', { ascending: false })
                        .limit(1);

                    if (error) {
                        console.error('[VisitTracker] Error updating duration:', error);
                    }
                }
            } catch (error) {
                console.error('[VisitTracker] Error in updateVisitDuration:', error);
            }
        }

        setupUnloadHandler() {
            // حفظ مدة الزيارة عند مغادرة الصفحة
            window.addEventListener('beforeunload', () => {
                this.handleUnload();
            });

            // للمتصفحات الحديثة
            window.addEventListener('pagehide', () => {
                this.handleUnload();
            });

            // تتبع الخروج من الصفحة (visibility API)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.handleUnload();
                }
            });
        }

        handleUnload() {
            if (!this.isTracking || !this.visitStartTime) return;

            const duration = Math.floor((Date.now() - this.visitStartTime) / 1000);

            if (duration >= TRACKER_CONFIG.minDuration) {
                // استخدام sendBeacon للإرسال الموثوق عند مغادرة الصفحة
                const data = {
                    session_id: this.sessionId,
                    page_path: window.location.pathname,
                    visit_duration: duration,
                    is_bounce: duration < 10 // اعتبار الزيارة ارتداد إذا كانت أقل من 10 ثوان
                };

                // محاولة استخدام sendBeacon
                if (navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    navigator.sendBeacon('/api/track-duration', blob);
                }
            }

            // إيقاف التتبع
            if (this.trackingInterval) {
                clearInterval(this.trackingInterval);
            }
        }

        destroy() {
            if (this.trackingInterval) {
                clearInterval(this.trackingInterval);
            }
            this.isTracking = false;
        }
    }

    // مكتبة UAParser لتحليل User Agent
    // نسخة مصغرة من ua-parser-js
    class UAParser {
        constructor() {
            this.ua = navigator.userAgent;
        }

        getResult() {
            return {
                browser: this.getBrowser(),
                os: this.getOS(),
                device: this.getDevice()
            };
        }

        getBrowser() {
            const ua = this.ua;
            let name = 'Unknown', version = 'Unknown';

            if (/Edge\/(\d+)/.test(ua)) {
                name = 'Edge';
                version = RegExp.$1;
            } else if (/Edg\/(\d+)/.test(ua)) {
                name = 'Edge';
                version = RegExp.$1;
            } else if (/Chrome\/(\d+)/.test(ua) && !/Edge/.test(ua)) {
                name = 'Chrome';
                version = RegExp.$1;
            } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
                name = 'Safari';
                version = RegExp.$1;
            } else if (/Firefox\/(\d+)/.test(ua)) {
                name = 'Firefox';
                version = RegExp.$1;
            } else if (/MSIE (\d+)/.test(ua) || /Trident.*rv:(\d+)/.test(ua)) {
                name = 'IE';
                version = RegExp.$1;
            } else if (/Opera\/(\d+)/.test(ua) || /OPR\/(\d+)/.test(ua)) {
                name = 'Opera';
                version = RegExp.$1;
            }

            return { name, version };
        }

        getOS() {
            const ua = this.ua;
            let name = 'Unknown', version = 'Unknown';

            if (/Windows NT (\d+\.\d+)/.test(ua)) {
                name = 'Windows';
                version = RegExp.$1;
            } else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
                name = 'macOS';
                version = RegExp.$1.replace('_', '.');
            } else if (/Android (\d+\.\d+)/.test(ua)) {
                name = 'Android';
                version = RegExp.$1;
            } else if (/iPhone OS (\d+[._]\d+)/.test(ua)) {
                name = 'iOS';
                version = RegExp.$1.replace('_', '.');
            } else if (/iPad.*OS (\d+[._]\d+)/.test(ua)) {
                name = 'iPadOS';
                version = RegExp.$1.replace('_', '.');
            } else if (/Linux/.test(ua)) {
                name = 'Linux';
            }

            return { name, version };
        }

        getDevice() {
            const ua = this.ua;
            let type = null, vendor = null;

            if (/iPad/.test(ua)) {
                type = 'tablet';
                vendor = 'Apple';
            } else if (/iPhone/.test(ua)) {
                type = 'mobile';
                vendor = 'Apple';
            } else if (/Android/.test(ua)) {
                if (/Mobile/.test(ua)) {
                    type = 'mobile';
                } else {
                    type = 'tablet';
                }
            } else if (/Windows Phone/.test(ua)) {
                type = 'mobile';
                vendor = 'Microsoft';
            }

            return { type, vendor };
        }
    }

    // تهيئة التتبع عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const tracker = new VisitTracker();
            tracker.init();
            window.visitTracker = tracker;
        });
    } else {
        const tracker = new VisitTracker();
        tracker.init();
        window.visitTracker = tracker;
    }

})();
