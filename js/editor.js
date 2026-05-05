let autoSaveTimer = null;

function initEditor() {
  const today     = getToday();
  const projects  = getActiveProjects();
  const todayPost = getPostByDate(today);

  renderEditorUI(todayPost, projects);
}

function renderEditorUI(post, projects) {
  const screen = document.getElementById('screen-editor');

  const options = projects.map(p => `
    <option value="${p.id}" ${post?.project_id === p.id ? 'selected' : ''}>
      ${escapeHtml(p.name)}
    </option>
  `).join('');

  screen.innerHTML = `
    <div id="editor-date">${formatDisplayDate(getToday())}</div>

    ${projects.length === 0
      ? `<div class="empty-state">진행 중인 프로젝트가 없어요.
           <button class="link-btn" onclick="switchScreen('dashboard')">
             새 적금 만들기 →
           </button>
         </div>`
      : `
        <div id="project-select-wrap">
          <select id="project-select" onchange="onProjectChange()">
            <option value="">프로젝트 선택</option>
            ${options}
          </select>
        </div>

        <div id="daily-goal-bar"></div>

        <textarea
          id="body"
          placeholder="오늘의 글을 납입하세요."
          spellcheck="false"
        >${post ? escapeHtml(post.body) : ''}</textarea>

        <div class="editor-footer">
          <span id="char-count">오늘 0자</span>
          <div class="editor-actions">
            <span id="save-status"></span>
            <button id="save-btn" onclick="savePost()">저장</button>
          </div>
        </div>
      `
    }
  `;

  if (post) {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.dataset.postId = post.id;
  }

  bindEditorEvents();
  onProjectChange();
  autoResizeTextarea();
}

function onProjectChange() {
  const selectEl = document.getElementById('project-select');
  const barEl    = document.getElementById('daily-goal-bar');
  const countEl  = document.getElementById('char-count');
  const bodyEl   = document.getElementById('body');

  if (!selectEl || !barEl) return;

  const projectId = selectEl.value;
  if (!projectId) {
    barEl.innerHTML = '';
    return;
  }

  const project      = getProject(projectId);
  const written      = getProjectWrittenChars(projectId);
  const daily        = calcDailyTarget(project.target_chars, written, project.deadline);
  const currentChars = bodyEl ? bodyEl.value.length : 0;
  const progress     = calcProgress(currentChars, daily);

  barEl.innerHTML = `
    <div class="daily-goal-wrap">
      <div class="daily-goal-label">
        <span>오늘 납입 목표</span>
        <span id="daily-goal-text">${currentChars.toLocaleString()} / ${daily.toLocaleString()}자</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${progress >= 100 ? 'done' : ''}"
             id="daily-progress-fill"
             style="width:${progress}%"></div>
      </div>
    </div>
  `;

  if (countEl) countEl.textContent = `오늘 ${currentChars.toLocaleString()}자`;

  window._dailyTarget = daily;
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
  fillEl.classList.toggle('done', progress >= 100);
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
    if (!silent) setSaveStatus('프로젝트를 선택해주세요.');
    return;
  }

  if (postId) {
    updatePost(postId, projectId, body);
  } else {
    const post = createPost(projectId, body);
    if (saveBtn) saveBtn.dataset.postId = post.id;
  }

  setSaveStatus(silent ? '자동 저장됨' : '저장됨');
  setTimeout(() => setSaveStatus(''), 2000);
}

function setSaveStatus(msg) {
  const el = document.getElementById('save-status');
  if (el) el.textContent = msg;
}
