/**
 * edge-invoke.js — موحِّد استدعاءات Supabase Edge Functions
 *
 * يعالج مشاكل البوابة (Gateway) العابرة 502/503/504 عبر:
 *  - مهلة زمنية (AbortController)
 *  - إعادة محاولة تلقائية مع Exponential Backoff + Jitter
 *  - إرفاق Authorization + apikey تلقائياً من الجلسة الحالية
 *  - صيغة نتيجة موحّدة { ok, data, error, status, attempts }
 *
 * الاستخدام:
 *   const res = await window.edgeInvoke('create-member-directly', { email, password, full_name, committee_id });
 *   if (!res.ok) showError(res.error);
 */
(function () {
    'use strict';

    const DEFAULTS = {
        timeoutMs: 45000,
        maxAttempts: 4,
        baseDelayMs: 800,
        maxDelayMs: 6000,
        retryStatuses: [408, 425, 429, 500, 502, 503, 504],
    };

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function backoffDelay(attempt, base, max) {
        const exp = Math.min(max, base * Math.pow(2, attempt - 1));
        const jitter = Math.random() * 0.35 * exp;
        return Math.round(exp + jitter);
    }

    function isRetriableError(err) {
        if (!err) return false;
        const msg = String(err.message || err).toLowerCase();
        return (
            err.name === 'AbortError' ||
            err.name === 'TimeoutError' ||
            msg.includes('failed to fetch') ||
            msg.includes('networkerror') ||
            msg.includes('network error') ||
            msg.includes('load failed') ||
            msg.includes('timeout')
        );
    }

    async function getAuthHeaders() {
        const sb = window.sbClient || window.sb;
        const headers = {
            'Content-Type': 'application/json',
            apikey: window.SUPABASE_ANON_KEY || '',
        };
        try {
            if (sb?.auth?.getSession) {
                const { data } = await sb.auth.getSession();
                const token = data?.session?.access_token;
                if (token) headers.Authorization = `Bearer ${token}`;
            }
        } catch (_) { /* تجاهل */ }
        if (!headers.Authorization && window.SUPABASE_ANON_KEY) {
            headers.Authorization = `Bearer ${window.SUPABASE_ANON_KEY}`;
        }
        return headers;
    }

    async function edgeInvoke(fnName, body, options = {}) {
        const cfg = { ...DEFAULTS, ...options };
        const url = `${window.SUPABASE_URL}/functions/v1/${fnName}`;
        const headers = { ...(await getAuthHeaders()), ...(options.headers || {}) };

        let lastErr = null;
        let lastStatus = 0;
        let lastPayload = null;

        for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

            try {
                const resp = await fetch(url, {
                    method: options.method || 'POST',
                    headers,
                    body: body === undefined ? undefined : JSON.stringify(body),
                    signal: controller.signal,
                });
                clearTimeout(timer);
                lastStatus = resp.status;

                let data = null;
                try { data = await resp.json(); } catch (_) { data = null; }
                lastPayload = data;

                if (resp.ok) {
                    return { ok: true, data, status: resp.status, attempts: attempt };
                }

                if (cfg.retryStatuses.includes(resp.status) && attempt < cfg.maxAttempts) {
                    const delay = backoffDelay(attempt, cfg.baseDelayMs, cfg.maxDelayMs);
                    console.warn(`[edge-invoke] ${fnName} → ${resp.status}, إعادة المحاولة خلال ${delay}ms (محاولة ${attempt}/${cfg.maxAttempts})`);
                    await sleep(delay);
                    continue;
                }

                return {
                    ok: false,
                    data,
                    status: resp.status,
                    error: (data && (data.error || data.message)) || `HTTP ${resp.status}`,
                    attempts: attempt,
                };
            } catch (err) {
                clearTimeout(timer);
                lastErr = err;
                if (isRetriableError(err) && attempt < cfg.maxAttempts) {
                    const delay = backoffDelay(attempt, cfg.baseDelayMs, cfg.maxDelayMs);
                    console.warn(`[edge-invoke] ${fnName} → ${err.name || 'Error'}: ${err.message}, إعادة المحاولة خلال ${delay}ms (محاولة ${attempt}/${cfg.maxAttempts})`);
                    await sleep(delay);
                    continue;
                }
                return {
                    ok: false,
                    data: lastPayload,
                    status: lastStatus,
                    error: err?.message || 'خطأ في الشبكة',
                    attempts: attempt,
                };
            }
        }

        return {
            ok: false,
            data: lastPayload,
            status: lastStatus,
            error: lastErr?.message || 'فشلت جميع المحاولات',
            attempts: cfg.maxAttempts,
        };
    }

    window.edgeInvoke = edgeInvoke;
})();
