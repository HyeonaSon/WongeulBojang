let _year;

function initArchive() {
  _year = new Date().getFullYear();
  renderArchive();
}

function renderArchive() {
  const el       = document.getElementById('screen-archive');
  const posts    = getPostsByDateRange(`${_year}-01-01`, `${_year}-12-31`);
  const projects = getAllProjects();

  // 날짜별 달성 여부
  const byDate = {};
  posts.forEach(p => {
    const d  = getDateStr(p.created_at);
    const pr = projects.find(x => x.id === p.project_id);
    if (!pr) { byDate[d] = { chars: p.char_count, done: false }; return; }
    const written = getProjectWrittenChars(pr.id);
    const daily   = calcDailyTarget(pr.target_chars, written, pr.deadline, pr.write_days);
    byDate[d] = { chars: p.char_count, done: p.char_count >= daily };
  });

  const totalDays  = Object.keys(byDate).length;
  const doneDays   = Object.values(byDate).filter(v => v.done).length;
  const totalChars = Object.values(byDate).reduce((s, v) => s + v.chars, 0);
  const allChars   = Object.values(byDate).map(v => v.chars);
  const maxChars   = Math.max(...allChars, 1);
  const today      = getToday();
  const now        = new Date().getFullYear();

  // 월별로 행 구성
  const months = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(_year, m + 1, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds      = `${_year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data    = byDate[ds];
      const future  = ds > today;
      const isToday = ds === today;
      let level = 0;
      if (data) {
        level = data.done
          ? Math.max(1, Math.min(4, Math.ceil((data.chars / maxChars) * 4)))
          : 1;
      }
      days.push({ ds, level, future, isToday, data });
    }
    months.push({ m, days });
  }

  const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월',
                       '7월','8월','9월','10월','11월','12월'];

  const rows = months.map(({ m, days }) => {
    const cells = days.map(({ ds, level, future, isToday, data }) => {
      const cls   = future ? 'future' : `level-${level}`;
      const title = data
        ? `${ds}: ${data.chars.toLocaleString()}자${data.done ? ' ✓' : ''}`
        : ds;
      return `<div class="grass-cell ${cls} ${isToday ? 'grass-today' : ''}"
                   title="${title}"></div>`;
    }).join('');

    return `
      <div class="grass-row">
        <span class="grass-month-label">${MONTH_NAMES[m]}</span>
        <div class="grass-cells">${cells}</div>
      </div>
    `;
  }).join('');

  const hasPrev = getAllPosts().some(p =>
    getDateStr(p.created_at).startsWith(String(_year - 1))
  );

  el.innerHTML = `
    <div class="archive-header">
      <button class="month-btn" onclick="moveYear(-1)"
              ${!hasPrev ? 'style="opacity:0.3;pointer-events:none"' : ''}>←</button>
      <span class="archive-month">${_year}년</span>
      <button class="month-btn" onclick="moveYear(1)"
              ${_year >= now ? 'style="opacity:0.3;pointer-events:none"' : ''}>→</button>
    </div>

    <div class="grass-stats">
      <div class="grass-stat">
        <div class="grass-stat-value">${totalDays}</div>
        <div class="grass-stat-label">납입일</div>
      </div>
      <div class="grass-stat">
        <div class="grass-stat-value">${doneDays}</div>
        <div class="grass-stat-label">목표 달성</div>
      </div>
      <div class="grass-stat">
        <div class="grass-stat-value">${totalChars.toLocaleString()}</div>
        <div class="grass-stat-label">총 글자</div>
      </div>
    </div>

    <div class="grass-wrap">${rows}</div>

    <div class="grass-legend">
      <span>적음</span>
      <div class="grass-cell level-0"></div>
      <div class="grass-cell level-1"></div>
      <div class="grass-cell level-2"></div>
      <div class="grass-cell level-3"></div>
      <div class="grass-cell level-4"></div>
      <span>많음</span>
    </div>
  `;
}

function moveYear(dir) {
  _year += dir;
  renderArchive();
}
