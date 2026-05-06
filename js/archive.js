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
  const jan1     = new Date(`${year}-01-01`);
  const dec31    = new Date(`${year}-12-31`);
  const today    = new Date(getToday());
  const allChars = Object.values(byDate).map(v => v.chars);
  const maxChars = Math.max(...allChars, 1);

  // 주(column) 별로 묶기
  const startDow = jan1.getDay(); // 1월 1일 요일
  const cols     = [];
  let   col      = [];

  // 첫 주 앞 빈 칸
  for (let i = 0; i < startDow; i++) {
    col.push({ empty: true });
  }

  let current = new Date(jan1);
  while (current <= dec31) {
    const ds       = current.toISOString().slice(0, 10);
    const data     = byDate[ds];
    const isFuture = current > today;
    const isToday  = ds === getToday();

    let level = 0;
    if (data) {
      level = data.done
        ? Math.max(1, Math.min(4, Math.ceil((data.chars / maxChars) * 4)))
        : 1;
    }

    col.push({ ds, level, isFuture, isToday, data });

    if (col.length === 7) {
      cols.push(col);
      col = [];
    }
    current.setDate(current.getDate() + 1);
  }

  if (col.length > 0) {
    while (col.length < 7) col.push({ empty: true });
    cols.push(col);
  }

  // 월 라벨 위치 계산
  const monthLabels = [];
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(year, m, 1);
    const dayOfYear    = Math.floor((firstOfMonth - jan1) / 86400000);
    const weekIndex    = Math.floor((dayOfYear + startDow) / 7);
    monthLabels.push({ label: `${m+1}월`, weekIndex });
  }

  // 월 라벨 행
  let monthRow = '<div class="grass-month-row">';
  let lastIdx  = 0;
  monthLabels.forEach(({ label, weekIndex }) => {
    const gap = weekIndex - lastIdx;
    for (let i = 0; i < gap; i++) {
      monthRow += `<div class="grass-month-label"></div>`;
    }
    monthRow += `<div class="grass-month-label">${label}</div>`;
    lastIdx = weekIndex + 1;
  });
  monthRow += '</div>';

  // 컬럼 렌더링
  const gridCols = cols.map(col => {
    const cells = col.map(cell => {
      if (cell.empty) return `<div class="grass-cell empty"></div>`;
      if (cell.isFuture) return `<div class="grass-cell future"></div>`;
      const title = cell.data
        ? `${cell.ds}: ${cell.data.chars.toLocaleString()}자${cell.data.done ? ' ✓' : ''}`
        : cell.ds;
      return `
        <div class="grass-cell level-${cell.level}
             ${cell.isToday ? 'grass-today' : ''}"
             title="${title}">
        </div>
      `;
    }).join('');
    return `<div class="grass-col">${cells}</div>`;
  }).join('');

  // 요일 라벨
  const dayLabels = ['일','','화','','목','','토'].map(d => `
    <div class="grass-day-label">${d}</div>
  `).join('');

  return `
    <div class="grass-container">
      <div class="grass-left">${dayLabels}</div>
      <div class="grass-right">
        ${monthRow}
        <div class="grass-grid">${gridCols}</div>
      </div>
    </div>
  `;
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
