/**
 * Member Nominations - واجهة الترشح للأعضاء
 * نادي أدِيب
 */

class MemberNominations {
    constructor() {
        this.currentUserId = null;
        this.currentUserCommitteeId = null;
        this.activeElections = [];
        this.myNominations = [];
        
        this.init();
    }

    async init() {
        await this.getCurrentUser();
        this.bindEvents();
    }

    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            this.currentUserId = user.id;
            
            // الحصول على لجنة المستخدم
            const { data: roles } = await supabase
                .from('user_roles')
                .select('committee_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .not('committee_id', 'is', null)
                .single();
            
            if (roles) {
                this.currentUserCommitteeId = roles.committee_id;
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    }

    bindEvents() {
        // زر تحديث
        const refreshBtn = document.getElementById('refreshNominationsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadActiveElections());
        }
    }

    async loadActiveElections() {
        if (!this.currentUserCommitteeId) {
            this.showNoCommitteeMessage();
            return;
        }

        try {
            this.showLoading();

            // تحميل الانتخابات النشطة للجنة المستخدم
            const now = new Date().toISOString();
            const { data: elections, error } = await supabase
                .from('elections')
                .select(`
                    *,
                    committees!inner(committee_name_ar)
                `)
                .eq('committee_id', this.currentUserCommitteeId)
                .in('status', ['nomination', 'voting'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.activeElections = elections || [];

            // تحميل ترشحات المستخدم
            await this.loadMyNominations();

            this.renderElections();
        } catch (error) {
            console.error('Error loading elections:', error);
            this.showError('حدث خطأ في تحميل الانتخابات');
        }
    }

    async loadMyNominations() {
        if (!this.currentUserId) return;

        try {
            const { data, error } = await supabase
                .from('election_candidates')
                .select('*')
                .eq('member_id', this.currentUserId);

            if (error) throw error;
            this.myNominations = data || [];
        } catch (error) {
            console.error('Error loading nominations:', error);
        }
    }

    renderElections() {
        const container = document.getElementById('nominationsContainer');
        if (!container) return;

        if (this.activeElections.length === 0) {
            container.innerHTML = `
                <div class="elections-empty">
                    <i class="fa-solid fa-box-open"></i>
                    <h3>لا توجد انتخابات متاحة</h3>
                    <p>لا توجد انتخابات مفتوحة للترشح في لجنتك حالياً</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activeElections.map(election => 
            this.renderElectionCard(election)
        ).join('');
    }

    renderElectionCard(election) {
        const myNomination = this.myNominations.find(n => n.election_id === election.id);
        const positionLabels = {
            leader: 'قائد اللجنة',
            deputy: 'نائب القائد'
        };

        const statusLabels = {
            nomination: 'فترة الترشح مفتوحة',
            voting: 'التصويت جارٍ'
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

        const isNominationOpen = election.status === 'nomination' && 
            new Date() >= new Date(election.nomination_start_date) &&
            new Date() <= new Date(election.nomination_end_date);

        const isVotingOpen = election.status === 'voting' &&
            new Date() >= new Date(election.voting_start_date) &&
            new Date() <= new Date(election.voting_end_date);

        let actionHtml = '';
        
        if (election.status === 'nomination') {
            if (myNomination) {
                actionHtml = this.renderNominationStatus(myNomination, election);
            } else if (isNominationOpen) {
                actionHtml = `
                    <button class="btn btn--primary" onclick="memberNominations.showNominationForm('${election.id}')">
                        <i class="fa-solid fa-hand-paper"></i>
                        تقديم ترشحي
                    </button>
                `;
            } else {
                actionHtml = `
                    <p class="text-muted">فترة الترشح لم تبدأ بعد أو انتهت</p>
                `;
            }
        } else if (election.status === 'voting') {
            actionHtml = `
                <button class="btn btn--primary" onclick="memberNominations.openVoting('${election.id}')">
                    <i class="fa-solid fa-vote-yea"></i>
                    التصويت الآن
                </button>
            `;
        }

        return `
            <div class="card" style="margin-bottom: var(--spacing-lg);">
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
                <div class="card-body">
                    <div class="election-card__dates">
                        ${election.status === 'nomination' ? `
                            <div class="election-date-item">
                                <i class="fa-solid fa-calendar-check"></i>
                                <span class="election-date-item__label">ينتهي الترشح:</span>
                                <span class="election-date-item__value">${formatDate(election.nomination_end_date)}</span>
                            </div>
                        ` : `
                            <div class="election-date-item">
                                <i class="fa-solid fa-calendar-check"></i>
                                <span class="election-date-item__label">ينتهي التصويت:</span>
                                <span class="election-date-item__value">${formatDate(election.voting_end_date)}</span>
                            </div>
                        `}
                    </div>
                    <div style="margin-top: var(--spacing-lg);">
                        ${actionHtml}
                    </div>
                </div>
            </div>
        `;
    }

    renderNominationStatus(nomination, election) {
        const statusLabels = {
            pending: 'قيد المراجعة',
            approved: 'مقبول',
            rejected: 'مرفوض',
            file_deleted: 'يرجى رفع ملف جديد'
        };

        const statusIcons = {
            pending: 'fa-clock',
            approved: 'fa-check-circle',
            rejected: 'fa-times-circle',
            file_deleted: 'fa-exclamation-circle'
        };

        const statusColors = {
            pending: 'var(--color-warning)',
            approved: 'var(--color-success)',
            rejected: 'var(--color-danger)',
            file_deleted: 'var(--color-warning)'
        };

        let html = `
            <div class="nomination-status nomination-status--${nomination.status}">
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                    <i class="fa-solid ${statusIcons[nomination.status]}" style="color: ${statusColors[nomination.status]}; font-size: 1.5rem;"></i>
                    <div>
                        <strong>حالة ترشحك: ${statusLabels[nomination.status]}</strong>
                        <p style="margin: 0; font-size: var(--font-size-sm); color: var(--text-muted);">
                            تم التقديم: ${new Date(nomination.submitted_at).toLocaleDateString('ar-SA')}
                        </p>
                    </div>
                </div>
        `;

        if (nomination.status === 'rejected' && nomination.rejection_reason) {
            html += `
                <p style="color: var(--color-danger); margin-top: var(--spacing-sm);">
                    <i class="fa-solid fa-info-circle"></i>
                    سبب الرفض: ${nomination.rejection_reason}
                </p>
            `;
        }

        if (nomination.status === 'file_deleted') {
            html += `
                <button class="btn btn--primary btn--sm" style="margin-top: var(--spacing-sm);" 
                        onclick="memberNominations.showReuploadForm('${nomination.id}', '${election.id}')">
                    <i class="fa-solid fa-upload"></i>
                    رفع ملف جديد
                </button>
            `;
        }

        if (nomination.nomination_file_url) {
            html += `
                <a href="${nomination.nomination_file_url}" target="_blank" class="btn btn--outline btn--outline-primary btn--sm" style="margin-top: var(--spacing-sm);">
                    <i class="fa-solid fa-file-pdf"></i>
                    عرض ملف الترشح
                </a>
            `;
        }

        html += '</div>';
        return html;
    }

    showNominationForm(electionId) {
        const election = this.activeElections.find(e => e.id === electionId);
        if (!election) return;

        const positionLabels = {
            leader: 'قائد اللجنة',
            deputy: 'نائب القائد'
        };

        const modalContent = `
            <div class="modal-header">
                <h2><i class="fa-solid fa-hand-paper"></i> تقديم الترشح</h2>
                <button class="btn btn--icon btn--icon-sm modal-close" onclick="memberNominations.closeModal()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="nomination-form">
                    <div style="text-align: center; margin-bottom: var(--spacing-xl);">
                        <h3>${election.committees.committee_name_ar}</h3>
                        <p style="color: var(--text-muted);">منصب: ${positionLabels[election.position_type]}</p>
                    </div>

                    <div class="nomination-instructions">
                        <h4><i class="fa-solid fa-lightbulb"></i> تعليمات مهمة</h4>
                        <ul>
                            <li>احرص أن يكون الملف المرفق واضحاً ويُخاطب أعضاء لجنتك</li>
                            <li>اشرح رؤيتك وخططك للجنة</li>
                            <li>حدد أهدافك ومؤهلاتك</li>
                            <li>الملفات المقبولة: PDF, DOCX, DOC</li>
                        </ul>
                    </div>

                    <div class="nomination-file-upload" id="fileUploadArea" onclick="document.getElementById('nominationFile').click()">
                        <i class="fa-solid fa-cloud-upload-alt"></i>
                        <p>اضغط هنا لرفع ملف الترشح</p>
                        <span class="file-types">PDF, DOCX, DOC - الحد الأقصى 10MB</span>
                        <input type="file" id="nominationFile" accept=".pdf,.docx,.doc" style="display: none;" 
                               onchange="memberNominations.handleFileSelect(event)">
                    </div>
                    <div id="selectedFileName" style="margin-top: var(--spacing-sm); text-align: center; display: none;">
                        <i class="fa-solid fa-file"></i>
                        <span id="fileNameText"></span>
                        <button class="btn btn--icon btn--icon-sm" onclick="memberNominations.removeFile()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn--outline btn--outline-secondary" onclick="memberNominations.closeModal()">
                    إلغاء
                </button>
                <button class="btn btn--primary" id="submitNominationBtn" disabled onclick="memberNominations.submitNomination('${electionId}')">
                    <i class="fa-solid fa-paper-plane"></i>
                    تقديم الترشح
                </button>
            </div>
        `;

        this.showModal(modalContent);
        this.selectedFile = null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // التحقق من نوع الملف
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('نوع الملف غير مدعوم. يرجى رفع ملف PDF أو DOCX أو DOC');
            return;
        }

        // التحقق من حجم الملف (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('حجم الملف كبير جداً. الحد الأقصى 10MB');
            return;
        }

        this.selectedFile = file;
        
        const uploadArea = document.getElementById('fileUploadArea');
        const fileNameDiv = document.getElementById('selectedFileName');
        const fileNameText = document.getElementById('fileNameText');
        const submitBtn = document.getElementById('submitNominationBtn');

        uploadArea.classList.add('has-file');
        fileNameDiv.style.display = 'block';
        fileNameText.textContent = file.name;
        submitBtn.disabled = false;
    }

    removeFile() {
        this.selectedFile = null;
        
        const uploadArea = document.getElementById('fileUploadArea');
        const fileNameDiv = document.getElementById('selectedFileName');
        const submitBtn = document.getElementById('submitNominationBtn');
        const fileInput = document.getElementById('nominationFile');

        uploadArea.classList.remove('has-file');
        fileNameDiv.style.display = 'none';
        submitBtn.disabled = true;
        fileInput.value = '';
    }

    async submitNomination(electionId) {
        if (!this.selectedFile) {
            this.showError('يرجى رفع ملف الترشح');
            return;
        }

        const submitBtn = document.getElementById('submitNominationBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الرفع...';

        try {
            // رفع الملف إلى Storage
            const fileExt = this.selectedFile.name.split('.').pop();
            const fileName = `${this.currentUserId}_${electionId}_${Date.now()}.${fileExt}`;
            const filePath = `nominations/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('election-files')
                .upload(filePath, this.selectedFile);

            if (uploadError) throw uploadError;

            // الحصول على رابط الملف
            const { data: urlData } = supabase.storage
                .from('election-files')
                .getPublicUrl(filePath);

            // إنشاء سجل الترشح
            const { error: insertError } = await supabase
                .from('election_candidates')
                .insert({
                    election_id: electionId,
                    member_id: this.currentUserId,
                    nomination_file_url: urlData.publicUrl,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            this.closeModal();
            this.showSuccess('تم تقديم ترشحك بنجاح! سيتم مراجعة طلبك وعند القبول ستدخل السباق الانتخابي.');
            await this.loadActiveElections();
        } catch (error) {
            console.error('Error submitting nomination:', error);
            if (error.code === '23505') {
                this.showError('لقد قمت بالترشح مسبقاً لهذا الانتخاب');
            } else {
                this.showError('حدث خطأ في تقديم الترشح');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> تقديم الترشح';
        }
    }

    showReuploadForm(nominationId, electionId) {
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fa-solid fa-upload"></i> رفع ملف جديد</h2>
                <button class="btn btn--icon btn--icon-sm modal-close" onclick="memberNominations.closeModal()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="nomination-form">
                    <div class="alert alert--info" style="margin-bottom: var(--spacing-lg);">
                        <i class="fa-solid fa-info-circle"></i>
                        تم حذف ملفك السابق. يرجى رفع ملف جديد لإكمال ترشحك.
                    </div>

                    <div class="nomination-file-upload" id="fileUploadArea" onclick="document.getElementById('nominationFile').click()">
                        <i class="fa-solid fa-cloud-upload-alt"></i>
                        <p>اضغط هنا لرفع ملف الترشح</p>
                        <span class="file-types">PDF, DOCX, DOC - الحد الأقصى 10MB</span>
                        <input type="file" id="nominationFile" accept=".pdf,.docx,.doc" style="display: none;" 
                               onchange="memberNominations.handleFileSelect(event)">
                    </div>
                    <div id="selectedFileName" style="margin-top: var(--spacing-sm); text-align: center; display: none;">
                        <i class="fa-solid fa-file"></i>
                        <span id="fileNameText"></span>
                        <button class="btn btn--icon btn--icon-sm" onclick="memberNominations.removeFile()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn--outline btn--outline-secondary" onclick="memberNominations.closeModal()">
                    إلغاء
                </button>
                <button class="btn btn--primary" id="submitNominationBtn" disabled onclick="memberNominations.reuploadFile('${nominationId}')">
                    <i class="fa-solid fa-upload"></i>
                    رفع الملف
                </button>
            </div>
        `;

        this.showModal(modalContent);
        this.selectedFile = null;
    }

    async reuploadFile(nominationId) {
        if (!this.selectedFile) {
            this.showError('يرجى اختيار ملف');
            return;
        }

        const submitBtn = document.getElementById('submitNominationBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الرفع...';

        try {
            // رفع الملف
            const fileExt = this.selectedFile.name.split('.').pop();
            const fileName = `${this.currentUserId}_${nominationId}_${Date.now()}.${fileExt}`;
            const filePath = `nominations/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('election-files')
                .upload(filePath, this.selectedFile);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('election-files')
                .getPublicUrl(filePath);

            // تحديث سجل الترشح
            const { error: updateError } = await supabase
                .from('election_candidates')
                .update({
                    nomination_file_url: urlData.publicUrl,
                    status: 'pending',
                    submitted_at: new Date().toISOString()
                })
                .eq('id', nominationId);

            if (updateError) throw updateError;

            this.closeModal();
            this.showSuccess('تم رفع الملف بنجاح! سيتم مراجعة طلبك.');
            await this.loadActiveElections();
        } catch (error) {
            console.error('Error reuploading file:', error);
            this.showError('حدث خطأ في رفع الملف');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> رفع الملف';
        }
    }

    async openVoting(electionId) {
        // استخدام نفس واجهة التصويت من elections-manager
        if (typeof electionsManager !== 'undefined') {
            electionsManager.openVoting(electionId);
        } else {
            this.showError('حدث خطأ في فتح صفحة التصويت');
        }
    }

    showNoCommitteeMessage() {
        const container = document.getElementById('nominationsContainer');
        if (container) {
            container.innerHTML = `
                <div class="elections-empty">
                    <i class="fa-solid fa-users-slash"></i>
                    <h3>لست منتسباً لأي لجنة</h3>
                    <p>يجب أن تكون عضواً في لجنة للمشاركة في الانتخابات</p>
                </div>
            `;
        }
    }

    // ============================================================================
    // Modal Helpers
    // ============================================================================

    showModal(content) {
        let modal = document.getElementById('nominationsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'nominationsModal';
            modal.className = 'modal-backdrop';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal">
                ${content}
            </div>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('nominationsModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ============================================================================
    // UI Helpers
    // ============================================================================

    showLoading() {
        const container = document.getElementById('nominationsContainer');
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

// تهيئة المدير
let memberNominations;
document.addEventListener('DOMContentLoaded', () => {
    // سيتم تهيئته عند الحاجة
});

function initMemberNominations() {
    if (!memberNominations) {
        memberNominations = new MemberNominations();
    }
    memberNominations.loadActiveElections();
}
