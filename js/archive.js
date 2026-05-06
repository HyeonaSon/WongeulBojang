let _year;

function initArchive() {
  _year = new Date().getFullYear();
  renderArchive();
}

function renderArchive() {
  const el       = document.getElementById('screen-archive');
  const posts    = getPostsByDateRange(`${_year}-01-01`, `${_year}-12-31`);
  const projects = getAllProjects();

  // 날짜별 달성 여부 계산
  const byDate = {};
  posts.forEach(p => {
    const d  = getDateStr(p.created_at);
    const pr = projects.find(x => x.id === p.project_id);
    if (!pr) {
      byDate[d] = { chars: p.char_count, done: false };
      return;
    }
    const written = getProjectWrittenChars(pr.id);
    const daily   = calcDailyTarget(pr.target_chars, written, pr.deadline, pr.write_days);
    byDate[d] = {
      chars: p.char_count,
      done:  p.char_count >= daily
    };
  });

  // 연도별 통계
  const totalDays   = Object.keys(byDate).length;
  const doneDays    = Object.values(byDate).filter(v => v.done).length;
  const totalChars  = Object.values(byDate).reduce((s, v) => s + v.chars, 0);

  // 잔디 그리드 생성
  const grid = renderGrass(_year, byDate);

  // 이전/다음 연도 버튼
  const now       = new Date().getFullYear();
  const hasPrev   = getAllPosts().some(p =>
    getDateStr(p.created_at).startsWith(String(_year - 1))
  );
  const hasNext   = _year < now;

  el.innerHTML = `
    <div class="archive-header">
      <button class="month-btn"
              onclick="moveYear(-1)"
              ${!hasPrev ? 'style="opacity:0.3;pointer-events:none"' : ''}>
        ←
      </button>
      <span class="archive-month">${_year}년</span>
      <button class="month-btn"
              onclick="moveYear(1)"
              ${!hasNext ? 'style="opacity:0.3;pointer-events:none"' : ''}>
        →
      </button>
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

    <div class="grass-wrap">
      <div class="grass-months">${renderMonthLabels(_year)}</div>
      <div class="grass-grid" id="grass-grid">${grid}</div>
      <div class="grass-days">
        <span></span>
        <span>월</span>
        <span></span>
        <span>수</span>
        <span></span>
        <span>금</span>
        <span></span>
      </div>
    </div>

    <div class="grass-legend">
      <span style="font-family:var(--sans);font-size:var(--xs);color:var(--muted)">
        적음
      </span>
      <div class="grass-cell level-0"></div>
      <div class="grass-cell level-1"></div>
      <div class="grass-cell level-2"></div>
      <div class="grass-cell level-3"></div>
      <div class="grass-cell level-4"></div>
      <span style="font-family:var(--sans);font-size:var(--xs);color:var(--muted)">
        많음
      </span>
    </div>
  `;
}

function renderGrass(year, byDate) {
  const startDate = new Date(`${year}-01-01`);
  const endDate   = new Date(`${year}-12-31`);
  const today     = new Date(getToday());

  // 모든 날짜의 글자 수
  const allChars = Object.values(byDate).map(v => v.chars);
  const maxChars = Math.max(...allChars, 1);

  // 시작 요일 (일=0) 만큼 빈 셀 추가
  const startDow = startDate.getDay();

  let cells = '';

  // 앞 빈 셀
  for (let i = 0; i < startDow; i++) {
    cells += `<div class="grass-cell empty"></div>`;
  }

  // 날짜 셀
  let current = new Date(startDate);
  while (current <= endDate) {
    const ds      = current.toISOString().slice(0, 10);
    const data    = byDate[ds];
    const isFuture = current > today;
    const isToday  = ds === getToday();

    let level = 0;
    let title = ds;

    if (data) {
      if (data.done) {
        // 목표 달성 — 글자 수 비례로 레벨 1~4
        level = Math.min(4, Math.ceil((data.chars / maxChars) * 4));
        if (level === 0) level = 1;
      } else {
        // 글은 썼지만 목표 미달 — 레벨 1 고정 (연한 색)
        level = 1;
      }
      title = `${ds}: ${data.chars.toLocaleString()}자${data.done ? ' ✓' : ''}`;
    }

    cells += `
      <div class="grass-cell level-${isFuture ? 'future' : level}
           ${isToday ? 'grass-today' : ''}"
           title="${title}">
      </div>
    `;

    current.setDate(current.getDate() + 1);
  }

  return cells;
}

function renderMonthLabels(year) {
  const months = ['1월','2월','3월','4월','5월','6월',
                  '7월','8월','9월','10월','11월','12월'];

  return months.map((m, i) => {
    // 각 월의 시작 주 위치 계산
    const firstDay = new Date(year, i, 1).getDay();
    const startOfYear = new Date(year, 0, 1).getDay();

    // 1월 1일부터 이 월의 1일까지 날짜 수
    const dayOfYear = Math.floor(
      (new Date(year, i, 1) - new Date(year, 0, 1)) / 86400000
    );
    const weekOffset = Math.floor((dayOfYear + startOfYear) / 7);

    return `<span style="grid-column:${weekOffset + 1}">${m}</span>`;
  }).join('');
}

function moveYear(dir) {
  _year += dir;
  renderArchive();
}
