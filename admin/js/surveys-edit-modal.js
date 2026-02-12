/**
 * نظام تعديل الاستبيانات بالنوافذ المنبثقة
 * Survey Edit Modal System - نادي أدِيب
 */

(function() {
    const sb = window.sbClient;

    class SurveyEditModal {
        constructor() {
            this.currentSurvey = null;
            this.currentQuestions = [];
            this.activeTab = 'basic';
            this.hasChanges = false;
            this.questionTypes = this.getQuestionTypes();
        }

        getQuestionTypes() {
            return [
                { value: 'short_text', label: 'نص قصير', icon: 'fa-font' },
                { value: 'long_text', label: 'نص طويل', icon: 'fa-align-left' },
                { value: 'single_choice', label: 'اختيار واحد', icon: 'fa-circle-dot' },
                { value: 'multiple_choice', label: 'اختيارات متعددة', icon: 'fa-square-check' },
                { value: 'dropdown', label: 'قائمة منسدلة', icon: 'fa-caret-down' },
                { value: 'linear_scale', label: 'مقياس خطي', icon: 'fa-sliders' },
                { value: 'rating_stars', label: 'تقييم بالنجوم', icon: 'fa-star' },
                { value: 'rating_hearts', label: 'تقييم بالقلوب', icon: 'fa-heart' },
                { value: 'rating_emojis', label: 'تقييم بالإيموجي', icon: 'fa-face-smile' },
                { value: 'number', label: 'رقم', icon: 'fa-hashtag' },
                { value: 'email', label: 'بريد إلكتروني', icon: 'fa-envelope' },
                { value: 'phone', label: 'رقم هاتف', icon: 'fa-phone' },
                { value: 'date', label: 'تاريخ', icon: 'fa-calendar' },
                { value: 'time', label: 'وقت', icon: 'fa-clock' },
                { value: 'yes_no', label: 'نعم/لا', icon: 'fa-toggle-on' }
            ];
        }

        async open(surveyId) {
            try {
                // جلب بيانات الاستبيان
                const { data: survey, error: surveyError } = await sb
                    .from('surveys')
                    .select('*')
                    .eq('id', surveyId)
                    .single();

                if (surveyError) throw surveyError;
                
                // محاولة جلب اسم المعدل إذا كان موجوداً
                if (survey.updated_by) {
                    const { data: updater } = await sb
                        .from('profiles')
                        .select('full_name')
                        .eq('id', survey.updated_by)
                        .single();
                    if (updater) {
                        survey.updated_by_profile = updater;
                    }
                }
                
                // جلب اسم المنشئ إذا لم يوجد معدل
                if (!survey.updated_by_profile && survey.created_by) {
                    const { data: creator } = await sb
                        .from('profiles')
                        .select('full_name')
                        .eq('id', survey.created_by)
                        .single();
                    if (creator) {
                        survey.created_by_profile = creator;
                    }
                }

                // جلب الأسئلة
                const { data: questions, error: questionsError } = await sb
                    .from('survey_questions')
                    .select('*')
                    .eq('survey_id', surveyId)
                    .order('question_order');

                if (questionsError) throw questionsError;

                this.currentSurvey = survey;
                this.currentQuestions = questions || [];
                this.hasChanges = false;

                this.render();
                this.show();
            } catch (error) {
                console.error('Error loading survey:', error);
                this.showNotification('حدث خطأ أثناء تحميل الاستبيان', 'error');
            }
        }

        render() {
            // إزالة أي modal موجود
            const existingModal = document.getElementById('surveyEditModal');
            if (existingModal) existingModal.remove();
            const existingBackdrop = document.getElementById('surveyEditBackdrop');
            if (existingBackdrop) existingBackdrop.remove();

            const hasResponses = (this.currentSurvey.total_responses || 0) > 0;

            const modalHTML = `
                <div class="modal-backdrop" id="surveyEditBackdrop">
                    <div class="modal survey-edit-modal active" id="surveyEditModal">
                        <div class="modal-header">
                            <div class="modal-header-content">
                                <i class="fa-solid fa-edit"></i>
                                <h3>تعديل الاستبيان</h3>
                            </div>
                            <button class="modal-close-x" onclick="window.surveyEditModal.close()">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <!-- Tabs -->
                            <div class="survey-edit-tabs">
                                <button class="survey-edit-tab ${this.activeTab === 'basic' ? 'active' : ''}" 
                                    onclick="window.surveyEditModal.switchTab('basic')">
                                    <i class="fa-solid fa-info-circle"></i>
                                    المعلومات الأساسية
                                </button>
                                <button class="survey-edit-tab ${this.activeTab === 'questions' ? 'active' : ''}" 
                                    onclick="window.surveyEditModal.switchTab('questions')">
                                    <i class="fa-solid fa-question-circle"></i>
                                    الأسئلة (${this.currentQuestions.length})
                                </button>
                                <button class="survey-edit-tab ${this.activeTab === 'settings' ? 'active' : ''}" 
                                    onclick="window.surveyEditModal.switchTab('settings')">
                                    <i class="fa-solid fa-cog"></i>
                                    الإعدادات
                                </button>
                            </div>
                            
                            <!-- Content -->
                            <div class="survey-edit-content">
                                ${hasResponses ? `
                                    <div class="edit-warning-banner">
                                        <i class="fa-solid fa-exclamation-triangle"></i>
                                        <div class="edit-warning-banner-text">
                                            <div class="edit-warning-banner-title">تنبيه: هذا الاستبيان لديه ${this.currentSurvey.total_responses} استجابة</div>
                                            <div class="edit-warning-banner-desc">التعديلات على الأسئلة قد تؤثر على البيانات المجمعة</div>
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Basic Info Panel -->
                                <div class="survey-edit-panel ${this.activeTab === 'basic' ? 'active' : ''}" id="basicPanel">
                                    ${this.renderBasicInfoPanel()}
                                </div>
                                
                                <!-- Questions Panel -->
                                <div class="survey-edit-panel ${this.activeTab === 'questions' ? 'active' : ''}" id="questionsPanel">
                                    ${this.renderQuestionsPanel()}
                                </div>
                                
                                <!-- Settings Panel -->
                                <div class="survey-edit-panel ${this.activeTab === 'settings' ? 'active' : ''}" id="settingsPanel">
                                    ${this.renderSettingsPanel()}
                                </div>
                            </div>
                        </div>
                        
                        <div class="survey-edit-footer">
                            <div class="survey-edit-footer-info">
                                <i class="fa-solid fa-clock"></i>
                                آخر تعديل: ${this.formatDate(this.currentSurvey.updated_at || this.currentSurvey.created_at)}
                                ${this.currentSurvey.updated_by_profile?.full_name ? `<span class="footer-info-separator">•</span><i class="fa-solid fa-user-pen"></i> ${this.escapeHtml(this.currentSurvey.updated_by_profile.full_name)}` : (this.currentSurvey.created_by_profile?.full_name ? `<span class="footer-info-separator">•</span><i class="fa-solid fa-user"></i> ${this.escapeHtml(this.currentSurvey.created_by_profile.full_name)}` : '')}
                            </div>
                            <div class="survey-edit-footer-actions">
                                <button class="btn btn--secondary" onclick="window.surveyEditModal.close()">
                                    <i class="fa-solid fa-times"></i>
                                    إلغاء
                                </button>
                                <button class="btn btn--primary" onclick="window.surveyEditModal.save()">
                                    <i class="fa-solid fa-save"></i>
                                    حفظ التغييرات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            document.body.classList.add('modal-open');

            // إضافة event listener للإغلاق بالنقر على الخلفية
            document.getElementById('surveyEditBackdrop').addEventListener('click', (e) => {
                if (e.target.id === 'surveyEditBackdrop') {
                    this.close();
                }
            });
        }

        renderBasicInfoPanel() {
            const survey = this.currentSurvey;

            return `
                <div class="edit-form-section">
                    <div class="edit-form-section-title">
                        <i class="fa-solid fa-file-alt"></i>
                        المعلومات الرئيسية
                    </div>
                    <div class="edit-form-grid single-column">
                        <div class="edit-form-group">
                            <label class="edit-form-label">
                                عنوان الاستبيان <span class="required">*</span>
                            </label>
                            <input type="text" class="edit-form-input" id="editSurveyTitle" 
                                value="${this.escapeHtml(survey.title || '')}" 
                                placeholder="أدخل عنوان الاستبيان"
                                onchange="window.surveyEditModal.markChanged()">
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">الوصف</label>
                            <textarea class="edit-form-textarea" id="editSurveyDescription" 
                                placeholder="وصف مختصر للاستبيان"
                                onchange="window.surveyEditModal.markChanged()">${this.escapeHtml(survey.description || '')}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="edit-form-section">
                    <div class="edit-form-section-title">
                        <i class="fa-solid fa-calendar"></i>
                        فترة النشر
                    </div>
                    <div class="edit-form-grid">
                        <div class="edit-form-group">
                            <label class="edit-form-label">تاريخ البدء</label>
                            <input type="datetime-local" class="edit-form-input" id="editSurveyStartDate" 
                                value="${survey.start_date ? this.formatDateForInput(survey.start_date) : ''}"
                                onchange="window.surveyEditModal.markChanged()">
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">تاريخ الانتهاء</label>
                            <input type="datetime-local" class="edit-form-input" id="editSurveyEndDate" 
                                value="${survey.end_date ? this.formatDateForInput(survey.end_date) : ''}"
                                onchange="window.surveyEditModal.markChanged()">
                        </div>
                    </div>
                </div>
                
                <div class="edit-form-section">
                    <div class="edit-form-section-title">
                        <i class="fa-solid fa-lock"></i>
                        إتاحة الاستبيان
                    </div>
                    <div class="edit-form-grid single-column">
                        <div class="edit-form-group">
                            <label class="edit-form-label">من يمكنه الإجابة على الاستبيان</label>
                            <select class="edit-form-input" id="editSurveyAccessType" 
                                onchange="window.surveyEditModal.markChanged()">
                                <option value="public" ${survey.access_type === 'public' ? 'selected' : ''}>متاح للعامة</option>
                                <option value="members_only" ${survey.access_type === 'members_only' ? 'selected' : ''}>لأعضاء أدِيب المسجلين فقط</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="edit-form-section">
                    <div class="edit-form-section-title">
                        <i class="fa-solid fa-message"></i>
                        الرسائل المخصصة
                    </div>
                    <div class="edit-form-grid single-column">
                        <div class="edit-form-group">
                            <label class="edit-form-label">رسالة الترحيب</label>
                            <textarea class="edit-form-textarea" id="editWelcomeMessage" 
                                placeholder="رسالة ترحيبية تظهر في بداية الاستبيان"
                                onchange="window.surveyEditModal.markChanged()">${this.escapeHtml(survey.welcome_message || '')}</textarea>
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">رسالة الشكر</label>
                            <textarea class="edit-form-textarea" id="editThankYouMessage" 
                                placeholder="رسالة شكر تظهر بعد إكمال الاستبيان"
                                onchange="window.surveyEditModal.markChanged()">${this.escapeHtml(survey.thank_you_message || 'شكراً لمشاركتك في هذا الاستبيان')}</textarea>
                        </div>
                    </div>
                </div>
            `;
        }

        renderQuestionsPanel() {
            if (this.currentQuestions.length === 0) {
                return `
                    <div class="results-empty-state">
                        <div class="results-empty-icon">
                            <i class="fa-solid fa-question"></i>
                        </div>
                        <div class="results-empty-title">لا توجد أسئلة</div>
                        <div class="results-empty-text">ابدأ بإضافة أسئلة للاستبيان</div>
                        <button class="btn btn--primary" onclick="window.surveyEditModal.addQuestion()">
                            <i class="fa-solid fa-plus"></i>
                            إضافة سؤال
                        </button>
                    </div>
                `;
            }

            return `
                <div class="edit-questions-list">
                    ${this.currentQuestions.map((q, index) => this.renderQuestionItem(q, index)).join('')}
                </div>
                <button class="add-question-btn" onclick="window.surveyEditModal.addQuestion()">
                    <i class="fa-solid fa-plus"></i>
                    إضافة سؤال جديد
                </button>
            `;
        }

        renderQuestionItem(question, index) {
            const typeInfo = this.questionTypes.find(t => t.value === question.question_type) || 
                { label: question.question_type, icon: 'fa-question' };

            return `
                <div class="edit-question-item" data-question-index="${index}">
                    <div class="edit-question-header">
                        <div class="edit-question-number">${index + 1}</div>
                        <div class="edit-question-info">
                            <div class="edit-question-text">${this.escapeHtml(question.question_text || 'سؤال بدون نص')}</div>
                            <div class="edit-question-type">
                                <i class="fa-solid ${typeInfo.icon}"></i>
                                ${typeInfo.label}
                                ${question.is_required ? '<span class="required-indicator">• إجباري</span>' : ''}
                            </div>
                        </div>
                        <div class="edit-question-actions">
                            <button class="edit-question-btn move" onclick="window.surveyEditModal.moveQuestion(${index}, 'up')" title="تحريك لأعلى" ${index === 0 ? 'disabled' : ''}>
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="edit-question-btn move" onclick="window.surveyEditModal.moveQuestion(${index}, 'down')" title="تحريك لأسفل">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <button class="edit-question-btn edit" onclick="window.surveyEditModal.editQuestion(${index})" title="تعديل">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button class="edit-question-btn delete" onclick="window.surveyEditModal.deleteQuestion(${index})" title="حذف">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        renderSettingsPanel() {
            const survey = this.currentSurvey;

            const settings = [
                {
                    id: 'allowMultipleResponses',
                    label: 'السماح بإجابات متعددة',
                    desc: 'السماح للمستخدم بالإجابة أكثر من مرة',
                    checked: survey.allow_multiple_responses
                },
                {
                    id: 'allowAnonymous',
                    label: 'إخفاء هوية المستجيب',
                    desc: 'عدم تسجيل هوية المستجيب',
                    checked: survey.allow_anonymous
                },
                {
                    id: 'showProgressBar',
                    label: 'عرض شريط التقدم',
                    desc: 'إظهار نسبة الإكمال للمستجيب',
                    checked: survey.show_progress_bar !== false
                },
                {
                    id: 'showResults',
                    label: 'عرض النتائج للمشاركين',
                    desc: 'السماح للمشاركين برؤية النتائج بعد الإجابة',
                    checked: survey.show_results_to_participants
                }
            ];

            return `
                <div class="edit-form-section">
                    <div class="edit-form-section-title">
                        <i class="fa-solid fa-sliders"></i>
                        إعدادات الاستبيان
                    </div>
                    <div class="edit-settings-grid">
                        ${settings.map(setting => `
                            <div class="edit-setting-item">
                                <div class="edit-setting-info">
                                    <div class="edit-setting-label">${setting.label}</div>
                                    <div class="edit-setting-desc">${setting.desc}</div>
                                </div>
                                <label class="edit-toggle">
                                    <input type="checkbox" id="edit${setting.id}" 
                                        ${setting.checked ? 'checked' : ''}
                                        onchange="window.surveyEditModal.markChanged()">
                                    <span class="edit-toggle-slider"></span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        switchTab(tabName) {
            this.activeTab = tabName;
            
            // تحديث التبويبات
            document.querySelectorAll('.survey-edit-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector(`.survey-edit-tab[onclick*="${tabName}"]`).classList.add('active');
            
            // تحديث المحتوى
            document.querySelectorAll('.survey-edit-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(`${tabName}Panel`).classList.add('active');
        }

        addQuestion() {
            const newQuestion = {
                id: null,
                survey_id: this.currentSurvey.id,
                question_text: '',
                question_type: 'short_text',
                question_order: this.currentQuestions.length,
                is_required: false,
                options: null
            };

            this.currentQuestions.push(newQuestion);
            this.hasChanges = true;
            this.updateQuestionsPanel();
            this.editQuestion(this.currentQuestions.length - 1);
        }

        editQuestion(index) {
            const question = this.currentQuestions[index];
            
            const modalHTML = `
                <div class="modal-backdrop active modal-backdrop--high" id="questionEditBackdrop">
                    <div class="modal modal-md active modal--high">
                        <div class="modal-header">
                            <div class="modal-header-content">
                                <i class="fa-solid fa-question-circle"></i>
                                <h3>${question.id ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
                            </div>
                            <button class="modal-close-x" onclick="window.surveyEditModal.closeQuestionEdit()">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="edit-form-group">
                                <label class="edit-form-label">نص السؤال <span class="required">*</span></label>
                                <input type="text" class="edit-form-input" id="questionText" 
                                    value="${this.escapeHtml(question.question_text || '')}"
                                    placeholder="أدخل نص السؤال">
                            </div>
                            <div class="edit-form-grid">
                                <div class="edit-form-group">
                                    <label class="edit-form-label">نوع السؤال</label>
                                    <select class="edit-form-select" id="questionType" onchange="window.surveyEditModal.onQuestionTypeChange()">
                                        ${this.questionTypes.map(type => `
                                            <option value="${type.value}" ${question.question_type === type.value ? 'selected' : ''}>
                                                ${type.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="edit-form-group">
                                    <label class="edit-form-label">إجباري</label>
                                    <label class="edit-toggle">
                                        <input type="checkbox" id="questionRequired" ${question.is_required ? 'checked' : ''}>
                                        <span class="edit-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div id="questionOptionsContainer">
                                ${this.renderQuestionOptions(question)}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn--secondary" onclick="window.surveyEditModal.closeQuestionEdit()">
                                إلغاء
                            </button>
                            <button class="btn btn--primary" onclick="window.surveyEditModal.saveQuestion(${index})">
                                <i class="fa-solid fa-check"></i>
                                حفظ السؤال
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        renderQuestionOptions(question) {
            const needsOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(question.question_type);
            const needsScale = ['linear_scale', 'rating_stars', 'rating_hearts', 'slider'].includes(question.question_type);

            if (needsOptions) {
                const options = question.options?.choices || ['', ''];
                return `
                    <div class="edit-form-group">
                        <label class="edit-form-label">الخيارات</label>
                        <div id="optionsList" class="options-list">
                            ${options.map((opt, i) => `
                                <div class="option-item">
                                    <input type="text" class="edit-form-input question-option" 
                                        value="${this.escapeHtml(opt)}" 
                                        placeholder="خيار ${i + 1}">
                                    <button type="button" class="btn btn--icon btn--icon-danger" 
                                        onclick="this.parentElement.remove()" 
                                        ${options.length <= 2 ? 'disabled' : ''}>
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn--outline-primary btn--sm add-option-btn"
                            onclick="window.surveyEditModal.addOption()">
                            <i class="fa-solid fa-plus"></i>
                            إضافة خيار
                        </button>
                    </div>
                `;
            }

            if (needsScale) {
                const scale = question.options?.scale || { min: 1, max: 5 };
                return `
                    <div class="edit-form-grid">
                        <div class="edit-form-group">
                            <label class="edit-form-label">الحد الأدنى</label>
                            <input type="number" class="edit-form-input" id="scaleMin" value="${scale.min}">
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">الحد الأقصى</label>
                            <input type="number" class="edit-form-input" id="scaleMax" value="${scale.max}">
                        </div>
                    </div>
                `;
            }

            return '';
        }

        onQuestionTypeChange() {
            const type = document.getElementById('questionType').value;
            const container = document.getElementById('questionOptionsContainer');
            container.innerHTML = this.renderQuestionOptions({ question_type: type, options: null });
        }

        addOption() {
            const list = document.getElementById('optionsList');
            const count = list.children.length + 1;
            const optionHTML = `
                <div class="option-item">
                    <input type="text" class="edit-form-input question-option" 
                        value="" 
                        placeholder="خيار ${count}">
                    <button type="button" class="btn btn--icon btn--icon-danger" 
                        onclick="this.parentElement.remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', optionHTML);
        }

        saveQuestion(index) {
            const text = document.getElementById('questionText').value.trim();
            if (!text) {
                this.showNotification('يرجى إدخال نص السؤال', 'error');
                return;
            }

            const type = document.getElementById('questionType').value;
            const required = document.getElementById('questionRequired').checked;

            let options = null;
            if (['single_choice', 'multiple_choice', 'dropdown'].includes(type)) {
                const optionInputs = document.querySelectorAll('.question-option');
                const choices = Array.from(optionInputs).map(input => input.value.trim()).filter(v => v);
                if (choices.length < 2) {
                    this.showNotification('يرجى إضافة خيارين على الأقل', 'error');
                    return;
                }
                options = { choices };
            } else if (['linear_scale', 'rating_stars', 'rating_hearts', 'slider'].includes(type)) {
                const min = parseInt(document.getElementById('scaleMin')?.value) || 1;
                const max = parseInt(document.getElementById('scaleMax')?.value) || 5;
                options = { scale: { min, max } };
            }

            this.currentQuestions[index] = {
                ...this.currentQuestions[index],
                question_text: text,
                question_type: type,
                is_required: required,
                options: options
            };

            this.hasChanges = true;
            this.closeQuestionEdit();
            this.updateQuestionsPanel();
        }

        closeQuestionEdit() {
            const backdrop = document.getElementById('questionEditBackdrop');
            if (backdrop) backdrop.remove();
        }

        async deleteQuestion(index) {
            const confirmed = await ModalHelper.confirm({
                title: 'حذف السؤال',
                message: 'هل أنت متأكد من حذف هذا السؤال؟',
                type: 'danger',
                confirmText: 'نعم، احذف',
                cancelText: 'إلغاء'
            });
            
            if (confirmed) {
                this.currentQuestions.splice(index, 1);
                this.hasChanges = true;
                this.updateQuestionsPanel();
            }
        }

        moveQuestion(index, direction) {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            
            // التحقق من الحدود
            if (newIndex < 0 || newIndex >= this.currentQuestions.length) {
                return;
            }

            // تبديل المواقع
            const temp = this.currentQuestions[index];
            this.currentQuestions[index] = this.currentQuestions[newIndex];
            this.currentQuestions[newIndex] = temp;

            // تحديث ترتيب الأسئلة
            this.currentQuestions.forEach((q, i) => {
                q.question_order = i;
            });

            this.hasChanges = true;
            this.updateQuestionsPanel();
        }

        updateQuestionsPanel() {
            const panel = document.getElementById('questionsPanel');
            if (panel) {
                panel.innerHTML = this.renderQuestionsPanel();
            }
            // تحديث عدد الأسئلة في التبويب
            const tab = document.querySelector('.survey-edit-tab[onclick*="questions"]');
            if (tab) {
                tab.innerHTML = `<i class="fa-solid fa-question-circle"></i> الأسئلة (${this.currentQuestions.length})`;
            }
        }

        markChanged() {
            this.hasChanges = true;
        }

        renderStatusButtons() {
            const status = this.currentSurvey.status;
            let buttons = '';
            
            // أزرار تغيير الحالة بناءً على الحالة الحالية
            if (status === 'draft') {
                buttons = `
                    <button class="btn btn--success btn--sm" onclick="window.surveyEditModal.changeStatus('active')" title="نشر الاستبيان">
                        <i class="fa-solid fa-paper-plane"></i>
                        نشر
                    </button>
                `;
            } else if (status === 'active') {
                buttons = `
                    <button class="btn btn--warning btn--sm" onclick="window.surveyEditModal.changeStatus('paused')" title="إيقاف مؤقت">
                        <i class="fa-solid fa-pause"></i>
                        إيقاف
                    </button>
                    <button class="btn btn--danger btn--sm" onclick="window.surveyEditModal.endSurvey()" title="إنهاء نهائي">
                        <i class="fa-solid fa-stop"></i>
                        إنهاء
                    </button>
                `;
            } else if (status === 'paused') {
                buttons = `
                    <button class="btn btn--success btn--sm" onclick="window.surveyEditModal.changeStatus('active')" title="تفعيل">
                        <i class="fa-solid fa-play"></i>
                        تفعيل
                    </button>
                    <button class="btn btn--secondary btn--sm" onclick="window.surveyEditModal.changeStatus('draft')" title="تحويل لمسودة">
                        <i class="fa-solid fa-file-pen"></i>
                        مسودة
                    </button>
                `;
            } else if (status === 'closed') {
                buttons = `
                    <button class="btn btn--info btn--sm" onclick="window.surveyEditModal.changeStatus('draft')" title="إعادة كمسودة">
                        <i class="fa-solid fa-rotate-left"></i>
                        إعادة كمسودة
                    </button>
                `;
            }
            
            return buttons;
        }

        async changeStatus(newStatus) {
            try {
                const { error } = await sb
                    .from('surveys')
                    .update({ status: newStatus, updated_at: new Date().toISOString() })
                    .eq('id', this.currentSurvey.id);

                if (error) throw error;

                this.currentSurvey.status = newStatus;
                this.showNotification('تم تغيير حالة الاستبيان بنجاح', 'success');
                
                // إعادة تحميل قائمة الاستبيانات
                if (window.surveysManager) {
                    await window.surveysManager.loadAllSurveys();
                }
                
                this.close();
            } catch (error) {
                console.error('Error changing status:', error);
                this.showNotification('حدث خطأ أثناء تغيير الحالة', 'error');
            }
        }

        async endSurvey() {
            if (!confirm('هل أنت متأكد من إنهاء الاستبيان نهائياً؟ لن يتمكن أي شخص من الإجابة عليه بعد ذلك.')) {
                return;
            }
            
            try {
                const { error } = await sb
                    .from('surveys')
                    .update({ 
                        status: 'active',
                        end_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.currentSurvey.id);

                if (error) throw error;

                this.showNotification('تم إنهاء الاستبيان بنجاح', 'success');
                
                if (window.surveysManager) {
                    await window.surveysManager.loadAllSurveys();
                }
                
                this.close();
            } catch (error) {
                console.error('Error ending survey:', error);
                this.showNotification('حدث خطأ أثناء إنهاء الاستبيان', 'error');
            }
        }

        async save() {
            try {
                const title = document.getElementById('editSurveyTitle').value.trim();
                if (!title) {
                    this.showNotification('يرجى إدخال عنوان الاستبيان', 'error');
                    return;
                }

                // تحويل التواريخ المحلية إلى ISO مع الحفاظ على التوقيت الصحيح
                const startDateInput = document.getElementById('editSurveyStartDate').value;
                const endDateInput = document.getElementById('editSurveyEndDate').value;
                
                // تحويل التاريخ المحلي إلى ISO string
                const convertLocalDateToISO = (dateValue) => {
                    if (!dateValue) return null;
                    const localDate = new Date(dateValue + ':00');
                    return localDate.toISOString();
                };
                
                const startDate = convertLocalDateToISO(startDateInput);
                const endDate = convertLocalDateToISO(endDateInput);

                // الحصول على معرف المستخدم الحالي
                const { data: { user } } = await sb.auth.getUser();

                // جمع البيانات - الحالة تبقى كما هي (لا يتم تغييرها من هنا)
                // ملاحظة: تم إزالة updated_by لأن العمود غير موجود في قاعدة البيانات
                const surveyData = {
                    title,
                    description: document.getElementById('editSurveyDescription').value || null,
                    survey_type: 'general',
                    access_type: document.getElementById('editSurveyAccessType')?.value || 'public',
                    start_date: startDate,
                    end_date: endDate,
                    welcome_message: document.getElementById('editWelcomeMessage').value || null,
                    thank_you_message: document.getElementById('editThankYouMessage').value || 'شكراً لمشاركتك',
                    allow_multiple_responses: document.getElementById('editallowMultipleResponses')?.checked || false,
                    allow_anonymous: document.getElementById('editallowAnonymous')?.checked || false,
                    show_progress_bar: document.getElementById('editshowProgressBar')?.checked !== false,
                    show_results_to_participants: document.getElementById('editshowResults')?.checked || false,
                    updated_at: new Date().toISOString()
                };

                // تحديث الاستبيان
                const { error: surveyError } = await sb
                    .from('surveys')
                    .update(surveyData)
                    .eq('id', this.currentSurvey.id);

                if (surveyError) throw surveyError;

                // حذف الأسئلة القديمة وإضافة الجديدة
                await sb.from('survey_questions').delete().eq('survey_id', this.currentSurvey.id);

                if (this.currentQuestions.length > 0) {
                    const questionsToInsert = this.currentQuestions.map((q, index) => ({
                        survey_id: this.currentSurvey.id,
                        question_text: q.question_text,
                        question_type: q.question_type,
                        question_order: index,
                        is_required: q.is_required,
                        options: q.options
                    }));

                    const { error: questionsError } = await sb.from('survey_questions').insert(questionsToInsert);
                    if (questionsError) throw questionsError;
                }

                this.showNotification('تم حفظ التغييرات بنجاح', 'success');
                this.hasChanges = false;
                
                // إعادة تحميل قائمة الاستبيانات
                if (window.surveysManager) {
                    await window.surveysManager.loadAllSurveys();
                }

                this.close();

            } catch (error) {
                console.error('Error saving survey:', error);
                this.showNotification('حدث خطأ أثناء حفظ التغييرات', 'error');
            }
        }

        show() {
            const backdrop = document.getElementById('surveyEditBackdrop');
            if (backdrop) {
                backdrop.classList.add('active');
            }
        }

        async close() {
            if (this.hasChanges) {
                const confirmed = await ModalHelper.confirm({
                    title: 'تغييرات غير محفوظة',
                    message: 'لديك تغييرات غير محفوظة. هل تريد الإغلاق؟',
                    type: 'warning',
                    confirmText: 'نعم، أغلق',
                    cancelText: 'إلغاء'
                });
                if (!confirmed) {
                    return;
                }
            }

            const backdrop = document.getElementById('surveyEditBackdrop');
            const modal = document.getElementById('surveyEditModal');
            
            if (modal) modal.classList.remove('active');
            if (backdrop) {
                backdrop.classList.remove('active');
                setTimeout(() => backdrop.remove(), 300);
            }
            
            document.body.classList.remove('modal-open');
            this.currentSurvey = null;
            this.currentQuestions = [];
            this.hasChanges = false;
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        formatDate(dateString) {
            if (!dateString) return 'غير محدد';
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        formatDateForInput(dateString) {
            // تحويل التاريخ من قاعدة البيانات (UTC) إلى التوقيت المحلي لعرضه في حقل datetime-local
            if (!dateString) return '';
            const date = new Date(dateString);
            // تحويل إلى التوقيت المحلي بصيغة YYYY-MM-DDTHH:mm
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        showNotification(message, type = 'info') {
            // استخدام نظام Toast الموحد بدلاً من الإشعارات المخصصة
            if (window.Toast) {
                if (type === 'success') {
                    Toast.success(message);
                } else if (type === 'error') {
                    Toast.error(message);
                } else {
                    Toast.info(message);
                }
            } else {
                // fallback في حالة عدم توفر Toast
                console.log(`[${type}] ${message}`);
            }
        }
    }

    window.surveyEditModal = new SurveyEditModal();
})();
