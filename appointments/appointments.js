'use strict';

(function(){
  const KEYS = {
    appointments: 'adeeb_appointments',
    appointment_bookings: 'adeeb_appointment_bookings',
  };

  const sb = window.sbClient || null;

  function qs(sel){ return document.querySelector(sel); }
  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }

  function getQueryParam(name){ try { const u=new URL(location.href); return u.searchParams.get(name); } catch { return null; } }

  function loadAppointments(){
    try{
      const raw = localStorage.getItem(KEYS.appointments);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function loadBookings(){
    try{
      const raw = localStorage.getItem(KEYS.appointment_bookings);
      const map = raw ? JSON.parse(raw) : {};
      return (map && typeof map === 'object' && !Array.isArray(map)) ? map : {};
    } catch { return {}; }
  }
  function saveBookings(map){
    try{ localStorage.setItem(KEYS.appointment_bookings, JSON.stringify(map || {})); } catch {}
  }

  function pad2(n){ return String(n).padStart(2,'0'); }
  function parseHM(s){
    const parts = String(s || '').split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }
  function hmFromMinutes(mins){
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return pad2(h) + ':' + pad2(m);
  }
  function buildWindows(slot){
    const s = parseHM(slot?.start);
    const e = parseHM(slot?.end);
    const out = [];
    if (s === null || e === null) return out;
    const startAligned = Math.ceil(s / 10) * 10;
    for (let m = startAligned; m + 10 <= e; m += 10) {
      out.push({ start: hmFromMinutes(m), end: hmFromMinutes(m + 10) });
    }
    return out;
  }
  function fmtSlotLabel(date, day, start, end){
    const parts = [];
    if (day) parts.push(day);
    if (date) parts.push(date);
    parts.push(start + ' - ' + end);
    return parts.join(' ');
  }

  const aptId = getQueryParam('id');
  const aptHeader = qs('#aptHeader');
  const aptSub = qs('#aptSub');
  const aptError = qs('#aptError');
  const aptContent = qs('#aptContent');
  const slotsList = qs('#slotsList');
  const noSlots = qs('#noSlots');
  const bookForm = qs('#bookForm');
  const statusMsg = qs('#statusMsg');
  const refreshBtn = qs('#refreshBtn');
  const selectionRow = qs('#selectionRow');
  const selectionText = qs('#selectionText');
  const changeSelectionBtn = qs('#changeSelectionBtn');
  const fillInfoDialog = qs('#fillInfoDialog');
  let windows = [];
  let selected = null;
  let rtChan = null;
  const presenceEl = qs('#presenceCount');

  function showError(msg){
    if (aptError) { aptError.textContent = msg || 'حدث خطأ غير متوقع.'; aptError.style.display = ''; }
    if (aptContent) aptContent.style.display = 'none';
  }
  function showContent(){
    if (aptError) aptError.style.display = 'none';
    if (aptContent) aptContent.style.display = '';
  }

  async function render(){
    let cur = null;
    let bookedSet = new Set();
    try {
      if (sb) {
        const { data: apt, error } = await sb.from('appointments').select('*').eq('id', aptId).maybeSingle();
        if (error) throw error;
        if (!apt) { showError('هذا الموعد غير موجود أو تم حذفه.'); return; }
        cur = { id: apt.id, title: apt.title || 'حجز موعد', slots: Array.isArray(apt.slots) ? apt.slots : (apt.slots ? apt.slots : []) };
        try {
          const { data: rows, error: bErr } = await sb
            .from('appointment_bookings')
            .select('slot_index, time_start')
            .eq('appointment_id', cur.id);
          if (bErr) throw bErr;
          const bookedList = Array.isArray(rows) ? rows : [];
          bookedSet = new Set(bookedList.map(e => String(e.slot_index) + '|' + e.time_start));
        } catch (e) {
          bookedSet = new Set();
        }
      } else {
        const all = loadAppointments();
        cur = all.find(a => a && a.id === aptId);
        if (!cur) { showError('هذا الموعد غير موجود أو تم حذفه.'); return; }
        const bookings = loadBookings();
        const bookedList = Array.isArray(bookings[cur.id]) ? bookings[cur.id] : [];
        bookedSet = new Set(bookedList.map(e => String(e.slot_index) + '|' + e.time_start));
      }
    } catch (err) {
      showError('حدث خطأ أثناء تحميل الموعد.');
      return;
    }

    if (aptHeader) aptHeader.innerHTML = '<i class="fa-solid fa-calendar-check"></i> ' + (cur.title || 'حجز موعد');
    if (aptSub) aptSub.textContent = 'اختر الوقت واملأ بياناتك لإرسال طلب الحجز.';

    const slots = Array.isArray(cur.slots) ? cur.slots : [];
    slotsList.innerHTML = '';
    if (selectionRow) selectionRow.style.display = 'none';
    selected = null;
    const items = [];
    slots.forEach((s, slotIdx) => {
      if (s && s.start && s.end) {
        const ws = buildWindows(s);
        ws.forEach(w => { items.push({ slotIdx, date: s.date || '', day: s.day || '', start: w.start, end: w.end }); });
      } else if (s && s.time) {
        const p = parseHM(s.time);
        if (p !== null) {
          const pAligned = Math.floor(p / 10) * 10;
          items.push({ slotIdx, date: s.date || '', day: s.day || '', start: hmFromMinutes(pAligned), end: hmFromMinutes(pAligned + 10) });
        }
      }
    });
    windows = items;
    if (!items.length) {
      if (noSlots) noSlots.style.display = '';
    } else {
      if (noSlots) noSlots.style.display = 'none';
      const frag = document.createDocumentFragment();
      items.forEach((it, i) => {
        const key = String(it.slotIdx) + '|' + it.start;
        const isBooked = bookedSet.has(key);
        const btn = el('<button type="button" class="slot-card" data-key="'+key+'" aria-pressed="false"></button>');
        const dateLineText = [it.day, it.date].filter(Boolean).join(' ');
        const dateLine = el('<div><strong>التاريخ:</strong> ' + dateLineText + '</div>');
        const timeLine = el('<div class="slot-time"><strong>الوقت:</strong> ' + it.start + ' - ' + it.end + '</div>');
        const meta = el('<div class="slot-meta">الموعد ' + (i+1) + '</div>');
        btn.appendChild(dateLine);
        btn.appendChild(timeLine);
        btn.appendChild(meta);
        if (isBooked) {
          btn.classList.add('booked');
          btn.disabled = true;
          const badge = el('<span class="slot-badge">محجوز</span>');
          timeLine.appendChild(badge);
        }
        frag.appendChild(btn);
      });
      slotsList.appendChild(frag);
    }

    showContent();
  }

  function setSelectedByKey(key) {
    const card = slotsList && slotsList.querySelector('.slot-card[data-key="'+key+'"]');
    if (!card) return;
    if (card.disabled) return;
    const parts = key.split('|');
    const slotIdx = Number(parts[0]);
    const startStr = parts[1] || '';
    const it = windows.find(w => w.slotIdx === slotIdx && w.start === startStr);
    if (!it) return;
    if (selected && selected.key) {
      const prev = slotsList.querySelector('.slot-card[data-key="'+selected.key+'"]');
      if (prev) {
        prev.classList.remove('selected');
        prev.disabled = false;
        const b = prev.querySelector('.slot-badge');
        if (b && !prev.classList.contains('booked')) b.remove();
      }
    }
    selected = { key, slot_index: slotIdx, start: startStr, end: hmFromMinutes(parseHM(startStr) + 10), label: fmtSlotLabel(it.date, it.day, startStr, hmFromMinutes(parseHM(startStr) + 10)) };
    card.classList.add('selected');
    card.disabled = true;
    let badge = card.querySelector('.slot-badge');
    if (!badge) {
      badge = el('<span class="slot-badge">محجوز</span>');
      const timeEl = card.querySelector('.slot-time') || card.children[1] || card.firstElementChild;
      if (timeEl) timeEl.appendChild(badge);
    }
    if (selectionRow && selectionText) {
      selectionText.textContent = 'الوقت المختار: ' + selected.label;
      selectionRow.style.display = '';
    }
  }
  function markCardBookedByKey(key){
    const c = slotsList && slotsList.querySelector('.slot-card[data-key="'+key+'"]');
    if (!c) return;
    c.classList.add('booked');
    c.disabled = true;
    let badge = c.querySelector('.slot-badge');
    if (!badge) {
      const timeEl = c.querySelector('.slot-time') || c.children[1] || c.firstElementChild;
      if (timeEl) {
        badge = el('<span class="slot-badge">محجوز</span>');
        timeEl.appendChild(badge);
      }
    }
    if (selected && selected.key === key) {
      selected = null;
      if (selectionRow) selectionRow.style.display = 'none';
      if (statusMsg) {
        statusMsg.style.color = '#ef4444';
        statusMsg.textContent = 'تم حجز الوقت الذي اخترته من مستخدم آخر. الرجاء اختيار وقت آخر.';
      }
    }
  }
  function unmarkCardBookedByKey(key){
    const c = slotsList && slotsList.querySelector('.slot-card[data-key="'+key+'"]');
    if (!c) return;
    c.classList.remove('booked');
    if (!c.classList.contains('selected')) c.disabled = false;
    const b = c.querySelector('.slot-badge');
    if (b) b.remove();
  }
  function ensureRealtime(){
    if (!sb || rtChan || !aptId) return;
    try {
      let did = '';
      try {
        did = localStorage.getItem('adeeb_device_id');
        if (!did) { did = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('adeeb_device_id', did); }
      } catch { did = String(Math.random()); }
      rtChan = sb
        .channel('rb:apt_'+aptId, { config: { presence: { key: did } } })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointment_bookings', filter: 'appointment_id=eq.' + aptId }, (payload)=>{
          try {
            const row = payload.new || {};
            const key = String(row.slot_index) + '|' + row.time_start;
            markCardBookedByKey(key);
          } catch {}
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'appointment_bookings', filter: 'appointment_id=eq.' + aptId }, (payload)=>{
          try {
            const row = payload.old || {};
            const key = String(row.slot_index) + '|' + row.time_start;
            unmarkCardBookedByKey(key);
          } catch {}
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointment_bookings', filter: 'appointment_id=eq.' + aptId }, (payload)=>{
          try {
            const oldRow = payload.old || {};
            const newRow = payload.new || {};
            const oldKey = String(oldRow.slot_index) + '|' + oldRow.time_start;
            const newKey = String(newRow.slot_index) + '|' + newRow.time_start;
            if (oldKey && oldKey !== 'undefined|undefined') unmarkCardBookedByKey(oldKey);
            if (newKey && newKey !== 'undefined|undefined') markCardBookedByKey(newKey);
          } catch {}
        })
        .on('presence', { event: 'sync' }, () => {
          try {
            const st = rtChan.presenceState() || {};
            const keys = Object.keys(st);
            let count = 0;
            for (const k of keys){
              const arr = Array.isArray(st[k]) ? st[k] : [];
              count += arr.length;
            }
            if (presenceEl){
              const b = presenceEl.querySelector('b');
              if (b) b.textContent = String(count);
              presenceEl.style.display = '';
            }
          } catch {}
        })
        .subscribe((status)=>{
          if (status === 'SUBSCRIBED') {
            try { rtChan.track({ appointment_id: aptId, online_at: new Date().toISOString() }); } catch {}
            if (presenceEl) presenceEl.style.display = '';
          }
        });
    } catch {}
  }

  slotsList?.addEventListener('click', (e) => {
    const card = e.target.closest('.slot-card');
    if (!card) return;
    if (card.classList.contains('booked')) return;
    const nameVal = (qs('#custName')?.value || '').trim();
    const phoneVal = (qs('#custPhone')?.value || '').trim();
    if (!nameVal || !phoneVal) {
      const missing = !nameVal ? 'name' : 'phone';
      if (fillInfoDialog && typeof fillInfoDialog.showModal === 'function') {
        try {
          fillInfoDialog.showModal();
          fillInfoDialog.addEventListener('close', () => {
            try {
              if (missing === 'name') qs('#custName')?.focus(); else qs('#custPhone')?.focus();
            } catch {}
          }, { once: true });
        } catch { try { if (missing === 'name') qs('#custName')?.focus(); else qs('#custPhone')?.focus(); } catch {} }
      } else {
        try { if (missing === 'name') qs('#custName')?.focus(); else qs('#custPhone')?.focus(); } catch {}
      }
      return;
    }
    const key = card.getAttribute('data-key');
    if (!key) return;
    setSelectedByKey(key);
  });

  changeSelectionBtn?.addEventListener('click', () => {
    if (selected && selected.key) {
      const prev = slotsList.querySelector('.slot-card[data-key="'+selected.key+'"]');
      if (prev && !prev.classList.contains('booked')) {
        prev.classList.remove('selected');
        prev.disabled = false;
        const b = prev.querySelector('.slot-badge');
        if (b) b.remove();
      }
    }
    selected = null;
    if (selectionRow) selectionRow.style.display = 'none';
  });

  bookForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMsg.textContent = '';

    let curId = aptId;
    if (!curId) { alert('الموعد غير موجود'); return; }
    if (!selected) { alert('الرجاء اختيار وقت'); return; }
    const slotIndex = selected.slot_index;
    const startStr = selected.start;
    if (!/^[0-2]\d:[0-5]\d$/.test(startStr)) { alert('الرجاء اختيار وقت صحيح'); return; }
    const startMin = parseHM(startStr);
    if (startMin === null || startMin % 10 !== 0) { alert('الرجاء اختيار وقت من مضاعفات 10 دقائق'); return; }
    const endStr = selected.end;

    const name = (qs('#custName')?.value || '').trim();
    const phone = (qs('#custPhone')?.value || '').trim();

    if (!name) { alert('الاسم مطلوب'); return; }
    if (!phone) { alert('رقم الجوال مطلوب'); return; }

    if (sb) {
      try {
        // Check not already booked (optimistic, DB should have unique constraint ideally)
        const { data: exists } = await sb
          .from('appointment_bookings')
          .select('id')
          .eq('appointment_id', curId)
          .eq('slot_index', slotIndex)
          .eq('time_start', startStr)
          .maybeSingle();
        if (exists) { alert('تم حجز هذا الوقت مسبقًا. الرجاء اختيار وقت آخر.'); return; }
        const { error } = await sb.from('appointment_bookings').insert({
          appointment_id: curId,
          slot_index: slotIndex,
          time_start: startStr,
          time_end: endStr,
          name,
          phone,
        });
        if (error) throw error;
      } catch (err) {
        alert('تعذّر إرسال طلب الحجز: ' + (err?.message || 'غير معروف'));
        return;
      }
    } else {
      // Fallback to local storage
      const bookings = loadBookings();
      const id = 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      const entry = {
        id,
        appointment_id: curId,
        slot_index: slotIndex,
        time_start: startStr,
        time_end: endStr,
        name,
        phone,
        created_at: new Date().toISOString(),
      };
      const list = Array.isArray(bookings[curId]) ? bookings[curId] : [];
      list.push(entry);
      bookings[curId] = list;
      saveBookings(bookings);
    }

    statusMsg.style.color = '#10b981';
    statusMsg.textContent = 'تم إرسال طلب الحجز ✓';
    try { bookForm.reset(); } catch {}
    if (selected && selected.key) {
      const c = slotsList.querySelector('.slot-card[data-key="'+selected.key+'"]');
      if (c) {
        c.classList.add('booked');
        c.disabled = true;
      }
      selected = null;
      if (selectionRow) selectionRow.style.display = 'none';
    }
  });

  refreshBtn?.addEventListener('click', render);

  if (!aptId) { showError('رابط غير صحيح: لا يوجد معرّف للموعد.'); return; }
  ensureRealtime();
  render();
})();
