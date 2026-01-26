/**
 * Survey Page Script - Adeeb Club
 * Handles survey display and response submission
 */

(function() {
    'use strict';

    const sb = window.sbClient;
    let currentSurvey = null;
    let surveyQuestions = [];

    /**
     * Initialize survey page
     */
    async function init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const surveyId = urlParams.get('id');

            if (!surveyId) {
                showError('رابط الاستبيان غير صحيح');
                return;
            }

            await loadSurvey(surveyId);
        } catch (error) {
            console.error('Initialization error:', error);
            showError('حدث خطأ أثناء تحميل الاستبيان');
        }
    }

    /**
     * Load survey data
     */
    async function loadSurvey(surveyId) {
        try {
            // Fetch survey
            const { data: survey, error: surveyError } = await sb
                .from('surveys')
                .select('*')
                .eq('id', surveyId)
                .single();

            if (surveyError) throw surveyError;

            if (!survey) {
                showError('الاستبيان غير موجود');
                return;
            }

            // Check survey status
            if (survey.status !== 'active') {
                showError('هذا الاستبيان غير متاح حالياً');
                return;
            }

            // Check dates
            const now = new Date();
            if (survey.start_date && new Date(survey.start_date) > now) {
                showError('هذا الاستبيان لم يبدأ بعد');
                return;
            }
            if (survey.end_date && new Date(survey.end_date) < now) {
                showError('انتهت مدة هذا الاستبيان');
                return;
            }

            // Fetch questions
            const { data: questions, error: questionsError } = await sb
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('display_order');

            if (questionsError) throw questionsError;

            if (!questions || questions.length === 0) {
                showError('هذا الاستبيان لا يحتوي على أسئلة');
                return;
            }

            currentSurvey = survey;
            surveyQuestions = questions;

            renderSurvey();
            hideLoading();

        } catch (error) {
            console.error('Error loading survey:', error);
            showError('حدث خطأ أثناء تحميل الاستبيان');
        }
    }

    /**
     * Render survey
     */
    function renderSurvey() {
        // Set title and description
        document.getElementById('surveyTitle').textContent = currentSurvey.title;
        document.getElementById('surveyDescription').textContent = currentSurvey.description || '';
        
        // Set welcome message
        const welcomeEl = document.getElementById('surveyWelcome');
        if (currentSurvey.welcome_message) {
            welcomeEl.textContent = currentSurvey.welcome_message;
            welcomeEl.style.display = 'block';
        } else {
            welcomeEl.style.display = 'none';
        }

        // Show progress bar if enabled
        if (currentSurvey.show_progress_bar) {
            document.getElementById('progressContainer').style.display = 'block';
            document.getElementById('totalQuestions').textContent = surveyQuestions.length;
        }

        // Render questions
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';

        surveyQuestions.forEach((question, index) => {
            const questionCard = createQuestionCard(question, index);
            container.appendChild(questionCard);
        });

        // Show survey container
        document.getElementById('surveyContainer').style.display = 'block';

        // Bind form submit
        document.getElementById('surveyForm').addEventListener('submit', handleSubmit);

        // Update progress on input change
        if (currentSurvey.show_progress_bar) {
            container.addEventListener('change', updateProgress);
            container.addEventListener('input', updateProgress);
        }
    }

    /**
     * Create question card
     */
    function createQuestionCard(question, index) {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.questionId = question.id;

        const showNumber = currentSurvey.show_question_numbers !== false;
        const questionNumber = showNumber ? index + 1 : '';

        let inputHtml = '';
        const name = `question_${question.id}`;
        const required = question.is_required ? 'required' : '';

        switch (question.question_type) {
            case 'short_text':
                inputHtml = `
                    <input type="text" 
                           name="${name}" 
                           class="input-field" 
                           placeholder="${escapeHtml(question.placeholder_text || 'اكتب إجابتك هنا...')}"
                           ${required}>
                `;
                break;

            case 'long_text':
                inputHtml = `
                    <textarea name="${name}" 
                              class="textarea-field" 
                              placeholder="${escapeHtml(question.placeholder_text || 'اكتب إجابتك هنا...')}"
                              ${required}></textarea>
                `;
                break;

            case 'email':
                inputHtml = `
                    <input type="email" 
                           name="${name}" 
                           class="input-field" 
                           placeholder="${escapeHtml(question.placeholder_text || 'example@email.com')}"
                           ${required}>
                `;
                break;

            case 'phone':
                inputHtml = `
                    <input type="tel" 
                           name="${name}" 
                           class="input-field" 
                           placeholder="${escapeHtml(question.placeholder_text || '05xxxxxxxx')}"
                           ${required}>
                `;
                break;

            case 'number':
                inputHtml = `
                    <input type="number" 
                           name="${name}" 
                           class="input-field" 
                           placeholder="${escapeHtml(question.placeholder_text || 'أدخل رقم...')}"
                           ${required}>
                `;
                break;

            case 'date':
                inputHtml = `
                    <input type="date" 
                           name="${name}" 
                           class="input-field" 
                           ${required}>
                `;
                break;

            case 'single_choice':
            case 'yes_no':
                const options = question.question_type === 'yes_no' 
                    ? [{ text: 'نعم', value: 'yes' }, { text: 'لا', value: 'no' }]
                    : question.options || [];
                
                inputHtml = `
                    <div class="options-list">
                        ${options.map((opt, i) => `
                            <div class="option-item">
                                <input type="radio" 
                                       id="${name}_${i}" 
                                       name="${name}" 
                                       value="${escapeHtml(opt.value || opt.text)}"
                                       ${required && i === 0 ? required : ''}>
                                <label for="${name}_${i}">${escapeHtml(opt.text)}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'multiple_choice':
                inputHtml = `
                    <div class="options-list">
                        ${(question.options || []).map((opt, i) => `
                            <div class="option-item">
                                <input type="checkbox" 
                                       id="${name}_${i}" 
                                       name="${name}[]" 
                                       value="${escapeHtml(opt.value || opt.text)}">
                                <label for="${name}_${i}">${escapeHtml(opt.text)}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'dropdown':
                inputHtml = `
                    <select name="${name}" class="select-field" ${required}>
                        <option value="">اختر إجابة...</option>
                        ${(question.options || []).map(opt => `
                            <option value="${escapeHtml(opt.value || opt.text)}">
                                ${escapeHtml(opt.text)}
                            </option>
                        `).join('')}
                    </select>
                `;
                break;

            case 'rating_scale':
                const maxRating = question.settings?.max_rating || 5;
                inputHtml = `
                    <div class="rating-scale">
                        ${Array.from({ length: maxRating }, (_, i) => i + 1).map(num => `
                            <div class="rating-option">
                                <input type="radio" 
                                       id="${name}_${num}" 
                                       name="${name}" 
                                       value="${num}"
                                       ${required && num === 1 ? required : ''}>
                                <label for="${name}_${num}" class="rating-label">${num}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'star_rating':
                const maxStars = question.settings?.max_stars || 5;
                inputHtml = `
                    <div class="star-rating" data-question="${name}">
                        ${Array.from({ length: maxStars }, (_, i) => maxStars - i).map(num => `
                            <input type="radio" 
                                   id="${name}_${num}" 
                                   name="${name}" 
                                   value="${num}"
                                   ${required && num === maxStars ? required : ''}>
                            <label for="${name}_${num}" class="star-label" title="${num} نجوم">
                                <i class="fa-solid fa-star"></i>
                            </label>
                        `).reverse().join('')}
                    </div>
                `;
                break;

            case 'linear_scale':
                const minScale = question.settings?.min_value || 0;
                const maxScale = question.settings?.max_value || 10;
                const minLabel = question.settings?.min_label || minScale;
                const maxLabel = question.settings?.max_label || maxScale;
                
                inputHtml = `
                    <div class="linear-scale">
                        <span class="scale-label">${escapeHtml(minLabel)}</span>
                        <div class="scale-options">
                            ${Array.from({ length: maxScale - minScale + 1 }, (_, i) => minScale + i).map(num => `
                                <div class="scale-option">
                                    <input type="radio" 
                                           id="${name}_${num}" 
                                           name="${name}" 
                                           value="${num}"
                                           ${required && num === minScale ? required : ''}>
                                    <label for="${name}_${num}" class="scale-button">${num}</label>
                                </div>
                            `).join('')}
                        </div>
                        <span class="scale-label">${escapeHtml(maxLabel)}</span>
                    </div>
                `;
                break;
        }

        card.innerHTML = `
            <div class="question-header">
                ${showNumber ? `<div class="question-number">${questionNumber}</div>` : ''}
                <div class="question-content">
                    <h3 class="question-text">
                        ${question.is_required ? '<span class="question-required">*</span>' : ''}
                        ${escapeHtml(question.question_text)}
                    </h3>
                    ${question.help_text ? `<p class="question-help">${escapeHtml(question.help_text)}</p>` : ''}
                </div>
            </div>
            <div class="question-input">
                ${inputHtml}
            </div>
        `;

        return card;
    }

    /**
     * Update progress
     */
    function updateProgress() {
        const form = document.getElementById('surveyForm');
        const formData = new FormData(form);
        let answeredCount = 0;

        surveyQuestions.forEach(question => {
            const name = `question_${question.id}`;
            const value = formData.get(name);
            const values = formData.getAll(`${name}[]`);
            
            if (value || values.length > 0) {
                answeredCount++;
            }
        });

        const percentage = (answeredCount / surveyQuestions.length) * 100;
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('currentQuestion').textContent = answeredCount;
    }

    /**
     * Handle form submit
     */
    async function handleSubmit(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const formData = new FormData(e.target);
            const answers = [];

            surveyQuestions.forEach(question => {
                const name = `question_${question.id}`;
                let answer = null;

                if (question.question_type === 'multiple_choice') {
                    const values = formData.getAll(`${name}[]`);
                    answer = values.length > 0 ? values : null;
                } else {
                    answer = formData.get(name);
                }

                if (answer !== null && answer !== '') {
                    answers.push({
                        question_id: question.id,
                        answer_value: typeof answer === 'object' ? JSON.stringify(answer) : answer
                    });
                }
            });

            // Create response
            const { data: response, error: responseError } = await sb
                .from('survey_responses')
                .insert([{
                    survey_id: currentSurvey.id,
                    status: 'completed'
                }])
                .select()
                .single();

            if (responseError) throw responseError;

            // Insert answers
            const answersData = answers.map(ans => ({
                response_id: response.id,
                question_id: ans.question_id,
                answer_value: ans.answer_value
            }));

            const { error: answersError } = await sb
                .from('survey_answers')
                .insert(answersData);

            if (answersError) throw answersError;

            // Show completion message
            showCompletion();

        } catch (error) {
            console.error('Error submitting survey:', error);
            showToast('حدث خطأ أثناء إرسال الإجابات. يرجى المحاولة مرة أخرى.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال الإجابات';
        }
    }

    /**
     * Show completion message
     */
    function showCompletion() {
        document.getElementById('surveyForm').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'none';
        
        const completionContainer = document.getElementById('completionContainer');
        const completionMessage = document.getElementById('completionMessage');
        
        completionMessage.textContent = currentSurvey.completion_message || 
            'تم إرسال إجاباتك بنجاح. نشكرك على وقتك ومشاركتك معنا.';
        
        completionContainer.style.display = 'block';
    }

    /**
     * Show error
     */
    function showError(message) {
        hideLoading();
        document.getElementById('surveyContainer').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorContainer').style.display = 'block';
    }

    /**
     * Hide loading
     */
    function hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
