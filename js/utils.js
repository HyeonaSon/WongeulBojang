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

function getMonthRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const end   = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
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

function charsToPages(chars) {
  return Math.floor(chars / 200);
}

function getCategory(chars) {
  const pages = charsToPages(chars);
  return CATEGORIES.find(c => pages >= c.minPages && pages <= c.maxPages)
    || { name: '장편 초과', minPages: 1201, maxPages: Infinity, desc: '1200매 초과' };
}

// ── 하루 납입 목표 ────────────────────────────

function calcDailyTarget(targetChars, writtenChars, deadline) {
  const remaining = Math.max(0, targetChars - writtenChars);
  const daysLeft  = getDaysLeft(deadline);
  if (daysLeft === 0) return remaining;
  return Math.ceil(remaining / daysLeft);
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
