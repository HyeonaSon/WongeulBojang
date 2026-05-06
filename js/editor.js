let autoSaveTimer = null;
let projectDropdownOpen = false;

function initEditor() {
  const today    = getToday();
  const projects = getActiveProjects();

  // 프로젝트 무관하게 오늘 글을 가져오는 게 아니라
  // 선택된 프로젝트의 오늘 글을 가져와야 함
  // → 초기엔 post 없이 시작, 프로젝트 선택 시 불러오도록

  renderEditorUI(null, projects);
}

function renderEditorUI(post, projects) {
  const screen = document.getElementById('screen-editor');

  if (projects.length === 0) {
    screen.innerHTML = `
      <div class="editor-header">
        <div class="editor-date">${formatDisplayDate(getToday())}</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">🏦</div>
        진행 중인 적금이 없어요.<br>
        <button class="link-btn" onclick="switchScreen('dashboard')">
          새 적금 개설하기 →
        </button>
      </div>
    `;
    return;
  }

  // 오늘 글이 있으면 해당 프로젝트 기본 선택
  const defaultProject = post
    ? projects.find(p => p.id === post.project_id) || projects[0]
    : projects[0];

  screen.innerHTML = `
    <div class="editor-header">
      <div class="editor-date">${formatDisplayDate(getToday())}</div>
      <div class="editor-project-select">
        <div class="custom-select-wrap" id="custom-select-wrap">
          <button class="custom-select-trigger" id="custom-select-trigger"
                  onclick="toggleProjectDropdown()">
            <span id="selected-project-name">
              ${defaultProject ? escapeHtml(defaultProject.name) : '적금 선택'}
            </span>
            <span class="custom-select-arrow" id="select-arrow">▾</span>
          </button>
          <div class="custom-select-dropdown" id="project-dropdown" hidden>
            ${projects.map(p => {
              const catClass = getCatClass(p.category);
              const isSelected = defaultProject && p.id === defaultProject.id;
              return `
                <div class="custom-select-option ${isSelected ? 'selected' : ''}"
                     data-id="${p.id}"
                     onclick="selectProject('${p.id}')">
                  <div class="custom-option-name">${escapeHtml(p.name)}</div>
                  <div class="custom-option-meta">
                    <span class="${catClass}">${p.category}</span>
                    <span>·</span>
                    <span>${getWriteDaysLabel(p.write_days)}</span>
                    <span>·</span>
                    <span>D-${getDaysLeft(p.deadline)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div id="write-day-badge"></div>
      </div>
    </div>

    <div id="deposit-goal-wrap"></div>
    <div id="editor-body-wrap"></div>
  `;

  // 드롭다운 외부 클릭 닫기
  document.addEventListener('click', handleDropdownOutsideClick);

  // 기본 프로젝트로 에디터 초기화
  if (defaultProject) {
    renderEditorBody(defaultProject.id, post);
  }
}

function toggleProjectDropdown() {
  const dropdown = document.getElementById('project-dropdown');
  const arrow    = document.getElementById('select-arrow');
  if (!dropdown) return;

  projectDropdownOpen = !projectDropdownOpen;
  dropdown.hidden     = !projectDropdownOpen;
  arrow.textContent   = projectDropdownOpen ? '▴' : '▾';
}

function selectProject(projectId) {
  const projects = getActiveProjects();
  const project  = projects.find(p => p.id === projectId);
  if (!project) return;

  const nameEl = document.getElementById('selected-project-name');
  if (nameEl) nameEl.textContent = project.name;

  document.querySelectorAll('.custom-select-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === projectId);
  });

  const dropdown = document.getElementById('project-dropdown');
  const arrow    = document.getElementById('select-arrow');
  if (dropdown) dropdown.hidden = true;
  if (arrow)    arrow.textContent = '▾';
  projectDropdownOpen = false;

  // ← post 파라미터 없이 호출 — 내부에서 이 프로젝트 오늘 글 직접 조회
  renderEditorBody(projectId, null);
}

function handleDropdownOutsideClick(e) {
  const wrap = document.getElementById('custom-select-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const dropdown = document.getElementById('project-dropdown');
    const arrow    = document.getElementById('select-arrow');
    if (dropdown) dropdown.hidden = true;
    if (arrow)    arrow.textContent = '▾';
    projectDropdownOpen = false;
  }
}

function renderEditorBody(projectId, post) {
  const badgeEl  = document.getElementById('write-day-badge');
  const goalWrap = document.getElementById('deposit-goal-wrap');
  const bodyWrap = document.getElementById('editor-body-wrap');

  if (!projectId) return;

  const project    = getProject(projectId);
  const written    = getProjectWrittenChars(projectId);
  const daily      = calcDailyTarget(
    project.target_chars, written, project.deadline, project.write_days
  );
  const canWrite   = isWriteDay(project) && project.start_date <= getToday();
  const label      = getWriteDaysLabel(project.write_days);

  // ← 이 프로젝트의 오늘 글만 불러오기
  const todayPost  = getPostByDateAndProject(getToday(), projectId);

  // 납입 요일 뱃지
  if (badgeEl) {
    badgeEl.innerHTML = `
      <span class="write-day-badge ${canWrite ? 'available' : 'unavailable'}">
        ${label}${canWrite ? ' ✓' : ' ✗'}
      </span>
    `;
  }

  // 납입 불가
  if (!canWrite) {
    if (goalWrap) goalWrap.innerHTML = '';
    if (bodyWrap) {
      const nextDay = getNextWriteDay(project);
      bodyWrap.innerHTML = `
        <div class="editor-locked">
          <div class="editor-locked-icon">📅</div>
          <div class="editor-locked-title">오늘은 납입일이 아니에요</div>
          <div class="editor-locked-desc">
            납입 요일: ${label}<br>
            ${nextDay ? `다음 납입일: ${nextDay}` : ''}
          </div>
        </div>
      `;
    }
    window._dailyTarget      = 0;
    window._currentProjectId = projectId;
    return;
  }

  const currentChars = todayPost ? todayPost.char_count : 0;
  const progress     = calcProgress(currentChars, daily);

  if (goalWrap) {
    goalWrap.innerHTML = `
      <div class="deposit-goal">
        <div class="deposit-goal-label">
          <span>오늘 납입 목표</span>
          <span id="daily-goal-text">
            ${currentChars.toLocaleString()} / ${daily.toLocaleString()}자
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
               id="daily-progress-fill"
               style="width:${progress}%"></div>
        </div>
      </div>
    `;
  }

  if (bodyWrap) {
    bodyWrap.innerHTML = `
      <textarea
        id="body"
        placeholder="오늘의 글을 납입하세요."
        spellcheck="false"
      >${todayPost ? escapeHtml(todayPost.body) : ''}</textarea>

      <div class="editor-footer">
        <span class="editor-char-count" id="char-count">
          오늘 ${currentChars.toLocaleString()}자
        </span>
        <div class="editor-actions">
          <span class="save-status" id="save-status"></span>
          <button class="deposit-btn" id="save-btn" onclick="savePost()">
            납입
          </button>
        </div>
      </div>
    `;

    if (todayPost) {
      document.getElementById('save-btn').dataset.postId = todayPost.id;
    }

    bindEditorEvents();
    autoResizeTextarea();
  }

  window._dailyTarget      = daily;
  window._currentProjectId = projectId;
}

  const currentChars = post ? post.char_count : 0;
  const progress     = calcProgress(currentChars, daily);

  // 납입 목표 바
  if (goalWrap) {
    goalWrap.innerHTML = `
      <div class="deposit-goal">
        <div class="deposit-goal-label">
          <span>오늘 납입 목표</span>
          <span id="daily-goal-text">
            ${currentChars.toLocaleString()} / ${daily.toLocaleString()}자
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
               id="daily-progress-fill"
               style="width:${progress}%"></div>
        </div>
      </div>
    `;
  }

  // 본문
  if (bodyWrap) {
    bodyWrap.innerHTML = `
      <textarea
        id="body"
        placeholder="오늘의 글을 납입하세요."
        spellcheck="false"
      >${post ? escapeHtml(post.body) : ''}</textarea>

      <div class="editor-footer">
        <span class="editor-char-count" id="char-count">
          오늘 ${currentChars.toLocaleString()}자
        </span>
        <div class="editor-actions">
          <span class="save-status" id="save-status"></span>
          <button class="deposit-btn" id="save-btn" onclick="savePost()">
            납입
          </button>
        </div>
      </div>
    `;

    if (post) {
      document.getElementById('save-btn').dataset.postId = post.id;
    }

    bindEditorEvents();
    autoResizeTextarea();
  }

  window._dailyTarget       = daily;
  window._currentProjectId  = projectId;
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

function onProjectChange() {
  const trigger = document.getElementById('custom-select-trigger');
  const projectId = document.querySelector('.custom-select-option.selected')
    ?.dataset.id;
  if (projectId) {
    const post = getPostByDateAndProject(getToday(), projectId);
    renderEditorBody(projectId, post);
  }
}

function updateDailyBar() {
  const bodyEl  = document.getElementById('body');
  const fillEl  = document.getElementById('daily-progress-fill');
  const textEl  = document.getElementById('daily-goal-text');
  const countEl = document.getElementById('char-count');

  if (!bodyEl || !fillEl) return;

  const current  = bodyEl.value.length;
  const daily    = window._dailyTarget || 0;
  const progress = calcProgress(current, daily);

  fillEl.style.width = progress + '%';
  fillEl.classList.toggle('complete', progress >= 100);
  if (textEl)  textEl.textContent  = `${current.toLocaleString()} / ${daily.toLocaleString()}자`;
  if (countEl) countEl.textContent = `오늘 ${current.toLocaleString()}자`;
}

function bindEditorEvents() {
  const bodyEl = document.getElementById('body');
  if (!bodyEl) return;

  bodyEl.addEventListener('input', () => {
    autoResizeTextarea();
    updateDailyBar();
    onEditorInput();
  });

  bodyEl.addEventListener('keydown', handleTabKey);
  document.addEventListener('keydown', handleSaveShortcut);
}

function onEditorInput() {
  setSaveStatus('입력 중...');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => savePost(true), 1500);
}

function handleTabKey(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const el    = e.target;
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  el.value    = el.value.slice(0, start) + '  ' + el.value.slice(end);
  el.selectionStart = el.selectionEnd = start + 2;
}

function handleSaveShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    savePost();
  }
}

function autoResizeTextarea() {
  const el = document.getElementById('body');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function savePost(silent = false) {
  const bodyEl  = document.getElementById('body');
  const saveBtn = document.getElementById('save-btn');

  if (!bodyEl) return;

  const body      = bodyEl.value.trim();
  const projectId = window._currentProjectId;
  const postId    = saveBtn?.dataset.postId;

  if (!body) {
    if (!silent) setSaveStatus('내용을 입력해주세요.');
    return;
  }
  if (!projectId) {
    if (!silent) setSaveStatus('적금을 선택해주세요.');
    return;
  }

  if (postId) {
    updatePost(postId, projectId, body);
  } else {
    const post = createPost(projectId, body);
    if (saveBtn) saveBtn.dataset.postId = post.id;
  }

  updateDailyBar();
  setSaveStatus(silent ? '자동 저장됨' : '납입 완료');
  setTimeout(() => setSaveStatus(''), 2000);
}

function setSaveStatus(msg) {
  const el = document.getElementById('save-status');
  if (el) el.textContent = msg;
}
