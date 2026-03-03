/**
 * مدير نظام الانتخابات لأدِيب
 * يدير عمليات الترشح والتصويت للمناصب القيادية
 */

class ElectionsManager {
    constructor() {
        this.supabase = window.sbClient;
        this.currentUser = null;
        this.currentUserRole = null;
        this.committees = [];
        this.elections = [];
        this.votingTimerInterval = null;
        this.listenersInitialized = false;
    }

    async init(user, userRole) {
        this.currentUser = user;
        this.currentUserRole = userRole;
        await this.loadCommittees();
        if (!this.listenersInitialized) {
            this.setupEventListeners();
            this.listenersInitialized = true;
        }
    }

    async loadCommittees() {
        try {
            const { data, error } = await this.supabase
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');
            
            if (error) throw error;
            this.committees = data || [];
            this.populateCommitteeSelect();
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    populateCommitteeSelect() {
        const select = document.getElementById('electionCommitteeSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- اختر اللجنة --</option>';
        this.committees.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.committee_name_ar}</option>`;
        });
    }

    setupEventListeners() {
        // زر فتح نافذة الانتخابات الجديدة
        document.getElementById('openNewElectionBtn')?.addEventListener('click', () => this.showOpenElectionModal());
        
        // أزرار النافذة المنبثقة
        document.getElementById('closeOpenElectionModal')?.addEventListener('click', () => this.hideOpenElectionModal());
        document.getElementById('cancelOpenElection')?.addEventListener('click', () => this.hideOpenElectionModal());
        document.getElementById('submitOpenElection')?.addEventListener('click', () => this.handleOpenElection());
        
        // تغيير اللجنة لتحميل المناصب الشاغرة
        document.getElementById('electionCommitteeSelect')?.addEventListener('change', (e) => this.loadAvailablePositions(e.target.value));

        // أزرار التحديث
        document.getElementById('refreshElectionsBtn')?.addEventListener('click', () => this.loadElectionsOpen());
        document.getElementById('refreshCandidatesBtn')?.addEventListener('click', () => this.loadCandidatesReview());
        document.getElementById('refreshVotingAdminBtn')?.addEventListener('click', () => this.loadVotingAdmin());
        document.getElementById('refreshElectionResultsBtn')?.addEventListener('click', () => this.loadElectionResults());

        // رفع ملف الترشح
        const fileZone = document.getElementById('nominationFileZone');
        const fileInput = document.getElementById('nominationFileInput');
        
        if (fileZone && fileInput) {
            fileZone.addEventListener('click', () => fileInput.click());
            fileZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileZone.style.borderColor = '#3b82f6';
                fileZone.style.background = '#eff6ff';
            });
            fileZone.addEventListener('dragleave', () => {
                fileZone.style.borderColor = '#d1d5db';
                fileZone.style.background = '';
            });
            fileZone.addEventListener('drop', (e) => {
                e.preventDefault();
                fileZone.style.borderColor = '#d1d5db';
                fileZone.style.background = '';
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }

        document.getElementById('removeSelectedFile')?.addEventListener('click', () => this.clearSelectedFile());
        document.getElementById('submitNominationBtn')?.addEventListener('click', () => this.submitNomination());
        
        // إغلاق النافذة عند النقر على الخلفية
        document.getElementById('openElectionModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'openElectionModal') {
                this.hideOpenElectionModal();
            }
        });
    }
    
    // ==================== النافذة المنبثقة ====================
    
    showOpenElectionModal() {
        const modalBackdrop = document.getElementById('openElectionModal');
        if (modalBackdrop) {
            const modalContent = modalBackdrop.querySelector('.modal');
            modalBackdrop.classList.remove('d-none');
            // استخدام setTimeout لضمان تطبيق الانتقالات بشكل صحيح
            setTimeout(() => {
                modalBackdrop.classList.add('active');
                if (modalContent) {
                    modalContent.classList.add('active');
                }
            }, 10);
            document.body.classList.add('modal-open');
            // إعادة تعيين النموذج
            document.getElementById('openElectionForm')?.reset();
            const positionSelect = document.getElementById('electionPositionSelect');
            if (positionSelect) {
                positionSelect.disabled = true;
                positionSelect.innerHTML = '<option value="">-- اختر اللجنة أولاً --</option>';
            }
            this.populateCommitteeSelect();
        }
    }
    
    hideOpenElectionModal() {
        const modalBackdrop = document.getElementById('openElectionModal');
        if (modalBackdrop) {
            const modalContent = modalBackdrop.querySelector('.modal');
            modalBackdrop.classList.remove('active');
            if (modalContent) {
                modalContent.classList.remove('active');
            }
            // الانتظار حتى انتهاء الانتقال قبل إخفاء العنصر
            setTimeout(() => {
                modalBackdrop.classList.add('d-none');
            }, 400);
            document.body.classList.remove('modal-open');
        }
    }
    
    async loadAvailablePositions(committeeId) {
        const positionSelect = document.getElementById('electionPositionSelect');
        const positionHint = document.getElementById('positionHint');
        
        if (!committeeId) {
            positionSelect.disabled = true;
            positionSelect.innerHTML = '<option value="">-- اختر اللجنة أولاً --</option>';
            if (positionHint) positionHint.textContent = 'سيتم عرض المناصب الشاغرة فقط';
            return;
        }
        
        try {
            // جلب المناصب المشغولة في هذه اللجنة
            const { data: occupiedPositions, error: posError } = await this.supabase
                .from('user_roles')
                .select('role:roles(role_name)')
                .eq('committee_id', parseInt(committeeId))
                .in('role_id', [7, 8]); // committee_leader = 7, deputy_committee_leader = 8
            
            if (posError) throw posError;
            
            // جلب الانتخابات المفتوحة لهذه اللجنة
            const { data: openElections, error: elecError } = await this.supabase
                .from('elections')
                .select('position_type')
                .eq('committee_id', parseInt(committeeId))
                .in('status', ['nomination_open', 'nomination_review', 'voting_open']);
            
            if (elecError) throw elecError;
            
            const occupiedRoles = (occupiedPositions || []).map(p => p.role?.role_name).filter(Boolean);
            const electionsInProgress = (openElections || []).map(e => e.position_type);
            
            const allPositions = [
                { value: 'committee_leader', label: 'قائد لجنة' },
                { value: 'deputy_committee_leader', label: 'نائب قائد لجنة' }
            ];
            
            const availablePositions = allPositions.filter(p => 
                !occupiedRoles.includes(p.value) && !electionsInProgress.includes(p.value)
            );
            
            positionSelect.disabled = false;
            
            if (availablePositions.length === 0) {
                positionSelect.innerHTML = '<option value="">لا توجد مناصب شاغرة</option>';
                positionSelect.disabled = true;
                if (positionHint) positionHint.textContent = 'جميع المناصب مشغولة أو لها انتخابات جارية';
                if (positionHint) positionHint.style.color = '#ef4444';
            } else {
                positionSelect.innerHTML = '<option value="">-- اختر المنصب --</option>';
                availablePositions.forEach(p => {
                    positionSelect.innerHTML += `<option value="${p.value}">${p.label}</option>`;
                });
                if (positionHint) positionHint.textContent = `${availablePositions.length} منصب شاغر`;
                if (positionHint) positionHint.style.color = '#10b981';
            }
        } catch (error) {
            console.error('Error loading positions:', error);
            positionSelect.innerHTML = '<option value="">حدث خطأ</option>';
            positionSelect.disabled = true;
        }
    }

    handleFileSelect(file) {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 10 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            this.showToast('يرجى اختيار ملف PDF أو Word فقط', 'error');
            return;
        }

        if (file.size > maxSize) {
            this.showToast('حجم الملف يتجاوز 10MB', 'error');
            return;
        }

        document.getElementById('selectedFileName').textContent = file.name;
        document.getElementById('selectedFileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('selectedFileInfo').style.display = 'block';
        document.getElementById('nominationFileZone').style.display = 'none';
    }

    clearSelectedFile() {
        document.getElementById('nominationFileInput').value = '';
        document.getElementById('selectedFileInfo').style.display = 'none';
        document.getElementById('nominationFileZone').style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ==================== قسم فتح باب الترشح ====================

    async loadElectionsOpen() {
        try {
            await this.loadStats();
            await this.loadCurrentElections();
        } catch (error) {
            console.error('Error loading elections:', error);
        }
    }

    async loadStats() {
        try {
            const { data, error } = await this.supabase
                .from('elections')
                .select('status')
                .neq('status', 'cancelled');

            if (error) throw error;

            const stats = {
                total: data.length,
                nominationOpen: data.filter(e => e.status === 'nomination_open').length,
                votingOpen: data.filter(e => e.status === 'voting_open').length,
                completed: data.filter(e => e.status === 'completed').length
            };

            document.getElementById('totalElectionsCount').textContent = stats.total;
            document.getElementById('openNominationsCount').textContent = stats.nominationOpen;
            document.getElementById('activeVotingCount').textContent = stats.votingOpen;
            document.getElementById('completedElectionsCount').textContent = stats.completed;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadCurrentElections() {
        const container = document.getElementById('currentElectionsList');
        if (!container) return;

        try {
            const { data, error } = await this.supabase
                .from('elections')
                .select(`
                    id,
                    committee_id,
                    position_type,
                    status,
                    nomination_end_date,
                    voting_start_date,
                    voting_end_date,
                    created_at,
                    created_by,
                    committee:committees(committee_name_ar),
                    creator:profiles!elections_created_by_fkey(full_name)
                `)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <p>لا توجد انتخابات حالية</p>
                    </div>`;
                return;
            }

            const cardsHtml = await Promise.all(data.map(election => this.renderElectionCard(election)));
            container.innerHTML = cardsHtml.join('');
            this.attachElectionCardListeners();
            this.initCountdownTimers();
        } catch (error) {
            console.error('Error loading elections:', error);
            container.innerHTML = '<p class="text-danger">حدث خطأ في تحميل الانتخابات</p>';
        }
    }

    async renderElectionCard(election) {
        const statusLabels = {
            'nomination_open': { text: 'الترشح مفتوح', class: 'badge-success', icon: 'fa-door-open' },
            'nomination_review': { text: 'مراجعة الطلبات', class: 'badge-warning', icon: 'fa-clipboard-check' },
            'voting_open': { text: 'التصويت مفتوح', class: 'badge-primary', icon: 'fa-check-to-slot' },
            'voting_closed': { text: 'التصويت مغلق', class: 'badge-secondary', icon: 'fa-lock' },
            'completed': { text: 'منتهية', class: 'badge-info', icon: 'fa-trophy' }
        };

        const positionLabels = {
            'committee_leader': 'قائد لجنة',
            'deputy_committee_leader': 'نائب قائد لجنة'
        };

        const status = statusLabels[election.status] || { text: election.status, class: 'badge-secondary', icon: 'fa-circle' };
        const position = positionLabels[election.position_type] || election.position_type;
        
        // جلب عدد المترشحين
        const { count: candidatesCount } = await this.supabase
            .from('election_candidates')
            .select('*', { count: 'exact', head: true })
            .eq('election_id', election.id);
        
        // تنسيق التواريخ مع الساعة والدقيقة (12 ساعة)
        const formatDateTime = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleString('ar-SA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        };
        
        const endDate = formatDateTime(election.voting_end_date);
        const createdDate = formatDateTime(election.created_at);
        const nominationEndDate = election.nomination_end_date ? formatDateTime(election.nomination_end_date) : '';

        // إضافة العداد التنازلي إذا كان الترشح مفتوحاً
        const countdownHtml = election.status === 'nomination_open' && election.nomination_end_date ? `
            <div class="nomination-countdown-wrap active" id="countdown-${election.id}">
                <div class="nomination-countdown-head">
                    <i class="fa-solid fa-clock"></i>
                    <span>الوقت المتبقي لإغلاق الترشح</span>
                </div>
                <div class="nomination-countdown-timer" data-end-date="${election.nomination_end_date}">
                    <div class="nomination-countdown-box">
                        <span class="days">0</span>
                        <small>يوم</small>
                    </div>
                    <div class="nomination-countdown-box">
                        <span class="hours">0</span>
                        <small>ساعة</small>
                    </div>
                    <div class="nomination-countdown-box">
                        <span class="minutes">0</span>
                        <small>دقيقة</small>
                    </div>
                    <div class="nomination-countdown-box">
                        <span class="seconds">0</span>
                        <small>ثانية</small>
                    </div>
                </div>
            </div>
        ` : '';

        return `
            <div class="application-card" data-election-id="${election.id}">
                ${countdownHtml}
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-avatar">
                            <i class="fa-solid fa-vote-yea"></i>
                        </div>
                        <div class="applicant-details">
                            <h4 class="applicant-name">${election.committee?.committee_name_ar || 'لجنة غير محددة'}</h4>
                            <div>
                                <span class="badge ${status.class}">
                                    <i class="fa-solid ${status.icon}"></i>
                                    ${status.text}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-user-tie"></i>
                            <div class="info-content">
                                <span class="info-label">المنصب</span>
                                <span class="info-value">${position}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-users"></i>
                            <div class="info-content">
                                <span class="info-label">عدد المترشحين</span>
                                <span class="info-value">${candidatesCount || 0}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-calendar-plus"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الإنشاء</span>
                                <span class="info-value">${createdDate}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fa-solid fa-user"></i>
                            <div class="info-content">
                                <span class="info-label">أنشأها</span>
                                <span class="info-value">${election.creator?.full_name || 'غير معروف'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="application-card-footer">
                    ${election.status === 'nomination_open' ? `
                        <button class="btn btn--warning btn--sm close-nomination-btn" data-id="${election.id}">
                            <i class="fa-solid fa-lock"></i> إغلاق الترشح
                        </button>
                        ${election.nomination_end_date ? `
                            <button class="btn btn--outline btn--outline-primary btn--sm extend-nomination-btn" data-id="${election.id}">
                                <i class="fa-solid fa-clock"></i> تعديل الوقت
                            </button>
                        ` : ''}
                    ` : ''}
                    ${election.status === 'nomination_review' ? `
                        <button class="btn btn--success btn--sm start-voting-btn" data-id="${election.id}">
                            <i class="fa-solid fa-play"></i> بدء التصويت
                        </button>
                    ` : ''}
                    ${election.status === 'voting_open' ? `
                        <button class="btn btn--primary btn--sm close-voting-btn" data-id="${election.id}">
                            <i class="fa-solid fa-stop"></i> إغلاق التصويت
                        </button>
                        ${election.voting_end_date ? `
                            <button class="btn btn--outline btn--outline-primary btn--sm extend-voting-btn" data-id="${election.id}">
                                <i class="fa-solid fa-clock"></i> تعديل الوقت
                            </button>
                        ` : ''}
                    ` : ''}
                    <button class="btn btn--outline btn--outline-danger btn--sm cancel-election-btn" data-id="${election.id}">
                        <i class="fa-solid fa-times"></i> إلغاء الانتخاب
                    </button>
                </div>
            </div>`;
    }

    attachElectionCardListeners() {
        document.querySelectorAll('.close-nomination-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeNomination(btn.dataset.id));
        });
        document.querySelectorAll('.start-voting-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startVoting(btn.dataset.id));
        });
        document.querySelectorAll('.close-voting-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeVoting(btn.dataset.id));
        });
        document.querySelectorAll('.cancel-election-btn').forEach(btn => {
            btn.addEventListener('click', () => this.cancelElection(btn.dataset.id));
        });
        document.querySelectorAll('.extend-nomination-btn').forEach(btn => {
            btn.addEventListener('click', () => this.extendNominationTime(btn.dataset.id));
        });
        document.querySelectorAll('.extend-voting-btn').forEach(btn => {
            btn.addEventListener('click', () => this.extendVotingTime(btn.dataset.id));
        });
    }

    async handleOpenElection() {
        const committeeId = document.getElementById('electionCommitteeSelect').value;
        const positionType = document.getElementById('electionPositionSelect').value;
        const nominationEndDate = document.getElementById('electionNominationEndDate').value;

        if (!committeeId || !positionType) {
            this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            // حساب تواريخ افتراضية للتصويت (7 أيام من الآن للبدء، 14 يوم للانتهاء)
            const now = new Date();
            const defaultVotingStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const defaultVotingEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

            // تحويل nominationEndDate من التوقيت المحلي إلى UTC بشكل صحيح
            let nominationEndDateUTC = null;
            if (nominationEndDate) {
                const localDate = new Date(nominationEndDate);
                nominationEndDateUTC = localDate.toISOString();
            }

            const { data, error } = await this.supabase
                .from('elections')
                .insert({
                    committee_id: parseInt(committeeId),
                    position_type: positionType,
                    nomination_end_date: nominationEndDateUTC,
                    voting_start_date: defaultVotingStart.toISOString(),
                    voting_end_date: defaultVotingEnd.toISOString(),
                    created_by: this.currentUser.id,
                    status: 'nomination_open'
                })
                .select()
                .single();

            if (error) throw error;

            await this.logActivity(data.id, 'election_opened', { position_type: positionType });
            
            this.showToast('تم فتح باب الترشح بنجاح', 'success');
            this.hideOpenElectionModal();
            await this.loadElectionsOpen();
        } catch (error) {
            console.error('Error opening election:', error);
            this.showToast('حدث خطأ أثناء فتح الانتخابات', 'error');
        }
    }

    async closeNomination(electionId) {
        const confirmed = await ModalHelper.confirm({
            title: 'إغلاق باب الترشح',
            message: 'هل أنت متأكد من إغلاق باب الترشح؟ لن يتمكن أحد من الترشح بعد ذلك.',
            type: 'warning',
            confirmText: 'نعم، إغلاق',
            cancelText: 'إلغاء'
        });
        
        if (!confirmed) return;

        try {
            const { error } = await this.supabase
                .from('elections')
                .update({ status: 'nomination_review' })
                .eq('id', electionId);

            if (error) throw error;

            await this.logActivity(electionId, 'nomination_closed', {});
            this.showToast('تم إغلاق باب الترشح', 'success');
            await this.loadElectionsOpen();
        } catch (error) {
            console.error('Error:', error);
            this.showToast('حدث خطأ', 'error');
        }
    }

    async startVoting(electionId) {
        const confirmed = await ModalHelper.confirm({
            title: 'بدء التصويت',
            message: 'هل أنت متأكد من بدء التصويت؟ سيتمكن الأعضاء من التصويت للمرشحين.',
            type: 'info',
            confirmText: 'نعم، ابدأ التصويت',
            cancelText: 'إلغاء'
        });
        
        if (!confirmed) return;

        try {
            const { error } = await this.supabase
                .from('elections')
                .update({ 
                    status: 'voting_open',
                    voting_start_date: new Date().toISOString()
                })
                .eq('id', electionId);

            if (error) throw error;

            await this.logActivity(electionId, 'voting_started', {});
            this.showToast('تم بدء التصويت', 'success');
            await this.loadElectionsOpen();
        } catch (error) {
            console.error('Error:', error);
            this.showToast('حدث خطأ', 'error');
        }
    }

    async closeVoting(electionId) {
        const confirmed = await ModalHelper.confirm({
            title: 'إغلاق التصويت',
            message: 'هل أنت متأكد من إغلاق التصويت؟ سيتم احتساب النتائج النهائية.',
            type: 'warning',
            confirmText: 'نعم، إغلاق التصويت',
            cancelText: 'إلغاء'
        });
        
        if (!confirmed) return;

        try {
            const { data: candidates, error: candError } = await this.supabase
                .from('election_candidates')
                .select('id, user_id, votes_count')
                .eq('election_id', electionId)
                .eq('status', 'approved')
                .order('votes_count', { ascending: false })
                .limit(1);

            if (candError) throw candError;

            const winnerId = candidates?.[0]?.user_id || null;

            const { error } = await this.supabase
                .from('elections')
                .update({ 
                    status: 'completed',
                    winner_id: winnerId
                })
                .eq('id', electionId);

            if (error) throw error;

            await this.logActivity(electionId, 'voting_closed', { winner_id: winnerId });
            this.showToast('تم إغلاق التصويت وإعلان النتيجة', 'success');
            await this.loadElectionsOpen();
        } catch (error) {
            console.error('Error:', error);
            this.showToast('حدث خطأ', 'error');
        }
    }

    async extendNominationTime(electionId) {
        const result = await Swal.fire({
            title: 'تعديل وقت الترشح',
            html: `
                <div style="text-align: right;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوقت الجديد لإغلاق الترشح</label>
                    <input type="datetime-local" id="newNominationEndDate" class="swal2-input" style="width: 90%;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'تحديث',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const newDate = document.getElementById('newNominationEndDate').value;
                if (!newDate) {
                    Swal.showValidationMessage('يرجى اختيار التاريخ والوقت');
                    return false;
                }
                return newDate;
            }
        });

        if (result.isConfirmed) {
            try {
                const { error } = await this.supabase
                    .from('elections')
                    .update({ nomination_end_date: new Date(result.value).toISOString() })
                    .eq('id', electionId);

                if (error) throw error;

                this.showToast('تم تحديث وقت الترشح بنجاح', 'success');
                await this.loadElections();
            } catch (error) {
                console.error('Error:', error);
                this.showToast('فشل تحديث الوقت', 'error');
            }
        }
    }

    async extendVotingTime(electionId) {
        const result = await Swal.fire({
            title: 'تعديل وقت التصويت',
            html: `
                <div style="text-align: right;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الوقت الجديد لإغلاق التصويت</label>
                    <input type="datetime-local" id="newVotingEndDate" class="swal2-input" style="width: 90%;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'تحديث',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const newDate = document.getElementById('newVotingEndDate').value;
                if (!newDate) {
                    Swal.showValidationMessage('يرجى اختيار التاريخ والوقت');
                    return false;
                }
                return newDate;
            }
        });

        if (result.isConfirmed) {
            try {
                const { error } = await this.supabase
                    .from('elections')
                    .update({ voting_end_date: new Date(result.value).toISOString() })
                    .eq('id', electionId);

                if (error) throw error;

                this.showToast('تم تحديث وقت التصويت بنجاح', 'success');
                await this.loadElections();
            } catch (error) {
                console.error('Error:', error);
                this.showToast('فشل تحديث الوقت', 'error');
            }
        }
    }

    async cancelElection(electionId) {
        const confirmed = await ModalHelper.confirm({
            title: 'إلغاء الانتخابات',
            message: 'هل أنت متأكد من إلغاء هذه الانتخابات؟ سيتم إلغاء جميع الترشيحات والأصوات المرتبطة بها.',
            type: 'danger',
            confirmText: 'نعم، إلغاء الانتخابات',
            cancelText: 'لا، تراجع'
        });
        
        if (!confirmed) return;

        try {
            const { error } = await this.supabase
                .from('elections')
                .update({ status: 'cancelled' })
                .eq('id', electionId);

            if (error) throw error;

            await this.logActivity(electionId, 'election_cancelled', {});
            this.showToast('تم إلغاء الانتخابات', 'success');
            await this.loadElectionsOpen();
        } catch (error) {
            console.error('Error:', error);
            this.showToast('حدث خطأ', 'error');
        }
    }

    // ==================== قسم مراجعة الطلبات ====================

    async loadCandidatesReview() {
        const container = document.getElementById('candidatesReviewList');
        if (!container) return;

        try {
            const { data, error } = await this.supabase
                .from('election_candidates')
                .select(`
                    *,
                    user:profiles!election_candidates_user_id_fkey(id, full_name, avatar_url),
                    election:elections(
                        id, position_type, status,
                        committee:committees(committee_name_ar)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <p>لا توجد طلبات ترشح</p>
                    </div>`;
                return;
            }

            container.innerHTML = data.map(c => this.renderCandidateCard(c)).join('');
            this.attachCandidateCardListeners();
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<p class="text-danger">حدث خطأ</p>';
        }
    }

    renderCandidateCard(candidate) {
        const statusLabels = {
            'pending': { text: 'قيد المراجعة', class: 'badge--warning' },
            'approved': { text: 'مقبول', class: 'badge--success' },
            'rejected': { text: 'مرفوض', class: 'badge--danger' },
            'file_deleted': { text: 'ملف محذوف', class: 'badge--secondary' }
        };

        const status = statusLabels[candidate.status] || { text: candidate.status, class: '' };
        const avatar = candidate.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.user?.full_name || 'U')}&background=3d8fd6&color=fff`;

        return `
            <div class="card" style="margin-bottom: 1rem;" data-candidate-id="${candidate.id}">
                <div class="card-body">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${avatar}" alt="" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <h4 style="margin: 0;">${candidate.user?.full_name || 'مستخدم'}</h4>
                                <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                                    ${candidate.election?.committee?.committee_name_ar || ''}
                                    <span class="badge ${status.class}" style="margin-right: 0.5rem;">${status.text}</span>
                                </p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <a href="${candidate.application_file_url}" target="_blank" class="btn btn--outline btn--outline-primary btn--sm">
                                <i class="fa-solid fa-file"></i> عرض الملف
                            </a>
                            ${candidate.status === 'pending' ? `
                                <button class="btn btn--success btn--sm approve-candidate-btn" data-id="${candidate.id}">
                                    <i class="fa-solid fa-check"></i> قبول
                                </button>
                                <button class="btn btn--danger btn--sm reject-candidate-btn" data-id="${candidate.id}">
                                    <i class="fa-solid fa-times"></i> رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }

    attachCandidateCardListeners() {
        document.querySelectorAll('.approve-candidate-btn').forEach(btn => {
            btn.addEventListener('click', () => this.reviewCandidate(btn.dataset.id, 'approved'));
        });
        document.querySelectorAll('.reject-candidate-btn').forEach(btn => {
            btn.addEventListener('click', () => this.reviewCandidate(btn.dataset.id, 'rejected'));
        });
    }

    async reviewCandidate(candidateId, action) {
        if (action === 'rejected') {
            // عرض نافذة منبثقة لإدخال سبب الرفض
            if (window.ModalHelper) {
                window.ModalHelper.form({
                    title: 'رفض المرشح',
                    fields: [
                        {
                            name: 'rejection_reason',
                            label: 'سبب الرفض (اختياري)',
                            type: 'textarea',
                            placeholder: 'اكتب سبب رفض المرشح... (سيظهر للمتقدم إذا تم كتابته)',
                            required: false,
                            value: ''
                        }
                    ],
                    submitText: 'رفض المرشح',
                    cancelText: 'إلغاء',
                    onSubmit: async (data) => {
                        try {
                            const { error } = await this.supabase
                                .from('election_candidates')
                                .update({ 
                                    status: 'rejected',
                                    rejection_reason: data.rejection_reason || null,
                                    reviewed_by: this.currentUser.id,
                                    reviewed_at: new Date().toISOString()
                                })
                                .eq('id', candidateId);

                            if (error) throw error;

                            this.showToast('تم رفض المرشح', 'success');
                            await this.loadCandidatesReview();
                        } catch (error) {
                            console.error('Error:', error);
                            this.showToast('حدث خطأ', 'error');
                        }
                    }
                });
            } else {
                const reason = prompt('سبب الرفض (اختياري):');
                try {
                    const { error } = await this.supabase
                        .from('election_candidates')
                        .update({ 
                            status: 'rejected',
                            rejection_reason: reason || null,
                            reviewed_by: this.currentUser.id,
                            reviewed_at: new Date().toISOString()
                        })
                        .eq('id', candidateId);

                    if (error) throw error;

                    this.showToast('تم رفض المرشح', 'success');
                    await this.loadCandidatesReview();
                } catch (error) {
                    console.error('Error:', error);
                    this.showToast('حدث خطأ', 'error');
                }
            }
            return;
        }

        const messages = {
            'approved': 'هل أنت متأكد من قبول هذا المرشح؟'
        };

        if (!confirm(messages[action])) return;

        try {
            const { error } = await this.supabase
                .from('election_candidates')
                .update({ 
                    status: action,
                    reviewed_by: this.currentUser.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', candidateId);

            if (error) throw error;

            this.showToast('تم تحديث حالة المرشح', 'success');
            await this.loadCandidatesReview();
        } catch (error) {
            console.error('Error:', error);
            this.showToast('حدث خطأ', 'error');
        }
    }

    // ==================== قسم الترشح للأعضاء ====================

    async loadNominationSection() {
        const userCommitteeId = this.currentUserRole?.committee_id;
        if (!userCommitteeId) {
            document.getElementById('noOpenElectionsMessage').style.display = 'block';
            document.getElementById('availablePositionsGrid').style.display = 'none';
            return;
        }

        try {
            // جلب جميع الانتخابات المفتوحة للترشح في لجنة المستخدم
            const { data: elections, error } = await this.supabase
                .from('elections')
                .select('*, committee:committees(committee_name_ar)')
                .eq('committee_id', userCommitteeId)
                .eq('status', 'nomination_open');

            if (error) throw error;

            // عرض جميع الانتخابات المفتوحة (حتى المنتهية) ما لم تنتقل للتصويت
            if (!elections || elections.length === 0) {
                document.getElementById('noOpenElectionsMessage').style.display = 'block';
                document.getElementById('availablePositionsGrid').style.display = 'none';
                return;
            }

            document.getElementById('noOpenElectionsMessage').style.display = 'none';
            document.getElementById('availablePositionsGrid').style.display = 'grid';

            // عرض كروت المناصب المتاحة
            await this.renderAvailablePositions(elections);

            // إعداد تحديث دوري للتحقق من انتهاء الوقت
            if (this.nominationCheckInterval) {
                clearInterval(this.nominationCheckInterval);
            }
            this.nominationCheckInterval = setInterval(async () => {
                await this.loadNominationSection();
            }, 30000); // كل 30 ثانية

        } catch (error) {
            console.error('Error:', error);
        }
    }

    async renderAvailablePositions(elections) {
        const container = document.getElementById('availablePositionsGrid');
        if (!container) return;

        const positionLabels = {
            'committee_leader': 'قائد اللجنة',
            'deputy_committee_leader': 'نائب قائد اللجنة',
            'leader': 'قائد اللجنة',
            'vice_leader': 'نائب قائد اللجنة'
        };

        let html = '';

        for (const election of elections) {
            // التحقق من وجود ترشح سابق
            const { data: existingApp } = await this.supabase
                .from('election_candidates')
                .select('*')
                .eq('election_id', election.id)
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            const positionName = positionLabels[election.position_type] || election.position_type;
            const endDate = election.nomination_end_date ? new Date(election.nomination_end_date).toLocaleString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : 'غير محدد';

            // حساب الوقت المتبقي باستخدام countdown-timer.css
            let timeRemainingHtml = '';
            let nominationEnded = false;
            if (election.nomination_end_date) {
                const now = new Date();
                const end = new Date(election.nomination_end_date);
                const diff = end - now;
                
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    
                    timeRemainingHtml = `
                        <div class="nomination-countdown-wrap active" data-end-date="${election.nomination_end_date}">
                            <div class="nomination-countdown-head">
                                <i class="fa-solid fa-clock"></i>
                                <span>الوقت المتبقي لإغلاق الترشح</span>
                            </div>
                            <div class="nomination-countdown-timer">
                                <div class="nomination-countdown-box">
                                    <span class="days">${days}</span>
                                    <small>يوم</small>
                                </div>
                                <div class="nomination-countdown-box">
                                    <span class="hours">${hours}</span>
                                    <small>ساعة</small>
                                </div>
                                <div class="nomination-countdown-box">
                                    <span class="minutes">${minutes}</span>
                                    <small>دقيقة</small>
                                </div>
                                <div class="nomination-countdown-box">
                                    <span class="seconds">${seconds}</span>
                                    <small>ثانية</small>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    nominationEnded = true;
                    timeRemainingHtml = `
                        <div class="alert" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #f59e0b; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; text-align: center;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #92400e; font-weight: 600;">
                                <i class="fa-solid fa-clock"></i>
                                <span>انتهت فترة الترشح لهذا المنصب</span>
                            </div>
                            <p style="margin: 0.5rem 0 0; color: #78350f; font-size: 0.875rem;">سيتم الانتقال لمرحلة التصويت قريباً</p>
                        </div>
                    `;
                }
            }

            html += `
                <div class="position-card" data-election-id="${election.id}">
                    <div class="position-card-header">
                        <div class="position-icon">
                            <i class="fa-solid ${election.position_type === 'committee_leader' || election.position_type === 'leader' ? 'fa-crown' : 'fa-star'}"></i>
                        </div>
                        <h3 class="position-title">${positionName}</h3>
                    </div>
                    <div class="position-card-body">
                        ${timeRemainingHtml}
                        <div class="position-info">
                            <div class="position-info-item">
                                <i class="fa-solid fa-users"></i>
                                <span>${election.committee?.committee_name_ar || 'غير محدد'}</span>
                            </div>
                            <div class="position-info-item">
                                <i class="fa-solid fa-calendar-xmark"></i>
                                <span>ينتهي: ${endDate}</span>
                            </div>
                        </div>
                        ${existingApp ? `
                            <div class="position-status">
                                <div class="status-badge status-${existingApp.status}">
                                    <i class="fa-solid ${existingApp.status === 'pending' ? 'fa-clock' : existingApp.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                    ${existingApp.status === 'pending' ? 'قيد المراجعة' : existingApp.status === 'approved' ? 'تم القبول' : 'تم الرفض'}
                                </div>
                            </div>
                        ` : nominationEnded ? `
                            <button class="btn btn--secondary btn--block" disabled>
                                <i class="fa-solid fa-lock"></i>
                                انتهت فترة الترشح
                            </button>
                        ` : `
                            <button class="btn btn--primary btn--block nominate-btn" data-election-id="${election.id}">
                                <i class="fa-solid fa-paper-plane"></i>
                                ترشح لهذا المنصب
                            </button>
                        `}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // تحديث العدادات التنازلية كل ثانية
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
        }
        this.timerUpdateInterval = setInterval(() => {
            document.querySelectorAll('.nomination-countdown-wrap').forEach(timer => {
                const endDate = new Date(timer.dataset.endDate);
                const now = new Date();
                const diff = endDate - now;
                
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    
                    const daysSpan = timer.querySelector('.days');
                    const hoursSpan = timer.querySelector('.hours');
                    const minutesSpan = timer.querySelector('.minutes');
                    const secondsSpan = timer.querySelector('.seconds');
                    
                    if (daysSpan) daysSpan.textContent = days;
                    if (hoursSpan) hoursSpan.textContent = hours;
                    if (minutesSpan) minutesSpan.textContent = minutes;
                    if (secondsSpan) secondsSpan.textContent = seconds;
                } else {
                    timer.classList.remove('active');
                }
            });
        }, 1000); // كل ثانية

        // إضافة مستمعي الأحداث لأزرار الترشح
        document.querySelectorAll('.nominate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const electionId = e.target.closest('.nominate-btn').dataset.electionId;
                const election = elections.find(el => el.id === electionId);
                this.showNominationForm(election);
            });
        });
    }

    showNominationForm(election) {
        this.currentElection = election;
        
        const positionLabels = {
            'committee_leader': 'قائد اللجنة',
            'deputy_committee_leader': 'نائب قائد اللجنة',
            'leader': 'قائد اللجنة',
            'vice_leader': 'نائب قائد اللجنة'
        };

        const content = `
            <div class="nomination-form-modal">
                <h3 style="margin-bottom: 1rem; color: #1f2937;">
                    <i class="fa-solid fa-file-upload"></i>
                    الترشح لمنصب ${positionLabels[election.position_type] || election.position_type}
                </h3>
                
                <div style="background: #eff6ff; border-right: 4px solid #3b82f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                    <p style="margin: 0; color: #1e40af; font-size: 0.9rem;">
                        <i class="fa-solid fa-info-circle"></i>
                        يرجى رفع ملف يحتوي على رؤيتك وخطتك للجنة. الملفات المقبولة: PDF, Word, PowerPoint
                    </p>
                </div>

                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">ملف الترشح <span style="color: #ef4444;">*</span></label>
                    <div class="file-upload-zone-modal" id="nominationFileZoneModal" style="border: 2px dashed #d1d5db; border-radius: 0.75rem; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-cloud-upload-alt" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                        <p style="margin-bottom: 0.5rem; color: #374151;">اسحب الملف هنا أو اضغط للاختيار</p>
                        <small style="color: #6b7280;">PDF, DOC, DOCX, PPT, PPTX - الحد الأقصى 10MB</small>
                        <input type="file" id="nominationFileInputModal" accept=".pdf,.doc,.docx,.ppt,.pptx" style="display: none;">
                    </div>
                    <div id="selectedFileInfoModal" style="display: none; margin-top: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fa-solid fa-file-pdf" style="font-size: 1.5rem; color: #ef4444;"></i>
                            <div style="flex: 1;">
                                <p id="selectedFileNameModal" style="margin: 0; font-weight: 500;"></p>
                                <small id="selectedFileSizeModal" style="color: #6b7280;"></small>
                            </div>
                            <button type="button" class="btn btn--icon btn--icon-sm" id="removeSelectedFileModal">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        Swal.fire({
            title: 'تقديم طلب الترشح',
            html: content,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> تقديم الطلب',
            cancelButtonText: 'إلغاء',
            width: '600px',
            didOpen: () => {
                const fileZone = document.getElementById('nominationFileZoneModal');
                const fileInput = document.getElementById('nominationFileInputModal');
                let selectedFile = null;

                fileZone.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length) {
                        selectedFile = e.target.files[0];
                        document.getElementById('selectedFileInfoModal').style.display = 'block';
                        document.getElementById('selectedFileNameModal').textContent = selectedFile.name;
                        document.getElementById('selectedFileSizeModal').textContent = (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB';
                    }
                });

                document.getElementById('removeSelectedFileModal')?.addEventListener('click', () => {
                    selectedFile = null;
                    fileInput.value = '';
                    document.getElementById('selectedFileInfoModal').style.display = 'none';
                });

                // حفظ الملف المحدد في الكائن
                this.selectedNominationFile = null;
                fileInput.addEventListener('change', () => {
                    this.selectedNominationFile = fileInput.files[0];
                });
            },
            preConfirm: () => {
                if (!this.selectedNominationFile) {
                    Swal.showValidationMessage('يرجى رفع ملف الترشح');
                    return false;
                }
                return true;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await this.submitNominationForElection(election.id, this.selectedNominationFile);
            }
        });
    }

    async submitNominationForElection(electionId, file) {
        // التحقق من صلاحية الانتخاب وعدم انتهاء الوقت
        const { data: election, error: electionError } = await this.supabase
            .from('elections')
            .select('nomination_end_date, status')
            .eq('id', electionId)
            .single();

        if (electionError || !election) {
            await Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'لم يتم العثور على الانتخاب',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        // التحقق من انتهاء وقت الترشح
        if (election.nomination_end_date) {
            const now = new Date();
            const endDate = new Date(election.nomination_end_date);
            if (endDate <= now) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'انتهى وقت الترشح',
                    text: 'عذراً، لقد انتهى الوقت المحدد لتقديم طلبات الترشح',
                    confirmButtonText: 'حسناً'
                });
                await this.loadNominationSection();
                return;
            }
        }

        const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'odp', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            await Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'نوع الملف غير مدعوم',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        const fileName = `${this.currentUser.id}_${Date.now()}.${fileExtension}`;

        try {
            Swal.fire({
                title: 'جاري رفع الملف...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('election-applications')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = this.supabase.storage
                .from('election-applications')
                .getPublicUrl(fileName);

            const { error: insertError } = await this.supabase
                .from('election_candidates')
                .insert({
                    election_id: electionId,
                    user_id: this.currentUser.id,
                    application_file_url: urlData.publicUrl,
                    application_file_name: file.name,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            await this.logActivity(electionId, 'nomination_submitted', { user_id: this.currentUser.id });

            await Swal.fire({
                icon: 'success',
                title: 'تم تقديم طلبك بنجاح! 🎉',
                html: `
                    <div style="text-align: center; padding: 1rem;">
                        <p style="font-size: 1.1rem; margin-bottom: 1rem; color: #10b981; font-weight: 600;">تم استلام طلب ترشحك بنجاح!</p>
                        <p style="margin-bottom: 1rem; color: #6b7280;">سيتم مراجعة طلبك من قبل الإدارة، وعند القبول ستدخل السباق الانتخابي.</p>
                        <div style="background: #f0fdf4; border-right: 4px solid #10b981; padding: 1rem; border-radius: 0.5rem; margin-top: 1.5rem;">
                            <p style="margin: 0; color: #059669; font-weight: 500;">🌟 نتمنى لك التوفيق والفوز في الانتخابات!</p>
                        </div>
                    </div>
                `,
                confirmButtonText: 'حسناً'
            });

            await this.loadNominationSection();
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تقديم الطلب',
                confirmButtonText: 'حسناً'
            });
        }
    }

    renderNominationCountdown(election) {
        const countdownContainer = document.getElementById('nominationCountdownContainer');
        if (!countdownContainer) return;

        if (election.nomination_end_date) {
            countdownContainer.innerHTML = `
                <div class="nomination-countdown-wrap active" style="margin-bottom: 1.5rem;">
                    <div class="nomination-countdown-head">
                        <i class="fa-solid fa-clock"></i>
                        <span>الوقت المتبقي لإغلاق الترشح</span>
                    </div>
                    <div class="nomination-countdown-timer" data-end-date="${election.nomination_end_date}">
                        <div class="nomination-countdown-box">
                            <span class="days">0</span>
                            <small>يوم</small>
                        </div>
                        <div class="nomination-countdown-box">
                            <span class="hours">0</span>
                            <small>ساعة</small>
                        </div>
                        <div class="nomination-countdown-box">
                            <span class="minutes">0</span>
                            <small>دقيقة</small>
                        </div>
                        <div class="nomination-countdown-box">
                            <span class="seconds">0</span>
                            <small>ثانية</small>
                        </div>
                    </div>
                </div>
            `;
            this.initCountdownTimers();
        } else {
            countdownContainer.innerHTML = '';
        }
    }

    renderNominationStatus(application) {
        const container = document.getElementById('nominationStatusContent');
        const statusConfig = {
            'pending': { icon: 'fa-clock', color: '#f59e0b', text: 'طلبك قيد المراجعة' },
            'approved': { icon: 'fa-check-circle', color: '#10b981', text: 'تم قبول ترشحك! أنت الآن في السباق الانتخابي' },
            'rejected': { icon: 'fa-times-circle', color: '#ef4444', text: 'تم رفض طلب ترشحك' },
            'file_deleted': { icon: 'fa-redo', color: '#6b7280', text: 'تم حذف ملفك. يمكنك التقديم مرة أخرى' }
        };

        const status = statusConfig[application.status] || statusConfig['pending'];

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: ${status.color}15; border-radius: 0.5rem; border-right: 4px solid ${status.color};">
                <i class="fa-solid ${status.icon}" style="font-size: 2rem; color: ${status.color};"></i>
                <div>
                    <h4 style="margin: 0; color: ${status.color};">${status.text}</h4>
                    ${application.rejection_reason ? `<p style="margin: 0.5rem 0 0 0; color: #6b7280;">السبب: ${application.rejection_reason}</p>` : ''}
                </div>
            </div>`;

        if (application.status === 'file_deleted') {
            document.getElementById('nominationFormCard').style.display = 'block';
        }
    }

    async submitNomination() {
        const fileInput = document.getElementById('nominationFileInput');
        if (!fileInput.files.length) {
            this.showToast('يرجى اختيار ملف الترشح', 'error');
            return;
        }

        if (!this.currentElection) {
            this.showToast('لا يوجد انتخابات مفتوحة', 'error');
            return;
        }

        const file = fileInput.files[0];
        // الملفات المدعومة: PDF, Word, PowerPoint, Text, Images
        const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'odp', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            this.showToast('نوع الملف غير مدعوم. الأنواع المدعومة: PDF, Word, PowerPoint, Text, Images', 'error');
            return;
        }
        const fileName = `${this.currentUser.id}_${Date.now()}.${fileExtension}`;

        try {
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('election-applications')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = this.supabase.storage
                .from('election-applications')
                .getPublicUrl(fileName);

            const { error: insertError } = await this.supabase
                .from('election_candidates')
                .insert({
                    election_id: this.currentElection.id,
                    user_id: this.currentUser.id,
                    application_file_url: urlData.publicUrl,
                    application_file_name: file.name,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            await this.logActivity(this.currentElection.id, 'nomination_submitted', { user_id: this.currentUser.id });

            if (window.ModalHelper) {
                window.ModalHelper.show({
                    title: 'تم تقديم طلبك بنجاح! 🎉',
                    html: `
                        <div style="text-align: center; padding: 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                            <p style="font-size: 1.1rem; margin-bottom: 1rem; color: #10b981; font-weight: 600;">تم استلام طلب ترشحك بنجاح!</p>
                            <p style="margin-bottom: 1rem; color: #6b7280;">سيتم مراجعة طلبك من قبل الإدارة، وعند القبول ستدخل السباق الانتخابي.</p>
                            <div style="background: #f0fdf4; border-right: 4px solid #10b981; padding: 1rem; border-radius: 0.5rem; margin-top: 1.5rem;">
                                <p style="margin: 0; color: #059669; font-weight: 500;">🌟 نتمنى لك التوفيق والفوز في الانتخابات!</p>
                            </div>
                        </div>
                    `,
                    type: 'success',
                    size: 'md'
                });
            } else {
                this.showToast('تم تقديم طلب الترشح بنجاح', 'success');
            }

            await this.loadNominationSection();
        } catch (error) {
            console.error('Error:', error);
            this.showToast('حدث خطأ أثناء تقديم الطلب', 'error');
        }
    }

    // ==================== قسم التصويت للأعضاء ====================

    async loadVotingSection() {
        const userCommitteeId = this.currentUserRole?.committee_id;
        if (!userCommitteeId) {
            document.getElementById('noOpenVotingMessage').style.display = 'block';
            document.getElementById('votingCandidatesContainer').style.display = 'none';
            document.getElementById('votingTimerCard').style.display = 'none';
            return;
        }

        try {
            const { data: election, error } = await this.supabase
                .from('elections')
                .select('*')
                .eq('committee_id', userCommitteeId)
                .eq('status', 'voting_open')
                .single();

            if (error || !election) {
                document.getElementById('noOpenVotingMessage').style.display = 'block';
                document.getElementById('votingCandidatesContainer').style.display = 'none';
                document.getElementById('votingTimerCard').style.display = 'none';
                return;
            }

            document.getElementById('noOpenVotingMessage').style.display = 'none';
            document.getElementById('votingCandidatesContainer').style.display = 'block';
            document.getElementById('votingTimerCard').style.display = 'block';

            this.startVotingTimer(election.voting_end_date);
            await this.loadVotingCandidates(election.id);
            await this.checkUserVote(election.id);

            this.currentElection = election;
        } catch (error) {
            console.error('Error:', error);
        }
    }

startVotingTimer(endDate) {
    if (this.votingTimerInterval) clearInterval(this.votingTimerInterval);

    const updateTimer = () => {
        const now = new Date().getTime();
        const end = new Date(endDate).getTime();
        const diff = end - now;

        if (diff <= 0) {
            document.getElementById('votingTimerCard').style.display = 'none';
            clearInterval(this.votingTimerInterval);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('votingDays').textContent = days.toString().padStart(2, '0');
        document.getElementById('votingHours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('votingMinutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('votingSeconds').textContent = seconds.toString().padStart(2, '0');
    };

    updateTimer();
    this.votingTimerInterval = setInterval(updateTimer, 1000);
}

    async loadVotingCandidates(electionId) {
        const container = document.getElementById('votingCandidatesList');
        if (!container) return;

        try {
            const { data, error } = await this.supabase
                .from('election_candidates')
                .select(`
                    *,
                    user:profiles!election_candidates_user_id_fkey(id, full_name, avatar_url)
                `)
                .eq('election_id', electionId)
                .eq('status', 'approved')
                .order('votes_count', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="text-center">لا يوجد مرشحون</p>';
                return;
            }

            container.innerHTML = data.map(c => this.renderVotingCandidateCard(c)).join('');
            this.attachVotingListeners();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    renderVotingCandidateCard(candidate) {
        const avatar = candidate.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.user?.full_name || 'U')}&background=3d8fd6&color=fff`;

        return `
            <div class="card" style="margin-bottom: 1rem; text-align: center; padding: 1.5rem;" data-candidate-id="${candidate.id}">
                <img src="${avatar}" alt="" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 1rem;">
                <h4 style="margin: 0 0 0.5rem 0;">${candidate.user?.full_name || 'مرشح'}</h4>
                <p style="margin: 0 0 1rem 0; color: #6b7280;">
                    <i class="fa-solid fa-chart-simple"></i> ${candidate.votes_count} صوت
                </p>
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <a href="${candidate.application_file_url}" target="_blank" class="btn btn--outline btn--outline-primary btn--sm">
                        <i class="fa-solid fa-file"></i> ملف الترشح
                    </a>
                    <button class="btn btn--primary btn--sm vote-btn" data-id="${candidate.id}" data-name="${candidate.user?.full_name}">
                        <i class="fa-solid fa-vote-yea"></i> صوّت
                    </button>
                </div>
            </div>`;
    }

    attachVotingListeners() {
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', () => this.castVote(btn.dataset.id, btn.dataset.name));
        });
    }

    async checkUserVote(electionId) {
        try {
            const { data, error } = await this.supabase
                .from('election_votes')
                .select('*, candidate:election_candidates(user:profiles!election_candidates_user_id_fkey(full_name))')
                .eq('election_id', electionId)
                .eq('voter_id', this.currentUser.id)
                .single();

            if (data) {
                document.getElementById('userVoteStatusCard').style.display = 'block';
                document.getElementById('votedForName').textContent = data.candidate?.user?.full_name || 'مرشح';
                document.querySelectorAll('.vote-btn').forEach(btn => {
                    btn.disabled = true;
                    btn.classList.remove('btn--primary');
                    btn.classList.add('btn--secondary');
                });
            }
        } catch (error) {
            // لم يصوت بعد
        }
    }

    async castVote(candidateId, candidateName) {
        if (!confirm(`هل أنت متأكد من التصويت لـ ${candidateName}؟`)) return;

        try {
            const { error } = await this.supabase
                .from('election_votes')
                .insert({
                    election_id: this.currentElection.id,
                    voter_id: this.currentUser.id,
                    candidate_id: candidateId
                });

            if (error) throw error;

            await this.logActivity(this.currentElection.id, 'vote_cast', { candidate_id: candidateId });
            this.showToast('تم تسجيل صوتك بنجاح', 'success');
            await this.loadVotingSection();
        } catch (error) {
            console.error('Error:', error);
            if (error.code === '23505') {
                this.showToast('لقد صوّت مسبقاً', 'error');
            } else {
                this.showToast('حدث خطأ أثناء التصويت', 'error');
            }
        }
    }

    // ==================== قسم النتائج ====================

    async loadElectionResults() {
        const container = document.getElementById('electionResultsList');
        if (!container) return;

        try {
            const { data, error } = await this.supabase
                .from('elections')
                .select(`
                    *,
                    committee:committees(committee_name_ar),
                    winner:profiles!elections_winner_id_fkey(full_name, avatar_url),
                    candidates:election_candidates(
                        id, votes_count, status,
                        user:profiles!election_candidates_user_id_fkey(full_name, avatar_url)
                    )
                `)
                .in('status', ['completed', 'voting_closed'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        <p>لا توجد نتائج للعرض</p>
                    </div>`;
                return;
            }

            container.innerHTML = data.map(e => this.renderResultCard(e)).join('');
        } catch (error) {
            console.error('Error:', error);
        }
    }

    renderResultCard(election) {
        const positionLabels = {
            'committee_leader': 'قائد لجنة',
            'deputy_committee_leader': 'نائب قائد لجنة'
        };

        const approvedCandidates = (election.candidates || [])
            .filter(c => c.status === 'approved')
            .sort((a, b) => b.votes_count - a.votes_count);

        const totalVotes = approvedCandidates.reduce((sum, c) => sum + c.votes_count, 0);

        return `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 style="margin: 0;">
                        <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i>
                        ${election.committee?.committee_name_ar} - ${positionLabels[election.position_type] || election.position_type}
                    </h3>
                </div>
                <div class="card-body">
                    ${election.winner ? `
                        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #fef3c7; border-radius: 0.5rem; margin-bottom: 1rem;">
                            <i class="fa-solid fa-crown" style="font-size: 2rem; color: #f59e0b;"></i>
                            <div>
                                <p style="margin: 0; color: #92400e; font-weight: 600;">الفائز</p>
                                <h4 style="margin: 0;">${election.winner.full_name}</h4>
                            </div>
                        </div>
                    ` : ''}
                    <p style="margin-bottom: 1rem; color: #6b7280;">إجمالي الأصوات: ${totalVotes}</p>
                    <div>
                        ${approvedCandidates.map((c, i) => `
                            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: ${i === 0 ? '#fef3c7' : '#f9fafb'}; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                                <span style="font-weight: bold; color: ${i === 0 ? '#f59e0b' : '#6b7280'};">#${i + 1}</span>
                                <span style="flex: 1;">${c.user?.full_name || 'مرشح'}</span>
                                <span style="font-weight: 600;">${c.votes_count} صوت</span>
                                <span style="color: #6b7280;">(${totalVotes > 0 ? Math.round(c.votes_count / totalVotes * 100) : 0}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    }

    // ==================== أدوات مساعدة ====================

    initCountdownTimers() {
        const timers = document.querySelectorAll('.nomination-countdown-timer, .voting-countdown-timer');
        
        timers.forEach(timer => {
            const endDate = new Date(timer.dataset.endDate);
            
            const updateTimer = () => {
                const now = new Date();
                const diff = endDate - now;
                
                if (diff <= 0) {
                    timer.innerHTML = '<div style="text-align: center; color: #fff; padding: 1rem;">انتهى الوقت</div>';
                    return;
                }
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                const daysEl = timer.querySelector('.days');
                const hoursEl = timer.querySelector('.hours');
                const minutesEl = timer.querySelector('.minutes');
                const secondsEl = timer.querySelector('.seconds');
                
                if (daysEl) daysEl.textContent = days;
                if (hoursEl) hoursEl.textContent = hours;
                if (minutesEl) minutesEl.textContent = minutes;
                if (secondsEl) secondsEl.textContent = seconds;
            };
            
            updateTimer();
            setInterval(updateTimer, 1000);
        });
    }

    async logActivity(electionId, action, details) {
        try {
            await this.supabase
                .from('election_activity_log')
                .insert({
                    election_id: electionId,
                    user_id: this.currentUser?.id,
                    action: action,
                    details: details
                });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    showToast(message, type = 'info') {
        if (window.Toast) {
            window.Toast.show({ message, type });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

window.ElectionsManager = new ElectionsManager();
