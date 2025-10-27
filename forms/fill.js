(function(){
  const sb = window.sbClient;
  const params = new URLSearchParams(location.search);
  const formParam = params.get('form');
  const errorBox = document.getElementById('errorBox');
  const formBox = document.getElementById('formBox');
  const fillForm = document.getElementById('fillForm');
  const headerEl = document.getElementById('formHeader');
  const subEl = document.getElementById('formSub');
  const thanksBox = document.getElementById('thanksBox');

  if(!sb){ error('Supabase غير مفعّل.'); return; }
  if(!formParam){ error('رابط غير صالح.'); return; }

  function error(msg){ errorBox.style.display='block'; errorBox.textContent = msg; }

  async function load(){
    try {
      // Fetch form by id or slug
      let q = sb.from('forms').select('id,title,description,is_public,is_published,accepting_responses').eq('id', formParam).maybeSingle();
      let { data: f, error: e1 } = await q;
      if(e1 || !f){
        let r2 = await sb.from('forms').select('id,title,description,is_public,is_published,accepting_responses').eq('slug', formParam).maybeSingle();
        f = r2.data; e1 = r2.error;
      }
      if(e1 || !f){ error('لم يتم العثور على الاستبيان.'); return; }
      if(!f.is_published){ error('هذا الاستبيان غير منشور.'); return; }
      if(!f.is_public){ error('هذا الاستبيان غير متاح للعامة.'); return; }
      if(!f.accepting_responses){ error('هذا الاستبيان متوقف عن استقبال الردود حاليًا.'); return; }

      headerEl.innerHTML = '<i class="fa-regular fa-square-check"></i> '+ (f.title || 'استبيان');
      subEl.textContent = f.description || '';

      const { data: qs, error: qe } = await sb
        .from('form_questions')
        .select('id,order_index,type,label,required,options')
        .eq('form_id', f.id)
        .order('order_index', { ascending: true });
      if(qe){ error('تعذر تحميل أسئلة الاستبيان.'); return; }
      const questions = Array.isArray(qs) ? qs : [];
      if(!questions.length){ error('لا يحتوي هذا الاستبيان على أسئلة.'); return; }

      renderQuestions(questions);
      formBox.style.display = 'block';

      fillForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const answers = collectAnswers(questions);
        if(answers == null){ return; } // validation error already shown
        try {
          const meta = buildMeta();
          const payload = { form_id: f.id, answers, meta };
          const res = await sb.from('form_responses').insert(payload).select('id').single();
          if(res.error){ throw res.error; }
          fillForm.style.display='none';
          thanksBox.style.display='block';
        } catch(err){
          error('تعذر إرسال إجابتك. حاول لاحقًا.');
        }
      });
    } catch (e){ error('حدث خطأ غير متوقع.'); }
  }

  function renderQuestions(list){
    fillForm.innerHTML = '';
    list.forEach((q, idx) => {
      const wrap = document.createElement('label');
      wrap.style.display = 'grid';
      wrap.style.gap = '6px';
      wrap.style.marginBottom = '6px';
      wrap.dataset.qid = q.id;
      const title = document.createElement('div');
      title.innerHTML = `${escapeHtml(q.label||('سؤال '+(idx+1)))} ${q.required? '<span class="slot-badge">إلزامي</span>':''}`;
      wrap.appendChild(title);
      if(q.type==='short_text'){
        const input = document.createElement('input');
        input.type='text'; input.maxLength=500; input.required = !!q.required; input.style.border='1px solid #e5e7eb'; input.style.borderRadius='10px'; input.style.padding='10px 12px';
        input.name = 'q_'+q.id; wrap.appendChild(input);
      } else if(q.type==='long_text'){
        const ta = document.createElement('textarea');
        ta.rows = 4; ta.required = !!q.required; ta.style.border='1px solid #e5e7eb'; ta.style.borderRadius='10px'; ta.style.padding='10px 12px';
        ta.name = 'q_'+q.id; wrap.appendChild(ta);
      } else if(q.type==='multiple_choice'){
        const box = document.createElement('div');
        box.style.display='grid'; box.style.gap='6px';
        const opts = Array.isArray(q.options)? q.options : [];
        opts.forEach((opt, i) => {
          const row = document.createElement('label');
          row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px';
          const r = document.createElement('input'); r.type='radio'; r.name='q_'+q.id; r.value = String(opt||'');
          row.appendChild(r);
          const span = document.createElement('span'); span.textContent = opt || ('خيار '+(i+1)); row.appendChild(span);
          box.appendChild(row);
        });
        wrap.appendChild(box);
      } else if(q.type==='checkboxes'){
        const box = document.createElement('div'); box.style.display='grid'; box.style.gap='6px';
        const opts = Array.isArray(q.options)? q.options : [];
        opts.forEach((opt, i) => {
          const row = document.createElement('label'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px';
          const c = document.createElement('input'); c.type='checkbox'; c.name='q_'+q.id; c.value = String(opt||'');
          row.appendChild(c);
          const span = document.createElement('span'); span.textContent = opt || ('خيار '+(i+1)); row.appendChild(span);
          box.appendChild(row);
        });
        wrap.appendChild(box);
      }
      fillForm.appendChild(wrap);
    });
    const actions = document.createElement('div'); actions.className='form-actions'; actions.style.marginTop='8px';
    const submit = document.createElement('button'); submit.type='submit'; submit.className='btn btn-primary'; submit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال الإجابة';
    actions.appendChild(submit);
    fillForm.appendChild(actions);
  }

  function collectAnswers(list){
    // Validate required groups for radios/checkboxes
    for(const q of list){
      if(q.required){
        if(q.type==='multiple_choice'){
          const sel = fillForm.querySelector(`input[type=radio][name="q_${q.id}"]:checked`);
          if(!sel){ error('يرجى الإجابة على جميع الأسئلة الإلزامية.'); return null; }
        } else if(q.type==='checkboxes'){
          const any = fillForm.querySelectorAll(`input[type=checkbox][name="q_${q.id}"]:checked`).length;
          if(!any){ error('يرجى الإجابة على جميع الأسئلة الإلزامية.'); return null; }
        } else {
          const el = fillForm.querySelector(`[name="q_${q.id}"]`);
          if(!el || !String(el.value||'').trim()){ error('يرجى الإجابة على جميع الأسئلة الإلزامية.'); return null; }
        }
      }
    }

    const answers = [];
    for(const q of list){
      if(q.type==='short_text' || q.type==='long_text'){
        const el = fillForm.querySelector(`[name="q_${q.id}"]`);
        const txt = String(el?.value || '').trim();
        answers.push({ question_id: q.id, type: q.type, answer_text: txt });
      } else if(q.type==='multiple_choice'){
        const sel = fillForm.querySelector(`input[type=radio][name="q_${q.id}"]:checked`);
        answers.push({ question_id: q.id, type: q.type, answer_options: sel ? [sel.value] : [] });
      } else if(q.type==='checkboxes'){
        const sels = Array.from(fillForm.querySelectorAll(`input[type=checkbox][name="q_${q.id}"]:checked`));
        answers.push({ question_id: q.id, type: q.type, answer_options: sels.map(el=>el.value) });
      }
    }
    return answers;
  }

  function buildMeta(){
    let visitor_id = null; try { visitor_id = localStorage.getItem('adeeb_visitor_id') || null; } catch {}
    return {
      path: location.pathname + location.search + location.hash,
      referrer: document.referrer || null,
      user_agent: (navigator.userAgent || '').slice(0, 400),
      time_zone: (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
      ts: new Date().toISOString(),
      visitor_id
    };
  }

  function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  document.addEventListener('DOMContentLoaded', load);
})();
