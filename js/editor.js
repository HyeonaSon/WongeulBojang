let autoSaveTimer = null;

async function initEditor() {
  const today = await getToday();
  const todayPost = await getPostByDate(today);
  const projects = await getAllProjects();

  renderEditorUI(todayPost, projects);
  updateCharCountDisplay();
}

function renderEditorUI(post, projects) {
  const screen = document.getElementById('screen-editor');

  // 프로젝트 선택 옵션
  const activeProjects = projects.filter(p => p.deadline >= getToday());
  const projectOptions = activeProjects.map(p =>
    `<option value="${p.id}" ${post?.projectId === p.id ? 'selected' : ''}>
      ${escapeHtml(p.name)}
    </option>`
  ).join('');

  const noProject = activeProjects.length === 0;

  screen.innerHTML = `
    <div id="editor-date">${formatDisplayDate(getToday())}</div>

    <div id="project-select-wrap">
      ${noProject
        ? `<span class="project-none">진행 중인 프로젝트가 없어요.
            <button onclick="switchScreen('goal')" class="link-btn">프로젝트 만들기 →</button>
           </span>`
        : `<select id="project-select" ${post ? '' : ''}>
            <option value="">프로젝트 선택</option>
            ${projectOptions}
           </select>`
      }
    </div>

    <textarea
      id="body"
      placeholder="오늘의 글을 써보세요."
      spellcheck="false"
      ${noProject ? 'disabled' : ''}
    >${post ? escapeHtml(post.body) : ''}</textarea>

    <div class="editor-footer">
      <span id="char-count">오늘 0자</span>
      <div class="editor-actions">
        <span id="save-status"></span>
        <button id="save-btn" onclick="savePost()" ${noProject ? 'disabled' : ''}>저장</button>
      </div>
    </div>
  `;

  if (post) {
    document.getElementById('save-btn').dataset.postId = post.id;
  }

  bindEditorEvents();
  updateCharCountDisplay();
  autoResizeTextarea();
}

function bindEditorEvents() {
  const bodyEl = document.getElementById('body');
  if (!bodyEl) return;

  bodyEl.addEventListener('input', () => {
    autoResizeTextarea();
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
  const el = e.target;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  el.value = el.value.slice(0, start) + '  ' + el.value.slice(end);
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
  const bodyEl     = document.getElementById('body');
  const selectEl   = document.getElementById('project-select');
  const saveBtn    = document.getElementById('save-btn');

  if (!bodyEl || !selectEl) return;

  const body      = bodyEl.value.trim();
  const projectId = Number(selectEl.value);
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
    updatePost(Number(postId), projectId, body);
  } else {
    const post = createPost(projectId, body);
    if (saveBtn) saveBtn.dataset.postId = post.id;
  }

  updateCharCountDisplay();
  setSaveStatus(silent ? '자동 저장됨' : '저장됨');
  setTimeout(() => setSaveStatus(''), 2000);
}

function setSaveStatus(msg) {
  const el = document.getElementById('save-status');
  if (el) el.textContent = msg;
}

function updateCharCountDisplay() {
  const el = document.getElementById('char-count');
  if (!el) return;
  const count = getCharCountByDate(getToday());
  el.textContent = `오늘 ${count.toLocaleString()}자`;
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
