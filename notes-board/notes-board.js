import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://xniaivonejocibhspfhu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuaWFpdm9uZWpvY2liaHNwZmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDg4MjYsImV4cCI6MjA3MTYyNDgyNn0.3ejhi7bFSVB33ngCz1CvbXQNAJOhPL-krI-F8DMq9lk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const openFormBtn = document.getElementById('openFormBtn');
const sheet = document.getElementById('noteFormSheet');
const closeFormBtn = document.getElementById('closeFormBtn');
const sheetBackdrop = sheet?.querySelector('[data-close]');
const noteForm = document.getElementById('noteForm');
const noteName = document.getElementById('noteName');
const qOne = document.getElementById('questionOne');
const qTwo = document.getElementById('questionTwo');
const notesContainer = document.getElementById('notesContainer');
const emptyState = document.getElementById('emptyState');
const noteModal = document.getElementById('noteModal');
const noteModalClose = document.getElementById('noteModalClose');
const noteModalBackdrop = noteModal?.querySelector('[data-close]');
const noteModalTitle = document.getElementById('noteModalTitle');
const noteModalAnswer = document.getElementById('noteModalAnswer');
const noteModalMeta = document.getElementById('noteModalMeta');
const heroAddBtn = document.getElementById('heroAddBtn');
const exploreBoardBtn = document.getElementById('exploreBoardBtn');
const boardSection = document.getElementById('boardSection');
const noteCountValue = document.getElementById('noteCountValue');
const noteMoodText = document.getElementById('noteMoodText');

let notes = [];
let activeModalNote = null;

init();

async function init() {
  notes = await fetchNotes();
  renderNotes();
}

async function fetchNotes() {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes from Supabase', error);
      return [];
    }

    return (data || []).map(mapRowToNote);
  } catch (error) {
    console.error('Unexpected error fetching notes', error);
    return [];
  }
}

function toggleSheet(show) {
  if (!sheet) return;
  if (show) {
    sheet.removeAttribute('hidden');
    requestAnimationFrame(() => {
      sheet.classList.add('is-visible');
    });
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => qOne?.focus());
  } else {
    sheet.classList.remove('is-visible');
    const handleAnim = () => {
      sheet.setAttribute('hidden', '');
      sheet.removeEventListener('transitionend', handleAnim);
    };
    sheet.addEventListener('transitionend', handleAnim, { once: true });
    document.body.style.overflow = '';
    noteForm?.reset();
  }
}

function toggleModal(show) {
  if (!noteModal) return;
  if (show) {
    noteModal.removeAttribute('hidden');
    requestAnimationFrame(() => {
      noteModal.classList.add('is-visible');
    });
    document.body.style.overflow = 'hidden';
  } else {
    noteModal.classList.remove('is-visible');
    const handleAnim = () => {
      noteModal.setAttribute('hidden', '');
      noteModal.removeEventListener('transitionend', handleAnim);
    };
    noteModal.addEventListener('transitionend', handleAnim, { once: true });
    document.body.style.overflow = '';
    activeModalNote = null;
  }
}

function formatRelative(ts) {
  try {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'أمس' : `منذ ${days} يوم`;
  } catch {
    return '';
  }
}

function randomColor() {
  const palette = ['yellow', 'blue', 'green', 'pink'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function randomAngle() {
  const angle = (Math.random() * 10 - 5).toFixed(1);
  return `${angle}deg`;
}

function randomPosition() {
  const x = 5 + Math.random() * 70;
  const y = 4 + Math.random() * 65;
  return { x, y };
}

function mapRowToNote(row) {
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const position = row.x != null && row.y != null ? { x: row.x, y: row.y } : randomPosition();
  return {
    id: row.id,
    author: row.author || '',
    q1: row.q1 || '',
    q2: row.q2 || '',
    createdAt,
    color: row.color || randomColor(),
    angle: row.angle || randomAngle(),
    x: position.x,
    y: position.y,
  };
}

function createNoteElement(note) {
  const article = document.createElement('article');
  article.className = 'note-card';
  article.dataset.color = note.color;
  article.dataset.id = note.id;
  article.style.setProperty('--angle', note.angle);
  const author = note.author && String(note.author).trim() ? String(note.author).trim() : 'طالب مجهول';
  article.innerHTML = `
    <h3 class="note-title">${escapeHtml(truncate(note.q1, 100))}</h3>
    <p class="note-answer">${escapeHtml(truncate(note.q2, 100))}</p>
    <div class="note-meta">${escapeHtml(author)} · ${formatRelative(note.createdAt)}</div>
  `;
  return article;
}

function renderNotes() {
  if (!notesContainer) return;
  notesContainer.innerHTML = '';
  notes.forEach((note) => {
    const card = createNoteElement(note);
    notesContainer.appendChild(card);
  });
  if (emptyState) emptyState.style.display = notes.length ? 'none' : '';
  if (noteCountValue) noteCountValue.textContent = notes.length;
  if (noteMoodText) {
    if (!notes.length) noteMoodText.textContent = 'جاهز للإلهام';
    else if (notes.length < 4) noteMoodText.textContent = 'لوحة هادئة';
    else if (notes.length < 9) noteMoodText.textContent = 'نشاط لطيف';
    else noteMoodText.textContent = 'إبداع متدفق';
  }
}

function truncate(str = '', max = 120) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

noteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nameValue = (noteName?.value || '').trim();
  const valueOne = (qOne?.value || '').trim();
  const valueTwo = (qTwo?.value || '').trim();
  if (!valueOne || !valueTwo) return;
  const position = randomPosition();
  const color = randomColor();
  const angle = randomAngle();
  const payload = {
    author: nameValue || null,
    q1: valueOne,
    q2: valueTwo,
    color,
    angle,
    x: position.x,
    y: position.y,
  };

  try {
    const { data, error } = await supabase
      .from('notes')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting note into Supabase', error);
      return;
    }

    const note = mapRowToNote(data);
    notes.unshift(note);
    renderNotes();
    toggleSheet(false);
  } catch (error) {
    console.error('Unexpected error inserting note', error);
  }
});

openFormBtn?.addEventListener('click', () => toggleSheet(true));
heroAddBtn?.addEventListener('click', () => toggleSheet(true));
closeFormBtn?.addEventListener('click', () => toggleSheet(false));
sheetBackdrop?.addEventListener('click', () => toggleSheet(false));
exploreBoardBtn?.addEventListener('click', () => {
  boardSection?.scrollIntoView({ behavior: 'smooth' });
});

notesContainer?.addEventListener('click', (event) => {
  const card = event.target.closest('.note-card');
  if (!card) return;
  const id = card.dataset.id;
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  activeModalNote = note;
  if (noteModalTitle) noteModalTitle.textContent = note.q1;
  if (noteModalAnswer) noteModalAnswer.textContent = note.q2;
  if (noteModalMeta) {
    const author = note.author && String(note.author).trim() ? String(note.author).trim() : 'طالب مجهول';
    const createdDate = new Date(note.createdAt);
    const dateStr = createdDate.toLocaleDateString('ar-EG', {
      calendar: 'gregory',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timeStr = createdDate.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    noteModalMeta.innerHTML = `
      <div class="modal__meta-item">
        <span class="modal__meta-icon modal__meta-icon--user fa-solid fa-user" aria-hidden="true"></span>
        <span class="modal__meta-value">${escapeHtml(author)}</span>
      </div>
      <div class="modal__meta-item">
        <span class="modal__meta-icon modal__meta-icon--date fa-regular fa-calendar-days" aria-hidden="true"></span>
        <span class="modal__meta-value">${escapeHtml(dateStr)}</span>
      </div>
      <div class="modal__meta-item">
        <span class="modal__meta-icon modal__meta-icon--time fa-regular fa-clock" aria-hidden="true"></span>
        <span class="modal__meta-value">${escapeHtml(timeStr)}</span>
      </div>
    `;
  }
  toggleModal(true);
});

[noteModalClose, noteModalBackdrop].forEach((el) =>
  el?.addEventListener('click', () => toggleModal(false))
);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (sheet && !sheet.hasAttribute('hidden')) toggleSheet(false);
    if (noteModal && !noteModal.hasAttribute('hidden')) toggleModal(false);
  }
});
