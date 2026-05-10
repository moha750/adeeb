/**
 * لعبة "خمّن الكلمة" — صفحة المتسابق
 *
 * تدفق الحالات:
 *   loading → join → waiting → play → submitted → waiting → play → ... → end
 *   شاشة error تظهر عند فشل الاتصال أو الطرد.
 */

(function() {
    'use strict';

    const sb = window.sbClient;
    const SCREENS = ['Loading', 'Join', 'Waiting', 'Play', 'Submitted', 'End', 'Error'];

    // ---------- localStorage helpers ----------
    function getOrCreateToken() {
        const KEY = 'gw_player_token';
        let token = localStorage.getItem(KEY);
        if (!token) {
            token = (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : 'tok_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
            localStorage.setItem(KEY, token);
        }
        return token;
    }

    function getCodeFromUrl() {
        const params = new URLSearchParams(location.search);
        return (params.get('code') || '').trim().toUpperCase();
    }

    // ---------- state ----------
    const state = {
        token: getOrCreateToken(),
        code: getCodeFromUrl(),
        sessionId: null,
        playerId: null,
        playerName: null,
        playerScore: 0,
        timePerWord: 60,
        currentWordId: null,
        currentWord: null,
        wordStartedAt: null,
        wordEndedAt: null,
        sessionStatus: 'waiting',
        alreadyAnswered: false,
        lastWinnerName: null,
        timerHandle: null,
        channel: null,
        polling: null
    };

    // ---------- screen management ----------
    function showScreen(name) {
        SCREENS.forEach(n => {
            const el = document.getElementById('screen' + n);
            if (el) el.hidden = (n !== name);
        });
    }

    function showError(message, title = 'حدث خطأ') {
        document.getElementById('errorTitle').textContent = title;
        document.getElementById('errorMessage').textContent = message;
        showScreen('Error');
    }

    // ---------- error parsing ----------
    function parseError(err) {
        const msg = err?.message || '';
        const map = {
            'GW_SESSION_NOT_FOUND': 'الجلسة غير موجودة',
            'GW_SESSION_FINISHED': 'الجلسة منتهية',
            'GW_PLAYER_KICKED': 'تم إخراجك من الجلسة',
            'GW_INVALID_NAME': 'الاسم غير صالح',
            'GW_INVALID_TOKEN': 'هوية المتسابق غير صالحة',
            'GW_NO_ACTIVE_ROUND': 'لا توجد جولة جارية حالياً',
            'GW_TIME_UP': 'انتهى وقت الجولة',
            'GW_ALREADY_ANSWERED': 'لقد أرسلت إجابتك بالفعل',
            'GW_ROUND_NOT_OPEN': 'الجولة غير مفتوحة',
            'GW_INVALID_ANSWER': 'الإجابة غير صالحة'
        };
        for (const k of Object.keys(map)) {
            if (msg.includes(k)) return map[k];
        }
        return msg.split(':').pop().trim() || 'تعذّر إكمال العملية';
    }

    // ---------- API ----------
    async function rpc(name, args) {
        const { data, error } = await sb.rpc(name, args);
        if (error) throw error;
        return data;
    }

    async function joinSession(playerName) {
        return rpc('gw_join_session', {
            p_code: state.code,
            p_name: playerName,
            p_token: state.token
        });
    }

    async function fetchPlayerState() {
        return rpc('gw_get_player_state', { p_token: state.token });
    }

    async function submitAnswer(answer) {
        return rpc('gw_submit_answer', { p_token: state.token, p_answer: answer });
    }

    async function fetchPlayers(sessionId) {
        const { data, error } = await sb
            .from('guess_word_players')
            .select('id, name, score, joined_at, is_kicked')
            .eq('session_id', sessionId)
            .eq('is_kicked', false)
            .order('joined_at', { ascending: true });
        if (error) {
            console.warn('[gw] players fetch error:', error);
            return [];
        }
        return data || [];
    }

    async function fetchLeaderboard(sessionId) {
        return rpc('gw_get_leaderboard', { p_session_id: sessionId });
    }

    // ---------- state application ----------
    function applyPlayerState(s) {
        state.sessionId = s.session_id;
        state.playerId = s.player_id;
        state.playerName = s.player_name;
        state.playerScore = s.player_score || 0;
        state.timePerWord = s.time_per_word || 60;
        state.currentWordId = s.current_word_id;
        state.currentWord = s.current_word;
        state.wordStartedAt = s.current_word_started_at ? new Date(s.current_word_started_at) : null;
        state.wordEndedAt = s.current_word_ended_at ? new Date(s.current_word_ended_at) : null;
        state.sessionStatus = s.session_status;
        state.alreadyAnswered = !!s.already_answered;
        state.lastWinnerName = s.current_word_winner_name || null;

        if (s.player_is_kicked) {
            stopTimer();
            stopRealtime();
            showError('تم إخراجك من الجلسة من قبل الأدمن', 'تم الإخراج');
            return;
        }

        renderForState();
    }

    // ---------- render ----------
    function renderForState() {
        // النهاية
        if (state.sessionStatus === 'finished') {
            stopTimer();
            renderEndScreen();
            return;
        }

        // اللعب الجاري
        if (state.sessionStatus === 'active' && state.currentWordId && state.wordStartedAt && !state.wordEndedAt) {
            const remaining = remainingSeconds();
            if (remaining > 0 && !state.alreadyAnswered) {
                renderPlayScreen();
                return;
            }
            if (state.alreadyAnswered) {
                renderSubmittedScreen();
                return;
            }
            // الوقت انتهى لكن الجولة لم تُغلق بعد على الخادم
        }

        // الانتظار (waiting أو بين الجولات)
        renderWaitingScreen();
    }

    function renderWaitingScreen() {
        document.getElementById('waitingPlayerName').textContent = state.playerName || '—';
        document.getElementById('waitingScore').textContent = state.playerScore;

        const lastBox = document.getElementById('lastWinnerBox');
        if (state.lastWinnerName && state.wordEndedAt) {
            document.getElementById('lastWinnerName').textContent = state.lastWinnerName;
            lastBox.hidden = false;
        } else {
            lastBox.hidden = true;
        }

        showScreen('Waiting');
        refreshPlayersList();
    }

    function renderPlayScreen() {
        document.getElementById('playPlayerName').textContent = state.playerName || '—';
        document.getElementById('playWord').textContent = state.currentWord || '—';
        document.getElementById('answerInput').value = '';
        document.getElementById('answerError').hidden = true;
        document.getElementById('answerSubmitBtn').disabled = false;
        showScreen('Play');
        startTimer('play');
    }

    function renderSubmittedScreen() {
        document.getElementById('submittedPlayerName').textContent = state.playerName || '—';
        document.getElementById('submittedScore').textContent = state.playerScore;
        showScreen('Submitted');
        startTimer('submitted');
    }

    async function renderEndScreen() {
        showScreen('End');
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '<div class="gw-muted" style="padding:1rem;">جارٍ التحميل...</div>';
        try {
            const rows = await fetchLeaderboard(state.sessionId);
            list.innerHTML = '';
            (rows || []).forEach(r => {
                const div = document.createElement('div');
                const isMe = r.player_id === state.playerId;
                const topClass = r.rank === 1 ? 'gw-leader-row--top1'
                    : r.rank === 2 ? 'gw-leader-row--top2'
                    : r.rank === 3 ? 'gw-leader-row--top3' : '';
                div.className = `gw-leader-row ${topClass} ${isMe ? 'gw-leader-row--mine' : ''}`.trim();
                const medal = r.rank === 1 ? '🥇'
                    : r.rank === 2 ? '🥈'
                    : r.rank === 3 ? '🥉' : `#${r.rank}`;
                div.innerHTML = `
                    <div class="gw-leader-rank">${medal}</div>
                    <div class="gw-leader-name">${escapeHtml(r.name)}${isMe ? ' (أنت)' : ''}</div>
                    <div class="gw-leader-score">${r.score}</div>
                `;
                list.appendChild(div);
            });
            if (!rows || rows.length === 0) {
                list.innerHTML = '<div class="gw-muted" style="padding:1rem;">لا توجد نتائج</div>';
            }
        } catch (e) {
            console.error('[gw] leaderboard error:', e);
            list.innerHTML = '<div class="gw-muted" style="padding:1rem;">تعذّر تحميل النتائج</div>';
        }
    }

    async function refreshPlayersList() {
        if (!state.sessionId) return;
        const players = await fetchPlayers(state.sessionId);
        const listEl = document.getElementById('waitingPlayersList');
        const countEl = document.getElementById('waitingPlayersCount');
        countEl.textContent = players.length;
        listEl.innerHTML = '';
        players.forEach(p => {
            const chip = document.createElement('span');
            chip.className = 'gw-player-chip' + (p.id === state.playerId ? ' gw-player-chip--me' : '');
            chip.textContent = p.name;
            listEl.appendChild(chip);
        });
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ---------- timer ----------
    function remainingSeconds() {
        if (!state.wordStartedAt) return 0;
        const elapsed = (Date.now() - state.wordStartedAt.getTime()) / 1000;
        return Math.max(0, Math.ceil(state.timePerWord - elapsed));
    }

    function startTimer(target) {
        stopTimer();
        const tick = () => {
            const s = remainingSeconds();
            const valEl = document.getElementById(target === 'play' ? 'playTimerValue' : 'submittedTimerValue');
            const wrapEl = document.getElementById(target === 'play' ? 'playTimer' : 'submittedTimer');
            if (valEl) valEl.textContent = s;

            if (wrapEl && target === 'play') {
                wrapEl.classList.toggle('warn', s <= 20 && s > 10);
                wrapEl.classList.toggle('danger', s <= 10);
            }

            if (s <= 0) {
                stopTimer();
                // إن انتهى الوقت بدون إرسال، أعد الحساب وأظهر الانتظار
                if (target === 'play' && !state.alreadyAnswered) {
                    renderWaitingScreen();
                }
            }
        };
        tick();
        state.timerHandle = setInterval(tick, 250);
    }

    function stopTimer() {
        if (state.timerHandle) {
            clearInterval(state.timerHandle);
            state.timerHandle = null;
        }
    }

    // ---------- realtime ----------
    function startRealtime(sessionId) {
        stopRealtime();
        const channel = sb.channel(`gw:session:${sessionId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'guess_word_sessions',
                filter: `id=eq.${sessionId}`
            }, () => refreshState())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'guess_word_words',
                filter: `session_id=eq.${sessionId}`
            }, () => refreshState())
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'guess_word_players',
                filter: `session_id=eq.${sessionId}`
            }, () => refreshPlayersList())
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'guess_word_players',
                filter: `session_id=eq.${sessionId}`
            }, () => refreshPlayersList())
            .subscribe();
        state.channel = channel;

        // احتياط: تحديث دوري كل 8 ثوانٍ في حال أخطأ Realtime
        if (state.polling) clearInterval(state.polling);
        state.polling = setInterval(refreshState, 8000);
    }

    function stopRealtime() {
        if (state.channel) {
            try { sb.removeChannel(state.channel); } catch (_) {}
            state.channel = null;
        }
        if (state.polling) {
            clearInterval(state.polling);
            state.polling = null;
        }
    }

    let refreshing = false;
    async function refreshState() {
        if (refreshing) return;
        refreshing = true;
        try {
            const s = await fetchPlayerState();
            if (!s) {
                showError('انتهت الجلسة أو لم تعد متاحة');
                stopRealtime();
                return;
            }
            applyPlayerState(s);
        } catch (e) {
            console.warn('[gw] refreshState error:', e);
        } finally {
            refreshing = false;
        }
    }

    // ---------- handlers ----------
    function attachJoinHandlers() {
        const form = document.getElementById('joinForm');
        const errorBox = document.getElementById('joinError');
        const btn = document.getElementById('joinSubmitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorBox.hidden = true;
            const name = document.getElementById('joinNameInput').value.trim();
            if (!name) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الانضمام...';

            try {
                const result = await joinSession(name);
                applyPlayerState({
                    session_id: result.session_id,
                    session_code: result.session_code,
                    session_title: result.session_title,
                    session_status: result.session_status,
                    time_per_word: result.time_per_word,
                    current_word_id: result.current_word_id,
                    current_word: null,
                    current_word_started_at: null,
                    current_word_ended_at: null,
                    current_word_winner_name: null,
                    player_id: result.player_id,
                    player_name: result.player_name,
                    player_score: result.player_score,
                    player_is_kicked: false,
                    already_answered: false
                });
                // اجلب الحالة الكاملة (للكلمة الجارية إن وُجدت)
                await refreshState();
                startRealtime(state.sessionId);
            } catch (err) {
                errorBox.textContent = parseError(err);
                errorBox.hidden = false;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> انضمام';
            }
        });
    }

    function attachAnswerHandlers() {
        const form = document.getElementById('answerForm');
        const errorBox = document.getElementById('answerError');
        const btn = document.getElementById('answerSubmitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorBox.hidden = true;

            const answer = document.getElementById('answerInput').value.trim();
            if (!answer) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الإرسال...';

            try {
                await submitAnswer(answer);
                state.alreadyAnswered = true;
                renderSubmittedScreen();
            } catch (err) {
                errorBox.textContent = parseError(err);
                errorBox.hidden = false;
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال الإجابة';
            }
        });
    }

    function attachMiscHandlers() {
        document.getElementById('endHomeBtn').addEventListener('click', () => {
            location.href = '/';
        });
        document.getElementById('errorRetryBtn').addEventListener('click', () => {
            location.reload();
        });
    }

    // ---------- init ----------
    async function init() {
        if (!sb) {
            showError('تعذّر الاتصال بالخادم');
            return;
        }

        if (!state.code) {
            showError('الرابط لا يحتوي على كود الجلسة. يرجى مسح الباركود من جديد.');
            return;
        }

        document.getElementById('joinSessionCode').textContent = state.code;
        attachJoinHandlers();
        attachAnswerHandlers();
        attachMiscHandlers();

        // إن كان هناك token مستخدم سابقاً لهذه الجلسة → ادخل مباشرة
        try {
            const existing = await fetchPlayerState();
            if (existing && existing.session_code === state.code) {
                applyPlayerState(existing);
                startRealtime(state.sessionId);
                return;
            }
        } catch (e) {
            console.warn('[gw] initial fetchPlayerState failed:', e);
        }

        // غير ذلك → اعرض شاشة الانضمام
        showScreen('Join');
    }

    document.addEventListener('DOMContentLoaded', init);

})();
