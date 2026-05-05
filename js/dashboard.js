let calendarYear, calendarMonth;

aysnc function initGoal() {
  const projects = await getAllProjects();
  await renderProjectList(projects);
}

function renderProjectList(projects) {
  const container = document.getElementById('screen-goal');

  const cards = projects.map(p => {
    const counts = getCharCountsInRange(p.startDate, p.deadline, p.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const written = Object.values(counts).filter(c => c > 0).length;
    const totalDays = Object.keys(counts).length;
    const isActive = p.deadline >= getToday();

    return `
      <div class="project-card ${isActive ? '' : 'project-ended'}"
           onclick="openProject(${p.id})">
        <div class="project-card-header">
          <span class="project-name">${escapeHtml(p.name)}</span>
          <span class="project-badge ${isActive ? 'badge-active' : 'badge-ended'}">
            ${isActive ? '진행 중' : '종료'}
          </span>
        </div>
        <div class="project-meta">
          ${p.startDate} — ${p.deadline}
        </div>
        <div class="project-stats-row">
          <span>${total.toLocaleString()}자</span>
          <span>${written} / ${totalDays}일</span>
          ${p.targetChars
            ? `<span>${Math.min(100, Math.round(total / p.targetChars * 100))}%</span>`
            : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div id="project-list">
      ${cards || '<div class="empty-state">아직 프로젝트가 없어요.</div>'}
    </div>
    <button class="btn-new-project" onclick="showProjectForm()">+ 새 프로젝트</button>
  `;
}

function showProjectForm(projectId = null) {
  const project = projectId ? getProject(projectId) : null;
  const container = document.getElementById('screen-goal');

  container.innerHTML = `
    <div class="goal-form">
      <label>프로젝트 이름</label>
      <input type="text" id="proj-name" placeholder="예: 5월 일기" 
             value="${project ? escapeHtml(project.name) : ''}" />
      <label>마감일</label>
      <input type="date" id="proj-deadline" min="${getToday()}"
             value="${project ? project.deadline : ''}" />
      <label>목표 글자 수 <span style="font-size:11px">(선택)</span></label>
      <input type="number" id="proj-chars" placeholder="예: 30000"
             value="${project?.targetChars || ''}" />
      <div style="display:flex; gap:12px; margin-top:8px;">
        <button class="btn-set-goal" onclick="submitProject(${projectId || ''})">
          ${project ? '수정' : '만들기'}
        </button>
        <button class="btn-reset" onclick="initGoal()">취소</button>
      </div>
    </div>
  `;
}

function submitProject(projectId = null) {
  const name     = document.getElementById('proj-name').value.trim();
  const deadline = document.getElementById('proj-deadline').value;
  const chars    = document.getElementById('proj-chars').value;

  if (!name || !deadline) return;

  if (projectId) {
    updateProject(projectId, {
      name,
      deadline,
      targetChars: chars ? Number(chars) : null
    });
  } else {
    createProject(name, deadline, chars ? Number(chars) : null);
  }

  initGoal();
}

aysnc function openProject(projectId) {
  const project = await getProject(projectId);
  if (!project) return;

  const counts = await getCharCountsInRange(project.startDate, project.deadline, projectId);
  const total = await Object.values(counts).reduce((a, b) => a + b, 0);
  const written = await Object.values(counts).filter(c => c > 0).length;
  const totalDays = await Object.keys(counts).length;
  const streak = await calcStreak(counts);

  calendarYear  = new Date().getFullYear();
  calendarMonth = new Date().getMonth();

  const container = await document.getElementById('screen-goal');
  container.innerHTML = `
    <div class="project-detail-header">
      <button class="back-btn" onclick="initGoal()">← 목록</button>
      <button class="btn-reset" onclick="showProjectForm(${projectId})">수정</button>
    </div>

    <h2 class="project-detail-name">${escapeHtml(project.name)}</h2>
    <div class="project-meta" style="margin-bottom:32px">
      ${project.startDate} — ${project.deadline}
    </div>

    <div class="goal-stats">
      <div class="stat">
        <span class="stat-label">누적 글자</span>
        <span class="stat-value">${total.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">작성일</span>
        <span class="stat-value">${written}<span style="font-size:14px;font-weight:300"> / ${totalDays}일</span></span>
      </div>
      <div class="stat">
        <span class="stat-label">연속 작성</span>
        <span class="stat-value">${streak}일</span>
      </div>
      ${project.targetChars ? `
      <div class="stat">
        <span class="stat-label">달성률</span>
        <span class="stat-value">${Math.min(100, Math.round(total / project.targetChars * 100))}%</span>
      </div>` : ''}
    </div>

    <div id="calendar-wrap"></div>
  `;

  await renderCalendar(counts, project, projectId);
}

function renderCalendar(counts, project, projectId) {
  const wrap = document.getElementById('calendar-wrap');
  const year = calendarYear;
  const month = calendarMonth;

  const monthStr = new Date(year, month).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long'
  });

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const max = Math.max(...Object.values(counts), 1);
  const dows = ['일', '월', '화', '수', '목', '금', '토'];

  let cells = dows.map(d => `<div class="calendar-dow">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="calendar-cell out-range"></div>`;
  }

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count   = counts[dateStr] || 0;
    const inRange = dateStr >= project.startDate && dateStr <= project.deadline;
    const isToday = dateStr === getToday();
    const hasPost = count > 0;
    const level   = !hasPost ? 0 : Math.ceil((count / max) * 4);

    const classes = [
      'calendar-cell',
      inRange ? 'in-range' : 'out-range',
      isToday ? 'today' : '',
      hasPost ? 'has-post' : '',
      hasPost ? `level-${level}` : ''
    ].filter(Boolean).join(' ');

    cells += `
      <div class="${classes}" title="${count ? count.toLocaleString() + '자' : ''}"
           ${inRange && hasPost ? `onclick="openPostFromCalendar('${dateStr}', ${projectId})"` : ''}>
        <span class="cell-date">${d}</span>
        <div class="cell-dot"></div>
      </div>
    `;
  }

  wrap.innerHTML = `
    <div class="calendar-nav">
      <button onclick="moveCalendar(-1, ${projectId})">←</button>
      <span>${monthStr}</span>
      <button onclick="moveCalendar(1, ${projectId})">→</button>
    </div>
    <div class="calendar-grid">${cells}</div>
    <div class="calendar-legend">
      <div class="legend-item">
        <div style="width:5px;height:5px;border-radius:50%;background:var(--c-dot)"></div>
        <span>글 있음</span>
      </div>
      <div class="legend-item">
        <div style="width:5px;height:5px;border-radius:50%;background:var(--c-dot-none)"></div>
        <span>글 없음</span>
      </div>
    </div>
  `;
}

function moveCalendar(dir, projectId) {
  calendarMonth += dir;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  if (calendarMonth < 0)  { calendarMonth = 11; calendarYear--; }

  const project = getProject(projectId);
  const counts  = getCharCountsInRange(project.startDate, project.deadline, projectId);
  renderCalendar(counts, project, projectId);
}

function openPostFromCalendar(dateStr, projectId) {
  const post = getPostByDateAndProject(dateStr, projectId);
  if (post) openPost(post, !isEditable(post));
}

function calcStreak(counts) {
  let streak = 0;
  let current = new Date(getToday());
  while (true) {
    const dateStr = current.toISOString().slice(0, 10);
    if ((counts[dateStr] || 0) > 0) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}
