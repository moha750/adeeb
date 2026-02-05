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
            const typeOptions = [
                { value: 'general', label: 'عام' },
                { value: 'membership', label: 'عضوية' },
                { value: 'event', label: 'فعالية' },
                { value: 'feedback', label: 'تقييم' },
                { value: 'evaluation', label: 'تقويم' },
                { value: 'poll', label: 'استطلاع' },
                { value: 'quiz', label: 'اختبار' },
                { value: 'research', label: 'بحث' }
            ];

            const accessOptions = [
                { value: 'public', label: 'عام (الجميع)' },
                { value: 'authenticated', label: 'مستخدمون مسجلون' },
                { value: 'members_only', label: 'أعضاء فقط' }
            ];

            const statusOptions = [
                { value: 'draft', label: 'مسودة' },
                { value: 'active', label: 'نشط' },
                { value: 'paused', label: 'متوقف' },
                { value: 'closed', label: 'مغلق' }
            ];

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
                        <i class="fa-solid fa-tags"></i>
                        التصنيف والحالة
                    </div>
                    <div class="edit-form-grid">
                        <div class="edit-form-group">
                            <label class="edit-form-label">نوع الاستبيان</label>
                            <select class="edit-form-select" id="editSurveyType" onchange="window.surveyEditModal.markChanged()">
                                ${typeOptions.map(opt => `
                                    <option value="${opt.value}" ${survey.survey_type === opt.value ? 'selected' : ''}>
                                        ${opt.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">الحالة</label>
                            <select class="edit-form-select" id="editSurveyStatus" onchange="window.surveyEditModal.markChanged()">
                                ${statusOptions.map(opt => `
                                    <option value="${opt.value}" ${survey.status === opt.value ? 'selected' : ''}>
                                        ${opt.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">نوع الوصول</label>
                            <select class="edit-form-select" id="editSurveyAccess" onchange="window.surveyEditModal.markChanged()">
                                ${accessOptions.map(opt => `
                                    <option value="${opt.value}" ${survey.access_type === opt.value ? 'selected' : ''}>
                                        ${opt.label}
                                    </option>
                                `).join('')}
                            </select>
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
                                value="${survey.start_date ? new Date(survey.start_date).toISOString().slice(0, 16) : ''}"
                                onchange="window.surveyEditModal.markChanged()">
                        </div>
                        <div class="edit-form-group">
                            <label class="edit-form-label">تاريخ الانتهاء</label>
                            <input type="datetime-local" class="edit-form-input" id="editSurveyEndDate" 
                                value="${survey.end_date ? new Date(survey.end_date).toISOString().slice(0, 16) : ''}"
                                onchange="window.surveyEditModal.markChanged()">
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
                                ${question.is_required ? '<span style="color: #ef4444; margin-right: 0.5rem;">• إجباري</span>' : ''}
                            </div>
                        </div>
                        <div class="edit-question-actions">
                            <button class="edit-question-btn move" title="تحريك">
                                <i class="fa-solid fa-grip-vertical"></i>
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
                    label: 'السماح بالإجابات المجهولة',
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
                <div class="modal-backdrop active" id="questionEditBackdrop" style="z-index: 1100;">
                    <div class="modal modal-md active" style="z-index: 1101;">
                        <div class="modal-header">
                            <div class="modal-header-content">
                                <i class="fa-solid fa-question-circle"></i>
                                <h3>${question.id ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
                            </div>
                            <button class="modal-close-x" onclick="window.surveyEditModal.closeQuestionEdit()">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body" style="padding: 1.5rem;">
                            <div class="edit-form-group" style="margin-bottom: 1rem;">
                                <label class="edit-form-label">نص السؤال <span class="required">*</span></label>
                                <input type="text" class="edit-form-input" id="questionText" 
                                    value="${this.escapeHtml(question.question_text || '')}"
                                    placeholder="أدخل نص السؤال">
                            </div>
                            <div class="edit-form-grid" style="margin-bottom: 1rem;">
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
                                    <label class="edit-form-label" style="margin-bottom: 0.75rem;">إجباري</label>
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
                        <div id="optionsList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${options.map((opt, i) => `
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="text" class="edit-form-input question-option" 
                                        value="${this.escapeHtml(opt)}" 
                                        placeholder="خيار ${i + 1}"
                                        style="margin-bottom: 0;">
                                    <button type="button" class="btn btn--icon btn--icon-danger" 
                                        onclick="this.parentElement.remove()" 
                                        ${options.length <= 2 ? 'disabled' : ''}>
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn--outline-primary btn--sm" style="margin-top: 0.75rem;"
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
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="text" class="edit-form-input question-option" 
                        value="" 
                        placeholder="خيار ${count}"
                        style="margin-bottom: 0;">
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

        deleteQuestion(index) {
            if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
                this.currentQuestions.splice(index, 1);
                this.hasChanges = true;
                this.updateQuestionsPanel();
            }
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

        async save() {
            try {
                const title = document.getElementById('editSurveyTitle').value.trim();
                if (!title) {
                    this.showNotification('يرجى إدخال عنوان الاستبيان', 'error');
                    return;
                }

                // جمع البيانات
                const surveyData = {
                    title,
                    description: document.getElementById('editSurveyDescription').value || null,
                    survey_type: document.getElementById('editSurveyType').value,
                    status: document.getElementById('editSurveyStatus').value,
                    access_type: document.getElementById('editSurveyAccess').value,
                    start_date: document.getElementById('editSurveyStartDate').value || null,
                    end_date: document.getElementById('editSurveyEndDate').value || null,
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

        close() {
            if (this.hasChanges) {
                if (!confirm('لديك تغييرات غير محفوظة. هل تريد الإغلاق؟')) {
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

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                font-weight: 600;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `;
            notification.innerHTML = `
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    window.surveyEditModal = new SurveyEditModal();
})();
