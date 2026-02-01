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
            
            // السماح بالوصول لجميع المستخدمين المسجلين
            return true;
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

            const stats = {
                desktop: 0,
                mobile: 0,
                tablet: 0,
                unknown: 0
            };

            if (data && data.length > 0) {
                data.forEach(item => {
                    const type = item.device_type || 'unknown';
                    stats[type] = parseInt(item.visit_count) || 0;
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
            if (data && data.length > 0) {
                data.forEach(item => {
                    const browser = item.browser_name || 'Unknown';
                    stats[browser] = parseInt(item.visit_count) || 0;
                });
            }

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
                        ${subtitle ? `<div class="stat-subtitle" style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${subtitle}</div>` : ''}
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
                this.getVisitStats(30)
            ]);

            const cards = [
                this.createStatsCard(
                    'زيارات اليوم',
                    this.formatNumber(todayStats.total),
                    `${this.formatNumber(todayStats.unique)} زائر فريد`,
                    'fa-calendar-day',
                    '#3d8fd6'
                ),
                this.createStatsCard(
                    'زيارات الأسبوع',
                    this.formatNumber(weekStats.total),
                    `${this.formatNumber(weekStats.unique)} زائر فريد`,
                    'fa-calendar-week',
                    '#10b981'
                ),
                this.createStatsCard(
                    'زيارات الشهر',
                    this.formatNumber(monthStats.total),
                    `${this.formatNumber(monthStats.unique)} زائر فريد`,
                    'fa-calendar-alt',
                    '#8b5cf6'
                ),
                this.createStatsCard(
                    'متوسط مدة الزيارة',
                    this.formatDuration(Math.round(generalStats?.avg_duration || 0)),
                    `معدل الارتداد: ${generalStats?.bounce_rate || 0}%`,
                    'fa-clock',
                    '#f59e0b'
                )
            ];

            container.innerHTML = `<div class="stats-grid">${cards.join('')}</div>`;
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
                                        <div class="top-page-bar-fill"></div>
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

    async getCountriesStats(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('country')
                .gte('visited_at', startDate.toISOString())
                .not('country', 'is', null);

            if (error) throw error;

            // حساب عدد الزيارات لكل دولة
            const countryCounts = {};
            data.forEach(visit => {
                const country = visit.country || 'غير معروف';
                countryCounts[country] = (countryCounts[country] || 0) + 1;
            });

            // تحويل إلى مصفوفة وترتيب حسب العدد
            return Object.entries(countryCounts)
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // أعلى 10 دول
        } catch (error) {
            console.error('Error getting countries stats:', error);
            return [];
        }
    }

    async getCitiesStats(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.sb
                .from('site_visits')
                .select('city, country')
                .gte('visited_at', startDate.toISOString())
                .not('city', 'is', null);

            if (error) throw error;

            // حساب عدد الزيارات لكل مدينة
            const cityCounts = {};
            data.forEach(visit => {
                const city = visit.city || 'غير معروف';
                const country = visit.country || '';
                const key = country ? `${city}, ${country}` : city;
                cityCounts[key] = (cityCounts[key] || 0) + 1;
            });

            // تحويل إلى مصفوفة وترتيب حسب العدد
            return Object.entries(cityCounts)
                .map(([city, count]) => ({ city, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // أعلى 10 مدن
        } catch (error) {
            console.error('Error getting cities stats:', error);
            return [];
        }
    }

    async renderCountriesChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const countriesStats = await this.getCountriesStats(days);

            if (countriesStats.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const labels = countriesStats.map(c => c.country);
            const data = countriesStats.map(c => c.count);

            const colors = [
                '#3d8fd6', '#28a745', '#ffc107', '#dc3545', '#6c757d',
                '#17a2b8', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
            ];

            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'عدد الزيارات',
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            rtl: true,
                            textDirection: 'rtl',
                            callbacks: {
                                label: function(context) {
                                    return `${context.parsed.x} زيارة`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    family: 'Cairo, sans-serif'
                                }
                            }
                        },
                        y: {
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
            console.error('Error rendering countries chart:', error);
        }
    }

    async renderCitiesChart(canvasId, days = 30) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const citiesStats = await this.getCitiesStats(days);

            if (citiesStats.length === 0) {
                canvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات متاحة</p>';
                return;
            }

            const labels = citiesStats.map(c => c.city);
            const data = citiesStats.map(c => c.count);

            const colors = [
                '#3d8fd6', '#28a745', '#ffc107', '#dc3545', '#6c757d',
                '#17a2b8', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
            ];

            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }

            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'عدد الزيارات',
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            rtl: true,
                            textDirection: 'rtl',
                            callbacks: {
                                label: function(context) {
                                    return `${context.parsed.x} زيارة`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    family: 'Cairo, sans-serif'
                                }
                            }
                        },
                        y: {
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
            console.error('Error rendering cities chart:', error);
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
