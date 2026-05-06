// ── 날짜 ──────────────────────────────────────

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDateStr(isoString) {
  return isoString.slice(0, 10);
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
}

function formatMonth(dateStr) {
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

function isWriteDay(project) {
  if (!project.write_days || project.write_days.length === 0) return true;
  return project.write_days.includes(new Date().getDay());
}

function getWriteDaysLabel(writeDays) {
  if (!writeDays || writeDays.length === 0) return '매일';
  return writeDays.map(d => DAY_NAMES[d]).join('·');
}

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

function getNextWriteDay(project) {
  if (!project.write_days || project.write_days.length === 0) return null;
  let current = new Date(getToday());
  current.setDate(current.getDate() + 1);
  for (let i = 0; i < 7; i++) {
    if (project.write_days.includes(current.getDay())) {
      return current.toISOString().slice(0, 10);
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

// ── 원고지 ────────────────────────────────────

const CATEGORIES = [
  { name: '조각글', minPages:    0, maxPages:   49, desc: '49매 이하' },
  { name: '엽편',   minPages:   50, maxPages:   79, desc: '50~79매' },
  { name: '단편',   minPages:   80, maxPages:  199, desc: '80~199매' },
  { name: '중편',   minPages:  200, maxPages:  499, desc: '200~499매' },
  { name: '경장편', minPages:  500, maxPages:  699, desc: '500~699매' },
  { name: '장편',   minPages:  700, maxPages: 1200, desc: '700~1200매' },
];

const CATEGORY_CLASS = {
  '조각글': 'cat-jogak',
  '엽편':   'cat-yeop',
  '단편':   'cat-dan',
  '중편':   'cat-jung',
  '경장편': 'cat-kyung',
  '장편':   'cat-jang',
};

function charsToPages(chars) {
  return Math.floor(chars / 200);
}

function getCategory(chars) {
  const pages = charsToPages(chars);
  return CATEGORIES.find(c => pages >= c.minPages && pages <= c.maxPages)
    || { name: '장편 초과', desc: '1200매 초과' };
}

function getCatClass(categoryName) {
  return CATEGORY_CLASS[categoryName] || 'cat-jogak';
}

// ── 목표 계산 ─────────────────────────────────

function calcDailyTarget(targetChars, writtenChars, deadline, writeDays) {
  const remaining = Math.max(0, targetChars - writtenChars);
  const days      = countWritableDays(getToday(), deadline, writeDays);
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

function appendZeros(inputId, count, cb) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.value = (el.value || '') + '0'.repeat(count);
  if (cb) cb();
}
