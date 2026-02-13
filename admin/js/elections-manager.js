/**
 * Elections Manager - نظام إدارة الانتخابات
 * نادي أدِيب
 */

class ElectionsManager {
    constructor() {
        this.elections = [];
        this.committees = [];
        this.currentElection = null;
        this.isAdmin = false;
        this.currentUserId = null;
        this.currentUserCommitteeId = null;
        
        this.init();
    }

    async init() {
        await this.checkPermissions();
        await this.loadCommittees();
        this.bindEvents();
    }

    async checkPermissions() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            this.currentUserId = user.id;
            
            // التحقق من صلاحيات الإدارة
            const { data: roles } = await supabase
                .from('user_roles')
                .select(`
                    role_id,
                    committee_id,
                    roles!inner(role_name)
                `)
                .eq('user_id', user.id)
                .eq('is_active', true);
            
            if (roles) {
                this.isAdmin = roles.some(r => 
                    ['club_president', 'ceo', 'hr_leader'].includes(r.roles.role_name)
                );
                
                // الحصول على لجنة المستخدم
                const committeeRole = roles.find(r => r.committee_id);
                if (committeeRole) {
                    this.currentUserCommitteeId = committeeRole.committee_id;
                }
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    }

    async loadCommittees() {
        try {
            const { data, error } = await supabase
                .from('committees')
                .select('id, committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar');
            
            if (error) throw error;
            this.committees = data || [];
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    bindEvents() {
        // زر إنشاء انتخاب جديد
        const createBtn = document.getElementById('createElectionBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateElectionModal());
        }

        // زر تحديث القائمة
        const refreshBtn = document.getElementById('refreshElectionsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadElections());
        }

        // فلتر الحالة
        const statusFilter = document.getElementById('electionsStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterElections());
        }

        // فلتر اللجنة
        const committeeFilter = document.getElementById('electionsCommitteeFilter');
        if (committeeFilter) {
            committeeFilter.addEventListener('change', () => this.filterElections());
        }
    }

    async loadElections() {
        try {
            this.showLoading();
            
            const { data, error } = await supabase
                .from('elections')
                .select(`
                    *,
                    committees!inner(committee_name_ar),
                    created_by_profile:profiles!elections_created_by_fkey(full_name),
                    winner_profile:profiles!elections_winner_id_fkey(full_name, avatar_url)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.elections = data || [];
            await this.loadElectionStats();
            this.renderElections();
            this.updateStats();
        } catch (error) {
            console.error('Error loading elections:', error);
            this.showError('حدث خطأ في تحميل الانتخابات');
        }
    }

    async loadElectionStats() {
        // تحميل إحصائيات كل انتخاب (عدد المرشحين والأصوات)
        for (const election of this.elections) {
            const { data: candidates } = await supabase
                .from('election_candidates')
                .select('id, status')
                .eq('election_id', election.id);
            
            election.candidatesCount = candidates?.filter(c => c.status === 'approved').length || 0;
            election.pendingCount = candidates?.filter(c => c.status === 'pending').length || 0;
            
            const { count: votesCount } = await supabase
                .from('election_votes')
                .select('id', { count: 'exact', head: true })
                .eq('election_id', election.id);
            
            election.votesCount = votesCount || 0;
        }
    }

    renderElections() {
        const container = document.getElementById('electionsContainer');
        if (!container) return;

        if (this.elections.length === 0) {
            container.innerHTML = `
                <div class="elections-empty">
                    <i class="fa-solid fa-box-open"></i>
                    <h3>لا توجد انتخابات</h3>
                    <p>لم يتم إنشاء أي انتخابات بعد</p>
                    ${this.isAdmin ? `
                        <button class="btn btn--primary" onclick="electionsManager.showCreateElectionModal()">
                            <i class="fa-solid fa-plus"></i>
                            إنشاء انتخاب جديد
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="elections-grid">
                ${this.elections.map(election => this.renderElectionCard(election)).join('')}
            </div>
        `;
    }

    renderElectionCard(election) {
        const statusLabels = {
            nomination: 'فترة الترشح',
            review: 'مراجعة الطلبات',
            voting: 'التصويت جارٍ',
            completed: 'مكتمل',
            cancelled: 'ملغي'
        };

        const positionLabels = {
            leader: 'قائد اللجنة',
            deputy: 'نائب القائد'
        };

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        return `
            <div class="election-card" data-election-id="${election.id}">
                <div class="election-card__header">
                    <span class="election-status election-status--${election.status}">
                        ${statusLabels[election.status]}
                    </span>
                    <h3>${election.committees.committee_name_ar}</h3>
                    <div class="election-card__position">
                        <i class="fa-solid fa-user-tie"></i>
                        ${positionLabels[election.position_type]}
                    </div>
                </div>
                <div class="election-card__body">
                    <div class="election-card__dates">
                        <div class="election-date-item">
                            <i class="fa-solid fa-calendar-plus"></i>
                            <span class="election-date-item__label">بدء الترشح:</span>
                            <span class="election-date-item__value">${formatDate(election.nomination_start_date)}</span>
                        </div>
                        <div class="election-date-item">
                            <i class="fa-solid fa-calendar-check"></i>
                            <span class="election-date-item__label">نهاية الترشح:</span>
                            <span class="election-date-item__value">${formatDate(election.nomination_end_date)}</span>
                        </div>
                        <div class="election-date-item">
                            <i class="fa-solid fa-vote-yea"></i>
                            <span class="election-date-item__label">فترة التصويت:</span>
                            <span class="election-date-item__value">${formatDate(election.voting_start_date)} - ${formatDate(election.voting_end_date)}</span>
                        </div>
                    </div>
                    <div class="election-card__stats">
                        <div class="election-stat">
                            <div class="election-stat__value">${election.candidatesCount}</div>
                            <div class="election-stat__label">مرشحين مقبولين</div>
                        </div>
                        <div class="election-stat">
                            <div class="election-stat__value">${election.votesCount}</div>
                            <div class="election-stat__label">أصوات</div>
                        </div>
                    </div>
                    ${election.pendingCount > 0 && this.isAdmin ? `
                        <div class="alert alert--warning" style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); font-size: var(--font-size-sm);">
                            <i class="fa-solid fa-clock"></i>
                            ${election.pendingCount} طلب ترشح بانتظار المراجعة
                        </div>
                    ` : ''}
                    ${election.status === 'completed' && election.winner_profile ? `
                        <div class="alert alert--success" style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm);">
                            <i class="fa-solid fa-trophy"></i>
                            الفائز: ${election.winner_profile.full_name}
                        </div>
                    ` : ''}
                </div>
                <div class="election-card__footer">
                    ${this.renderElectionActions(election)}
                </div>
            </div>
        `;
    }

    renderElectionActions(election) {
        const actions = [];

        // عرض التفاصيل للجميع
        actions.push(`
            <button class="btn btn--outline btn--outline-primary btn--sm" onclick="electionsManager.viewElection('${election.id}')">
                <i class="fa-solid fa-eye"></i>
                عرض
            </button>
        `);

        if (this.isAdmin) {
            // إدارة المرشحين
            if (election.status === 'nomination' || election.status === 'review') {
                actions.push(`
                    <button class="btn btn--outline btn--outline-secondary btn--sm" onclick="electionsManager.manageCandidates('${election.id}')">
                        <i class="fa-solid fa-users-gear"></i>
                        المرشحين
                    </button>
                `);
            }

            // تغيير الحالة
            if (election.status !== 'completed' && election.status !== 'cancelled') {
                actions.push(`
                    <button class="btn btn--outline btn--outline-warning btn--sm" onclick="electionsManager.changeStatus('${election.id}')">
                        <i class="fa-solid fa-exchange-alt"></i>
                        تغيير الحالة
                    </button>
                `);
            }

            // إلغاء الانتخاب
            if (election.status !== 'completed' && election.status !== 'cancelled') {
                actions.push(`
                    <button class="btn btn--outline btn--outline-danger btn--sm" onclick="electionsManager.cancelElection('${election.id}')">
                        <i class="fa-solid fa-ban"></i>
                        إلغاء
                    </button>
                `);
            }
        }

        // التصويت (لأعضاء اللجنة فقط)
        if (election.status === 'voting' && election.committee_id === this.currentUserCommitteeId) {
            actions.push(`
                <button class="btn btn--primary btn--sm" onclick="electionsManager.openVoting('${election.id}')">
                    <i class="fa-solid fa-vote-yea"></i>
                    التصويت
                </button>
            `);
        }

        return actions.join('');
    }

    updateStats() {
        const totalEl = document.getElementById('totalElectionsCount');
        const activeEl = document.getElementById('activeElectionsCount');
        const votingEl = document.getElementById('votingElectionsCount');
        const completedEl = document.getElementById('completedElectionsCount');

        if (totalEl) totalEl.textContent = this.elections.length;
        if (activeEl) activeEl.textContent = this.elections.filter(e => 
            ['nomination', 'review', 'voting'].includes(e.status)
        ).length;
        if (votingEl) votingEl.textContent = this.elections.filter(e => e.status === 'voting').length;
        if (completedEl) completedEl.textContent = this.elections.filter(e => e.status === 'completed').length;
    }

    filterElections() {
        const statusFilter = document.getElementById('electionsStatusFilter')?.value;
        const committeeFilter = document.getElementById('electionsCommitteeFilter')?.value;

        let filtered = [...this.elections];

        if (statusFilter) {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        if (committeeFilter) {
            filtered = filtered.filter(e => e.committee_id === parseInt(committeeFilter));
        }

        const container = document.getElementById('electionsContainer');
        if (container) {
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="elections-empty">
                        <i class="fa-solid fa-filter"></i>
                        <h3>لا توجد نتائج</h3>
                        <p>لا توجد انتخابات تطابق معايير البحث</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="elections-grid">
                        ${filtered.map(election => this.renderElectionCard(election)).join('')}
                    </div>
                `;
            }
        }
    }

    showCreateElectionModal() {
        if (!this.isAdmin) {
            this.showError('ليس لديك صلاحية لإنشاء انتخابات');
            return;
        }

        const committeeOptions = this.committees.map(c => 
            `<option value="${c.id}">${c.committee_name_ar}</option>`
        ).join('');

        const modalContent = `
            <div class="modal-header">
                <h2><i class="fa-solid fa-plus-circle"></i> إنشاء انتخاب جديد</h2>
                <button class="btn btn--icon btn--icon-sm modal-close" onclick="electionsManager.closeModal()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="createElectionForm" class="election-form-grid">
                    <div class="form-group">
                        <label for="electionCommittee">اللجنة <span class="required">*</span></label>
                        <select id="electionCommittee" class="form-control" required>
                            <option value="">اختر اللجنة</option>
                            ${committeeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="electionPosition">المنصب <span class="required">*</span></label>
                        <select id="electionPosition" class="form-control" required>
                            <option value="">اختر المنصب</option>
                            <option value="leader">قائد اللجنة</option>
                            <option value="deputy">نائب القائد</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="nominationStartDate">بداية فترة الترشح <span class="required">*</span></label>
                        <input type="datetime-local" id="nominationStartDate" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="nominationEndDate">نهاية فترة الترشح <span class="required">*</span></label>
                        <input type="datetime-local" id="nominationEndDate" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="votingStartDate">بداية فترة التصويت <span class="required">*</span></label>
                        <input type="datetime-local" id="votingStartDate" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="votingEndDate">نهاية فترة التصويت <span class="required">*</span></label>
                        <input type="datetime-local" id="votingEndDate" class="form-control" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn--outline btn--outline-secondary" onclick="electionsManager.closeModal()">
                    إلغاء
                </button>
                <button class="btn btn--primary" onclick="electionsManager.createElection()">
                    <i class="fa-solid fa-check"></i>
                    إنشاء الانتخاب
                </button>
            </div>
        `;

        this.showModal(modalContent);
    }

    async createElection() {
        const form = document.getElementById('createElectionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const committeeId = document.getElementById('electionCommittee').value;
        const positionType = document.getElementById('electionPosition').value;
        const nominationStartDate = document.getElementById('nominationStartDate').value;
        const nominationEndDate = document.getElementById('nominationEndDate').value;
        const votingStartDate = document.getElementById('votingStartDate').value;
        const votingEndDate = document.getElementById('votingEndDate').value;

        // التحقق من التواريخ
        if (new Date(nominationEndDate) <= new Date(nominationStartDate)) {
            this.showError('تاريخ نهاية الترشح يجب أن يكون بعد تاريخ البداية');
            return;
        }

        if (new Date(votingStartDate) < new Date(nominationEndDate)) {
            this.showError('تاريخ بداية التصويت يجب أن يكون بعد نهاية فترة الترشح');
            return;
        }

        if (new Date(votingEndDate) <= new Date(votingStartDate)) {
            this.showError('تاريخ نهاية التصويت يجب أن يكون بعد تاريخ البداية');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('elections')
                .insert({
                    committee_id: parseInt(committeeId),
                    position_type: positionType,
                    nomination_start_date: nominationStartDate,
                    nomination_end_date: nominationEndDate,
                    voting_start_date: votingStartDate,
                    voting_end_date: votingEndDate,
                    created_by: this.currentUserId,
                    status: 'nomination'
                })
                .select()
                .single();

            if (error) throw error;

            this.closeModal();
            this.showSuccess('تم إنشاء الانتخاب بنجاح');
            await this.loadElections();
        } catch (error) {
            console.error('Error creating election:', error);
            this.showError('حدث خطأ في إنشاء الانتخاب');
        }
    }

    async viewElection(electionId) {
        const election = this.elections.find(e => e.id === electionId);
        if (!election) return;

        try {
            // تحميل المرشحين مع الأصوات
            const { data: voteCounts } = await supabase.rpc('get_election_vote_counts', {
                p_election_id: electionId
            });

            // التحقق إذا صوّت المستخدم
            const { data: hasVoted } = await supabase.rpc('has_user_voted', {
                p_election_id: electionId
            });

            const statusLabels = {
                nomination: 'فترة الترشح',
                review: 'مراجعة الطلبات',
                voting: 'التصويت جارٍ',
                completed: 'مكتمل',
                cancelled: 'ملغي'
            };

            const positionLabels = {
                leader: 'قائد اللجنة',
                deputy: 'نائب القائد'
            };

            let candidatesHtml = '';
            if (voteCounts && voteCounts.length > 0) {
                candidatesHtml = `
                    <h4 style="margin-top: var(--spacing-lg); margin-bottom: var(--spacing-md);">
                        <i class="fa-solid fa-users"></i> المرشحون
                    </h4>
                    <div class="candidates-list">
                        ${voteCounts.map((candidate, index) => `
                            <div class="candidate-card candidate-card--approved">
                                <div class="candidate-info">
                                    <div class="candidate-name">${candidate.full_name}</div>
                                    <div class="candidate-meta">
                                        <span><i class="fa-solid fa-vote-yea"></i> ${candidate.vote_count} صوت</span>
                                    </div>
                                </div>
                                ${election.status === 'completed' && index === 0 ? `
                                    <span class="candidate-status-badge candidate-status-badge--approved">
                                        <i class="fa-solid fa-trophy"></i> الفائز
                                    </span>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                candidatesHtml = `
                    <div class="elections-empty" style="padding: var(--spacing-lg);">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>لا يوجد مرشحون مقبولون بعد</p>
                    </div>
                `;
            }

            const modalContent = `
                <div class="modal-header">
                    <h2><i class="fa-solid fa-info-circle"></i> تفاصيل الانتخاب</h2>
                    <button class="btn btn--icon btn--icon-sm modal-close" onclick="electionsManager.closeModal()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="election-details">
                        <div class="detail-row">
                            <span class="detail-label">اللجنة:</span>
                            <span class="detail-value">${election.committees.committee_name_ar}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">المنصب:</span>
                            <span class="detail-value">${positionLabels[election.position_type]}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الحالة:</span>
                            <span class="election-status election-status--${election.status}" style="position: static;">
                                ${statusLabels[election.status]}
                            </span>
                        </div>
                        ${hasVoted ? `
                            <div class="voting-already-voted" style="margin-top: var(--spacing-md);">
                                <i class="fa-solid fa-check-circle"></i>
                                <h3>لقد قمت بالتصويت</h3>
                            </div>
                        ` : ''}
                        ${candidatesHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--outline btn--outline-secondary" onclick="electionsManager.closeModal()">
                        إغلاق
                    </button>
                    ${election.status === 'voting' && election.committee_id === this.currentUserCommitteeId && !hasVoted ? `
                        <button class="btn btn--primary" onclick="electionsManager.closeModal(); electionsManager.openVoting('${electionId}');">
                            <i class="fa-solid fa-vote-yea"></i>
                            التصويت الآن
                        </button>
                    ` : ''}
                </div>
            `;

            this.showModal(modalContent, 'modal--lg');
        } catch (error) {
            console.error('Error viewing election:', error);
            this.showError('حدث خطأ في تحميل تفاصيل الانتخاب');
        }
    }

    async manageCandidates(electionId) {
        if (!this.isAdmin) return;

        try {
            const { data: candidates, error } = await supabase
                .from('election_candidates')
                .select(`
                    *,
                    member:profiles!election_candidates_member_id_fkey(full_name, avatar_url, email),
                    reviewer:profiles!election_candidates_reviewed_by_fkey(full_name)
                `)
                .eq('election_id', electionId)
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            const statusLabels = {
                pending: 'قيد المراجعة',
                approved: 'مقبول',
                rejected: 'مرفوض',
                file_deleted: 'تم حذف الملف'
            };

            let candidatesHtml = '';
            if (candidates && candidates.length > 0) {
                candidatesHtml = candidates.map(candidate => `
                    <div class="candidate-card candidate-card--${candidate.status}">
                        <img src="${candidate.member.avatar_url || '../adeeb-logo.png'}" alt="" class="candidate-avatar">
                        <div class="candidate-info">
                            <div class="candidate-name">${candidate.member.full_name}</div>
                            <div class="candidate-meta">
                                <span><i class="fa-solid fa-envelope"></i> ${candidate.member.email}</span>
                                <span><i class="fa-solid fa-calendar"></i> ${new Date(candidate.submitted_at).toLocaleDateString('ar-SA')}</span>
                            </div>
                            <span class="candidate-status-badge candidate-status-badge--${candidate.status}">
                                ${statusLabels[candidate.status]}
                            </span>
                            ${candidate.rejection_reason ? `
                                <p style="color: var(--color-danger); font-size: var(--font-size-sm); margin-top: var(--spacing-xs);">
                                    سبب الرفض: ${candidate.rejection_reason}
                                </p>
                            ` : ''}
                        </div>
                        <div class="candidate-actions">
                            ${candidate.nomination_file_url ? `
                                <a href="${candidate.nomination_file_url}" target="_blank" class="btn btn--outline btn--outline-primary btn--sm">
                                    <i class="fa-solid fa-file-pdf"></i>
                                    الملف
                                </a>
                            ` : ''}
                            ${candidate.status === 'pending' ? `
                                <button class="btn btn--success btn--sm" onclick="electionsManager.approveCandidate('${candidate.id}')">
                                    <i class="fa-solid fa-check"></i>
                                    قبول
                                </button>
                                <button class="btn btn--danger btn--sm" onclick="electionsManager.rejectCandidate('${candidate.id}')">
                                    <i class="fa-solid fa-times"></i>
                                    رفض
                                </button>
                            ` : ''}
                            ${candidate.status !== 'file_deleted' && candidate.nomination_file_url ? `
                                <button class="btn btn--outline btn--outline-warning btn--sm" onclick="electionsManager.deleteFile('${candidate.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                    حذف الملف
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                candidatesHtml = `
                    <div class="elections-empty" style="padding: var(--spacing-lg);">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>لا يوجد مرشحون بعد</p>
                    </div>
                `;
            }

            const modalContent = `
                <div class="modal-header">
                    <h2><i class="fa-solid fa-users-gear"></i> إدارة المرشحين</h2>
                    <button class="btn btn--icon btn--icon-sm modal-close" onclick="electionsManager.closeModal()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="candidates-list">
                        ${candidatesHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--outline btn--outline-secondary" onclick="electionsManager.closeModal()">
                        إغلاق
                    </button>
                </div>
            `;

            this.showModal(modalContent, 'modal--lg');
            this.currentElection = electionId;
        } catch (error) {
            console.error('Error loading candidates:', error);
            this.showError('حدث خطأ في تحميل المرشحين');
        }
    }

    async approveCandidate(candidateId) {
        try {
            const { error } = await supabase
                .from('election_candidates')
                .update({
                    status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: this.currentUserId
                })
                .eq('id', candidateId);

            if (error) throw error;

            this.showSuccess('تم قبول المرشح');
            if (this.currentElection) {
                await this.manageCandidates(this.currentElection);
            }
        } catch (error) {
            console.error('Error approving candidate:', error);
            this.showError('حدث خطأ في قبول المرشح');
        }
    }

    async rejectCandidate(candidateId) {
        const reason = prompt('أدخل سبب الرفض (اختياري):');
        
        try {
            const { error } = await supabase
                .from('election_candidates')
                .update({
                    status: 'rejected',
                    rejection_reason: reason || null,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: this.currentUserId
                })
                .eq('id', candidateId);

            if (error) throw error;

            this.showSuccess('تم رفض المرشح');
            if (this.currentElection) {
                await this.manageCandidates(this.currentElection);
            }
        } catch (error) {
            console.error('Error rejecting candidate:', error);
            this.showError('حدث خطأ في رفض المرشح');
        }
    }

    async deleteFile(candidateId) {
        if (!confirm('هل أنت متأكد من حذف ملف الترشح؟ سيتمكن المرشح من رفع ملف جديد.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('election_candidates')
                .update({
                    status: 'file_deleted',
                    nomination_file_url: null,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: this.currentUserId
                })
                .eq('id', candidateId);

            if (error) throw error;

            this.showSuccess('تم حذف الملف');
            if (this.currentElection) {
                await this.manageCandidates(this.currentElection);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showError('حدث خطأ في حذف الملف');
        }
    }

    async changeStatus(electionId) {
        const election = this.elections.find(e => e.id === electionId);
        if (!election) return;

        const statusOptions = {
            nomination: ['review', 'voting', 'cancelled'],
            review: ['nomination', 'voting', 'cancelled'],
            voting: ['completed', 'cancelled']
        };

        const statusLabels = {
            nomination: 'فترة الترشح',
            review: 'مراجعة الطلبات',
            voting: 'التصويت',
            completed: 'مكتمل',
            cancelled: 'ملغي'
        };

        const availableStatuses = statusOptions[election.status] || [];
        
        const options = availableStatuses.map(s => 
            `<option value="${s}">${statusLabels[s]}</option>`
        ).join('');

        const modalContent = `
            <div class="modal-header">
                <h2><i class="fa-solid fa-exchange-alt"></i> تغيير حالة الانتخاب</h2>
                <button class="btn btn--icon btn--icon-sm modal-close" onclick="electionsManager.closeModal()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>الحالة الحالية: <strong>${statusLabels[election.status]}</strong></p>
                <div class="form-group" style="margin-top: var(--spacing-md);">
                    <label for="newStatus">الحالة الجديدة</label>
                    <select id="newStatus" class="form-control">
                        ${options}
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn--outline btn--outline-secondary" onclick="electionsManager.closeModal()">
                    إلغاء
                </button>
                <button class="btn btn--primary" onclick="electionsManager.updateStatus('${electionId}')">
                    <i class="fa-solid fa-check"></i>
                    تحديث
                </button>
            </div>
        `;

        this.showModal(modalContent);
    }

    async updateStatus(electionId) {
        const newStatus = document.getElementById('newStatus').value;
        
        try {
            const updateData = { status: newStatus };

            // إذا كانت الحالة "مكتمل"، نحدد الفائز
            if (newStatus === 'completed') {
                const { data: voteCounts } = await supabase.rpc('get_election_vote_counts', {
                    p_election_id: electionId
                });

                if (voteCounts && voteCounts.length > 0) {
                    updateData.winner_id = voteCounts[0].member_id;
                }
            }

            const { error } = await supabase
                .from('elections')
                .update(updateData)
                .eq('id', electionId);

            if (error) throw error;

            this.closeModal();
            this.showSuccess('تم تحديث حالة الانتخاب');
            await this.loadElections();
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('حدث خطأ في تحديث الحالة');
        }
    }

    async cancelElection(electionId) {
        if (!confirm('هل أنت متأكد من إلغاء هذا الانتخاب؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('elections')
                .update({ status: 'cancelled' })
                .eq('id', electionId);

            if (error) throw error;

            this.showSuccess('تم إلغاء الانتخاب');
            await this.loadElections();
        } catch (error) {
            console.error('Error cancelling election:', error);
            this.showError('حدث خطأ في إلغاء الانتخاب');
        }
    }

    async openVoting(electionId) {
        const election = this.elections.find(e => e.id === electionId);
        if (!election) return;

        if (election.committee_id !== this.currentUserCommitteeId) {
            this.showError('لا يمكنك التصويت في انتخابات لجنة أخرى');
            return;
        }

        try {
            // التحقق إذا صوّت المستخدم
            const { data: hasVoted } = await supabase.rpc('has_user_voted', {
                p_election_id: electionId
            });

            // تحميل المرشحين مع الأصوات
            const { data: voteCounts } = await supabase.rpc('get_election_vote_counts', {
                p_election_id: electionId
            });

            // حساب الوقت المتبقي
            const endTime = new Date(election.voting_end_date);
            const now = new Date();
            const timeRemaining = endTime - now;

            if (timeRemaining <= 0) {
                this.showError('انتهت فترة التصويت');
                return;
            }

            let candidatesHtml = '';
            if (voteCounts && voteCounts.length > 0) {
                candidatesHtml = voteCounts.map(candidate => `
                    <div class="voting-candidate-card ${hasVoted ? 'voted' : ''}" 
                         data-candidate-id="${candidate.candidate_id}"
                         ${!hasVoted ? `onclick="electionsManager.selectCandidate('${candidate.candidate_id}')"` : ''}>
                        <div class="voting-candidate-info">
                            <div class="voting-candidate-name">${candidate.full_name}</div>
                        </div>
                        <div class="voting-candidate-votes">
                            <div class="voting-candidate-votes__count">${candidate.vote_count}</div>
                            <div class="voting-candidate-votes__label">صوت</div>
                        </div>
                        <div class="vote-checkbox">
                            ${hasVoted ? '<i class="fa-solid fa-check"></i>' : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                candidatesHtml = `
                    <div class="elections-empty">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>لا يوجد مرشحون للتصويت</p>
                    </div>
                `;
            }

            const formatTimeRemaining = (ms) => {
                const hours = Math.floor(ms / (1000 * 60 * 60));
                const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((ms % (1000 * 60)) / 1000);
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            };

            const modalContent = `
                <div class="modal-header">
                    <h2><i class="fa-solid fa-vote-yea"></i> التصويت</h2>
                    <button class="btn btn--icon btn--icon-sm modal-close" onclick="electionsManager.closeModal()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="voting-container">
                        <div class="voting-header">
                            <h2>${election.committees.committee_name_ar}</h2>
                            <div class="voting-timer" id="votingTimer">
                                <i class="fa-solid fa-clock"></i>
                                <span id="timerDisplay">${formatTimeRemaining(timeRemaining)}</span>
                            </div>
                        </div>
                        
                        ${hasVoted ? `
                            <div class="voting-already-voted">
                                <i class="fa-solid fa-check-circle"></i>
                                <h3>لقد قمت بالتصويت بالفعل</h3>
                                <p>شكراً لمشاركتك في العملية الانتخابية</p>
                            </div>
                        ` : ''}
                        
                        <div class="voting-candidates">
                            ${candidatesHtml}
                        </div>
                        
                        ${!hasVoted && voteCounts && voteCounts.length > 0 ? `
                            <div class="voting-submit">
                                <button class="btn btn--primary btn--lg" id="submitVoteBtn" disabled onclick="electionsManager.submitVote('${electionId}')">
                                    <i class="fa-solid fa-check"></i>
                                    تأكيد التصويت
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            this.showModal(modalContent, 'modal--lg');
            this.selectedCandidate = null;

            // بدء العد التنازلي
            if (!hasVoted) {
                this.startVotingTimer(endTime);
            }
        } catch (error) {
            console.error('Error opening voting:', error);
            this.showError('حدث خطأ في فتح صفحة التصويت');
        }
    }

    selectCandidate(candidateId) {
        // إزالة التحديد السابق
        document.querySelectorAll('.voting-candidate-card').forEach(card => {
            card.classList.remove('selected');
        });

        // تحديد المرشح الجديد
        const card = document.querySelector(`[data-candidate-id="${candidateId}"]`);
        if (card) {
            card.classList.add('selected');
            card.querySelector('.vote-checkbox').innerHTML = '<i class="fa-solid fa-check"></i>';
        }

        this.selectedCandidate = candidateId;

        // تفعيل زر التصويت
        const submitBtn = document.getElementById('submitVoteBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }

    async submitVote(electionId) {
        if (!this.selectedCandidate) {
            this.showError('الرجاء اختيار مرشح');
            return;
        }

        if (!confirm('هل أنت متأكد من تصويتك؟ لا يمكن تغيير التصويت بعد التأكيد.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('election_votes')
                .insert({
                    election_id: electionId,
                    voter_id: this.currentUserId,
                    candidate_id: this.selectedCandidate
                });

            if (error) throw error;

            this.closeModal();
            this.showSuccess('تم تسجيل صوتك بنجاح');
            await this.loadElections();
        } catch (error) {
            console.error('Error submitting vote:', error);
            if (error.code === '23505') {
                this.showError('لقد قمت بالتصويت مسبقاً');
            } else {
                this.showError('حدث خطأ في تسجيل التصويت');
            }
        }
    }

    startVotingTimer(endTime) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        const updateTimer = () => {
            const now = new Date();
            const remaining = endTime - now;

            if (remaining <= 0) {
                clearInterval(this.timerInterval);
                document.getElementById('timerDisplay').textContent = '00:00:00';
                this.closeModal();
                this.showError('انتهت فترة التصويت');
                this.loadElections();
                return;
            }

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            const display = document.getElementById('timerDisplay');
            if (display) {
                display.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };

        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    // ============================================================================
    // Modal Helpers
    // ============================================================================

    showModal(content, extraClass = '') {
        let modal = document.getElementById('electionsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'electionsModal';
            modal.className = 'modal-backdrop';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal ${extraClass}">
                ${content}
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('electionsModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    // ============================================================================
    // UI Helpers
    // ============================================================================

    showLoading() {
        const container = document.getElementById('electionsContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-3xl);">
                    <i class="fa-solid fa-spinner fa-spin fa-3x" style="color: var(--color-primary-light);"></i>
                    <p style="margin-top: var(--spacing-md); color: var(--text-muted);">جاري التحميل...</p>
                </div>
            `;
        }
    }

    showSuccess(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

// تهيئة المدير عند تحميل الصفحة
let electionsManager;
document.addEventListener('DOMContentLoaded', () => {
    // سيتم تهيئته عند الحاجة من dashboard
});

// دالة لتهيئة المدير
function initElectionsManager() {
    if (!electionsManager) {
        electionsManager = new ElectionsManager();
    }
    electionsManager.loadElections();
}
