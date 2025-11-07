(function(){
  const sb = window.sbClient;
  const params = new URLSearchParams(location.search);
  const formParam = params.get('form');

  const authBox = document.getElementById('authBox');
  const errorBox = document.getElementById('errorBox');
  const resultsBox = document.getElementById('resultsBox');
  const tableEl = document.getElementById('resultsTable');
  const exportBtn = document.getElementById('exportBtn');
  const statsEl = document.getElementById('stats');
  const headerEl = document.getElementById('resHeader');
  const subEl = document.getElementById('resSub');

  if(!sb){ showErr('Supabase غير مفعّل.'); return; }
  if(!formParam){ showErr('رابط غير صالح.'); return; }

  function showErr(msg){ errorBox.style.display='block'; errorBox.textContent = msg; }
  function needLogin(){
    authBox.style.display='block';
    const q = encodeURIComponent('form='+encodeURIComponent(formParam));
    authBox.innerHTML = 'يلزم تسجيل الدخول لعرض النتائج. <a href="../auth/login.html?redirect=forms/results.html%3F'+ q +'">تسجيل الدخول</a>';
  }

  async function load(){
    try {
      const { data: { session } } = await sb.auth.getSession();
      if(!session){ needLogin(); return; }
      const uid = session.user.id;

      // Fetch form by id or slug with owner
      let r = await sb.from('forms').select('id,owner_id,title,description,slug').eq('id', formParam).maybeSingle();
      let f = r.data; let ferr = r.error;
      if(ferr || !f){
        const r2 = await sb.from('forms').select('id,owner_id,title,description,slug').eq('slug', formParam).maybeSingle();
        f = r2.data; ferr = r2.error;
      }
      if(ferr || !f){ showErr('لم يتم العثور على الاستبيان.'); return; }

      // Permission: owner or admin
      let allowed = (f.owner_id === uid);
      if(!allowed){
        try {
          const { data: adminRow } = await sb.from('admins').select('user_id,is_admin').eq('user_id', uid).eq('is_admin', true).maybeSingle();
          if(adminRow) allowed = true;
        } catch {}
      }
      if(!allowed){ showErr('ليس لديك الصلاحية لعرض النتائج.'); return; }

      headerEl.innerHTML = '<i class="fa-solid fa-chart-column"></i> '+ (f.title || 'النتائج');
      subEl.textContent = f.description || '';

      const { data: qs, error: qe } = await sb
        .from('form_questions')
        .select('id,order_index,label,type')
        .eq('form_id', f.id)
        .order('order_index', { ascending: true });
      if(qe){ showErr('تعذر تحميل الأسئلة.'); return; }
      const questions = Array.isArray(qs) ? qs : [];
      const qMap = new Map(questions.map(q => [q.id, q]));

      const { data: rows, error: re } = await sb
        .from('form_responses')
        .select('id,created_at,answers,meta')
        .eq('form_id', f.id)
        .order('created_at', { ascending: false });
      if(re){ showErr('تعذر تحميل الردود.'); return; }
      const responses = Array.isArray(rows) ? rows : [];

      buildTable(questions, responses);
      resultsBox.style.display='block';
      statsEl.textContent = responses.length ? ('عدد الردود: ' + responses.length) : 'لا توجد ردود بعد.';

      exportBtn.addEventListener('click', () => exportExcel(f, questions, responses));
    } catch(e){ showErr('حدث خطأ غير متوقع.'); }
  }

  function buildTable(questions, responses){
    tableEl.innerHTML = '';
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');
    const thDate = document.createElement('th'); thDate.textContent = 'التاريخ'; thr.appendChild(thDate);
    questions.forEach(q => { const th = document.createElement('th'); th.textContent = q.label || 'سؤال'; thr.appendChild(th); });
    thead.appendChild(thr);
    const tbody = document.createElement('tbody');

    responses.forEach(r => {
      const tr = document.createElement('tr');
      const tdDate = document.createElement('td'); tdDate.textContent = fmtDate(r.created_at); tr.appendChild(tdDate);
      const answers = Array.isArray(r.answers)? r.answers : [];
      const byQ = new Map(answers.map(a => [a.question_id, a]));
      questions.forEach(q => {
        const td = document.createElement('td');
        const a = byQ.get(q.id);
        if(!a) { td.textContent = ''; tr.appendChild(td); return; }
        if(q.type==='short_text'||q.type==='long_text') td.textContent = (a.answer_text || '').trim();
        else td.textContent = Array.isArray(a.answer_options) ? a.answer_options.join(', ') : '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    tableEl.appendChild(thead); tableEl.appendChild(tbody);
  }

  function exportExcel(form, questions, responses){
    try {
      const rows = responses.map(r => {
        const obj = { التاريخ: fmtDate(r.created_at) };
        const byQ = new Map((Array.isArray(r.answers)? r.answers : []).map(a => [a.question_id, a]));
        questions.forEach(q => {
          const a = byQ.get(q.id);
          const key = q.label || 'سؤال';
          let val = '';
          if(a){
            if(q.type==='short_text'||q.type==='long_text') val = (a.answer_text||'').trim();
            else val = Array.isArray(a.answer_options) ? a.answer_options.join(', ') : '';
          }
          obj[key] = val;
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Responses');
      const name = 'Form_'+ (form.slug || form.id) + '_responses.xlsx';
      XLSX.writeFile(wb, name);
    } catch(e){ alert('تعذر التصدير.'); }
  }

  function fmtDate(iso){ try { return new Date(iso).toLocaleString('ar'); } catch { return iso; } }

  document.addEventListener('DOMContentLoaded', load);
})();
