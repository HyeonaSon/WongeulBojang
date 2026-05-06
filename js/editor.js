let autoSaveTimer = null;

function initEditor() {
  const today     = getToday();
  const projects  = getActiveProjects();
  const todayPost = getPostByDate(today);

  renderEditorUI(todayPost, projects);
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

  const options = projects.map(p => `
    <option value="${p.id}" ${post?.project_id === p.id ? 'selected' : ''}>
      ${escapeHtml(p.name)}
    </option>
  `).join('');

  screen.innerHTML = `
    <div class="editor-header">
      <div class="editor-date">${formatDisplayDate(getToday())}</div>
      <div class="editor-project-select">
        <select id="project-select" onchange="onProjectChange()">
          <option value="">적금 선택</option>
          ${options}
        </select>
        <div id="write-day-badge"></div>
      </div>
    </div>

    <div id="deposit-goal-wrap"></div>
    <div id="editor-body-wrap"></div>
  `;

  if (post) {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.dataset.postId = post.id;
  }

  onProjectChange();
}

function onProjectChange() {
  const selectEl   = document.getElementById('project-select');
  const badgeEl    = document.getElementById('write-day-badge');
  const goalWrap   = document.getElementById('deposit-goal-wrap');
  const bodyWrap   = document.getElementById('editor-body-wrap');

  if (!selectEl) return;

  const projectId = selectEl.value;

  if (!projectId) {
    if (badgeEl)  badgeEl.innerHTML = '';
    if (goalWrap) goalWrap.innerHTML = '';
    if (bodyWrap) bodyWrap.innerHTML = '';
    return;
  }

  const project    = getProject(projectId);
  const written    = getProjectWrittenChars(projectId);
  const daily      = calcDailyTarget(
    project.target_chars, written, project.deadline, project.write_days
  );
  const canWrite   = isWriteDay(project) && project.start_date <= getToday();
  const todayPost  = getPostByDateAndProject(getToday(), projectId);
  const label      = getWriteDaysLabel(project.write_days);

  // 납입 요일 뱃지
  if (badgeEl) {
    badgeEl.innerHTML = `
      <span class="write-day-badge ${canWrite ? 'available' : 'unavailable'}">
        ${label} 납입${canWrite ? ' 가능' : ' 불가'}
      </span>
    `;
  }

  // 납입 불가 날 (오늘이 납입 요일 아님)
  if (!canWrite) {
    if (goalWrap) goalWrap.innerHTML = '';
    if (bodyWrap) {
      const nextWriteDay = getNextWriteDay(project);
      bodyWrap.innerHTML = `
        <div class="editor-locked">
          <div class="editor-locked-icon">📅</div>
          <div class="editor-locked-title">오늘은 납입일이 아니에요</div>
          <div class="editor-locked-desc">
            납입 요일: ${label}<br>
            ${nextWriteDay ? `다음 납입일: ${nextWriteDay}` : ''}
          </div>
        </div>
      `;
    }
    window._dailyTarget = 0;
    return;
  }

  // 이미 오늘 납입 완료
  const currentChars = todayPost ? todayPost.char_count : 0;
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

  // 본문 + 저장 버튼
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

  window._dailyTarget = daily;
}

// 다음 납입 가능 날짜
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
  const bodyEl   = document.getElementById('body');
  const selectEl = document.getElementById('project-select');
  const saveBtn  = document.getElementById('save-btn');

  if (!bodyEl || !selectEl) return;

  const body      = bodyEl.value.trim();
  const projectId = selectEl.value;
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
