/**
 * إدارة لعبة "خمّن الكلمة" - نادي أدِيب
 * يعالج 3 أقسام:
 *   1. guess-word-list-section   : قائمة الجلسات السابقة + إنشاء جديدة
 *   2. guess-word-create-section : نموذج إنشاء جلسة (عنوان + مدة + كلمات)
 *   3. guess-word-live-section   : التحكم المباشر بالجلسة (QR + كلمات + إجابات + متسابقين)
 */

class GuessWordManager {
    constructor() {
        this.sb = window.sbClient;
        this.currentUser = null;
        this.sessions = [];
        this.activeSessionId = null;
        this.activeSession = null;
        this.activeWords = [];
        this.activePlayers = [];
        this.activeAnswers = [];
        this.channel = null;
        this.timerHandle = null;
        this.qrInstance = null;
        console.log('GuessWordManager: Initialized');
    }

    async init(currentUser) {
        this.currentUser = currentUser;
        await this.loadList();
        this.attachListListeners();
        this.attachCreateListeners();
    }

    // ==========================================
    // 1. قائمة الجلسات
    // ==========================================
    async loadList() {
        try {
            const { data, error } = await this.sb.rpc('gw_list_admin_sessions');
            if (error) throw error;
            this.sessions = data || [];
            this.renderList();
        } catch (err) {
            console.error('[gw] loadList error:', err);
            this.notifyError('تعذّر تحميل الجلسات');
        }
    }

    renderList() {
        const container = document.getElementById('guessWordListContainer');
        if (!container) return;

        const total = this.sessions.length;
        const active = this.sessions.filter(s => s.status === 'active' || s.status === 'waiting').length;
        const finished = this.sessions.filter(s => s.status === 'finished').length;

        // تحديث بطاقات الإحصائيات في الـ DOM
        const totalEl = document.getElementById('gwTotalSessionsCount');
        const activeEl = document.getElementById('gwActiveSessionsCount');
        const finishedEl = document.getElementById('gwFinishedSessionsCount');
        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (finishedEl) finishedEl.textContent = finished;

        if (total === 0) {
            container.innerHTML = `
                <div class="gw-empty">
                    <i class="fa-solid fa-spell-check"></i>
                    <h3>لا توجد جلسات بعد</h3>
                    <p>ابدأ بإنشاء جلسة جديدة لبدء اللعب</p>
                </div>
            `;
        } else {
            const cards = this.sessions.map(s => this._renderSessionCard(s)).join('');
            container.innerHTML = `<div class="uc-grid">${cards}</div>`;
        }

        this._attachListCardListeners();
    }

    _renderSessionCard(s) {
        const statusLabel = s.status === 'waiting' ? 'في الانتظار'
            : s.status === 'active' ? 'جارية'
            : 'منتهية';
        const variant = s.status === 'waiting' ? 'uc-card--warning'
            : s.status === 'active' ? 'uc-card--success'
            : 'uc-card--neutral';
        const statusIcon = s.status === 'waiting' ? 'fa-hourglass-half'
            : s.status === 'active' ? 'fa-circle-play'
            : 'fa-flag-checkered';
        const created = this._formatDate(s.created_at);
        const title = s.title || 'جلسة بلا عنوان';

        const continueBtn = (s.status !== 'finished')
            ? `<button class="btn btn-primary" data-action="open" data-id="${s.id}"><i class="fa-solid fa-play"></i> فتح</button>`
            : `<button class="btn btn-slate btn-outline" data-action="open" data-id="${s.id}"><i class="fa-solid fa-eye"></i> عرض</button>`;

        return `
            <article class="uc-card ${variant}">
                <header class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            <i class="fa-solid fa-spell-check"></i>
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title uc-card__title--wrap">${this._esc(title)}</h3>
                            <span class="uc-card__badge">
                                <i class="fa-solid ${statusIcon}"></i>
                                ${statusLabel}
                            </span>
                        </div>
                    </div>
                </header>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-key"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الكود</span>
                            <span class="uc-card__info-value">${this._esc(s.code)}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-list"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">عدد الكلمات</span>
                            <span class="uc-card__info-value">${s.words_count} كلمة</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">المتسابقون</span>
                            <span class="uc-card__info-value">${s.players_count} متسابق</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ الإنشاء</span>
                            <span class="uc-card__info-value">${created}</span>
                        </div>
                    </div>
                </div>
                <div class="uc-card__footer">
                    ${continueBtn}
                    <button class="btn btn-danger btn-outline" data-action="delete" data-id="${s.id}">
                        <i class="fa-solid fa-trash"></i> حذف
                    </button>
                </div>
            </article>
        `;
    }

    _attachListCardListeners() {
        const container = document.getElementById('guessWordListContainer');
        if (!container) return;
        container.querySelectorAll('[data-action="open"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openLiveSession(btn.dataset.id);
            });
        });
        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSession(btn.dataset.id);
            });
        });
    }

    attachListListeners() {
        const newBtn = document.getElementById('gwNewSessionBtn');
        if (newBtn && !newBtn._gwAttached) {
            newBtn._gwAttached = true;
            newBtn.addEventListener('click', () => {
                if (window.navigateToSection) window.navigateToSection('guess-word-create-section');
            });
        }
        const refreshBtn = document.getElementById('gwRefreshListBtn');
        if (refreshBtn && !refreshBtn._gwAttached) {
            refreshBtn._gwAttached = true;
            refreshBtn.addEventListener('click', () => this.loadList());
        }
    }

    async deleteSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const confirmed = await this._confirm(
            `هل تريد حذف الجلسة "${session.title || session.code}"؟ سيتم حذف كل الإجابات والمتسابقين معها.`,
            'حذف'
        );
        if (!confirmed) return;

        try {
            const { error } = await this.sb.rpc('gw_delete_session', { p_session_id: sessionId });
            if (error) throw error;
            this.notifySuccess('تم حذف الجلسة');
            await this.loadList();
        } catch (err) {
            console.error('[gw] deleteSession error:', err);
            this.notifyError('تعذّر حذف الجلسة');
        }
    }

    // ==========================================
    // 2. إنشاء جلسة
    // ==========================================
    attachCreateListeners() {
        const form = document.getElementById('gwCreateForm');
        if (form && !form._gwAttached) {
            form._gwAttached = true;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateSubmit();
            });
        }

        const wordsTa = document.getElementById('gwCreateWords');
        if (wordsTa && !wordsTa._gwAttached) {
            wordsTa._gwAttached = true;
            wordsTa.addEventListener('input', () => this._updateWordsCounter());
        }

        const timeInput = document.getElementById('gwCreateTime');
        if (timeInput && !timeInput._gwAttached) {
            timeInput._gwAttached = true;
            timeInput.addEventListener('input', () => this._updateWordsCounter());
        }

        const shuffleBtn = document.getElementById('gwShuffleWordsBtn');
        if (shuffleBtn && !shuffleBtn._gwAttached) {
            shuffleBtn._gwAttached = true;
            shuffleBtn.addEventListener('click', () => this._shuffleWords());
        }

        const uploadBtn = document.getElementById('gwUploadExcelBtn');
        const fileInput = document.getElementById('gwExcelFileInput');
        if (uploadBtn && fileInput && !uploadBtn._gwAttached) {
            uploadBtn._gwAttached = true;

            uploadBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file) await this._importWordsFromExcel(file);
                fileInput.value = '';
            });

            // drag & drop
            const isExcelFile = (file) => /\.xlsx?$/i.test(file?.name || '');

            const onDragEnter = (e) => {
                e.preventDefault();
                if (e.dataTransfer?.types?.includes('Files')) {
                    uploadBtn.classList.add('drag-over');
                }
            };
            const onDragOver = (e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            };
            const onDragLeave = (e) => {
                // لا تُلغِ حالة dragover إن غادر العناصر الداخلية
                if (e.relatedTarget && uploadBtn.contains(e.relatedTarget)) return;
                uploadBtn.classList.remove('drag-over');
            };
            const onDrop = async (e) => {
                e.preventDefault();
                uploadBtn.classList.remove('drag-over');
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                if (!isExcelFile(file)) {
                    this.notifyError('الملف يجب أن يكون Excel (.xlsx أو .xls)');
                    return;
                }
                await this._importWordsFromExcel(file);
            };

            uploadBtn.addEventListener('dragenter', onDragEnter);
            uploadBtn.addEventListener('dragover', onDragOver);
            uploadBtn.addEventListener('dragleave', onDragLeave);
            uploadBtn.addEventListener('drop', onDrop);
        }

        const cancelBtn = document.getElementById('gwCancelCreateBtn');
        if (cancelBtn && !cancelBtn._gwAttached) {
            cancelBtn._gwAttached = true;
            cancelBtn.addEventListener('click', () => {
                if (window.navigateToSection) window.navigateToSection('guess-word-list-section');
            });
        }
    }

    onShowCreate() {
        // إعادة تعيين النموذج عند فتح الشاشة
        const form = document.getElementById('gwCreateForm');
        if (form) form.reset();
        const time = document.getElementById('gwCreateTime');
        if (time) time.value = 60;
        this._updateWordsCounter();
    }

    _updateWordsCounter() {
        const ta = document.getElementById('gwCreateWords');
        const textEl = document.getElementById('gwWordsCounterText');
        const timeInput = document.getElementById('gwCreateTime');
        if (!ta || !textEl) return;

        const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
        const count = lines.length;
        const timePerWord = parseInt(timeInput?.value || '60', 10);

        if (count === 0) {
            textEl.textContent = 'أضف كلمات لمعرفة الإحصائية';
        } else {
            const totalSeconds = count * timePerWord;
            textEl.innerHTML = `<strong>${count}</strong> كلمة · مدة الجلسة المتوقعة <strong>${this._formatDuration(totalSeconds)}</strong>`;
        }

        this._renderWordsPreview(lines);
    }

    _renderWordsPreview(words) {
        const wrap = document.getElementById('gwWordsPreview');
        if (!wrap) return;

        if (!words || words.length === 0) {
            wrap.hidden = true;
            wrap.innerHTML = '';
            return;
        }

        wrap.hidden = false;

        // تحديث ذكي in-place لتجنّب إعادة تشغيل animation الـ chips الثابتة
        // (innerHTML الكامل يجعل كل chip يومض عند كل ضغطة مفتاح)
        const existing = Array.from(wrap.children);

        // 1) حدّث/أضف
        words.forEach((word, idx) => {
            const chip = existing[idx];
            if (chip) {
                // العنصر موجود — حدّث النص فقط إن تغيّر (لا re-create)
                const textEl = chip.querySelector('.chip__text');
                if (textEl && textEl.textContent !== word) {
                    textEl.textContent = word;
                }
                chip.dataset.index = idx;
                const btn = chip.querySelector('.chip__remove');
                if (btn) btn.setAttribute('aria-label', `حذف الكلمة ${word}`);
            } else {
                // عنصر جديد فقط — يأخذ animation الدخول
                wrap.appendChild(this._buildWordChip(word, idx));
            }
        });

        // 2) احذف الزائد
        while (wrap.children.length > words.length) {
            wrap.removeChild(wrap.lastElementChild);
        }
    }

    _buildWordChip(word, idx) {
        const chip = document.createElement('span');
        chip.className = 'chip chip--lg';
        chip.dataset.index = idx;
        chip.innerHTML = `
            <span class="chip__text">${this._esc(word)}</span>
            <button type="button" class="chip__remove" aria-label="حذف الكلمة ${this._esc(word)}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        chip.querySelector('.chip__remove').addEventListener('click', () => {
            // اقرأ index من dataset (يتغيّر بعد كل حذف)
            this._removeWordAt(parseInt(chip.dataset.index, 10));
        });
        return chip;
    }

    _removeWordAt(index) {
        const ta = document.getElementById('gwCreateWords');
        if (!ta) return;
        const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
        if (index < 0 || index >= lines.length) return;
        lines.splice(index, 1);
        ta.value = lines.join('\n');
        this._updateWordsCounter();
    }

    _formatDuration(totalSeconds) {
        if (totalSeconds < 60) return `${totalSeconds} ثانية`;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        if (s === 0) return `${m} دقيقة`;
        return `${m} دقيقة و${s} ثانية`;
    }

    async _importWordsFromExcel(file) {
        if (typeof ExcelJS === 'undefined') {
            this.notifyError('مكتبة Excel غير محمّلة');
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            // اجمع كل الخلايا غير الفارغة من كل الأوراق
            const collected = [];
            workbook.worksheets.forEach(ws => {
                ws.eachRow({ includeEmpty: false }, (row) => {
                    row.eachCell({ includeEmpty: false }, (cell) => {
                        const v = cell.value;
                        if (v == null) return;
                        // الـ value قد يكون object (formula/richText/hyperlink)
                        let text = '';
                        if (typeof v === 'string' || typeof v === 'number') {
                            text = String(v);
                        } else if (v.text) {
                            text = String(v.text);
                        } else if (v.result != null) {
                            text = String(v.result);
                        } else if (Array.isArray(v.richText)) {
                            text = v.richText.map(p => p.text).join('');
                        }
                        text = text.trim();
                        if (text) collected.push(text);
                    });
                });
            });

            if (collected.length === 0) {
                this.notifyError('لم يتم العثور على كلمات في الملف');
                return;
            }

            // ادمج مع الكلمات الموجودة، تجاهل التكرار case-insensitive
            const ta = document.getElementById('gwCreateWords');
            const existing = (ta?.value || '').split('\n').map(l => l.trim()).filter(Boolean);
            const seen = new Set(existing.map(w => w.toLowerCase()));

            let added = 0;
            let duplicates = 0;
            const final = [...existing];
            for (const w of collected) {
                const key = w.toLowerCase();
                if (seen.has(key)) {
                    duplicates++;
                } else {
                    seen.add(key);
                    final.push(w);
                    added++;
                }
            }

            if (ta) {
                ta.value = final.join('\n');
                this._updateWordsCounter();
            }

            const dupNote = duplicates > 0 ? ` · تجاهل ${duplicates} تكرار` : '';
            this.notifySuccess(`تم استيراد ${added} كلمة${dupNote}`);
        } catch (err) {
            console.error('[gw] Excel import error:', err);
            this.notifyError('تعذّر قراءة ملف Excel — تأكد من صحة الملف');
        }
    }

    _shuffleWords() {
        const ta = document.getElementById('gwCreateWords');
        if (!ta) return;
        const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
            this.notifyError('أضف كلمتين على الأقل قبل الخلط');
            return;
        }
        // Fisher-Yates shuffle
        for (let i = lines.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lines[i], lines[j]] = [lines[j], lines[i]];
        }
        ta.value = lines.join('\n');
        this._updateWordsCounter();
        this.notifySuccess('تم خلط ترتيب الكلمات');
    }

    async handleCreateSubmit() {
        const titleEl = document.getElementById('gwCreateTitle');
        const timeEl = document.getElementById('gwCreateTime');
        const wordsEl = document.getElementById('gwCreateWords');
        const submitBtn = document.getElementById('gwCreateSubmitBtn');

        const title = (titleEl?.value || '').trim();
        const timePerWord = parseInt(timeEl?.value || '60', 10);
        const words = (wordsEl?.value || '')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (!title) {
            this.notifyError('عنوان الجلسة مطلوب');
            return;
        }
        if (words.length === 0) {
            this.notifyError('أضف كلمة واحدة على الأقل');
            return;
        }
        if (timePerWord < 10 || timePerWord > 600) {
            this.notifyError('المدة يجب أن تكون بين 10 و600 ثانية');
            return;
        }

        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الإنشاء...';

        try {
            const { data, error } = await this.sb.rpc('gw_create_session', {
                p_title: title,
                p_words: words,
                p_time_per_word: timePerWord
            });
            if (error) throw error;

            this.notifySuccess(`تم إنشاء الجلسة بكود ${data.code}`);
            await this.loadList();
            this.openLiveSession(data.id);
        } catch (err) {
            console.error('[gw] create error:', err);
            this.notifyError(this._parseError(err));
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    }

    // ==========================================
    // 3. الشاشة المباشرة
    // ==========================================
    async openLiveSession(sessionId) {
        this.activeSessionId = sessionId;
        if (window.navigateToSection) window.navigateToSection('guess-word-live-section');
        await this.loadLiveData();
        this._attachLiveListeners();
        this._renderLive();
        this._renderQR();
        this._startTimer();
        this._subscribeRealtime();
    }

    async loadLiveData() {
        if (!this.activeSessionId) return;
        try {
            const { data, error } = await this.sb.rpc('gw_get_admin_session_data', {
                p_session_id: this.activeSessionId
            });
            if (error) throw error;
            if (!data) {
                this.notifyError('الجلسة غير موجودة');
                return;
            }
            this.activeSession = data.session;
            this.activeWords = data.words || [];
            this.activePlayers = data.players || [];
            this.activeAnswers = data.answers || [];
        } catch (err) {
            console.error('[gw] loadLiveData error:', err);
            this.notifyError(this._parseError(err) || 'تعذّر تحميل بيانات الجلسة');
        }
    }

    async _loadAnswersForCurrentWord() {
        // الآن جزء من loadLiveData؛ نحتفظ بالاسم لاستدعاءات Realtime
        await this.loadLiveData();
    }

    _attachLiveListeners() {
        const startBtn = document.getElementById('gwStartRoundBtn');
        const closeBtn = document.getElementById('gwCloseSessionBtn');
        const backBtn = document.getElementById('gwBackToListBtn');
        const copyLinkBtn = document.getElementById('gwCopyLinkBtn');

        if (startBtn && !startBtn._gwAttached) {
            startBtn._gwAttached = true;
            startBtn.addEventListener('click', () => this.startNextRound());
        }
        if (closeBtn && !closeBtn._gwAttached) {
            closeBtn._gwAttached = true;
            closeBtn.addEventListener('click', () => this.closeSession());
        }
        if (backBtn && !backBtn._gwAttached) {
            backBtn._gwAttached = true;
            backBtn.addEventListener('click', () => {
                this._cleanupLive();
                if (window.navigateToSection) window.navigateToSection('guess-word-list-section');
                this.loadList();
            });
        }
        if (copyLinkBtn && !copyLinkBtn._gwAttached) {
            copyLinkBtn._gwAttached = true;
            copyLinkBtn.addEventListener('click', () => this._copyJoinLink());
        }
    }

    _renderLive() {
        if (!this.activeSession) return;

        // العنوان والكود
        const titleEl = document.getElementById('gwLiveTitle');
        if (titleEl) titleEl.textContent = this.activeSession.title || 'جلسة خمّن الكلمة';

        const codeEl = document.getElementById('gwLiveCode');
        if (codeEl) codeEl.textContent = this.activeSession.code;

        const linkEl = document.getElementById('gwJoinLink');
        if (linkEl) linkEl.value = this._getJoinUrl();

        // الكلمة الحالية
        this._renderCurrentWord();

        // الأزرار
        this._renderControlButtons();

        // الإجابات
        this._renderAnswers();

        // المتسابقون
        this._renderPlayers();
    }

    _renderCurrentWord() {
        const wordEl = document.getElementById('gwLiveCurrentWord');
        const roundEl = document.getElementById('gwLiveRoundLabel');
        if (!wordEl || !roundEl) return;

        const currentWord = this.activeWords.find(w => w.id === this.activeSession.current_word_id);
        const totalWords = this.activeWords.length;

        if (this.activeSession.status === 'finished') {
            wordEl.className = 'gw-current-word empty';
            wordEl.textContent = 'انتهت الجلسة';
            roundEl.textContent = `${totalWords} جولات منتهية`;
        } else if (currentWord) {
            const currentPos = currentWord.position + 1;
            wordEl.className = 'gw-current-word';
            wordEl.textContent = currentWord.word;
            roundEl.textContent = `الجولة ${currentPos} من ${totalWords}`;
        } else {
            wordEl.className = 'gw-current-word empty';
            wordEl.textContent = 'لم تبدأ جولة بعد';
            const nextPos = this._getNextWordPosition();
            roundEl.textContent = nextPos !== null
                ? `جاهز للجولة ${nextPos + 1} من ${totalWords}`
                : `${totalWords} جولات`;
        }
    }

    _getNextWordPosition() {
        const currentWord = this.activeWords.find(w => w.id === this.activeSession.current_word_id);
        if (!currentWord) {
            return this.activeWords.length > 0 ? 0 : null;
        }
        const next = this.activeWords.find(w => w.position > currentWord.position);
        return next ? next.position : null;
    }

    _renderControlButtons() {
        const startBtn = document.getElementById('gwStartRoundBtn');
        const closeBtn = document.getElementById('gwCloseSessionBtn');
        if (!startBtn || !closeBtn) return;

        const isFinished = this.activeSession.status === 'finished';
        const hasCurrent = !!this.activeSession.current_word_id;
        const nextPos = this._getNextWordPosition();
        const noMore = nextPos === null && hasCurrent;

        if (isFinished) {
            startBtn.style.display = 'none';
            closeBtn.style.display = 'none';
        } else {
            startBtn.style.display = 'inline-flex';
            closeBtn.style.display = 'inline-flex';

            if (!hasCurrent) {
                startBtn.innerHTML = '<i class="fa-solid fa-play"></i> بدء الجولة الأولى';
            } else if (noMore) {
                startBtn.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> إنهاء الجلسة';
            } else {
                startBtn.innerHTML = '<i class="fa-solid fa-forward"></i> الكلمة التالية';
            }
        }
    }

    _renderAnswers() {
        const container = document.getElementById('gwLiveAnswersList');
        if (!container) return;

        if (!this.activeSession.current_word_id) {
            container.innerHTML = '<div class="gw-no-answers"><i class="fa-regular fa-clock"></i><br>لم تبدأ جولة بعد</div>';
            return;
        }

        if (this.activeAnswers.length === 0) {
            container.innerHTML = '<div class="gw-no-answers"><i class="fa-regular fa-comment-dots"></i><br>في انتظار الإجابات...</div>';
            return;
        }

        const currentWord = this.activeWords.find(w => w.id === this.activeSession.current_word_id);
        const winnerId = currentWord?.winner_player_id;

        container.innerHTML = this.activeAnswers.map((ans, idx) => {
            const player = this.activePlayers.find(p => p.id === ans.player_id);
            const playerName = player?.name || 'متسابق';
            const isWinner = ans.player_id === winnerId;
            const rank = idx + 1;
            const seconds = (ans.response_ms / 1000).toFixed(2);

            return `
                <div class="gw-answer-row rank-${rank} ${isWinner ? 'winner' : ''}">
                    <div class="gw-answer-rank">${rank}</div>
                    <div class="gw-answer-body">
                        <div class="gw-answer-name">
                            ${this._esc(playerName)}
                            <span class="gw-answer-time">${seconds}ث</span>
                        </div>
                        <div class="gw-answer-text">${this._esc(ans.answer)}</div>
                    </div>
                    <button
                        class="gw-pick-btn ${isWinner ? 'is-winner' : ''}"
                        data-player-id="${ans.player_id}"
                        data-word-id="${ans.word_id}"
                    >
                        <i class="fa-solid ${isWinner ? 'fa-crown' : 'fa-trophy'}"></i>
                        ${isWinner ? 'الفائز' : 'اختر فائزاً'}
                    </button>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.gw-pick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.pickWinner(btn.dataset.wordId, btn.dataset.playerId);
            });
        });
    }

    _renderPlayers() {
        const container = document.getElementById('gwLivePlayersList');
        const countEl = document.getElementById('gwLivePlayersCount');
        if (!container) return;

        const active = this.activePlayers.filter(p => !p.is_kicked);
        if (countEl) countEl.textContent = active.length;

        if (active.length === 0) {
            container.innerHTML = '<div class="gw-no-answers" style="padding:1rem;">لم ينضم أي متسابق بعد</div>';
            return;
        }

        const sorted = [...active].sort((a, b) => b.score - a.score || (a.joined_at > b.joined_at ? 1 : -1));
        container.innerHTML = sorted.map(p => `
            <div class="gw-player-tag">
                <span>${this._esc(p.name)}</span>
                <span class="score">${p.score}</span>
                <button class="kick-btn" data-player-id="${p.id}" title="طرد">
                    <i class="fa-solid fa-user-xmark"></i>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.kick-btn').forEach(btn => {
            btn.addEventListener('click', () => this.kickPlayer(btn.dataset.playerId));
        });
    }

    _renderQR() {
        const wrapper = document.getElementById('gwQRWrapper');
        if (!wrapper || !this.activeSession) return;
        const url = this._getJoinUrl();

        wrapper.innerHTML = '';

        // window.QRCode محمّلة من qrcode@1.5.4 (API: toCanvas / toDataURL)
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
            const canvas = document.createElement('canvas');
            wrapper.appendChild(canvas);
            window.QRCode.toCanvas(canvas, url, {
                width: 240,
                margin: 1,
                color: { dark: '#274060', light: '#ffffff' }
            }, (err) => {
                if (err) {
                    console.error('[gw] QR render error:', err);
                    this._renderQRFallback(wrapper, url);
                }
            });
            return;
        }

        // fallback إن لم تُحمَّل المكتبة
        this._renderQRFallback(wrapper, url);
    }

    _renderQRFallback(wrapper, url) {
        wrapper.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" alt="QR" width="240" height="240">`;
    }

    _getJoinUrl() {
        const origin = location.origin;
        const path = location.pathname;
        // المسار الحالي مثل: /admin/dashboard.html → نريد /game/guess-word.html
        const base = origin + path.replace(/\/admin\/[^/]*\.html$/, '').replace(/\/admin\/?$/, '');
        return `${base}/game/guess-word.html?code=${this.activeSession.code}`;
    }

    async _copyJoinLink() {
        const url = this._getJoinUrl();
        try {
            await navigator.clipboard.writeText(url);
            this.notifySuccess('تم نسخ الرابط');
        } catch (e) {
            const inp = document.getElementById('gwJoinLink');
            if (inp) {
                inp.select();
                document.execCommand('copy');
                this.notifySuccess('تم نسخ الرابط');
            }
        }
    }

    // ==========================================
    // 4. عمليات التحكم بالجلسة
    // ==========================================
    async startNextRound() {
        if (!this.activeSessionId) return;
        try {
            const { error } = await this.sb.rpc('gw_start_next_round', { p_session_id: this.activeSessionId });
            if (error) throw error;
            await this.loadLiveData();
            this._renderLive();
            this._startTimer();
        } catch (err) {
            console.error('[gw] startNextRound error:', err);
            this.notifyError(this._parseError(err));
        }
    }

    async pickWinner(wordId, playerId) {
        try {
            const { error } = await this.sb.rpc('gw_pick_winner', {
                p_word_id: wordId,
                p_player_id: playerId
            });
            if (error) throw error;
            this.notifySuccess('تم تحديد الفائز');
            await this.loadLiveData();
            this._renderLive();
        } catch (err) {
            console.error('[gw] pickWinner error:', err);
            this.notifyError(this._parseError(err));
        }
    }

    async closeSession() {
        const confirmed = await this._confirm('هل تريد إنهاء الجلسة الآن؟', 'إنهاء');
        if (!confirmed) return;
        try {
            const { error } = await this.sb.rpc('gw_close_session', { p_session_id: this.activeSessionId });
            if (error) throw error;
            this.notifySuccess('تم إنهاء الجلسة');
            await this.loadLiveData();
            this._renderLive();
            this._stopTimer();
        } catch (err) {
            console.error('[gw] closeSession error:', err);
            this.notifyError(this._parseError(err));
        }
    }

    async kickPlayer(playerId) {
        const player = this.activePlayers.find(p => p.id === playerId);
        if (!player) return;
        const confirmed = await this._confirm(`هل تريد طرد المتسابق "${player.name}"؟`, 'طرد');
        if (!confirmed) return;
        try {
            const { error } = await this.sb.rpc('gw_kick_player', { p_player_id: playerId });
            if (error) throw error;
            this.notifySuccess('تم طرد المتسابق');
            await this.loadLiveData();
            this._renderLive();
        } catch (err) {
            console.error('[gw] kickPlayer error:', err);
            this.notifyError(this._parseError(err));
        }
    }

    // ==========================================
    // 5. الموقت
    // ==========================================
    _startTimer() {
        this._stopTimer();
        const tick = () => {
            const timerEl = document.getElementById('gwLiveTimer');
            const valueEl = document.getElementById('gwLiveTimerValue');
            if (!timerEl || !valueEl) return;

            const currentWord = this.activeWords.find(w => w.id === this.activeSession?.current_word_id);
            if (!currentWord || !currentWord.started_at || currentWord.ended_at) {
                timerEl.classList.remove('warn', 'danger');
                timerEl.classList.add('ended');
                valueEl.textContent = currentWord?.ended_at ? 'انتهت' : '—';
                return;
            }

            timerEl.classList.remove('ended');
            const elapsed = (Date.now() - new Date(currentWord.started_at).getTime()) / 1000;
            const remaining = Math.max(0, Math.ceil(this.activeSession.time_per_word - elapsed));
            valueEl.textContent = remaining;
            timerEl.classList.toggle('warn', remaining <= 20 && remaining > 10);
            timerEl.classList.toggle('danger', remaining <= 10 && remaining > 0);
            if (remaining <= 0) {
                timerEl.classList.remove('warn', 'danger');
                timerEl.classList.add('ended');
                valueEl.textContent = '0';
            }
        };
        tick();
        this.timerHandle = setInterval(tick, 250);
    }

    _stopTimer() {
        if (this.timerHandle) {
            clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
    }

    // ==========================================
    // 6. Realtime
    // ==========================================
    _subscribeRealtime() {
        this._unsubscribeRealtime();
        if (!this.activeSessionId) return;

        const sid = this.activeSessionId;
        this.channel = this.sb.channel(`gw-admin:${sid}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'guess_word_players',
                filter: `session_id=eq.${sid}`
            }, async () => {
                await this.loadLiveData();
                this._renderPlayers();
                this._renderAnswers();
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'guess_word_answers'
            }, async (payload) => {
                const wordId = payload.new?.word_id;
                if (wordId === this.activeSession?.current_word_id) {
                    await this._loadAnswersForCurrentWord();
                    this._renderAnswers();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'guess_word_words',
                filter: `session_id=eq.${sid}`
            }, async () => {
                await this.loadLiveData();
                this._renderLive();
            })
            .subscribe();
    }

    _unsubscribeRealtime() {
        if (this.channel) {
            try { this.sb.removeChannel(this.channel); } catch (_) {}
            this.channel = null;
        }
    }

    _cleanupLive() {
        this._stopTimer();
        this._unsubscribeRealtime();
        this.activeSessionId = null;
        this.activeSession = null;
    }

    // ==========================================
    // 7. مساعدات
    // ==========================================
    _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    _formatDate(d) {
        if (!d) return '—';
        try {
            const date = new Date(d);
            return date.toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })
                + ' ' + date.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return d;
        }
    }

    _parseError(err) {
        const msg = err?.message || '';
        const map = {
            'GW_FORBIDDEN': 'لا تملك الصلاحيات اللازمة',
            'GW_TITLE_REQUIRED': 'عنوان الجلسة مطلوب',
            'GW_TITLE_TOO_LONG': 'العنوان طويل جداً (الحد 100 حرف)',
            'GW_TITLE_DUPLICATE': 'يوجد جلسة بنفس العنوان — اختر عنواناً مختلفاً',
            'idx_gw_sessions_title_unique': 'يوجد جلسة بنفس العنوان — اختر عنواناً مختلفاً',
            'GW_NO_WORDS': 'يجب إضافة كلمة واحدة على الأقل',
            'GW_TOO_MANY_WORDS': 'الحد الأقصى 200 كلمة',
            'GW_SESSION_NOT_FOUND': 'الجلسة غير موجودة',
            'GW_SESSION_FINISHED': 'الجلسة منتهية',
            'GW_WORD_NOT_FOUND': 'الكلمة غير موجودة',
            'GW_PLAYER_NOT_IN_SESSION': 'المتسابق ليس في هذه الجلسة'
        };
        for (const k of Object.keys(map)) {
            if (msg.includes(k)) return map[k];
        }
        return msg.split(':').pop().trim() || 'حدث خطأ غير متوقع';
    }

    notifySuccess(message) {
        if (window.Swal) {
            window.Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: message, showConfirmButton: false, timer: 2500 });
        } else {
            console.log('[gw] OK:', message);
        }
    }

    notifyError(message) {
        if (window.Swal) {
            window.Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: message, showConfirmButton: false, timer: 3500 });
        } else {
            alert(message);
        }
    }

    async _confirm(message, confirmLabel = 'تأكيد') {
        if (window.Swal) {
            const r = await window.Swal.fire({
                title: 'تأكيد',
                text: message,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: confirmLabel,
                cancelButtonText: 'إلغاء',
                reverseButtons: true
            });
            return r.isConfirmed;
        }
        return confirm(message);
    }
}

window.GuessWordManager = GuessWordManager;
