(function(){
  const sb = window.sbClient;
  const formEl = document.getElementById('builderForm');
  const titleEl = document.getElementById('formTitle');
  const descEl = document.getElementById('formDesc');
  const isPublicEl = document.getElementById('isPublic');
  const addBtn = document.getElementById('addQuestionBtn');
  const typeSel = document.getElementById('newQType');
  const listEl = document.getElementById('questions');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const publishBtn = document.getElementById('publishBtn');
  const statusEl = document.getElementById('status');
  const authNotice = document.getElementById('authNotice');
  const shareBox = document.getElementById('shareBox');
  const fillUrlEl = document.getElementById('fillUrl');
  const resultsUrlEl = document.getElementById('resultsUrl');
  const copyFillBtn = document.getElementById('copyFill');
  const copyResultsBtn = document.getElementById('copyResults');

  const state = { questions: [] };

  function uuid(){ try { return crypto.randomUUID(); } catch { return 'q-' + Math.random().toString(36).slice(2) + Date.now().toString(36); } }
  function slugify(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-+/g,'-').replace(/^-+|-+$/g,''); }
  function kebabId(){ return Math.random().toString(36).slice(2,6); }

  function render(){
    listEl.innerHTML = '';
    state.questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'slot-card';
      card.dataset.id = q.id;
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.gap = '8px';
      header.style.alignItems = 'center';
      header.innerHTML = `
        <div style="flex:1; display:grid; gap:6px">
          <input type="text" value="${q.label||''}" placeholder="نص السؤال" style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px" />
          ${q.type==='multiple_choice'||q.type==='checkboxes' ? `<div class="opts"></div><button type="button" class="btn btn-outline btn-xs add-opt"><i class=\"fa-solid fa-plus\"></i> خيار جديد</button>` : ''}
        </div>
        <div style="display:grid; gap:8px; justify-items:start">
          <select class="qtype" style="border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px">
            <option value="short_text" ${q.type==='short_text'?'selected':''}>نص قصير</option>
            <option value="long_text" ${q.type==='long_text'?'selected':''}>نص طويل</option>
            <option value="multiple_choice" ${q.type==='multiple_choice'?'selected':''}>اختيار من متعدد</option>
            <option value="checkboxes" ${q.type==='checkboxes'?'selected':''}>خيارات متعددة</option>
          </select>
          <label style="display:flex; gap:6px; align-items:center"><input type="checkbox" class="req" ${q.required?'checked':''}/> مطلوب</label>
          <div style="display:flex; gap:6px">
            <button type="button" class="btn btn-outline btn-xs up"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" class="btn btn-outline btn-xs down"><i class="fa-solid fa-arrow-down"></i></button>
            <button type="button" class="btn btn-outline btn-xs del"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>`;
      card.appendChild(header);
      listEl.appendChild(card);
      const [labelInput] = header.querySelectorAll('input[type="text"]');
      labelInput.addEventListener('input', () => { q.label = labelInput.value; persistDraft(); });
      const reqEl = header.querySelector('.req');
      reqEl.addEventListener('change', () => { q.required = !!reqEl.checked; persistDraft(); });
      const typeEl = header.querySelector('.qtype');
      typeEl.addEventListener('change', () => { q.type = typeEl.value; if(q.type!=='multiple_choice'&&q.type!=='checkboxes') q.options=[]; render(); persistDraft(); });
      const upBtn = header.querySelector('.up');
      const downBtn = header.querySelector('.down');
      const delBtn = header.querySelector('.del');
      upBtn.addEventListener('click', () => { if(idx>0){ const t=state.questions[idx-1]; state.questions[idx-1]=state.questions[idx]; state.questions[idx]=t; render(); persistDraft(); }});
      downBtn.addEventListener('click', () => { if(idx<state.questions.length-1){ const t=state.questions[idx+1]; state.questions[idx+1]=state.questions[idx]; state.questions[idx]=t; render(); persistDraft(); }});
      delBtn.addEventListener('click', () => { state.questions.splice(idx,1); render(); persistDraft(); });
      if(q.type==='multiple_choice'||q.type==='checkboxes'){
        q.options = Array.isArray(q.options)? q.options : [];
        const optsBox = header.querySelector('.opts');
        const addOptBtn = header.querySelector('.add-opt');
        function renderOpts(){
          optsBox.innerHTML = '';
          q.options.forEach((opt, i) => {
            const row = document.createElement('div');
            row.style.display = 'flex'; row.style.gap='6px'; row.style.alignItems='center'; row.style.marginBottom='6px';
            row.innerHTML = `
              <input type="text" value="${opt||''}" placeholder="خيار" style="flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px" />
              <button type="button" class="btn btn-outline btn-xs rem"><i class="fa-regular fa-trash-can"></i></button>
            `;
            const [optInput] = row.querySelectorAll('input[type="text"]');
            const rem = row.querySelector('.rem');
            optInput.addEventListener('input', () => { q.options[i] = optInput.value; persistDraft(); });
            rem.addEventListener('click', () => { q.options.splice(i,1); renderOpts(); persistDraft(); });
            optsBox.appendChild(row);
          });
        }
        renderOpts();
        addOptBtn.addEventListener('click', () => { q.options.push(''); renderOpts(); persistDraft(); });
      }
    });
  }

  function persistDraft(){
    const draft = {
      title: titleEl.value||'',
      description: descEl.value||'',
      is_public: !!isPublicEl.checked,
      questions: state.questions
    };
    try { localStorage.setItem('adeeb_forms_builder_draft', JSON.stringify(draft)); } catch {}
  }
  function loadDraft(){
    try {
      const raw = localStorage.getItem('adeeb_forms_builder_draft');
      if(!raw) return;
      const d = JSON.parse(raw);
      titleEl.value = d.title||'';
      descEl.value = d.description||'';
      isPublicEl.checked = !!d.is_public;
      state.questions = Array.isArray(d.questions) ? d.questions : [];
      render();
    } catch {}
  }

  addBtn.addEventListener('click', () => {
    const t = typeSel.value;
    const q = { id: uuid(), type: t, label: '', required: false, options: t==='multiple_choice'||t==='checkboxes' ? ['',''] : [] };
    state.questions.push(q); render(); persistDraft();
  });

  saveDraftBtn.addEventListener('click', () => { persistDraft(); statusEl.textContent = 'تم حفظ المسودة محليًا'; setTimeout(()=>statusEl.textContent='',2000); });

  copyFillBtn.addEventListener('click', () => { fillUrlEl.select(); document.execCommand('copy'); statusEl.textContent='تم نسخ الرابط'; setTimeout(()=>statusEl.textContent='',1500); });
  copyResultsBtn.addEventListener('click', () => { resultsUrlEl.select(); document.execCommand('copy'); statusEl.textContent='تم نسخ الرابط'; setTimeout(()=>statusEl.textContent='',1500); });

  async function ensureAuth(){
    if(!sb){ authNotice.style.display='block'; authNotice.textContent='Supabase غير مفعّل.'; publishBtn.disabled = true; return null; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if(!session){
        authNotice.style.display='block';
        authNotice.innerHTML = 'يلزم تسجيل الدخول لنشر الاستبيان. <a href="../login.html?redirect=forms/builder.html">تسجيل الدخول</a>';
        return null;
      }
      authNotice.style.display='none';
      return session;
    } catch { return null; }
  }

  function buildSlug(base){
    const s = slugify(base||'');
    return (s? s : 'form') + '-' + kebabId();
  }

  publishBtn.addEventListener('click', async () => {
    statusEl.textContent = '';
    const title = titleEl.value.trim();
    if(!title){ statusEl.textContent='يرجى كتابة عنوان'; return; }
    if(!state.questions.length){ statusEl.textContent='أضف سؤالًا واحدًا على الأقل'; return; }

    const session = await ensureAuth();
    if(!session){ return; }

    publishBtn.disabled = true; saveDraftBtn.disabled = true;
    try {
      const slug = buildSlug(title);
      const formRow = {
        owner_id: session.user.id,
        title,
        description: descEl.value.trim()||null,
        slug,
        is_public: !!isPublicEl.checked,
        is_published: true,
        accepting_responses: true
      };
      const ins = await sb.from('forms').insert(formRow).select('id,slug').single();
      if(ins.error){ throw ins.error; }
      const formId = ins.data.id;
      const rows = state.questions.map((q, i) => ({
        form_id: formId,
        order_index: i,
        type: q.type,
        label: q.label||('سؤال '+(i+1)),
        required: !!q.required,
        options: (q.type==='multiple_choice'||q.type==='checkboxes') ? (Array.isArray(q.options)? q.options.filter(Boolean) : []) : []
      }));
      if(rows.length){
        const qres = await sb.from('form_questions').insert(rows).select('id');
        if(qres.error){ throw qres.error; }
      }
      const origin = location.origin || (location.protocol + '//' + location.host);
      const fillUrl = origin + '/forms/fill.html?form=' + formId;
      const resultsUrl = origin + '/forms/results.html?form=' + formId;
      fillUrlEl.value = fillUrl; resultsUrlEl.value = resultsUrl;
      shareBox.style.display='block';
      statusEl.textContent = 'تم النشر.';
      try { localStorage.removeItem('adeeb_forms_builder_draft'); } catch {}
    } catch (e){
      statusEl.textContent = 'تعذر النشر. يرجى تجهيز جداول Supabase ثم المحاولة.';
    } finally {
      publishBtn.disabled = false; saveDraftBtn.disabled = false;
    }
  });

  loadDraft();
})();
