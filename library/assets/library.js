/* مكتبة أدِيب — بناء بطاقات التقارير من reports.json */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function cardHTML(r) {
    var badge = r.featured ? '<span class="book__badge">الأحدث</span>' : '';
    // سماكة الكتاب حسب عدد الصفحات (إحساس واقعي)
    var thickness = Math.max(16, Math.min(42, Math.round((r.pageCount || 60) / 5.5)));
    return '' +
      '<a class="book-card' + (r.featured ? ' featured' : '') + '" href="book.html?id=' + encodeURIComponent(r.id) + '" title="' + esc(r.name) + '">' +
        '<div class="book" style="--thickness:' + thickness + 'px">' +
          '<div class="book__3d">' +
            '<span class="book__edge"></span>' +
            '<span class="book__spine"></span>' +
            '<img class="book__cover" src="' + esc(r.cover) + '" alt="' + esc(r.name) + '" loading="lazy">' +
            '<span class="book__gloss"></span>' +
          '</div>' +
          badge +
        '</div>' +
        '<div class="book-shelf"></div>' +
        '<div class="book-caption">' +
          '<h3 class="card-name">' + esc(r.name) + '</h3>' +
          '<p class="card-meta">' + esc(r.type) +
            ' · <span class="num">' + esc(r.yearHijri) + '</span>هـ - ' +
            '<span class="num">' + esc(r.yearGregorian) + '</span>م</p>' +
          '<span class="card-open">تصفّح التقرير <i class="fas fa-arrow-left"></i></span>' +
        '</div>' +
      '</a>';
  }

  function render(data) {
    var lib = (data && data.library) || {};
    if (lib.title) {
      var t = document.querySelector('.library-title');
      if (t) t.textContent = lib.title;
    }
    if (lib.tagline) {
      var tg = document.querySelector('.library-tagline');
      if (tg) tg.textContent = lib.tagline;
    }
    if (lib.intro) {
      var intro = document.querySelector('.library-intro');
      if (intro) intro.textContent = lib.intro;
    }

    var reports = ((data && data.reports) || []).slice().sort(function (a, b) {
      return (parseInt(b.yearGregorian, 10) || 0) - (parseInt(a.yearGregorian, 10) || 0);
    });

    var grid = document.getElementById('reportsGrid');
    if (!grid) return;
    if (!reports.length) {
      grid.outerHTML = '<p class="reports-empty">لا توجد تقارير متاحة بعد.</p>';
      return;
    }
    grid.innerHTML = reports.map(cardHTML).join('');
  }

  function setYear() {
    var y = document.querySelector('.footer-copyright .year');
    if (y) y.textContent = new Date().getFullYear();
  }

  fetch('reports.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function (err) {
      console.error('تعذّر تحميل بيانات المكتبة:', err);
      var grid = document.getElementById('reportsGrid');
      if (grid) grid.outerHTML = '<p class="reports-empty">تعذّر تحميل التقارير، حاول لاحقاً.</p>';
    });

  setYear();
})();
