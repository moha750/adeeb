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
            const { data, error } = await this.sb
                .from('guess_word_sessions')
                .select('id, code, title, status, time_per_word, created_at, started_at, finished_at')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            this.sessions = data || [];
            await this.enrichSessionsWithCounts();
            this.renderList();
        } catch (err) {
            console.error('[gw] loadList error:', err);
            this.notifyError('تعذّر تحميل الجلسات');
        }
    }

    async enrichSessionsWithCounts() {
        if (this.sessions.length === 0) return;
        const ids = this.sessions.map(s => s.id);
        const [playersRes, wordsRes] = await Promise.all([
            this.sb.from('guess_word_players').select('session_id').in('session_id', ids).eq('is_kicked', false),
            this.sb.from('guess_word_words').select('session_id').in('session_id', ids)
        ]);
        const playersBySession = {};
        const wordsBySession = {};
        (playersRes.data || []).forEach(r => {
            playersBySession[r.session_id] = (playersBySession[r.session_id] || 0) + 1;
        });
        (wordsRes.data || []).forEach(r => {
            wordsBySession[r.session_id] = (wordsBySession[r.session_id] || 0) + 1;
        });
        this.sessions.forEach(s => {
            s.players_count = playersBySession[s.id] || 0;
            s.words_count = wordsBySession[s.id] || 0;
        });
    }

    renderList() {
        const container = document.getElementById('guessWordListContainer');
        if (!container) return;

        const total = this.sessions.length;
        const active = this.sessions.filter(s => s.status === 'active' || s.status === 'waiting').length;
        const finished = this.sessions.filter(s => s.status === 'finished').length;

        const statsHtml = `
            <div class="gw-admin-stats">
                <div class="gw-admin-stat-card">
                    <i class="fa-solid fa-list-check"></i>
                    <div>
                        <div class="label">إجمالي الجلسات</div>
                        <div class="value">${total}</div>
                    </div>
                </div>
                <div class="gw-admin-stat-card">
                    <i class="fa-solid fa-play"></i>
                    <div>
                        <div class="label">جلسات نشطة</div>
                        <div class="value">${active}</div>
                    </div>
                </div>
                <div class="gw-admin-stat-card">
                    <i class="fa-solid fa-flag-checkered"></i>
                    <div>
                        <div class="label">جلسات منتهية</div>
                        <div class="value">${finished}</div>
                    </div>
                </div>
            </div>
        `;

        let listHtml;
        if (total === 0) {
            listHtml = `
                <div class="gw-empty">
                    <i class="fa-solid fa-comments-question"></i>
                    <h3>لا توجد جلسات بعد</h3>
                    <p>ابدأ بإنشاء جلسة جديدة لبدء اللعب</p>
                </div>
            `;
        } else {
            const cards = this.sessions.map(s => this._renderSessionCard(s)).join('');
            listHtml = `<div class="gw-sessions-grid">${cards}</div>`;
        }

        container.innerHTML = statsHtml + listHtml;
        this._attachListCardListeners();
    }

    _renderSessionCard(s) {
        const statusLabel = s.status === 'waiting' ? 'في الانتظار'
            : s.status === 'active' ? 'جارية'
            : 'منتهية';
        const created = this._formatDate(s.created_at);
        const title = s.title || 'جلسة بلا عنوان';

        const continueBtn = (s.status !== 'finished')
            ? `<button class="btn btn-primary" data-action="open" data-id="${s.id}"><i class="fa-solid fa-play"></i> فتح</button>`
            : `<button class="btn btn-slate btn-outline" data-action="open" data-id="${s.id}"><i class="fa-solid fa-eye"></i> عرض</button>`;

        return `
            <article class="gw-session-card">
                <div class="gw-session-card-header">
                    <div class="gw-session-card-title">${this._esc(title)}</div>
                    <span class="gw-session-status ${s.status}">${statusLabel}</span>
                </div>
                <div class="gw-session-card-meta">
                    <span><i class="fa-regular fa-calendar"></i>${created}</span>
                    <span><i class="fa-solid fa-list"></i>${s.words_count} كلمة</span>
                    <span><i class="fa-solid fa-users"></i>${s.players_count} متسابق</span>
                </div>
                <div class="gw-session-card-meta">
                    <span class="gw-session-card-code">${s.code}</span>
                </div>
                <div class="gw-session-card-actions">
                    ${continueBtn}
                    <button class="btn btn-danger btn-outline" data-action="delete" data-id="${s.id}" title="حذف">
                        <i class="fa-solid fa-trash"></i>
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
        const counter = document.getElementById('gwWordsCounter');
        if (!ta || !counter) return;
        const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
        counter.innerHTML = `<strong>${lines.length}</strong> كلمة`;
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
                p_title: title || null,
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
            const [sessionRes, wordsRes, playersRes] = await Promise.all([
                this.sb.from('guess_word_sessions').select('*').eq('id', this.activeSessionId).single(),
                this.sb.from('guess_word_words').select('*').eq('session_id', this.activeSessionId).order('position'),
                this.sb.from('guess_word_players').select('*').eq('session_id', this.activeSessionId).order('joined_at')
            ]);

            if (sessionRes.error) throw sessionRes.error;
            this.activeSession = sessionRes.data;
            this.activeWords = wordsRes.data || [];
            this.activePlayers = playersRes.data || [];

            await this._loadAnswersForCurrentWord();
        } catch (err) {
            console.error('[gw] loadLiveData error:', err);
            this.notifyError('تعذّر تحميل بيانات الجلسة');
        }
    }

    async _loadAnswersForCurrentWord() {
        const currentWordId = this.activeSession?.current_word_id;
        if (!currentWordId) {
            this.activeAnswers = [];
            return;
        }
        const { data, error } = await this.sb
            .from('guess_word_answers')
            .select('*')
            .eq('word_id', currentWordId)
            .order('response_ms', { ascending: true });
        if (error) {
            console.error('[gw] loadAnswers error:', error);
            this.activeAnswers = [];
            return;
        }
        this.activeAnswers = data || [];
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
        if (typeof QRCode === 'undefined') {
            wrapper.innerHTML = '<div class="gw-no-answers">QR library not loaded</div>';
            return;
        }
        this.qrInstance = new QRCode(wrapper, {
            text: url,
            width: 240,
            height: 240,
            colorDark: '#274060',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
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
