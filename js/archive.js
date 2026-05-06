let archiveYear, archiveMonth;
let selectedDate = null;

function initArchive() {
  const now    = new Date();
  archiveYear  = now.getFullYear();
  archiveMonth = now.getMonth();
  selectedDate = getToday();
  renderArchive();
}

function renderArchive() {
  const container      = document.getElementById('screen-archive');
  const { start, end } = getMonthRange(archiveYear, archiveMonth);

  const posts    = getPostsByDateRange(start, end);
  const projects = getAllProjects();

  // 날짜별 포스트 맵
  const postByDate = {};
  posts.forEach(p => { postByDate[getDateStr(p.created_at)] = p; });

  // 날짜별 목표 달성 여부
  const doneByDate = {};
  posts.forEach(p => {
    const d       = getDateStr(p.created_at);
    const project = projects.find(pr => pr.id === p.project_id);
    if (!project) return;
    const written = getProjectWrittenChars(project.id);
    const daily   = calcDailyTarget(
      project.target_chars, written, project.deadline, project.write_days
    );
    doneByDate[d] = p.char_count >= daily;
  });

  const monthLabel     = formatMonthLabel(start);
  const firstDay       = new Date(archiveYear, archiveMonth, 1).getDay();
  const lastDate       = new Date(archiveYear, archiveMonth + 1, 0).getDate();
  const dows           = ['일', '월', '화', '수', '목', '금', '토'];

  // 이 달에 걸쳐있는 프로젝트 (최대 3개)
  const activeProjects = projects
    .filter(p => p.start_date <= end && p.deadline >= start)
    .slice(0, 3);

  let cells = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="cal-cell"></div>`;
  }

  for (let d = 1; d <= lastDate; d++) {
    const dateStr    = `${archiveYear}-${String(archiveMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const post       = postByDate[dateStr];
    const done       = doneByDate[dateStr];
    const isToday    = dateStr === getToday();
    const isSelected = dateStr === selectedDate;

    // 프로젝트 타임라인 바
    const bars = activeProjects.map(p => {
      const inRange    = dateStr >= p.start_date && dateStr <= p.deadline;
      const isStart    = dateStr === p.start_date;
      const isEnd      = dateStr === p.deadline;
      const hasPost    = post && post.project_id === p.id;
      const colorClass = CATEGORY_CLASS[p.category] || 'jogak';

      if (!inRange) return `<div class="cal-bar empty-bar"></div>`;

      return `
        <div class="cal-bar ${hasPost ? 'active-bar' : 'inactive-bar'}
          ${isStart ? 'bar-start' : ''}
          ${isEnd ? 'bar-end' : ''}"
          style="background: var(--c-cat-${colorClass})">
        </div>
      `;
    }).join('');

    // 납입 가능 여부
    const isWritable = activeProjects.some(p => {
      if (dateStr < p.start_date || dateStr > p.deadline) return false;
      if (!p.write_days || p.write_days.length === 0) return true;
      return p.write_days.includes(new Date(dateStr + 'T00:00:00').getDay());
    });

    cells += `
      <div class="cal-cell
        ${post ? 'has-post' : ''}
        ${isToday ? 'today' : ''}
        ${isSelected ? 'selected' : ''}
        ${post || isToday ? 'clickable' : ''}
        ${!isWritable && !post ? 'not-write-day' : ''}"
        onclick="selectDate('${dateStr}')">
        <span class="cal-date">${d}</span>
        <div class="cal-bars">${bars}</div>
        ${done ? '<span class="cal-check">✓</span>' : ''}
      </div>
    `;
  }

  // 범례
  const legend = activeProjects.map(p => {
    const colorClass = CATEGORY_CLASS[p.category] || 'jogak';
    return `
      <div class="cal-legend-item">
        <div class="cal-legend-color"
             style="background: var(--c-cat-${colorClass})"></div>
        <span class="cal-legend-name">${escapeHtml(p.name)}</span>
        <span class="cal-legend-range">${p.start_date} — ${p.deadline}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="archive-header">
      <button class="archive-nav-btn" onclick="moveArchive(-1)">←</button>
      <span class="archive-month">${monthLabel}</span>
      <button class="archive-nav-btn" onclick="moveArchive(1)">→</button>
    </div>

    <div class="cal-grid">${cells}</div>

    ${legend ? `<div class="cal-legend">${legend}</div>` : ''}

    <div id="archive-detail"></div>
  `;

  // 선택된 날짜 상세 표시
  if (selectedDate && postByDate[selectedDate]) {
    renderDateDetail(postByDate[selectedDate], projects);
  }
}

function selectDate(dateStr) {
  if (selectedDate === dateStr) {
    selectedDate = null;
    renderArchive();
    return;
  }
  selectedDate = dateStr;
  renderArchive();
}

function renderDateDetail(post, projects) {
  const detail     = document.getElementById('archive-detail');
  if (!detail) return;

  const project    = projects.find(p => p.id === post.project_id);
  const dateStr    = getDateStr(post.created_at);
  const colorClass = project ? (CATEGORY_CLASS[project.category] || 'jogak') : 'jogak';
  const editable   = isEditable(post);

  detail.innerHTML = `
    <div class="detail-card">
      <div class="detail-card-header">
        <div>
          <div class="detail-date">${formatDisplayDate(dateStr)}</div>
          ${project ? `
            <div class="detail-project">
              <div class="detail-dot"
                   style="background: var(--c-cat-${colorClass})"></div>
              <span>${escapeHtml(project.name)}</span>
              <span class="cat-${colorClass}">${project.category}</span>
            </div>
          ` : ''}
        </div>
        <div class="detail-meta">
          <span class="detail-chars">${post.char_count.toLocaleString()}자</span>
          <span class="detail-badge ${editable ? 'editable' : 'locked'}">
            ${editable ? '수정 가능' : '잠김'}
          </span>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-text">
          ${escapeHtml(post.body).replace(/\n/g, '<br>')}
        </div>
      </div>

      ${editable ? `
        <div class="detail-footer">
          <span class="detail-save-status">오늘 쓴 글은 납입 메뉴에서 수정할 수 있어요.</span>
          <button class="modal-save-btn" onclick="switchScreen('editor')">
            납입 메뉴로 →
          </button>
        </div>
      ` : ''}
    </div>
  `;

  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function moveArchive(dir) {
  archiveMonth += dir;
  if (archiveMonth > 11) { archiveMonth = 0; archiveYear++; }
  if (archiveMonth < 0)  { archiveMonth = 11; archiveYear--; }
  selectedDate = null;
  renderArchive();
}
