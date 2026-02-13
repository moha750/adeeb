/**
 * نظام الانتخابات للأعضاء - الترشح والتصويت
 * Member Elections System - Nomination and Voting
 */

(function() {
    'use strict';

    let currentUser = null;
    let currentUserCommitteeId = null;
    let activeElections = [];
    let myNominations = [];

    // عناصر DOM
    const electionsCard = document.getElementById('electionsCard');
    const activeElectionsContainer = document.getElementById('activeElectionsContainer');
    const noActiveElections = document.getElementById('noActiveElections');

    /**
     * تهيئة نظام الانتخابات للأعضاء
     */
    async function initMemberElections(user, committeeId) {
        currentUser = user;
        currentUserCommitteeId = committeeId;
        
        if (!electionsCard || !committeeId) return;
        
        try {
            await loadActiveElections();
            await loadMyNominations();
            renderElections();
        } catch (error) {
            console.error('خطأ في تهيئة نظام الانتخابات:', error);
        }
    }

    /**
     * تحميل الانتخابات النشطة للجنة
     */
    async function loadActiveElections() {
        try {
            const { data, error } = await window.sbClient
                .from('elections')
                .select(`
                    *,
                    committee:committees(id, committee_name_ar),
                    candidates:election_candidates(
                        id,
                        member_id,
                        status,
                        member:profiles(id, full_name, avatar_url)
                    )
                `)
                .eq('committee_id', currentUserCommitteeId)
                .in('status', ['nomination', 'voting'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            activeElections = data || [];
            
        } catch (error) {
            console.error('خطأ في تحميل الانتخابات:', error);
            activeElections = [];
        }
    }

    /**
     * تحميل ترشيحاتي
     */
    async function loadMyNominations() {
        try {
            const { data, error } = await window.sbClient
                .from('election_candidates')
                .select('*')
                .eq('member_id', currentUser.id);

            if (error) throw error;
            
            myNominations = data || [];
            
        } catch (error) {
            console.error('خطأ في تحميل الترشيحات:', error);
            myNominations = [];
        }
    }

    /**
     * عرض الانتخابات
     */
    function renderElections() {
        if (!activeElectionsContainer) return;
        
        if (activeElections.length === 0) {
            if (noActiveElections) noActiveElections.style.display = 'flex';
            return;
        }
        
        if (noActiveElections) noActiveElections.style.display = 'none';
        
        const electionsHtml = activeElections.map(election => {
            const isNominationPeriod = election.status === 'nomination';
            const isVotingPeriod = election.status === 'voting';
            const myNomination = myNominations.find(n => n.election_id === election.id);
            const approvedCandidates = election.candidates?.filter(c => c.status === 'approved') || [];
            
            return `
                <div class="election-card-member" data-election-id="${election.id}">
                    <div class="election-card-header">
                        <div class="election-title">
                            <h4>${getPositionTypeLabel(election.position_type)}</h4>
                            <span class="election-status ${election.status}">
                                ${getStatusLabel(election.status)}
                            </span>
                        </div>
                        <p class="election-committee">${election.committee?.committee_name_ar || ''}</p>
                    </div>
                    
                    <div class="election-dates">
                        ${isNominationPeriod ? `
                            <div class="date-item">
                                <i class="fa-solid fa-calendar-plus"></i>
                                <span>فترة الترشح: ${formatDateRange(election.nomination_start_date, election.nomination_end_date)}</span>
                            </div>
                        ` : ''}
                        ${isVotingPeriod ? `
                            <div class="date-item">
                                <i class="fa-solid fa-check-to-slot"></i>
                                <span>فترة التصويت: ${formatDateRange(election.voting_start_date, election.voting_end_date)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${isNominationPeriod ? renderNominationSection(election, myNomination) : ''}
                    ${isVotingPeriod ? renderVotingSection(election, approvedCandidates) : ''}
                </div>
            `;
        }).join('');
        
        activeElectionsContainer.innerHTML = electionsHtml;
        
        // ربط الأحداث
        bindElectionEvents();
    }

    /**
     * عرض قسم الترشح
     */
    function renderNominationSection(election, myNomination) {
        if (myNomination) {
            const statusBadge = getNominationStatusBadge(myNomination.status);
            return `
                <div class="nomination-status-section">
                    <h5><i class="fa-solid fa-user-check"></i> حالة ترشحك</h5>
                    <div class="nomination-status-card">
                        ${statusBadge}
                        ${myNomination.status === 'pending' ? '<p>طلب ترشحك قيد المراجعة</p>' : ''}
                        ${myNomination.status === 'approved' ? '<p>تم قبول ترشحك! ستظهر في قائمة المرشحين عند بدء التصويت.</p>' : ''}
                        ${myNomination.status === 'rejected' ? `<p>تم رفض ترشحك. ${myNomination.rejection_reason || ''}</p>` : ''}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="nomination-action-section">
                <h5><i class="fa-solid fa-hand-point-up"></i> هل تريد الترشح؟</h5>
                <p>يمكنك الترشح لمنصب ${getPositionTypeLabel(election.position_type).replace('انتخاب ', '')}</p>
                <button class="btn btn--primary nominate-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-user-plus"></i>
                    تقديم طلب الترشح
                </button>
            </div>
        `;
    }

    /**
     * عرض قسم التصويت
     */
    function renderVotingSection(election, candidates) {
        if (candidates.length === 0) {
            return `
                <div class="voting-section">
                    <h5><i class="fa-solid fa-check-to-slot"></i> التصويت</h5>
                    <p class="text-muted">لا يوجد مرشحون مقبولون للتصويت</p>
                </div>
            `;
        }
        
        return `
            <div class="voting-section">
                <h5><i class="fa-solid fa-check-to-slot"></i> صوّت لمرشحك المفضل</h5>
                <div class="candidates-list">
                    ${candidates.map(candidate => `
                        <div class="candidate-vote-card" data-candidate-id="${candidate.id}">
                            <div class="candidate-info">
                                <img src="${candidate.member?.avatar_url || '/assets/images/default-avatar.png'}" 
                                     alt="" class="candidate-avatar">
                                <span class="candidate-name">${candidate.member?.full_name || 'مرشح'}</span>
                            </div>
                            <button class="btn btn--primary btn--sm vote-btn" 
                                    data-election-id="${election.id}"
                                    data-candidate-id="${candidate.id}">
                                <i class="fa-solid fa-check"></i>
                                تصويت
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * ربط أحداث الانتخابات
     */
    function bindElectionEvents() {
        // أزرار الترشح
        document.querySelectorAll('.nominate-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const electionId = e.currentTarget.dataset.electionId;
                await submitNomination(electionId);
            });
        });
        
        // أزرار التصويت
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const electionId = e.currentTarget.dataset.electionId;
                const candidateId = e.currentTarget.dataset.candidateId;
                await submitVote(electionId, candidateId);
            });
        });
    }

    /**
     * تقديم طلب الترشح
     */
    async function submitNomination(electionId) {
        try {
            // التحقق من عدم وجود ترشح سابق
            const existingNomination = myNominations.find(n => n.election_id === electionId);
            if (existingNomination) {
                showToast('لديك طلب ترشح سابق لهذا الانتخاب', 'warning');
                return;
            }
            
            // طلب ملف الترشح (اختياري)
            const confirmed = await showConfirmDialog(
                'تأكيد الترشح',
                'هل أنت متأكد من رغبتك في الترشح لهذا المنصب؟',
                'تأكيد الترشح',
                'إلغاء'
            );
            
            if (!confirmed) return;
            
            const { data, error } = await window.sbClient
                .from('election_candidates')
                .insert({
                    election_id: electionId,
                    member_id: currentUser.id,
                    nomination_file_url: '', // يمكن إضافة رفع ملف لاحقاً
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;
            
            showToast('تم تقديم طلب الترشح بنجاح! سيتم مراجعته من قبل الإدارة.', 'success');
            
            // تحديث العرض
            await loadMyNominations();
            renderElections();
            
        } catch (error) {
            console.error('خطأ في تقديم الترشح:', error);
            showToast('حدث خطأ في تقديم طلب الترشح', 'error');
        }
    }

    /**
     * تقديم التصويت
     */
    async function submitVote(electionId, candidateId) {
        try {
            // التحقق من عدم التصويت سابقاً
            const { data: existingVote, error: checkError } = await window.sbClient
                .from('election_votes')
                .select('id')
                .eq('election_id', electionId)
                .eq('voter_id', currentUser.id)
                .single();

            if (existingVote) {
                showToast('لقد قمت بالتصويت مسبقاً في هذا الانتخاب', 'warning');
                return;
            }
            
            const confirmed = await showConfirmDialog(
                'تأكيد التصويت',
                'هل أنت متأكد من اختيارك؟ لا يمكن تغيير التصويت بعد تأكيده.',
                'تأكيد التصويت',
                'إلغاء'
            );
            
            if (!confirmed) return;
            
            const { error } = await window.sbClient
                .from('election_votes')
                .insert({
                    election_id: electionId,
                    voter_id: currentUser.id,
                    candidate_id: candidateId
                });

            if (error) throw error;
            
            showToast('تم تسجيل صوتك بنجاح! شكراً لمشاركتك.', 'success');
            
            // تعطيل أزرار التصويت لهذا الانتخاب
            document.querySelectorAll(`.vote-btn[data-election-id="${electionId}"]`).forEach(btn => {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-check-double"></i> تم التصويت';
                btn.classList.remove('btn--primary');
                btn.classList.add('btn--success');
            });
            
        } catch (error) {
            console.error('خطأ في التصويت:', error);
            showToast('حدث خطأ في تسجيل التصويت', 'error');
        }
    }

    // =====================================================
    // دوال مساعدة
    // =====================================================

    function getPositionTypeLabel(positionType) {
        const labels = {
            'leader': 'انتخاب قائد اللجنة',
            'deputy': 'انتخاب نائب قائد اللجنة'
        };
        return labels[positionType] || positionType || 'انتخاب';
    }

    function getStatusLabel(status) {
        const labels = {
            'nomination': 'فترة الترشح',
            'review': 'مراجعة الترشيحات',
            'voting': 'فترة التصويت',
            'completed': 'منتهي',
            'cancelled': 'ملغي'
        };
        return labels[status] || status;
    }

    function getNominationStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge bg-warning">قيد المراجعة</span>',
            'approved': '<span class="badge bg-success">مقبول</span>',
            'rejected': '<span class="badge bg-danger">مرفوض</span>'
        };
        return badges[status] || '';
    }

    function formatDateRange(startDate, endDate) {
        if (!startDate || !endDate) return 'غير محدد';
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const options = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('ar-SA', options)} - ${end.toLocaleDateString('ar-SA', options)}`;
    }

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

    async function showConfirmDialog(title, text, confirmText, cancelText) {
        if (window.Swal) {
            const result = await window.Swal.fire({
                title: title,
                text: text,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6c757d',
                confirmButtonText: confirmText,
                cancelButtonText: cancelText
            });
            return result.isConfirmed;
        }
        return confirm(`${title}\n\n${text}`);
    }

    // =====================================================
    // تصدير الدوال
    // =====================================================

    window.MemberElections = {
        init: initMemberElections,
        refresh: async function() {
            await loadActiveElections();
            await loadMyNominations();
            renderElections();
        }
    };

})();
