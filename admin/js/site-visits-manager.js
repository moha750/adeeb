/**
 * مدير إحصائيات زيارات الموقع
 * يوفر واجهة لعرض وإدارة بيانات الزيارات
 */

class SiteVisitsManager {
    constructor(supabaseClient) {
        this.sb = supabaseClient;
        this.currentPeriod = 30; // الفترة الافتراضية 30 يوم
        this.charts = {};
    }

    async checkPermissions() {
        try {
            const { data: { user } } = await this.sb.auth.getUser();
            if (!user) return false;

            const { data, error } = await this.sb.rpc('can_view_site_visits', {
                user_id: user.id
            });

            if (error) {
                console.error('Error checking permissions:', error);
                return false;
            }

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
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('device_type')
                .gte('visited_at', startDate.toISOString());

            if (error) throw error;

            const stats = {
                desktop: 0,
                mobile: 0,
                tablet: 0,
                unknown: 0
            };

            data.forEach(visit => {
                const type = visit.device_type || 'unknown';
                stats[type] = (stats[type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting device stats:', error);
            throw error;
        }
    }

    async getBrowserStats(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('browser_name')
                .gte('visited_at', startDate.toISOString());

            if (error) throw error;

            const stats = {};
            data.forEach(visit => {
                const browser = visit.browser_name || 'Unknown';
                stats[browser] = (stats[browser] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting browser stats:', error);
            throw error;
        }
    }

    async getTodayStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('*', { count: 'exact', head: false })
                .gte('visited_at', today.toISOString());

            if (error) throw error;

            const uniqueVisitors = new Set(data.map(v => v.visitor_id)).size;

            return {
                total: data.length,
                unique: uniqueVisitors
            };
        } catch (error) {
            console.error('Error getting today stats:', error);
            throw error;
        }
    }

    async getWeekStats() {
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('*', { count: 'exact', head: false })
                .gte('visited_at', weekAgo.toISOString());

            if (error) throw error;

            const uniqueVisitors = new Set(data.map(v => v.visitor_id)).size;

            return {
                total: data.length,
                unique: uniqueVisitors
            };
        } catch (error) {
            console.error('Error getting week stats:', error);
            throw error;
        }
    }

    async getMonthStats() {
        try {
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('*', { count: 'exact', head: false })
                .gte('visited_at', monthAgo.toISOString());

            if (error) throw error;

            const uniqueVisitors = new Set(data.map(v => v.visitor_id)).size;

            return {
                total: data.length,
                unique: uniqueVisitors
            };
        } catch (error) {
            console.error('Error getting month stats:', error);
            throw error;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'م';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'ألف';
        }
        return num.toString();
    }

    formatDuration(seconds) {
        if (!seconds) return '0 ث';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours} س ${minutes} د`;
        } else if (minutes > 0) {
            return `${minutes} د ${secs} ث`;
        } else {
            return `${secs} ث`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getPageName(path) {
        const pageNames = {
            '/': 'الصفحة الرئيسية',
            '/index.html': 'الصفحة الرئيسية',
            '/membership.html': 'صفحة العضوية',
            '/news/': 'الأخبار',
            '/constitution/': 'الدستور',
            '/admin/': 'لوحة التحكم'
        };

        return pageNames[path] || path;
    }

    createStatsCard(title, value, subtitle, icon, color = 'primary') {
        return `
            <div class="stat-card stat-card--${color}">
                <div class="stat-card__icon">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="stat-card__content">
                    <h3 class="stat-card__value">${value}</h3>
                    <p class="stat-card__title">${title}</p>
                    ${subtitle ? `<p class="stat-card__subtitle">${subtitle}</p>` : ''}
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
                this.getVisitStats(30)
            ]);

            const cards = [
                this.createStatsCard(
                    'زيارات اليوم',
                    this.formatNumber(todayStats.total),
                    `${this.formatNumber(todayStats.unique)} زائر فريد`,
                    'fa-calendar-day',
                    'primary'
                ),
                this.createStatsCard(
                    'زيارات الأسبوع',
                    this.formatNumber(weekStats.total),
                    `${this.formatNumber(weekStats.unique)} زائر فريد`,
                    'fa-calendar-week',
                    'success'
                ),
                this.createStatsCard(
                    'زيارات الشهر',
                    this.formatNumber(monthStats.total),
                    `${this.formatNumber(monthStats.unique)} زائر فريد`,
                    'fa-calendar-alt',
                    'info'
                ),
                this.createStatsCard(
                    'متوسط مدة الزيارة',
                    this.formatDuration(Math.round(generalStats?.avg_duration || 0)),
                    `معدل الارتداد: ${generalStats?.bounce_rate || 0}%`,
                    'fa-clock',
                    'warning'
                )
            ];

            container.innerHTML = cards.join('');
        } catch (error) {
            console.error('Error rendering stats cards:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل الإحصائيات</div>';
            }
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

            const maxVisits = Math.max(...pages.map(p => p.visit_count));

            const html = `
                <div class="top-pages-list">
                    ${pages.map((page, index) => {
                        const percentage = (page.visit_count / maxVisits) * 100;
                        return `
                            <div class="top-page-item">
                                <div class="top-page-rank">${index + 1}</div>
                                <div class="top-page-info">
                                    <h4 class="top-page-title">${this.getPageName(page.page_path)}</h4>
                                    <p class="top-page-path">${page.page_path}</p>
                                    <div class="top-page-bar">
                                        <div class="top-page-bar-fill" style="width: ${percentage}%"></div>
                                    </div>
                                </div>
                                <div class="top-page-stats">
                                    <span class="top-page-visits">${this.formatNumber(page.visit_count)}</span>
                                    <span class="top-page-label">زيارة</span>
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
            if (container) {
                container.innerHTML = '<div class="error-message">حدث خطأ أثناء تحميل البيانات</div>';
            }
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

            visitsData.reverse();

            const labels = visitsData.map(v => this.formatDate(v.visit_date));
            const totalVisits = visitsData.map(v => v.total_visits);
            const uniqueVisitors = visitsData.map(v => v.unique_visitors);

            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'إجمالي الزيارات',
                            data: totalVisits,
                            borderColor: '#3d8fd6',
                            backgroundColor: 'rgba(61, 143, 214, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'زوار فريدون',
                            data: uniqueVisitors,
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            rtl: true,
                            labels: {
                                font: {
                                    family: 'Cairo, sans-serif'
                                }
                            }
                        },
                        tooltip: {
                            rtl: true,
                            textDirection: 'rtl'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    family: 'Cairo, sans-serif'
                                }
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    family: 'Cairo, sans-serif'
                                }
                            }
                        }
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
                deviceStats.mobile || 0,
                deviceStats.tablet || 0,
                deviceStats.unknown || 0
            ];

            const colors = ['#3d8fd6', '#28a745', '#ffc107', '#6c757d'];

            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            rtl: true,
                            labels: {
                                font: {
                                    family: 'Cairo, sans-serif'
                                },
                                padding: 15
                            }
                        },
                        tooltip: {
                            rtl: true,
                            textDirection: 'rtl',
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
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

    async exportData(days = 30, format = 'csv') {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('*')
                .gte('visited_at', startDate.toISOString())
                .order('visited_at', { ascending: false });

            if (error) throw error;

            if (format === 'csv') {
                return this.exportToCSV(data);
            } else if (format === 'json') {
                return this.exportToJSON(data);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    exportToCSV(data) {
        const headers = ['التاريخ', 'الصفحة', 'العنوان', 'الجهاز', 'المتصفح', 'نظام التشغيل', 'المدة'];
        const rows = data.map(visit => [
            new Date(visit.visited_at).toLocaleString('ar-SA'),
            visit.page_path,
            visit.page_title || '',
            visit.device_type || '',
            visit.browser_name || '',
            visit.os_name || '',
            visit.visit_duration || 0
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
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
