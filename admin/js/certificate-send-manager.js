/**
 * صفحة "إرسال الشهادات" — مركزية لكل الأنشطة
 * يعمل ضمن قسم #activities-send-certs-section في لوحة التحكم.
 *
 * يعتمد على:
 *   - RPC list_certificates_for_send() لجلب كل شهادات الحضور
 *   - RPC mark_certificate_sent(p_reservation_id) لتسجيل عملية الإرسال
 *   - صفحة عامة activities/download-certificate.html?serial=... للتحميل بدون login
 */

class CertificateSendManager {
    constructor() {
        this.rows = [];
        this.filter = 'pending';
        this.search = '';
        this.activityFilter = 'all';
    }

    async load() {
        const root = document.getElementById('sendCertsContent');
        if (!root) return;
        root.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
                        <p class="empty-state__title">جاري تحميل الشهادات…</p>
                    </div>
                </div>
            </div>`;

        try {
            const sb = window.sbClient;
            if (!sb) throw new Error('CLIENT_NOT_READY');
            const { data, error } = await sb.rpc('list_certificates_for_send');
            if (error) throw error;
            this.rows = Array.isArray(data) ? data : [];
            this.render();
        } catch (err) {
            console.error('CertificateSendManager: load error', err);
            root.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                            <p class="empty-state__title">${this.escapeHtml(this.humanizeError(err.message || String(err)))}</p>
                        </div>
                    </div>
                </div>`;
        }
    }

    render() {
        const root = document.getElementById('sendCertsContent');
        if (!root) return;

        if (this.rows.length === 0) {
            root.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-paper-plane"></i></div>
                            <p class="empty-state__title">لا توجد شهادات للإرسال</p>
                            <p class="empty-state__msg">تظهر الشهادات هنا تلقائياً عند تسجيل حضور المسجّلين.</p>
                        </div>
                    </div>
                </div>`;
            return;
        }

        const sentCount    = this.rows.filter(c => c.certificate_sent_at).length;
        const pendingCount = this.rows.length - sentCount;

        const stats = [
            { label: 'إجمالي الشهادات', value: this.rows.length, icon: 'fa-award',       color: '#3b82f6', rgb: '59, 130, 246' },
            { label: 'مُرسلة',           value: sentCount,        icon: 'fa-circle-check', color: '#10b981', rgb: '16, 185, 129' },
            { label: 'قيد الانتظار',     value: pendingCount,     icon: 'fa-clock',        color: '#f59e0b', rgb: '245, 158, 11' },
        ];

        const activityOptions = this.uniqueActivities();
        const filters = [
            { id: 'pending', label: 'لم تُرسل بعد', count: pendingCount },
            { id: 'sent',    label: 'تم الإرسال',  count: sentCount },
            { id: 'all',     label: 'الكل',         count: this.rows.length },
        ];

        root.innerHTML = `
            <div class="stats-grid">
                ${stats.map(st => `
                    <div class="stat-card" style="--stat-color: ${st.color}; --stat-color-rgb: ${st.rgb};">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon"><i class="fa-solid ${st.icon}"></i></div>
                            <div class="stat-content">
                                <div class="stat-value">${st.value}</div>
                                <div class="stat-label">${this.escapeHtml(st.label)}</div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>

            <div class="filters-bar">
                <div class="filter-group">
                    <i class="fa-solid fa-search"></i>
                    <input type="search" id="csmSearch" class="input input-text"
                           placeholder="ابحث بالاسم أو الجوال أو رقم الشهادة…"
                           value="${this.escapeHtml(this.search)}" />
                </div>
                <select id="csmStatusFilter" class="filter-select">
                    ${filters.map(f => `
                        <option value="${f.id}" ${this.filter === f.id ? 'selected' : ''}>${this.escapeHtml(f.label)} (${f.count})</option>
                    `).join('')}
                </select>
                <select id="csmActivityFilter" class="filter-select">
                    <option value="all" ${this.activityFilter === 'all' ? 'selected' : ''}>كل الأنشطة</option>
                    ${activityOptions.map(a => `
                        <option value="${this.escapeHtml(a.id)}" ${this.activityFilter === a.id ? 'selected' : ''}>${this.escapeHtml(a.name)}</option>
                    `).join('')}
                </select>
            </div>

            <div id="csmTableWrap">${this.renderTable(this.filteredRows())}</div>
        `;

        this.attachListeners();
    }

    uniqueActivities() {
        const map = new Map();
        for (const c of this.rows) {
            if (c.activity_id && !map.has(c.activity_id)) {
                map.set(c.activity_id, { id: c.activity_id, name: c.activity_name || '—', date: c.activity_date });
            }
        }
        return Array.from(map.values()).sort((a, b) =>
            (b.date || '').localeCompare(a.date || '')
        );
    }

    filteredRows() {
        let list = this.rows;
        if (this.filter === 'pending')   list = list.filter(c => !c.certificate_sent_at);
        else if (this.filter === 'sent') list = list.filter(c =>  c.certificate_sent_at);

        if (this.activityFilter !== 'all') {
            list = list.filter(c => c.activity_id === this.activityFilter);
        }

        const q = (this.search || '').trim().toLowerCase();
        if (q) {
            list = list.filter(c =>
                (c.full_name || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.certificate_serial || '').toLowerCase().includes(q)
            );
        }
        return list;
    }

    renderTable(rows) {
        if (rows.length === 0) {
            return `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                            <p class="empty-state__title">لا توجد نتائج مطابقة</p>
                        </div>
                    </div>
                </div>`;
        }

        const trs = rows.map((c, i) => {
            const phone = c.phone
                ? `<span dir="ltr">${this.escapeHtml(c.phone)}</span>`
                : `<span class="cell-muted"><i class="fa-solid fa-minus"></i></span>`;
            const activityDate = c.activity_date
                ? new Date(c.activity_date).toLocaleDateString('ar-SA')
                : '—';
            const sendBtn = this.renderSendButton(c);
            const sentCell = this.renderSentCell(c);
            return `
            <tr>
                <td>${i + 1}</td>
                <td>
                    <div style="font-weight:600;">${this.escapeHtml(c.full_name || '—')}</div>
                    <div style="font-size:0.8rem;margin-top:0.15rem;">${phone}</div>
                </td>
                <td>
                    <div style="font-weight:600;">${this.escapeHtml(c.activity_name || '—')}</div>
                    <div style="font-size:0.8rem;color:#64748b;margin-top:0.15rem;">${this.escapeHtml(activityDate)}</div>
                </td>
                <td><span class="aa-cert-serial" data-copy-serial="${this.escapeHtml(c.certificate_serial)}" title="نسخ رابط التحقق">
                    <i class="fa-solid fa-copy"></i> ${this.escapeHtml(c.certificate_serial)}
                </span></td>
                <td>${sendBtn}</td>
                <td>${sentCell}</td>
            </tr>`;
        }).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-paper-plane"></i> الشهادات (${rows.length})</h3>
                    <button class="btn btn-success btn-sm" id="csmExportCsv" type="button">
                        <i class="fa-solid fa-file-csv"></i> تصدير CSV
                    </button>
                </div>
                <div class="card-body">
                    <div class="data-table-wrap">
                        <div class="data-table-scroll">
                            <table class="data-table data-table--striped data-table--with-index">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>الاسم / الجوال</th>
                                        <th>النشاط</th>
                                        <th>رقم الشهادة</th>
                                        <th>إرسال</th>
                                        <th>حالة الإرسال</th>
                                    </tr>
                                </thead>
                                <tbody>${trs}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSendButton(c) {
        const phone = this.normalizePhoneForWhatsapp(c.phone);
        if (!phone) {
            return `<button class="btn btn-outline btn-sm" disabled title="لا يوجد رقم جوال صالح">
                <i class="fa-brands fa-whatsapp"></i> غير متاح
            </button>`;
        }
        const msg = this.buildMessage(c);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        const label = c.certificate_sent_at ? 'إعادة الإرسال' : 'إرسال الشهادة';
        return `<a class="btn btn-success btn-sm" href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
            <i class="fa-brands fa-whatsapp"></i> ${label}
        </a>`;
    }

    renderSentCell(c) {
        if (c.certificate_sent_at) {
            const when = new Date(c.certificate_sent_at).toLocaleDateString('ar-SA');
            return `<span class="uc-badge uc-badge--success" title="تم الإرسال ${when}">
                <i class="fa-solid fa-check-circle"></i> ${this.escapeHtml(when)}
            </span>`;
        }
        return `<button type="button" class="btn btn-warning btn-sm" data-mark-cert-sent="${this.escapeHtml(c.id)}">
            <i class="fa-solid fa-check"></i> تأكيد الإرسال
        </button>`;
    }

    attachListeners() {
        const search = document.getElementById('csmSearch');
        if (search) {
            search.addEventListener('input', (e) => {
                this.search = e.target.value;
                this.refreshTable();
            });
        }
        const statusSel = document.getElementById('csmStatusFilter');
        if (statusSel) {
            statusSel.addEventListener('change', (e) => {
                this.filter = e.target.value;
                this.render();
            });
        }
        const actSel = document.getElementById('csmActivityFilter');
        if (actSel) {
            actSel.addEventListener('change', (e) => {
                this.activityFilter = e.target.value;
                this.render();
            });
        }
        document.getElementById('csmExportCsv')?.addEventListener('click', () => this.exportCsv());
        this.attachRowListeners();
    }

    attachRowListeners() {
        document.querySelectorAll('[data-mark-cert-sent]').forEach(el => {
            el.addEventListener('click', () => this.markSent(el.dataset.markCertSent, el));
        });
        document.querySelectorAll('#csmTableWrap [data-copy-serial]').forEach(el => {
            el.addEventListener('click', () => this.copyVerifyLink(el.dataset.copySerial));
        });
    }

    refreshTable() {
        const wrap = document.getElementById('csmTableWrap');
        if (wrap) wrap.innerHTML = this.renderTable(this.filteredRows());
        this.attachRowListeners();
    }

    async markSent(reservationId, btn) {
        if (!reservationId) return;
        const original = btn?.innerHTML;
        const tr = btn?.closest('tr');
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
            const sb = window.sbClient;
            const { error } = await sb.rpc('mark_certificate_sent', { p_reservation_id: reservationId });
            if (error) throw error;
            this.notifySuccess('تم تسجيل إرسال الشهادة');
            const r = this.rows.find(x => x.id === reservationId);
            if (r) r.certificate_sent_at = new Date().toISOString();
            // تحديث في المكان: يبقى الصف ظاهرًا مع فلتر "لم تُرسل بعد"
            // حتى يرى المستخدم تحوّل الزر إلى شارة "تم الإرسال" (مطابق لزر تأكيد التواصل في تبويب الحجوزات)
            if (tr && r) {
                const sendTd = tr.children[4];
                const sentTd = tr.children[5];
                if (sendTd) sendTd.innerHTML = this.renderSendButton(r);
                if (sentTd) sentTd.innerHTML = this.renderSentCell(r);
                this.attachRowListeners();
            }
            this.updateCounts();
        } catch (err) {
            console.error('CertificateSendManager: markSent error', err);
            this.notifyError(this.humanizeError(err.message || String(err)));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    updateCounts() {
        const root = document.getElementById('sendCertsContent');
        if (!root) return;
        const sentCount    = this.rows.filter(c => c.certificate_sent_at).length;
        const pendingCount = this.rows.length - sentCount;

        const values = root.querySelectorAll('.stats-grid .stat-value');
        if (values[1]) values[1].textContent = String(sentCount);
        if (values[2]) values[2].textContent = String(pendingCount);

        const sel = document.getElementById('csmStatusFilter');
        if (sel) {
            const setOpt = (id, label, count) => {
                const o = sel.querySelector(`option[value="${id}"]`);
                if (o) o.textContent = `${label} (${count})`;
            };
            setOpt('pending', 'لم تُرسل بعد', pendingCount);
            setOpt('sent',    'تم الإرسال',  sentCount);
            setOpt('all',     'الكل',         this.rows.length);
        }
    }

    exportCsv() {
        const rows = this.filteredRows();
        if (rows.length === 0) {
            this.notifyError('لا توجد بيانات للتصدير');
            return;
        }
        const headers = ['الاسم', 'الجوال', 'النشاط', 'تاريخ النشاط', 'رقم الشهادة', 'تاريخ الإصدار', 'تاريخ الإرسال', 'رابط التحميل'];
        const lines = rows.map(c => [
            c.full_name || '',
            c.phone || '',
            c.activity_name || '',
            c.activity_date ? new Date(c.activity_date).toLocaleDateString('ar-SA') : '',
            c.certificate_serial || '',
            c.attended_at ? new Date(c.attended_at).toLocaleDateString('ar-SA') : '',
            c.certificate_sent_at ? new Date(c.certificate_sent_at).toLocaleDateString('ar-SA') : '',
            this.buildDownloadUrl(c.certificate_serial),
        ]);
        this.downloadCsv('certificates_send.csv', headers, lines);
    }

    downloadCsv(filename, headers, rows) {
        const escape = (v) => {
            const s = String(v ?? '');
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ============================================
    // أدوات بناء الرسالة والروابط
    // ============================================
    buildMessage(c) {
        const downloadUrl = this.buildDownloadUrl(c.certificate_serial);
        const lines = [
            'السلام عليكم ' + (c.full_name || '') + '،',
            '',
            'نُهنئك على حضورك جلسة "' + (c.activity_name || '') + '".',
            '',
            'شهادتك جاهزة للتحميل عبر الرابط التالي:',
            downloadUrl,
            '',
            'رقم الشهادة: ' + c.certificate_serial,
            '',
            'مع تحيات نادي أدِيب',
        ];
        return lines.join('\n');
    }

    buildDownloadUrl(serial) {
        const origin = window.location.origin;
        const path = window.location.pathname;
        const base = path.replace(/\/admin\/[^/]*$/, '/');
        return `${origin}${base}activities/download-certificate.html?serial=${encodeURIComponent(serial)}`;
    }

    buildVerifyUrl(serial) {
        const origin = window.location.origin;
        const path = window.location.pathname;
        const base = path.replace(/\/admin\/[^/]*$/, '/');
        return `${origin}${base}activities/verify.html?serial=${encodeURIComponent(serial)}`;
    }

    copyVerifyLink(serial) {
        if (!serial) return;
        const url = this.buildVerifyUrl(serial);
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                this.notifySuccess('تم نسخ رابط التحقق من الشهادة');
            }).catch(() => this.fallbackCopy(url));
        } else {
            this.fallbackCopy(url);
        }
    }

    fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            this.notifySuccess('تم نسخ الرابط');
        } catch (e) {
            this.notifyError('تعذّر نسخ الرابط');
        }
        document.body.removeChild(ta);
    }

    normalizePhoneForWhatsapp(phone) {
        if (!phone) return null;
        let digits = String(phone).replace(/\D+/g, '');
        if (!digits) return null;
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.startsWith('05') && digits.length === 10) digits = '966' + digits.slice(1);
        else if (digits.startsWith('5') && digits.length === 9) digits = '966' + digits;
        if (digits.length < 8 || digits.length > 15) return null;
        return digits;
    }

    humanizeError(code) {
        const map = {
            NOT_AUTHENTICATED:      'يجب تسجيل الدخول أولًا.',
            NOT_AUTHORIZED:         'لا تملك صلاحية الوصول لهذه الصفحة.',
            RESERVATION_NOT_FOUND:  'الحجز غير موجود.',
            CERTIFICATE_NOT_ISSUED: 'لم تُصدَر الشهادة بعد.',
            CLIENT_NOT_READY:       'لم يتم تهيئة الاتصال بقاعدة البيانات.',
        };
        for (const k in map) {
            if (code && String(code).includes(k)) return map[k];
        }
        return code || 'حدث خطأ غير متوقع.';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    notifySuccess(msg) {
        if (window.toastSuccess) window.toastSuccess(msg);
        else console.log('[ok]', msg);
    }

    notifyError(msg) {
        if (window.toastError) window.toastError(msg);
        else console.error('[error]', msg);
    }
}

window.CertificateSendManager = CertificateSendManager;
