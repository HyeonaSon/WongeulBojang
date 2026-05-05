// ── 날짜 ──────────────────────────────────────

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDateStr(isoString) {
  return isoString.slice(0, 10);
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
}

function formatMonthLabel(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long'
  });
}

function getDaysLeft(deadline) {
  const today = new Date(getToday());
  const end   = new Date(deadline);
  return Math.max(0, Math.ceil((end - today) / 86400000));
}

function getMonthRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const end   = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

function dateRange(startDate, endDate) {
  const result  = [];
  let current   = new Date(startDate);
  const end     = new Date(endDate);
  while (current <= end) {
    result.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return result;
}

// ── 요일 ──────────────────────────────────────

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 오늘 납입 가능한지
function isWriteDay(project) {
  if (!project.write_days || project.write_days.length === 0) return true;
  return project.write_days.includes(new Date().getDay());
}

// 납입 요일 텍스트 반환
function getWriteDaysLabel(writeDays) {
  if (!writeDays || writeDays.length === 0) return '매일';
  return writeDays.map(d => DAY_NAMES[d]).join('·');
}

// 기간 내 납입 가능 일수
function countWritableDays(startDate, endDate, writeDays) {
  if (!writeDays || writeDays.length === 0) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    return Math.max(1, Math.ceil((e - s) / 86400000) + 1);
  }
  let count   = 0;
  let current = new Date(startDate);
  const end   = new Date(endDate);
  while (current <= end) {
    if (writeDays.includes(current.getDay())) count++;
    current.setDate(current.getDate() + 1);
  }
  return count || 1;
}

// 오늘부터 마감일까지 납입 가능 일수
function countRemainingWritableDays(deadline, writeDays) {
  return countWritableDays(getToday(), deadline, writeDays);
}

// ── 원고지 계산 ───────────────────────────────

const CATEGORIES = [
  { name: '조각글', minPages:    0, maxPages:   49, desc: '49매 이하' },
  { name: '엽편',   minPages:   50, maxPages:   79, desc: '50~79매' },
  { name: '단편',   minPages:   80, maxPages:  199, desc: '80~199매' },
  { name: '중편',   minPages:  200, maxPages:  499, desc: '200~499매' },
  { name: '경장편', minPages:  500, maxPages:  699, desc: '500~699매' },
  { name: '장편',   minPages:  700, maxPages: 1200, desc: '700~1200매' },
];

const CATEGORY_CLASS = {
  '조각글': 'jogak',
  '엽편':   'yeop',
  '단편':   'dan',
  '중편':   'jung',
  '경장편': 'kyung',
  '장편':   'jang',
};

function charsToPages(chars) {
  return Math.floor(chars / 200);
}

function getCategory(chars) {
  const pages = charsToPages(chars);
  return CATEGORIES.find(c => pages >= c.minPages && pages <= c.maxPages)
    || { name: '장편 초과', minPages: 1201, maxPages: Infinity, desc: '1200매 초과' };
}

function getCatClass(categoryName) {
  return 'cat-' + (CATEGORY_CLASS[categoryName] || 'jogak');
}

// ── 목표 계산 ─────────────────────────────────

// 요일 반영 하루 목표
function calcDailyTarget(targetChars, writtenChars, deadline, writeDays) {
  const remaining = Math.max(0, targetChars - writtenChars);
  const days      = countRemainingWritableDays(deadline, writeDays);
  return Math.ceil(remaining / days);
}

function calcProgress(written, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((written / target) * 100));
}

// ── 텍스트 ────────────────────────────────────

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appendZeros(inputId, count, onInput) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = (input.value || '') + '0'.repeat(count);
  if (onInput) onInput();
}
