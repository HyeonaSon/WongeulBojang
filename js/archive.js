let _archiveYear, _archiveMonth, _selDate;

function initArchive() {
  const now    = new Date();
  _archiveYear  = now.getFullYear();
  _archiveMonth = now.getMonth();
  _selDate      = getToday();
  renderArchive();
}

function renderArchive() {
  const el             = document.getElementById('screen-archive');
  const { start, end } = getMonthRange(_archiveYear, _archiveMonth);
  const posts          = getPostsByDateRange(start, end);
  const projects       = getAllProjects();

  // 날짜별 글 맵
  const byDate = {};
  posts.forEach(p => { byDate[getDateStr(p.created_at)] = p; });

  // 날짜별 목표 달성
  const done = {};
  posts.forEach(p => {
    const d   = getDateStr(p.created_at);
    const pr  = projects.find(x => x.id === p.project_id);
    if (!pr) return;
    const w   = getProjectWrittenChars(pr.id);
    const day = calcDailyTarget(pr.target_chars, w, pr.deadline, pr.write_days);
    done[d]   = p.char_count >= day;
  });

  const label    = formatMonth(start);
  const firstDay = new Date(_archiveYear, _archiveMonth, 1).getDay();
  const lastDate = new Date(_archiveYear, _archiveMonth + 1, 0).getDate();
  const dows     = ['일','월','화','수','목','금','토'];

  // 이 달 프로젝트 (최대 3개)
  const actProj = projects
    .filter(p => p.start_date <= end && p.deadline >= start)
    .slice(0, 3);

  // 달력 셀
  let cells = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="cal-cell"></div>`;
  }

  for (let d = 1; d <= lastDate; d++) {
    const ds      = `${_archiveYear}-${String(_archiveMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const post    = byDate[ds];
    const isToday = ds === getToday();
    const isSel   = ds === _selDate;

    // 타임라인 바
    const bars = actProj.map(p => {
      const inRange = ds >= p.start_date && ds <= p.deadline;
      const isStart = ds === p.start_date;
      const isEnd   = ds === p.deadline;
      const hasPost = post && post.project_id === p.id;
      const color   = `var(--${CATEGORY_CLASS[p.category]?.replace('cat-','') || 'jogak'})`;

      if (!inRange) return `<div class="cal-bar empty"></div>`;
      return `
        <div class="cal-bar ${hasPost ? 'on' : 'off'}
             ${isStart ? 's' : ''} ${isEnd ? 'e' : ''}"
             style="background:${color}">
        </div>
      `;
    }).join('');

    // 납입 가능 여부
    const writable = actProj.some(p => {
      if (ds < p.start_date || ds > p.deadline) return false;
      if (!p.write_days || p.write_days.length === 0) return true;
      return p.write_days.includes(new Date(ds + 'T00:00:00').getDay());
    });

    cells += `
      <div class="cal-cell
           ${post ? 'wrote' : ''}
           ${isToday ? 'today' : ''}
           ${isSel ? 'sel' : ''}
           ${post || isToday ? 'click' : ''}
           ${!writable && !post ? 'dim' : ''}"
           onclick="selectDate('${ds}')">
        <span class="cal-num">${d}</span>
        <div class="cal-bars">${bars}</div>
        ${done[ds] ? '<span class="cal-check">✓</span>' : ''}
      </div>
    `;
  }

  // 범례
  const legend = actProj.map(p => {
    const color = `var(--${CATEGORY_CLASS[p.category]?.replace('cat-','') || 'jogak'})`;
    return `
      <div class="legend-item">
        <div class="legend-color" style="background:${color}"></div>
        <span class="legend-name">${escapeHtml(p.name)}</span>
        <span class="legend-range">${p.start_date} — ${p.deadline}</span>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="archive-header">
      <button class="month-btn" onclick="moveMonth(-1)">←</button>
      <span class="archive-month">${label}</span>
      <button class="month-btn" onclick="moveMonth(1)">→</button>
    </div>

    <div class="cal-grid">${cells}</div>

    ${legend ? `<div class="cal-legend">${legend}</div>` : ''}

    <div id="post-detail"></div>
  `;

  if (_selDate && byDate[_selDate]) {
    renderPostDetail(byDate[_selDate], projects);
  }
}

function selectDate(ds) {
  if (_selDate === ds) {
    _selDate = null;
    renderArchive();
    return;
  }
  _selDate = ds;
  renderArchive();
}

function renderPostDetail(post, projects) {
  const el      = document.getElementById('post-detail');
  if (!el) return;

  const pr      = projects.find(p => p.id === post.project_id);
  const ds      = getDateStr(post.created_at);
  const color   = pr
    ? `var(--${CATEGORY_CLASS[pr.category]?.replace('cat-','') || 'jogak'})`
    : 'var(--jogak)';
  const editable = isEditable(post);

  el.innerHTML = `
    <div class="post-card">
      <div class="post-card-header">
        <div>
          <div class="post-card-date">${formatDate(ds)}</div>
          ${pr ? `
            <div class="post-card-project" style="margin-top:4px">
              <div class="post-dot" style="background:${color}"></div>
              <span>${escapeHtml(pr.name)}</span>
            </div>
          ` : ''}
        </div>
        <div style="text-align:right">
          <div class="post-card-chars">${post.char_count.toLocaleString()}자</div>
          <div style="font-family:var(--sans);font-size:var(--xs);
                      color:${editable ? 'var(--accent-2)' : 'var(--muted)'};
                      margin-top:4px">
            ${editable ? '수정 가능' : '잠김'}
          </div>
        </div>
      </div>

      <div class="post-card-body">
        ${escapeHtml(post.body).replace(/\n/g, '<br>')}
      </div>

      <div class="post-card-footer">
        <span>
          ${editable
            ? '오늘 쓴 글은 납입 메뉴에서 수정할 수 있어요.'
            : '수정할 수 없는 글이에요.'}
        </span>
        ${editable ? `
          <button class="text-btn" onclick="go('editor')">
            납입 메뉴로 →
          </button>
        ` : ''}
      </div>
    </div>
  `;

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function moveMonth(dir) {
  _archiveMonth += dir;
  if (_archiveMonth > 11) { _archiveMonth = 0; _archiveYear++; }
  if (_archiveMonth < 0)  { _archiveMonth = 11; _archiveYear--; }
  _selDate = null;
  renderArchive();
}
