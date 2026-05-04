/**
 * نظام تتبع زيارات نادي أديب
 * يُرسل البيانات إلى Edge Function track-pageview التي تتولى:
 *   - parse للـ User-Agent
 *   - استخراج IP و country من الخادم (لا يصل العميل لها)
 *   - فلترة Bots
 *   - hashing للـ IP قبل الحفظ
 *
 * آلية تتبع المدة: heartbeat كل 15 ثانية + sendBeacon عند مغادرة الصفحة.
 * لا يعتمد على supabase-js (مستقل تماماً).
 */
(function () {
    'use strict';

    var TRACKER_URL =
        (typeof window.SUPABASE_URL === 'string' && window.SUPABASE_URL)
            ? window.SUPABASE_URL + '/functions/v1/track-pageview'
            : 'https://nnlhkfeybyhvlinbqqfa.supabase.co/functions/v1/track-pageview';

    var STORAGE_VISITOR = 'adeeb_visitor_id';
    var STORAGE_SESSION = 'adeeb_session_id';
    var HEARTBEAT_MS    = 15000;
    var MAX_DURATION    = 14400; // 4 ساعات

    function uuid() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            try { return window.crypto.randomUUID(); } catch (e) {}
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function getOrCreateVisitorId() {
        try {
            var v = localStorage.getItem(STORAGE_VISITOR);
            if (!v) { v = uuid(); localStorage.setItem(STORAGE_VISITOR, v); }
            return v;
        } catch (e) { return uuid(); }
    }

    function getOrCreateSessionId() {
        try {
            var s = sessionStorage.getItem(STORAGE_SESSION);
            if (!s) { s = uuid(); sessionStorage.setItem(STORAGE_SESSION, s); }
            return s;
        } catch (e) { return uuid(); }
    }

    function currentUserId() {
        // إن أمكن، نأخذ user_id من sb client (لو كان متاحاً)
        try {
            if (window.sbClient && window.sbClient.auth) {
                var session = window.sbClient.auth.currentSession || null;
                if (session && session.user && session.user.id) return session.user.id;
            }
        } catch (e) {}
        return null;
    }

    function postJSON(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            keepalive: true,
            credentials: 'omit',
            mode: 'cors',
        });
    }

    function sendBeacon(url, body) {
        try {
            if (navigator.sendBeacon) {
                // text/plain لتجنّب CORS preflight — sendBeacon لا يُكمل POST بعد إغلاق التبويب لو احتاج preflight
                var blob = new Blob([JSON.stringify(body)], { type: 'text/plain;charset=UTF-8' });
                return navigator.sendBeacon(url, blob);
            }
        } catch (e) {}
        // fallback — fetch keepalive
        try { postJSON(url, body); } catch (e) {}
        return false;
    }

    var Tracker = {
        visitorId: null,
        sessionId: null,
        startedAt: 0,
        pageviewId: null,
        heartbeatTimer: null,
        ended: false,

        init: function () {
            try {
                this.visitorId = getOrCreateVisitorId();
                this.sessionId = getOrCreateSessionId();
                this.startedAt = Date.now();
                this.start();
                this.bindUnload();
            } catch (e) {
                console.warn('[VisitTracker] init failed:', e && e.message);
            }
        },

        start: function () {
            var self = this;
            var payload = {
                visitor_id: this.visitorId,
                session_id: this.sessionId,
                page_path:  window.location.pathname || '/',
                page_url:   window.location.href,
                page_title: document.title || null,
                referrer:   document.referrer || null,
                screen_width:  window.screen ? window.screen.width  : null,
                screen_height: window.screen ? window.screen.height : null,
                language:   (navigator.language || '').slice(0, 20) || null,
                user_id:    currentUserId(),
            };

            postJSON(TRACKER_URL, payload)
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) {
                    if (data && data.pageview_id) {
                        self.pageviewId = data.pageview_id;
                        self.startHeartbeat();
                    }
                })
                .catch(function (err) {
                    console.warn('[VisitTracker] start failed:', err && err.message);
                });
        },

        startHeartbeat: function () {
            var self = this;
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(function () {
                if (!self.pageviewId || self.ended) return;
                if (document.visibilityState === 'hidden') return; // لا نحتسب الوقت في الخلفية
                var seconds = Math.min(MAX_DURATION, Math.floor((Date.now() - self.startedAt) / 1000));
                postJSON(TRACKER_URL + '/heartbeat', {
                    pageview_id: self.pageviewId,
                    total_seconds: seconds,
                }).catch(function () {});
            }, HEARTBEAT_MS);
        },

        sendEnd: function () {
            if (!this.pageviewId || this.ended) return;
            this.ended = true;
            if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
            var seconds = Math.min(MAX_DURATION, Math.floor((Date.now() - this.startedAt) / 1000));
            sendBeacon(TRACKER_URL + '/end', {
                pageview_id: this.pageviewId,
                total_seconds: seconds,
            });
        },

        bindUnload: function () {
            var self = this;
            // pagehide موثوق على الموبايل والديسكتوب
            window.addEventListener('pagehide', function () { self.sendEnd(); });
            // visibilitychange: عند الإخفاء نُرسل الـ end (الـ tab قد لا تعود)
            // إذا عاد المستخدم نُعيد البدء — لذا نمنع الإرسال المتكرر بـ ended flag
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden') self.sendEnd();
            });
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { Tracker.init(); });
    } else {
        Tracker.init();
    }

    window.adeebVisitTracker = Tracker;
})();
