/**
 * مدير الانتخابات - إدارة انتخابات قادة اللجان
 * Elections Manager - Committee Leaders Elections Management
 */

(function() {
    'use strict';

    // =====================================================
    // المتغيرات العامة
    // =====================================================
    
    let currentUser = null;
    let currentElections = [];
    let currentCandidates = [];
    let currentVotes = [];
    let availableCommittees = [];
    let selectedElection = null;
    let selectedCandidate = null;

    // =====================================================
    // عناصر DOM - قائمة الانتخابات
    // =====================================================
    
    const electionsSection = document.getElementById('electionsSection');
    const electionsTable = document.getElementById('electionsTable');
    const electionsTableBody = document.getElementById('electionsTableBody');
    const createElectionBtn = document.getElementById('createElectionBtn');
    const refreshElectionsBtn = document.getElementById('refreshElectionsBtn');
    const electionStatusFilter = document.getElementById('electionStatusFilter');
    const electionCommitteeFilter = document.getElementById('electionCommitteeFilter');
    const electionSearchInput = document.getElementById('electionSearchInput');

    // =====================================================
    // عناصر DOM - مودال إنشاء/تعديل انتخاب
    // =====================================================
    
    const electionModal = document.getElementById('electionModal');
    const electionModalTitle = document.getElementById('electionModalTitle');
    const closeElectionModal = document.getElementById('closeElectionModal');
    const closeElectionModalBtn = document.getElementById('closeElectionModalBtn');
    const saveElectionBtn = document.getElementById('saveElectionBtn');
    const deleteElectionBtn = document.getElementById('deleteElectionBtn');
    
    // حقول النموذج
    const electionIdInput = document.getElementById('electionId');
    const electionTitleInput = document.getElementById('electionTitle');
    const electionDescriptionInput = document.getElementById('electionDescription');
    const electionCommitteeSelect = document.getElementById('electionCommittee');
    const electionPositionInput = document.getElementById('electionPosition');
    const nominationStartInput = document.getElementById('nominationStartDate');
    const nominationEndInput = document.getElementById('nominationEndDate');
    const votingStartInput = document.getElementById('votingStartDate');
    const votingEndInput = document.getElementById('votingEndDate');
    const electionStatusSelect = document.getElementById('electionStatus');
    const maxCandidatesInput = document.getElementById('maxCandidates');
    const minVotesInput = document.getElementById('minVotesRequired');

    // =====================================================
    // عناصر DOM - إدارة المرشحين
    // =====================================================
    
    const candidatesModal = document.getElementById('candidatesModal');
    const closeCandidatesModal = document.getElementById('closeCandidatesModal');
    const closeCandidatesModalBtn = document.getElementById('closeCandidatesModalBtn');
    const candidatesTableBody = document.getElementById('candidatesTableBody');
    const candidatesElectionTitle = document.getElementById('candidatesElectionTitle');
    const candidateStatusFilter = document.getElementById('candidateStatusFilter');
    const exportCandidatesBtn = document.getElementById('exportCandidatesBtn');

    // =====================================================
    // عناصر DOM - تفاصيل المرشح
    // =====================================================
    
    const candidateDetailModal = document.getElementById('candidateDetailModal');
    const closeCandidateDetailModal = document.getElementById('closeCandidateDetailModal');
    const closeCandidateDetailBtn = document.getElementById('closeCandidateDetailBtn');
    const candidateDetailName = document.getElementById('candidateDetailName');
    const candidateDetailEmail = document.getElementById('candidateDetailEmail');
    const candidateDetailPhone = document.getElementById('candidateDetailPhone');
    const candidateDetailCommittee = document.getElementById('candidateDetailCommittee');
    const candidateDetailMotivation = document.getElementById('candidateDetailMotivation');
    const candidateDetailExperience = document.getElementById('candidateDetailExperience');
    const candidateDetailVision = document.getElementById('candidateDetailVision');
    const candidateDetailStatus = document.getElementById('candidateDetailStatus');
    const candidateAdminNotes = document.getElementById('candidateAdminNotes');
    const approveCandidateBtn = document.getElementById('approveCandidateBtn');
    const rejectCandidateBtn = document.getElementById('rejectCandidateBtn');
    const saveCandidateBtn = document.getElementById('saveCandidateBtn');

    // =====================================================
    // عناصر DOM - نتائج التصويت
    // =====================================================
    
    const resultsModal = document.getElementById('resultsModal');
    const closeResultsModal = document.getElementById('closeResultsModal');
    const closeResultsModalBtn = document.getElementById('closeResultsModalBtn');
    const resultsElectionTitle = document.getElementById('resultsElectionTitle');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const totalVotesCount = document.getElementById('totalVotesCount');
    const totalVotersCount = document.getElementById('totalVotersCount');
    const participationRate = document.getElementById('participationRate');
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    const announceResultsBtn = document.getElementById('announceResultsBtn');

    // =====================================================
    // تهيئة مدير الانتخابات
    // =====================================================
    
    let currentSectionId = 'elections-section';
    let occupiedPositions = []; // المناصب المشغولة حالياً
    
    async function initElectionsManager(user, sectionId = 'elections-section') {
        currentUser = user;
        currentSectionId = sectionId;
        
        try {
            // تحميل اللجان المتاحة
            await loadCommittees();
            
            // تحميل المناصب المشغولة
            await loadOccupiedPositions();
            
            // تحميل الانتخابات حسب القسم
            await loadElectionsBySection(sectionId);
            
            // ربط الأحداث
            bindEvents();
            bindSectionEvents();
            
            console.log('✅ تم تهيئة مدير الانتخابات بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تهيئة مدير الانتخابات:', error);
            showToast('حدث خطأ في تحميل نظام الانتخابات', 'error');
        }
    }
    
    /**
     * تحميل المناصب المشغولة حالياً
     */
    async function loadOccupiedPositions() {
        try {
            // جلب قادة ونواب اللجان الحاليين من user_roles
            const { data, error } = await window.sbClient
                .from('user_roles')
                .select(`
                    committee_id,
                    role:role_id(role_name)
                `)
                .eq('is_active', true)
                .in('role_id', [5, 4]); // 5 = committee_leader, 4 = deputy_committee_leader
            
            if (error) throw error;
            
            occupiedPositions = (data || []).map(item => ({
                committee_id: item.committee_id,
                position_type: item.role?.role_name === 'committee_leader' ? 'leader' : 'deputy'
            }));
            
        } catch (error) {
            console.error('خطأ في تحميل المناصب المشغولة:', error);
            occupiedPositions = [];
        }
    }
    
    /**
     * التحقق مما إذا كان المنصب مشغولاً
     */
    function isPositionOccupied(committeeId, positionType) {
        return occupiedPositions.some(p => 
            p.committee_id === parseInt(committeeId) && p.position_type === positionType
        );
    }
    
    /**
     * تحميل الانتخابات حسب القسم
     */
    async function loadElectionsBySection(sectionId) {
        switch(sectionId) {
            case 'elections-nomination-section':
                await loadElectionsByStatus('nomination', 'nominationElectionsTableBody');
                break;
            case 'elections-voting-section':
                await loadElectionsByStatus('voting', 'votingElectionsTableBody');
                break;
            case 'elections-completed-section':
                await loadElectionsByStatus('completed', 'completedElectionsTableBody');
                break;
            default:
                await loadElections();
        }
    }
    
    /**
     * تحميل الانتخابات حسب الحالة
     */
    async function loadElectionsByStatus(status, tableBodyId) {
        try {
            const tableBody = document.getElementById(tableBodyId);
            if (!tableBody) return;
            
            showLoadingState(tableBody);
            
            const { data, error } = await window.sbClient
                .from('elections')
                .select(`
                    *,
                    committee:committees(id, committee_name_ar),
                    candidates:election_candidates(count),
                    votes:election_votes(count),
                    winner:winner_id(id, full_name)
                `)
                .eq('status', status)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            renderElectionsTableForSection(data || [], tableBody, status);
            
        } catch (error) {
            console.error('خطأ في تحميل الانتخابات:', error);
            showToast('حدث خطأ في تحميل الانتخابات', 'error');
        }
    }
    
    /**
     * عرض جدول الانتخابات لقسم معين
     */
    function renderElectionsTableForSection(elections, tableBody, status) {
        if (!tableBody) return;
        
        if (elections.length === 0) {
            const statusLabels = {
                'nomination': 'فترة الترشح',
                'voting': 'فترة التصويت',
                'completed': 'مكتملة'
            };
            showEmptyState(tableBody, `لا توجد انتخابات في ${statusLabels[status] || 'هذه المرحلة'}`);
            return;
        }

        tableBody.innerHTML = elections.map(election => {
            const committeeName = election.committee?.committee_name_ar || 'غير محدد';
            const candidatesCount = election.candidates?.[0]?.count || 0;
            const votesCount = election.votes?.[0]?.count || 0;
            const winnerName = election.winner?.full_name || '-';
            const statusBadge = getStatusBadge(election.status);
            
            let winnerColumn = '';
            if (status === 'completed') {
                winnerColumn = `<td><strong>${escapeHtml(winnerName)}</strong></td>`;
            }
            
            return `
                <tr data-election-id="${election.id}">
                    <td>
                        <div class="election-info">
                            <strong>${getPositionTypeLabel(election.position_type)}</strong>
                            <small class="text-muted d-block">${escapeHtml(committeeName)}</small>
                        </div>
                    </td>
                    <td>${escapeHtml(committeeName)}</td>
                    ${winnerColumn}
                    <td>
                        <div class="dates-info">
                            <small><strong>الترشح:</strong> ${formatDateRange(election.nomination_start_date, election.nomination_end_date)}</small>
                            <small><strong>التصويت:</strong> ${formatDateRange(election.voting_start_date, election.voting_end_date)}</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-info">${candidatesCount} مرشح</span>
                    </td>
                    ${status !== 'nomination' ? `<td><span class="badge bg-primary">${votesCount} صوت</span></td>` : ''}
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary view-candidates-btn" 
                                    data-election-id="${election.id}" 
                                    title="المرشحون">
                                <i class="fas fa-users"></i>
                            </button>
                            <button class="btn btn-outline-success view-results-btn" 
                                    data-election-id="${election.id}" 
                                    title="النتائج">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button class="btn btn-outline-secondary edit-election-btn" 
                                    data-election-id="${election.id}" 
                                    title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        bindTableEvents();
    }
    
    /**
     * ربط أحداث أزرار التحديث للأقسام الجديدة
     */
    function bindSectionEvents() {
        const refreshNominationBtn = document.getElementById('refreshNominationElectionsBtn');
        if (refreshNominationBtn) {
            refreshNominationBtn.addEventListener('click', () => loadElectionsByStatus('nomination', 'nominationElectionsTableBody'));
        }
        
        const refreshVotingBtn = document.getElementById('refreshVotingElectionsBtn');
        if (refreshVotingBtn) {
            refreshVotingBtn.addEventListener('click', () => loadElectionsByStatus('voting', 'votingElectionsTableBody'));
        }
        
        const refreshCompletedBtn = document.getElementById('refreshCompletedElectionsBtn');
        if (refreshCompletedBtn) {
            refreshCompletedBtn.addEventListener('click', () => loadElectionsByStatus('completed', 'completedElectionsTableBody'));
        }
    }

    // =====================================================
    // تحميل البيانات
    // =====================================================
    
    /**
     * تحميل قائمة اللجان
     */
    async function loadCommittees() {
        try {
            const { data, error } = await window.sbClient
                .from('committees')
                .select('id, committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) throw error;
            
            availableCommittees = data || [];
            
            // ملء قائمة اللجان في الفلاتر والنماذج
            populateCommitteeSelects();
            
        } catch (error) {
            console.error('خطأ في تحميل اللجان:', error);
        }
    }

    /**
     * ملء قوائم اللجان المنسدلة
     */
    function populateCommitteeSelects() {
        const selects = [electionCommitteeFilter, electionCommitteeSelect];
        
        selects.forEach(select => {
            if (!select) return;
            
            // الاحتفاظ بالخيار الأول
            const firstOption = select.options[0];
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);
            
            // إضافة اللجان
            availableCommittees.forEach(committee => {
                const option = document.createElement('option');
                option.value = committee.id;
                option.textContent = committee.committee_name_ar;
                select.appendChild(option);
            });
        });
        
        // إضافة مستمع لتحديث خيارات المنصب عند تغيير اللجنة
        if (electionCommitteeSelect) {
            electionCommitteeSelect.addEventListener('change', updatePositionOptions);
        }
    }
    
    /**
     * تحديث خيارات المنصب بناءً على اللجنة المختارة
     */
    function updatePositionOptions() {
        if (!electionPositionInput || !electionCommitteeSelect) return;
        
        const committeeId = parseInt(electionCommitteeSelect.value);
        if (!committeeId) {
            // إذا لم يتم اختيار لجنة، أظهر جميع الخيارات
            electionPositionInput.innerHTML = `
                <option value="leader">قائد اللجنة</option>
                <option value="deputy">نائب قائد اللجنة</option>
            `;
            return;
        }
        
        const leaderOccupied = isPositionOccupied(committeeId, 'leader');
        const deputyOccupied = isPositionOccupied(committeeId, 'deputy');
        
        let optionsHtml = '';
        
        if (!leaderOccupied) {
            optionsHtml += '<option value="leader">قائد اللجنة</option>';
        }
        if (!deputyOccupied) {
            optionsHtml += '<option value="deputy">نائب قائد اللجنة</option>';
        }
        
        if (optionsHtml === '') {
            // جميع المناصب مشغولة
            optionsHtml = '<option value="" disabled>جميع المناصب مشغولة</option>';
            showToast('جميع المناصب في هذه اللجنة مشغولة حالياً', 'warning');
        }
        
        electionPositionInput.innerHTML = optionsHtml;
    }

    /**
     * تحميل قائمة الانتخابات
     */
    async function loadElections() {
        try {
            showLoadingState(electionsTableBody);
            
            let query = window.sbClient
                .from('elections')
                .select(`
                    *,
                    committee:committees(id, committee_name_ar),
                    candidates:election_candidates(count),
                    votes:election_votes(count)
                `)
                .order('created_at', { ascending: false });

            // تطبيق الفلاتر
            const statusFilter = electionStatusFilter?.value;
            const committeeFilter = electionCommitteeFilter?.value;
            const searchTerm = electionSearchInput?.value?.trim();

            if (statusFilter && statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            
            if (committeeFilter && committeeFilter !== 'all') {
                query = query.eq('committee_id', committeeFilter);
            }

            const { data, error } = await query;

            if (error) throw error;
            
            currentElections = data || [];
            
            // تصفية بالبحث النصي
            if (searchTerm) {
                currentElections = currentElections.filter(election => 
                    election.position_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    election.committee?.committee_name_ar?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            renderElectionsTable();
            
        } catch (error) {
            console.error('خطأ في تحميل الانتخابات:', error);
            showToast('حدث خطأ في تحميل الانتخابات', 'error');
            showEmptyState(electionsTableBody, 'حدث خطأ في تحميل البيانات');
        }
    }

    /**
     * عرض جدول الانتخابات
     */
    function renderElectionsTable() {
        if (!electionsTableBody) return;
        
        if (currentElections.length === 0) {
            showEmptyState(electionsTableBody, 'لا توجد انتخابات حالياً');
            return;
        }

        electionsTableBody.innerHTML = currentElections.map(election => {
            const statusBadge = getStatusBadge(election.status);
            const committeeName = election.committee?.committee_name_ar || 'غير محدد';
            const candidatesCount = election.candidates?.[0]?.count || 0;
            const votesCount = election.votes?.[0]?.count || 0;
            
            return `
                <tr data-election-id="${election.id}">
                    <td>
                        <div class="election-info">
                            <strong>${getPositionTypeLabel(election.position_type)}</strong>
                            <small class="text-muted d-block">${escapeHtml(committeeName)}</small>
                        </div>
                    </td>
                    <td>${escapeHtml(committeeName)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="dates-info">
                            <small><strong>الترشح:</strong> ${formatDateRange(election.nomination_start_date, election.nomination_end_date)}</small>
                            <small><strong>التصويت:</strong> ${formatDateRange(election.voting_start_date, election.voting_end_date)}</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-info">${candidatesCount} مرشح</span>
                    </td>
                    <td>
                        <span class="badge bg-primary">${votesCount} صوت</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary view-candidates-btn" 
                                    data-election-id="${election.id}" 
                                    title="المرشحون">
                                <i class="fas fa-users"></i>
                            </button>
                            <button class="btn btn-outline-success view-results-btn" 
                                    data-election-id="${election.id}" 
                                    title="النتائج">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button class="btn btn-outline-secondary edit-election-btn" 
                                    data-election-id="${election.id}" 
                                    title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-election-btn" 
                                    data-election-id="${election.id}" 
                                    title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // ربط أحداث الأزرار
        bindTableEvents();
    }

    /**
     * الحصول على تسمية نوع المنصب
     */
    function getPositionTypeLabel(positionType) {
        const labels = {
            'leader': 'انتخاب قائد اللجنة',
            'deputy': 'انتخاب نائب قائد اللجنة'
        };
        return labels[positionType] || positionType || 'انتخاب';
    }

    /**
     * الحصول على شارة الحالة
     */
    function getStatusBadge(status) {
        const statusMap = {
            'draft': { class: 'bg-secondary', text: 'مسودة' },
            'nomination': { class: 'bg-info', text: 'فترة الترشح' },
            'voting': { class: 'bg-primary', text: 'فترة التصويت' },
            'completed': { class: 'bg-success', text: 'مكتمل' },
            'cancelled': { class: 'bg-danger', text: 'ملغي' }
        };
        
        const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    /**
     * تنسيق نطاق التواريخ
     */
    function formatDateRange(startDate, endDate) {
        if (!startDate || !endDate) return 'غير محدد';
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const options = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('ar-SA', options)} - ${end.toLocaleDateString('ar-SA', options)}`;
    }

    // =====================================================
    // ربط الأحداث
    // =====================================================
    
    function bindEvents() {
        // زر إنشاء انتخاب جديد
        createElectionBtn?.addEventListener('click', () => openElectionModal());
        
        // زر تحديث القائمة
        refreshElectionsBtn?.addEventListener('click', () => loadElections());
        
        // فلاتر البحث
        electionStatusFilter?.addEventListener('change', () => loadElections());
        electionCommitteeFilter?.addEventListener('change', () => loadElections());
        electionSearchInput?.addEventListener('input', debounce(() => loadElections(), 300));
        
        // أزرار مودال الانتخاب
        closeElectionModal?.addEventListener('click', () => hideModal(electionModal));
        closeElectionModalBtn?.addEventListener('click', () => hideModal(electionModal));
        saveElectionBtn?.addEventListener('click', () => saveElection());
        deleteElectionBtn?.addEventListener('click', () => deleteElection());
        
        // أزرار مودال المرشحين
        closeCandidatesModal?.addEventListener('click', () => hideModal(candidatesModal));
        closeCandidatesModalBtn?.addEventListener('click', () => hideModal(candidatesModal));
        candidateStatusFilter?.addEventListener('change', () => filterCandidates());
        exportCandidatesBtn?.addEventListener('click', () => exportCandidates());
        
        // أزرار مودال تفاصيل المرشح
        closeCandidateDetailModal?.addEventListener('click', () => hideModal(candidateDetailModal));
        closeCandidateDetailBtn?.addEventListener('click', () => hideModal(candidateDetailModal));
        approveCandidateBtn?.addEventListener('click', () => updateCandidateStatus('approved'));
        rejectCandidateBtn?.addEventListener('click', () => updateCandidateStatus('rejected'));
        saveCandidateBtn?.addEventListener('click', () => saveCandidateNotes());
        
        // أزرار مودال النتائج
        closeResultsModal?.addEventListener('click', () => hideModal(resultsModal));
        closeResultsModalBtn?.addEventListener('click', () => hideModal(resultsModal));
        exportResultsBtn?.addEventListener('click', () => exportResults());
        announceResultsBtn?.addEventListener('click', () => announceResults());
    }

    /**
     * ربط أحداث الجدول
     */
    function bindTableEvents() {
        // أزرار عرض المرشحين
        document.querySelectorAll('.view-candidates-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const electionId = e.currentTarget.dataset.electionId;
                openCandidatesModal(electionId);
            });
        });
        
        // أزرار عرض النتائج
        document.querySelectorAll('.view-results-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const electionId = e.currentTarget.dataset.electionId;
                openResultsModal(electionId);
            });
        });
        
        // أزرار التعديل
        document.querySelectorAll('.edit-election-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const electionId = e.currentTarget.dataset.electionId;
                openElectionModal(electionId);
            });
        });
        
        // أزرار الحذف
        document.querySelectorAll('.delete-election-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const electionId = e.currentTarget.dataset.electionId;
                confirmDeleteElection(electionId);
            });
        });
    }

    // =====================================================
    // إدارة الانتخابات (CRUD)
    // =====================================================
    
    /**
     * فتح مودال إنشاء/تعديل انتخاب
     */
    async function openElectionModal(electionId = null) {
        resetElectionForm();
        
        if (electionId) {
            // تعديل انتخاب موجود
            selectedElection = currentElections.find(e => e.id === electionId);
            
            if (selectedElection) {
                electionModalTitle.textContent = 'تعديل الانتخاب';
                fillElectionForm(selectedElection);
                deleteElectionBtn.style.display = 'inline-block';
            }
        } else {
            // إنشاء انتخاب جديد
            selectedElection = null;
            electionModalTitle.textContent = 'إنشاء انتخاب جديد';
            deleteElectionBtn.style.display = 'none';
            
            // تعيين تواريخ افتراضية
            setDefaultDates();
        }
        
        showModal(electionModal);
    }

    /**
     * إعادة تعيين نموذج الانتخاب
     */
    function resetElectionForm() {
        if (electionIdInput) electionIdInput.value = '';
        if (electionCommitteeSelect) electionCommitteeSelect.value = '';
        if (electionPositionInput) electionPositionInput.value = 'leader';
        if (nominationStartInput) nominationStartInput.value = '';
        if (nominationEndInput) nominationEndInput.value = '';
        if (votingStartInput) votingStartInput.value = '';
        if (votingEndInput) votingEndInput.value = '';
        if (electionStatusSelect) electionStatusSelect.value = 'nomination';
    }

    /**
     * ملء نموذج الانتخاب بالبيانات
     */
    function fillElectionForm(election) {
        if (electionIdInput) electionIdInput.value = election.id;
        if (electionCommitteeSelect) electionCommitteeSelect.value = election.committee_id || '';
        if (electionPositionInput) electionPositionInput.value = election.position_type || 'leader';
        if (nominationStartInput) nominationStartInput.value = formatDateTimeLocal(election.nomination_start_date);
        if (nominationEndInput) nominationEndInput.value = formatDateTimeLocal(election.nomination_end_date);
        if (votingStartInput) votingStartInput.value = formatDateTimeLocal(election.voting_start_date);
        if (votingEndInput) votingEndInput.value = formatDateTimeLocal(election.voting_end_date);
        if (electionStatusSelect) electionStatusSelect.value = election.status || 'nomination';
    }

    /**
     * تعيين تواريخ افتراضية
     */
    function setDefaultDates() {
        const now = new Date();
        const nominationStart = new Date(now);
        const nominationEnd = new Date(now);
        nominationEnd.setDate(nominationEnd.getDate() + 7);
        
        const votingStart = new Date(nominationEnd);
        votingStart.setDate(votingStart.getDate() + 1);
        const votingEnd = new Date(votingStart);
        votingEnd.setDate(votingEnd.getDate() + 3);
        
        if (nominationStartInput) nominationStartInput.value = formatDateTimeLocal(nominationStart);
        if (nominationEndInput) nominationEndInput.value = formatDateTimeLocal(nominationEnd);
        if (votingStartInput) votingStartInput.value = formatDateTimeLocal(votingStart);
        if (votingEndInput) votingEndInput.value = formatDateTimeLocal(votingEnd);
    }

    /**
     * تنسيق التاريخ لحقل datetime-local
     */
    function formatDateTimeLocal(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().slice(0, 16);
    }

    /**
     * حفظ الانتخاب
     */
    async function saveElection() {
        try {
            // التحقق من الحقول المطلوبة
            if (!electionCommitteeSelect?.value) {
                showToast('يرجى اختيار اللجنة', 'warning');
                return;
            }
            
            // التحقق من أن المنصب غير مشغول (فقط عند إنشاء انتخاب جديد)
            if (!selectedElection) {
                const committeeId = parseInt(electionCommitteeSelect.value);
                const positionType = electionPositionInput?.value || 'leader';
                
                if (isPositionOccupied(committeeId, positionType)) {
                    const positionLabel = positionType === 'leader' ? 'قائد اللجنة' : 'نائب قائد اللجنة';
                    const committeeName = availableCommittees.find(c => c.id === committeeId)?.committee_name_ar || 'اللجنة';
                    showToast(`منصب ${positionLabel} في ${committeeName} مشغول حالياً. لا يمكن إنشاء انتخاب لمنصب مشغول.`, 'error');
                    return;
                }
            }
            
            // التحقق من التواريخ
            const nominationStart = new Date(nominationStartInput?.value);
            const nominationEnd = new Date(nominationEndInput?.value);
            const votingStart = new Date(votingStartInput?.value);
            const votingEnd = new Date(votingEndInput?.value);
            
            if (nominationEnd <= nominationStart) {
                showToast('تاريخ انتهاء الترشح يجب أن يكون بعد تاريخ البداية', 'warning');
                return;
            }
            
            if (votingStart < nominationEnd) {
                showToast('تاريخ بداية التصويت يجب أن يكون بعد انتهاء الترشح', 'warning');
                return;
            }
            
            if (votingEnd <= votingStart) {
                showToast('تاريخ انتهاء التصويت يجب أن يكون بعد تاريخ البداية', 'warning');
                return;
            }

            const electionData = {
                committee_id: parseInt(electionCommitteeSelect.value),
                position_type: electionPositionInput?.value || 'leader',
                nomination_start_date: nominationStartInput.value,
                nomination_end_date: nominationEndInput.value,
                voting_start_date: votingStartInput.value,
                voting_end_date: votingEndInput.value,
                status: electionStatusSelect?.value || 'nomination'
            };

            saveElectionBtn.disabled = true;
            saveElectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            let result;
            
            if (selectedElection) {
                // تحديث
                result = await window.sbClient
                    .from('elections')
                    .update(electionData)
                    .eq('id', selectedElection.id)
                    .select()
                    .single();
            } else {
                // إنشاء جديد
                electionData.created_by = currentUser.id;
                result = await window.sbClient
                    .from('elections')
                    .insert(electionData)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            showToast(selectedElection ? 'تم تحديث الانتخاب بنجاح' : 'تم إنشاء الانتخاب بنجاح', 'success');
            hideModal(electionModal);
            await loadElections();
            
        } catch (error) {
            console.error('خطأ في حفظ الانتخاب:', error);
            showToast('حدث خطأ في حفظ الانتخاب', 'error');
        } finally {
            if (saveElectionBtn) {
                saveElectionBtn.disabled = false;
                saveElectionBtn.innerHTML = '<i class="fas fa-save"></i> حفظ';
            }
        }
    }

    /**
     * تأكيد حذف الانتخاب
     */
    async function confirmDeleteElection(electionId) {
        const election = currentElections.find(e => e.id === electionId);
        if (!election) return;
        
        const confirmed = await showConfirmDialog(
            'حذف الانتخاب',
            `هل أنت متأكد من حذف انتخاب "${election.title}"؟ سيتم حذف جميع المرشحين والأصوات المرتبطة.`,
            'حذف',
            'إلغاء'
        );
        
        if (confirmed) {
            await deleteElectionById(electionId);
        }
    }

    /**
     * حذف الانتخاب
     */
    async function deleteElection() {
        if (!selectedElection) return;
        await confirmDeleteElection(selectedElection.id);
    }

    /**
     * حذف انتخاب بالمعرف
     */
    async function deleteElectionById(electionId) {
        try {
            // حذف الأصوات أولاً
            await window.sbClient
                .from('election_votes')
                .delete()
                .eq('election_id', electionId);
            
            // حذف المرشحين
            await window.sbClient
                .from('election_candidates')
                .delete()
                .eq('election_id', electionId);
            
            // حذف الانتخاب
            const { error } = await window.sbClient
                .from('elections')
                .delete()
                .eq('id', electionId);

            if (error) throw error;

            showToast('تم حذف الانتخاب بنجاح', 'success');
            hideModal(electionModal);
            await loadElections();
            
        } catch (error) {
            console.error('خطأ في حذف الانتخاب:', error);
            showToast('حدث خطأ في حذف الانتخاب', 'error');
        }
    }

    // =====================================================
    // إدارة المرشحين
    // =====================================================
    
    /**
     * فتح مودال المرشحين
     */
    async function openCandidatesModal(electionId) {
        selectedElection = currentElections.find(e => e.id === electionId);
        if (!selectedElection) return;
        
        if (candidatesElectionTitle) {
            candidatesElectionTitle.textContent = selectedElection.title;
        }
        
        await loadCandidates(electionId);
        showModal(candidatesModal);
    }

    /**
     * تحميل المرشحين
     */
    async function loadCandidates(electionId) {
        try {
            showLoadingState(candidatesTableBody);
            
            const { data, error } = await window.sbClient
                .from('election_candidates')
                .select(`
                    *,
                    member:member_id(
                        id,
                        full_name,
                        email,
                        phone,
                        avatar_url,
                        member_details(committee_id)
                    )
                `)
                .eq('election_id', electionId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            currentCandidates = data || [];
            renderCandidatesTable();
            
        } catch (error) {
            console.error('خطأ في تحميل المرشحين:', error);
            showToast('حدث خطأ في تحميل المرشحين', 'error');
            showEmptyState(candidatesTableBody, 'حدث خطأ في تحميل البيانات');
        }
    }

    /**
     * عرض جدول المرشحين
     */
    function renderCandidatesTable() {
        if (!candidatesTableBody) return;
        
        let filteredCandidates = [...currentCandidates];
        
        // تطبيق فلتر الحالة
        const statusFilter = candidateStatusFilter?.value;
        if (statusFilter && statusFilter !== 'all') {
            filteredCandidates = filteredCandidates.filter(c => c.status === statusFilter);
        }
        
        if (filteredCandidates.length === 0) {
            showEmptyState(candidatesTableBody, 'لا يوجد مرشحون');
            return;
        }

        candidatesTableBody.innerHTML = filteredCandidates.map(candidate => {
            const member = candidate.member;
            const statusBadge = getCandidateStatusBadge(candidate.status);
            const avatarUrl = member?.avatar_url || '/assets/images/default-avatar.png';
            
            return `
                <tr data-candidate-id="${candidate.id}">
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${avatarUrl}" alt="" class="rounded-circle me-2" width="40" height="40">
                            <div>
                                <strong>${escapeHtml(member?.full_name || 'غير معروف')}</strong>
                                <small class="text-muted d-block">${escapeHtml(member?.email || '')}</small>
                            </div>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${formatDate(candidate.created_at)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary view-candidate-btn" 
                                    data-candidate-id="${candidate.id}" 
                                    title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${candidate.status === 'pending' ? `
                                <button class="btn btn-outline-success approve-candidate-btn" 
                                        data-candidate-id="${candidate.id}" 
                                        title="قبول">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-outline-danger reject-candidate-btn" 
                                        data-candidate-id="${candidate.id}" 
                                        title="رفض">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // ربط أحداث أزرار المرشحين
        bindCandidateTableEvents();
    }

    /**
     * الحصول على شارة حالة المرشح
     */
    function getCandidateStatusBadge(status) {
        const statusMap = {
            'pending': { class: 'bg-warning', text: 'قيد المراجعة' },
            'approved': { class: 'bg-success', text: 'مقبول' },
            'rejected': { class: 'bg-danger', text: 'مرفوض' },
            'withdrawn': { class: 'bg-secondary', text: 'منسحب' }
        };
        
        const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    /**
     * ربط أحداث جدول المرشحين
     */
    function bindCandidateTableEvents() {
        // عرض تفاصيل المرشح
        document.querySelectorAll('.view-candidate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const candidateId = e.currentTarget.dataset.candidateId;
                openCandidateDetailModal(candidateId);
            });
        });
        
        // قبول المرشح
        document.querySelectorAll('.approve-candidate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const candidateId = e.currentTarget.dataset.candidateId;
                selectedCandidate = currentCandidates.find(c => c.id === candidateId);
                await updateCandidateStatus('approved');
            });
        });
        
        // رفض المرشح
        document.querySelectorAll('.reject-candidate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const candidateId = e.currentTarget.dataset.candidateId;
                selectedCandidate = currentCandidates.find(c => c.id === candidateId);
                await updateCandidateStatus('rejected');
            });
        });
    }

    /**
     * فتح مودال تفاصيل المرشح
     */
    function openCandidateDetailModal(candidateId) {
        selectedCandidate = currentCandidates.find(c => c.id === candidateId);
        if (!selectedCandidate) return;
        
        const member = selectedCandidate.member;
        
        if (candidateDetailName) candidateDetailName.textContent = member?.full_name || 'غير معروف';
        if (candidateDetailEmail) candidateDetailEmail.textContent = member?.email || '-';
        if (candidateDetailPhone) candidateDetailPhone.textContent = member?.phone || '-';
        if (candidateDetailCommittee) candidateDetailCommittee.textContent = selectedElection?.committee?.name_ar || '-';
        if (candidateDetailMotivation) candidateDetailMotivation.textContent = selectedCandidate.motivation || '-';
        if (candidateDetailExperience) candidateDetailExperience.textContent = selectedCandidate.experience || '-';
        if (candidateDetailVision) candidateDetailVision.textContent = selectedCandidate.vision || '-';
        if (candidateDetailStatus) candidateDetailStatus.innerHTML = getCandidateStatusBadge(selectedCandidate.status);
        if (candidateAdminNotes) candidateAdminNotes.value = selectedCandidate.admin_notes || '';
        
        // إظهار/إخفاء أزرار القبول والرفض
        const isPending = selectedCandidate.status === 'pending';
        if (approveCandidateBtn) approveCandidateBtn.style.display = isPending ? 'inline-block' : 'none';
        if (rejectCandidateBtn) rejectCandidateBtn.style.display = isPending ? 'inline-block' : 'none';
        
        showModal(candidateDetailModal);
    }

    /**
     * تحديث حالة المرشح
     */
    async function updateCandidateStatus(newStatus) {
        if (!selectedCandidate) return;
        
        try {
            const updateData = {
                status: newStatus,
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString()
            };
            
            if (candidateAdminNotes?.value) {
                updateData.admin_notes = candidateAdminNotes.value.trim();
            }

            const { error } = await window.sbClient
                .from('election_candidates')
                .update(updateData)
                .eq('id', selectedCandidate.id);

            if (error) throw error;

            const statusText = newStatus === 'approved' ? 'قبول' : 'رفض';
            showToast(`تم ${statusText} المرشح بنجاح`, 'success');
            
            hideModal(candidateDetailModal);
            await loadCandidates(selectedElection.id);
            
        } catch (error) {
            console.error('خطأ في تحديث حالة المرشح:', error);
            showToast('حدث خطأ في تحديث حالة المرشح', 'error');
        }
    }

    /**
     * حفظ ملاحظات المرشح
     */
    async function saveCandidateNotes() {
        if (!selectedCandidate) return;
        
        try {
            const { error } = await window.sbClient
                .from('election_candidates')
                .update({
                    admin_notes: candidateAdminNotes?.value?.trim() || null
                })
                .eq('id', selectedCandidate.id);

            if (error) throw error;

            showToast('تم حفظ الملاحظات بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في حفظ الملاحظات:', error);
            showToast('حدث خطأ في حفظ الملاحظات', 'error');
        }
    }

    /**
     * تصفية المرشحين
     */
    function filterCandidates() {
        renderCandidatesTable();
    }

    /**
     * تصدير المرشحين
     */
    function exportCandidates() {
        if (currentCandidates.length === 0) {
            showToast('لا يوجد مرشحون للتصدير', 'warning');
            return;
        }
        
        const csvData = currentCandidates.map(c => ({
            'الاسم': c.member?.full_name || '',
            'البريد الإلكتروني': c.member?.email || '',
            'الهاتف': c.member?.phone || '',
            'الحالة': c.status,
            'الدافع': c.motivation || '',
            'الخبرة': c.experience || '',
            'الرؤية': c.vision || '',
            'تاريخ الترشح': formatDate(c.created_at)
        }));
        
        exportToCSV(csvData, `candidates_${selectedElection?.title || 'export'}.csv`);
    }

    // =====================================================
    // نتائج التصويت
    // =====================================================
    
    /**
     * فتح مودال النتائج
     */
    async function openResultsModal(electionId) {
        selectedElection = currentElections.find(e => e.id === electionId);
        if (!selectedElection) return;
        
        if (resultsElectionTitle) {
            resultsElectionTitle.textContent = selectedElection.title;
        }
        
        await loadResults(electionId);
        showModal(resultsModal);
    }

    /**
     * تحميل نتائج التصويت
     */
    async function loadResults(electionId) {
        try {
            showLoadingState(resultsTableBody);
            
            // تحميل المرشحين مع عدد الأصوات
            const { data: candidates, error: candidatesError } = await window.sbClient
                .from('election_candidates')
                .select(`
                    *,
                    member:member_id(id, full_name, avatar_url),
                    votes:election_votes(count)
                `)
                .eq('election_id', electionId)
                .eq('status', 'approved');

            if (candidatesError) throw candidatesError;
            
            // تحميل إجمالي الأصوات
            const { data: votesData, error: votesError } = await window.sbClient
                .from('election_votes')
                .select('voter_id')
                .eq('election_id', electionId);

            if (votesError) throw votesError;
            
            // حساب الإحصائيات
            const totalVotes = votesData?.length || 0;
            const uniqueVoters = new Set(votesData?.map(v => v.voter_id)).size;
            
            // تحميل عدد أعضاء اللجنة للمشاركة
            const { data: committeeMembers, error: membersError } = await window.sbClient
                .from('member_details')
                .select('user_id')
                .eq('committee_id', selectedElection.committee_id);

            if (membersError) throw membersError;
            
            const totalEligibleVoters = committeeMembers?.length || 1;
            const participation = ((uniqueVoters / totalEligibleVoters) * 100).toFixed(1);
            
            // تحديث الإحصائيات
            if (totalVotesCount) totalVotesCount.textContent = totalVotes;
            if (totalVotersCount) totalVotersCount.textContent = uniqueVoters;
            if (participationRate) participationRate.textContent = `${participation}%`;
            
            // ترتيب المرشحين حسب الأصوات
            const sortedCandidates = (candidates || []).map(c => ({
                ...c,
                voteCount: c.votes?.[0]?.count || 0
            })).sort((a, b) => b.voteCount - a.voteCount);
            
            currentVotes = sortedCandidates;
            renderResultsTable(sortedCandidates, totalVotes);
            
        } catch (error) {
            console.error('خطأ في تحميل النتائج:', error);
            showToast('حدث خطأ في تحميل النتائج', 'error');
            showEmptyState(resultsTableBody, 'حدث خطأ في تحميل البيانات');
        }
    }

    /**
     * عرض جدول النتائج
     */
    function renderResultsTable(candidates, totalVotes) {
        if (!resultsTableBody) return;
        
        if (candidates.length === 0) {
            showEmptyState(resultsTableBody, 'لا يوجد مرشحون مقبولون');
            return;
        }

        resultsTableBody.innerHTML = candidates.map((candidate, index) => {
            const member = candidate.member;
            const voteCount = candidate.voteCount;
            const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : 0;
            const avatarUrl = member?.avatar_url || '/assets/images/default-avatar.png';
            const rankBadge = index === 0 ? '<i class="fas fa-crown text-warning me-2"></i>' : '';
            
            return `
                <tr class="${index === 0 ? 'table-success' : ''}">
                    <td>
                        <strong>${index + 1}</strong>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            ${rankBadge}
                            <img src="${avatarUrl}" alt="" class="rounded-circle me-2" width="40" height="40">
                            <strong>${escapeHtml(member?.full_name || 'غير معروف')}</strong>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-primary fs-6">${voteCount}</span>
                    </td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" 
                                 style="width: ${percentage}%;" 
                                 aria-valuenow="${percentage}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${percentage}%
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * تصدير النتائج
     */
    function exportResults() {
        if (currentVotes.length === 0) {
            showToast('لا توجد نتائج للتصدير', 'warning');
            return;
        }
        
        const csvData = currentVotes.map((c, index) => ({
            'الترتيب': index + 1,
            'الاسم': c.member?.full_name || '',
            'عدد الأصوات': c.voteCount,
            'النسبة': `${((c.voteCount / (currentVotes.reduce((sum, v) => sum + v.voteCount, 0) || 1)) * 100).toFixed(1)}%`
        }));
        
        exportToCSV(csvData, `results_${selectedElection?.title || 'export'}.csv`);
    }

    /**
     * إعلان النتائج
     */
    async function announceResults() {
        if (!selectedElection || currentVotes.length === 0) return;
        
        const winner = currentVotes[0];
        if (!winner) return;
        
        const confirmed = await showConfirmDialog(
            'إعلان النتائج',
            `هل تريد إعلان "${winner.member?.full_name}" كفائز في انتخاب "${selectedElection.title}"؟`,
            'إعلان',
            'إلغاء'
        );
        
        if (!confirmed) return;
        
        try {
            // تحديث حالة الانتخاب
            const { error: electionError } = await window.sbClient
                .from('elections')
                .update({
                    status: 'completed',
                    winner_id: winner.member?.id,
                    completed_at: new Date().toISOString()
                })
                .eq('id', selectedElection.id);

            if (electionError) throw electionError;

            showToast('تم إعلان النتائج بنجاح', 'success');
            hideModal(resultsModal);
            await loadElections();
            
        } catch (error) {
            console.error('خطأ في إعلان النتائج:', error);
            showToast('حدث خطأ في إعلان النتائج', 'error');
        }
    }

    // =====================================================
    // دوال مساعدة
    // =====================================================
    
    /**
     * عرض حالة التحميل
     */
    function showLoadingState(element) {
        if (!element) return;
        element.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * عرض حالة فارغة
     */
    function showEmptyState(element, message) {
        if (!element) return;
        element.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4 text-muted">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }

    /**
     * إظهار المودال
     */
    function showModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    /**
     * إخفاء المودال
     */
    function hideModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    /**
     * تنسيق التاريخ
     */
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * تهريب HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * دالة debounce
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * عرض رسالة Toast
     */
    function showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.Swal) {
            window.Swal.fire({
                toast: true,
                position: 'top-end',
                icon: type,
                title: message,
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    /**
     * عرض مربع حوار التأكيد
     */
    async function showConfirmDialog(title, text, confirmText, cancelText) {
        if (window.Swal) {
            const result = await window.Swal.fire({
                title: title,
                text: text,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: confirmText,
                cancelButtonText: cancelText
            });
            return result.isConfirmed;
        }
        return confirm(`${title}\n\n${text}`);
    }

    /**
     * تصدير إلى CSV
     */
    function exportToCSV(data, filename) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    // =====================================================
    // تصدير الدوال للاستخدام الخارجي
    // =====================================================
    
    window.ElectionsManager = {
        init: initElectionsManager,
        loadElections: loadElections,
        openElectionModal: openElectionModal,
        openCandidatesModal: openCandidatesModal,
        openResultsModal: openResultsModal
    };

})();
