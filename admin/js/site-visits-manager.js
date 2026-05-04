/**
 * مدير إحصائيات زيارات الموقع
 * يوفر واجهة لعرض وإدارة بيانات الزيارات
 */

class SiteVisitsManager {
    constructor(supabaseClient) {
        this.sb = supabaseClient;
        this.currentPeriod = 30;
        this.charts = {};
    }

    async checkPermissions() {
        try {
            const { data: { user } } = await this.sb.auth.getUser();
            if (!user) return false;
            const { data, error } = await this.sb.rpc('current_user_is_admin');
            if (error) return false;
            return data === true;
        } catch (error) {
            console.error('Error in checkPermissions:', error);
            return false;
        }
    }

    async getVisitStats(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb.rpc('get_visit_stats', {
                start_date: startDate.toISOString(),
                end_date: new Date().toISOString()
            });

            if (error) throw error;

            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error getting visit stats:', error);
            throw error;
        }
    }

    async getTopPages(days = 30, limit = 10) {
        try {
            const { data, error } = await this.sb.rpc('get_top_pages', {
                days_back: days,
                limit_count: limit
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting top pages:', error);
            throw error;
        }
    }

    async getVisitsByDay(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_visits_by_day', {
                days_back: days
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting visits by day:', error);
            throw error;
        }
    }

    async getDeviceStats(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_device_stats', {
                days_back: days
            });

            if (error) throw error;

            const stats = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
            if (data && data.length > 0) {
                data.forEach(item => {
                    const type = (item.device_type || 'unknown').toLowerCase();
                    if (stats[type] !== undefined) {
                        stats[type] = parseInt(item.visit_count) || 0;
                    } else {
                        stats.unknown += parseInt(item.visit_count) || 0;
                    }
                });
            }
            return stats;
        } catch (error) {
            console.error('Error getting device stats:', error);
            throw error;
        }
    }

    async getBrowserStats(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_browser_stats', {
                days_back: days
            });
            if (error) throw error;
            const stats = {};
            (data || []).forEach(item => {
                stats[item.browser_name || 'Unknown'] = parseInt(item.visit_count) || 0;
            });
            return stats;
        } catch (error) {
            console.error('Error getting browser stats:', error);
            throw error;
        }
    }

    async getTodayStats() {
        try {
            const { data, error } = await this.sb.rpc('get_today_visits_stats');
            if (error) throw error;
            if (data && data.length > 0) {
                return {
                    total: parseInt(data[0].total_visits) || 0,
                    unique: parseInt(data[0].unique_visitors) || 0
                };
            }
            return { total: 0, unique: 0 };
        } catch (error) {
            console.error('Error getting today stats:', error);
            throw error;
        }
    }

    async getWeekStats() {
        try {
            const { data, error } = await this.sb.rpc('get_week_visits_stats');
            if (error) throw error;
            if (data && data.length > 0) {
                return {
                    total: parseInt(data[0].total_visits) || 0,
                    unique: parseInt(data[0].unique_visitors) || 0
                };
            }
            return { total: 0, unique: 0 };
        } catch (error) {
            console.error('Error getting week stats:', error);
            throw error;
        }
    }

    async getMonthStats() {
        try {
            const { data, error } = await this.sb.rpc('get_month_visits_stats');
            if (error) throw error;
            if (data && data.length > 0) {
                return {
                    total: parseInt(data[0].total_visits) || 0,
                    unique: parseInt(data[0].unique_visitors) || 0
                };
            }
            return { total: 0, unique: 0 };
        } catch (error) {
            console.error('Error getting month stats:', error);
            throw error;
        }
    }

    async getCountriesStats(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_countries_stats', {
                days_back: days,
                limit_count: 10
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting countries stats:', error);
            return [];
        }
    }

    async getCitiesStats(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_cities_stats', {
                days_back: days,
                limit_count: 10
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting cities stats:', error);
            return [];
        }
    }

    async getNewVsReturning(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_new_vs_returning', { days_back: days });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting new vs returning:', error);
            return [];
        }
    }

    async getTopReferrers(days = 30, limit = 10) {
        try {
            const { data, error } = await this.sb.rpc('get_top_referrers', {
                days_back: days,
                limit_count: limit
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting top referrers:', error);
            return [];
        }
    }

    async getHeatmap(days = 30) {
        try {
            const { data, error } = await this.sb.rpc('get_visits_heatmap', { days_back: days });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting heatmap:', error);
            return [];
        }
    }

    async getExitPages(days = 30, limit = 10) {
        try {
            const { data, error } = await this.sb.rpc('get_exit_pages', {
                days_back: days,
                limit_count: limit
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting exit pages:', error);
            return [];
        }
    }

    formatNumber(num) {
        const n = Number(num) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'م';
        if (n >= 1000)    return (n / 1000).toFixed(1) + 'ألف';
        return n.toString();
    }

    formatDuration(seconds) {
        const s = Number(seconds);
        if (!Number.isFinite(s) || s <= 0) return '0 ث';
        const total = Math.floor(s);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        if (hours > 0)   return `${hours} س ${minutes} د`;
        if (minutes > 0) return `${minutes} د ${secs} ث`;
        return `${secs} ث`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    getPageName(path) {
        const pageNames = {
            '/': 'الصفحة الرئيسية',
            '/index.html': 'الصفحة الرئيسية',
            '/membership.html': 'صفحة العضوية',
            '/activities.html': 'الأنشطة والبرامج',
            '/booking.html': 'الحجز',
            '/profile.html': 'الملف الشخصي',
            '/check-in.html': 'تسجيل الحضور',
            '/eid-game.html': 'لعبة العيد',
            '/member-onboarding.html': 'استكمال بيانات العضوية',
            '/news/news.html': 'الأخبار',
            '/news/news-detail.html': 'تفاصيل خبر',
            '/surveys/survey.html': 'استبيان',
            '/constitution/constitution.html': 'الدستور',
            '/activities/my-bookings.html': 'حجوزاتي',
            '/activities/verify.html': 'التحقق من الشهادة',
            '/activities/download-certificate.html': 'تنزيل الشهادة',
            '/auth/login.html': 'تسجيل الدخول',
            '/auth/reset-password.html': 'إعادة تعيين كلمة المرور',
            '/auth/update-password.html': 'تحديث كلمة المرور',
            '/auth/confirm.html': 'تأكيد البريد',
            '/links/adeeb.html': 'روابط أديب',
        };
        return pageNames[path] || path;
    }

    createStatsCard(title, value, subtitle, icon, color = '#3d8fd6') {
        return `
            <div class="stat-card" style="--stat-color: ${color}">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${value}</div>
                        <div class="stat-label">${title}</div>
                        ${subtitle ? `<div class="stat-subtitle">${subtitle}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async renderStatsCards(containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';

            const [todayStats, weekStats, monthStats, generalStats] = await Promise.all([
                this.getTodayStats(),
                this.getWeekStats(),
                this.getMonthStats(),
                this.getVisitStats(this.currentPeriod || 30)
            ]);

            const ppSession = generalStats?.pages_per_session ? Number(generalStats.pages_per_session).toFixed(1) : '0';
            const periodDays = this.currentPeriod || 30;
            const periodLabel = periodDays === 7 ? 'آخر 7 أيام'
                : periodDays === 30 ? 'آخر 30 يوم'
                : periodDays === 90 ? 'آخر 90 يوم'
                : periodDays === 365 ? 'آخر سنة'
                : `آخر ${periodDays} يوم`;

            const cards = [
                this.createStatsCard(
                    'الزوار',
                    this.formatNumber(generalStats?.unique_visitors || 0),
                    `${this.formatNumber(generalStats?.unique_sessions || 0)} جلسة • ${periodLabel}`,
                    'fa-users',
                    '#0ea5e9'
                ),
                this.createStatsCard(
                    'مشاهدات اليوم',
                    this.formatNumber(todayStats.total),
                    `${this.formatNumber(todayStats.unique)} زائر فريد`,
                    'fa-calendar-day',
                    '#3d8fd6'
                ),
                this.createStatsCard(
                    'مشاهدات الأسبوع',
                    this.formatNumber(weekStats.total),
                    `${this.formatNumber(weekStats.unique)} زائر فريد`,
                    'fa-calendar-week',
                    '#10b981'
                ),
                this.createStatsCard(
                    'مشاهدات الشهر',
                    this.formatNumber(monthStats.total),
                    `${this.formatNumber(monthStats.unique)} زائر فريد`,
                    'fa-calendar-alt',
                    '#8b5cf6'
                ),
                this.createStatsCard(
                    'متوسط مدة المشاهدة',
                    this.formatDuration(generalStats?.avg_duration),
                    `معدل الارتداد: ${generalStats?.bounce_rate ?? 0}%`,
                    'fa-clock',
                    '#f59e0b'
                ),
                this.createStatsCard(
                    'الصفحات لكل جلسة',
                    ppSession,
                    `${this.formatNumber(generalStats?.member_visits || 0)} مشاهدة لأعضاء`,
                    'fa-layer-group',
                    '#ef4444'
                )
            ];

            container.innerHTML = cards.join('');
        } catch (error) {
            console.error('Error rendering stats cards:', error);
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل الإحصائيات</div>';
        }
    }

    async renderTopPages(containerId, days = 30) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';

            const pages = await this.getTopPages(days, 10);
            if (pages.length === 0) {
                container.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const maxVisits = Math.max(...pages.map(p => Number(p.visit_count) || 0)) || 1;
            const html = `
                <div class="top-pages-list">
                    ${pages.map((page, index) => {
                        const percentage = (Number(page.visit_count) / maxVisits) * 100;
                        return `
                            <div class="top-page-item">
                                <div class="top-page-rank">${index + 1}</div>
                                <div class="top-page-info">
                                    <h4 class="top-page-title">${this.getPageName(page.page_path)}</h4>
                                    <p class="top-page-path">${page.page_path}</p>
                                    <div class="top-page-bar">
                                        <div class="top-page-bar-fill" style="width: ${percentage.toFixed(1)}%"></div>
                                    </div>
                                </div>
                                <div class="top-page-stats">
                                    <span class="top-page-visits">${this.formatNumber(page.visit_count)}</span>
                                    <span class="top-page-label">مشاهدة</span>
                                    <span class="top-page-unique">${this.formatNumber(page.unique_visitors)} فريد</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            container.innerHTML = html;
        } catch (error) {
            console.error('Error rendering top pages:', error);
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل البيانات</div>';
        }
    }

    async renderVisitsChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const visitsData = await this.getVisitsByDay(days);
            if (visitsData.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const ordered = [...visitsData].reverse();
            const labels = ordered.map(v => this.formatDate(v.visit_date));
            const totalVisits = ordered.map(v => Number(v.total_visits) || 0);
            const uniqueVisitors = ordered.map(v => Number(v.unique_visitors) || 0);

            if (this.charts[canvasId]) this.charts[canvasId].destroy();

            this.charts[canvasId] = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'إجمالي المشاهدات',
                            data: totalVisits,
                            borderColor: '#3d8fd6',
                            backgroundColor: 'rgba(61, 143, 214, 0.1)',
                            tension: 0.4, fill: true
                        },
                        {
                            label: 'زوار فريدون',
                            data: uniqueVisitors,
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4, fill: true
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top', rtl: true,
                                  labels: { font: { family: 'Cairo, sans-serif' } } },
                        tooltip: { rtl: true, textDirection: 'rtl' }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { font: { family: 'Cairo, sans-serif' } } },
                        x: { ticks: { font: { family: 'Cairo, sans-serif' } } }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering visits chart:', error);
        }
    }

    async renderDeviceChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const deviceStats = await this.getDeviceStats(days);
            const labels = ['سطح المكتب', 'الجوال', 'التابلت', 'غير معروف'];
            const data = [
                deviceStats.desktop || 0,
                deviceStats.mobile  || 0,
                deviceStats.tablet  || 0,
                deviceStats.unknown || 0
            ];
            const colors = ['#3d8fd6', '#28a745', '#ffc107', '#6c757d'];

            if (this.charts[canvasId]) this.charts[canvasId].destroy();

            this.charts[canvasId] = new Chart(canvas, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom', rtl: true,
                                  labels: { font: { family: 'Cairo, sans-serif' }, padding: 15 } },
                        tooltip: {
                            rtl: true, textDirection: 'rtl',
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering device chart:', error);
        }
    }

    async renderCountriesChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const stats = await this.getCountriesStats(days);
            if (stats.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const labels = stats.map(c => c.country_name || c.country_code || 'غير معروف');
            const data = stats.map(c => Number(c.visit_count) || 0);
            const colors = ['#3d8fd6','#28a745','#ffc107','#dc3545','#6c757d',
                            '#17a2b8','#e83e8c','#fd7e14','#20c997','#6610f2'];

            if (this.charts[canvasId]) this.charts[canvasId].destroy();

            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'عدد المشاهدات', data, backgroundColor: colors.slice(0, data.length), borderWidth: 0 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: { rtl: true, textDirection: 'rtl',
                                   callbacks: { label: ctx => `${ctx.parsed.x} مشاهدة` } }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { font: { family: 'Cairo, sans-serif' } } },
                        y: { ticks: { font: { family: 'Cairo, sans-serif' } } }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering countries chart:', error);
        }
    }

    async renderCitiesChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const stats = await this.getCitiesStats(days);
            if (stats.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const labels = stats.map(c => c.country_name ? `${c.city} — ${c.country_name}` : c.city);
            const data = stats.map(c => Number(c.visit_count) || 0);
            const colors = ['#3d8fd6','#28a745','#ffc107','#dc3545','#6c757d',
                            '#17a2b8','#e83e8c','#fd7e14','#20c997','#6610f2'];

            if (this.charts[canvasId]) this.charts[canvasId].destroy();

            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'عدد المشاهدات', data, backgroundColor: colors.slice(0, data.length), borderWidth: 0 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: { rtl: true, textDirection: 'rtl',
                                   callbacks: { label: ctx => `${ctx.parsed.x} مشاهدة` } }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { font: { family: 'Cairo, sans-serif' } } },
                        y: { ticks: { font: { family: 'Cairo, sans-serif' } } }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering cities chart:', error);
        }
    }

    async renderNewVsReturningChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const data = await this.getNewVsReturning(days);
            if (data.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const ordered = [...data].reverse();
            const labels = ordered.map(d => this.formatDate(d.visit_date));
            const newV = ordered.map(d => Number(d.new_visitors) || 0);
            const ret  = ordered.map(d => Number(d.returning_visitors) || 0);

            if (this.charts[canvasId]) this.charts[canvasId].destroy();

            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'زوار جدد',    data: newV, backgroundColor: '#3d8fd6' },
                        { label: 'زوار عائدون', data: ret,  backgroundColor: '#28a745' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top', rtl: true,
                                  labels: { font: { family: 'Cairo, sans-serif' } } },
                        tooltip: { rtl: true, textDirection: 'rtl' }
                    },
                    scales: {
                        x: { stacked: true, ticks: { font: { family: 'Cairo, sans-serif' } } },
                        y: { stacked: true, beginAtZero: true, ticks: { font: { family: 'Cairo, sans-serif' } } }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering new vs returning chart:', error);
        }
    }

    async renderReferrersList(containerId, days = 30) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';

            const refs = await this.getTopReferrers(days, 10);
            if (refs.length === 0) {
                container.innerHTML = '<p class="no-data">لا توجد إحالات مسجلة (الدخول المباشر فقط)</p>';
                return;
            }

            const max = Math.max(...refs.map(r => Number(r.visit_count) || 0)) || 1;
            const html = `
                <div class="top-pages-list">
                    ${refs.map((r, i) => {
                        const pct = (Number(r.visit_count) / max) * 100;
                        return `
                            <div class="top-page-item">
                                <div class="top-page-rank">${i + 1}</div>
                                <div class="top-page-info">
                                    <h4 class="top-page-title">${r.referrer_host}</h4>
                                    <div class="top-page-bar">
                                        <div class="top-page-bar-fill" style="width: ${pct.toFixed(1)}%"></div>
                                    </div>
                                </div>
                                <div class="top-page-stats">
                                    <span class="top-page-visits">${this.formatNumber(r.visit_count)}</span>
                                    <span class="top-page-label">مشاهدة</span>
                                    <span class="top-page-unique">${this.formatNumber(r.unique_visitors)} فريد</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            container.innerHTML = html;
        } catch (error) {
            console.error('Error rendering referrers list:', error);
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل البيانات</div>';
        }
    }

    async renderHeatmap(containerId, days = 30) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';

            const data = await this.getHeatmap(days);
            const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

            // matrix[7][24]
            const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
            let max = 0;
            (data || []).forEach(row => {
                const d = parseInt(row.day_of_week);
                const h = parseInt(row.hour_of_day);
                const c = parseInt(row.visit_count) || 0;
                if (d >= 0 && d < 7 && h >= 0 && h < 24) {
                    matrix[d][h] = c;
                    if (c > max) max = c;
                }
            });

            if (max === 0) {
                container.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const cellHtml = (count) => {
                const intensity = count / max;
                const alpha = count === 0 ? 0.04 : (0.15 + intensity * 0.85);
                return `<td title="${count} مشاهدة" style="background: rgba(61, 143, 214, ${alpha.toFixed(2)}); padding: 6px; border: 1px solid rgba(0,0,0,0.05); text-align:center; font-size:0.75rem; color:${intensity > 0.5 ? '#fff' : '#333'};">${count || ''}</td>`;
            };

            const headers = Array.from({ length: 24 }, (_, h) => `<th style="font-size:0.7rem; padding:4px; font-weight:600;">${h}</th>`).join('');
            const rows = matrix.map((row, d) => `
                <tr>
                    <td style="font-size:0.75rem; padding:4px 8px; font-weight:600; white-space:nowrap;">${dayNames[d]}</td>
                    ${row.map(cellHtml).join('')}
                </tr>
            `).join('');

            container.innerHTML = `
                <div style="overflow-x:auto;">
                    <table style="border-collapse: collapse; width: 100%; min-width: 700px;">
                        <thead>
                            <tr>
                                <th></th>
                                ${headers}
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div style="font-size:0.75rem; color:#6c757d; margin-top:8px;">الساعات بتوقيت UTC. كلما زاد لون الخلية كانت الساعة أكثر ازدحاماً.</div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering heatmap:', error);
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل الخريطة الحرارية</div>';
        }
    }

    async renderExitPagesList(containerId, days = 30) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';

            const pages = await this.getExitPages(days, 10);
            if (pages.length === 0) {
                container.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const max = Math.max(...pages.map(p => Number(p.exit_count) || 0)) || 1;
            const html = `
                <div class="top-pages-list">
                    ${pages.map((p, i) => {
                        const pct = (Number(p.exit_count) / max) * 100;
                        return `
                            <div class="top-page-item">
                                <div class="top-page-rank">${i + 1}</div>
                                <div class="top-page-info">
                                    <h4 class="top-page-title">${this.getPageName(p.page_path)}</h4>
                                    <p class="top-page-path">${p.page_path}</p>
                                    <div class="top-page-bar">
                                        <div class="top-page-bar-fill" style="width: ${pct.toFixed(1)}%"></div>
                                    </div>
                                </div>
                                <div class="top-page-stats">
                                    <span class="top-page-visits">${this.formatNumber(p.exit_count)}</span>
                                    <span class="top-page-label">خروج</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            container.innerHTML = html;
        } catch (error) {
            console.error('Error rendering exit pages:', error);
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل البيانات</div>';
        }
    }

    async exportData(days = 30, format = 'csv') {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb.rpc('export_visits_for_admin', {
                start_date: startDate.toISOString(),
                end_date: new Date().toISOString()
            });

            if (error) throw error;
            const rows = data || [];

            if (format === 'csv') return this.exportToCSV(rows);
            if (format === 'json') return this.exportToJSON(rows);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    exportToCSV(data) {
        const headers = ['التاريخ', 'الصفحة', 'العنوان', 'الدولة', 'المدينة', 'الجهاز', 'المتصفح', 'نظام التشغيل', 'مصدر الإحالة', 'المدة (ث)', 'ارتداد'];
        const escape = (v) => {
            if (v == null) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        const rows = data.map(v => [
            new Date(v.visited_at).toLocaleString('ar-SA'),
            v.page_path,
            v.page_title || '',
            v.country_name || v.country_code || '',
            v.city || '',
            v.device_type || '',
            v.browser_name || '',
            v.os_name || '',
            v.referrer_host || '',
            v.total_seconds || 0,
            v.is_bounce ? 'نعم' : 'لا'
        ]);

        const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `site-visits-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    exportToJSON(data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `site-visits-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

window.SiteVisitsManager = SiteVisitsManager;
