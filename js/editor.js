let _autoSave   = null;
let _projectId  = null;
let _daily      = 0;

function initEditor() {
  document.removeEventListener('click', _dropdownClose);

  const projects = getWritableProjects();
  const el       = document.getElementById('screen-editor');

  if (projects.length === 0) {
    el.innerHTML = `
      <div class="editor-date">${formatDate(getToday())}</div>
      <div class="empty">
        <div class="empty-icon">🏦</div>
        납입 가능한 적금이 없어요.<br>
        <button class="link-btn" onclick="go('home')">
          새 적금 개설하기 →
        </button>
      </div>
    `;
    return;
  }

  const today = getToday();
  const def   = projects.find(p =>
    getPostByDateAndProject(today, p.id)
  ) || projects[0];

  // _daily 는 여기서 딱 한 번만 계산
  _projectId = def.id;
  _daily     = calcFixed(_projectId);

  el.innerHTML = `
    <div class="editor-top">
      <div class="editor-date">${formatDate(getToday())}</div>
      <div class="select-wrap" id="sel-wrap">
        <button class="select-trigger" id="sel-trigger"
                onclick="toggleDropdown()">
          <span id="sel-name">${escapeHtml(def.name)}</span>
          <span class="select-arrow" id="sel-arrow">▾</span>
        </button>
        <div class="select-dropdown" id="sel-drop" hidden>
          ${projects.map(p => `
            <div class="select-option ${p.id === def.id ? 'on' : ''}"
                 data-id="${p.id}"
                 onclick="pickProject('${p.id}')">
              <div class="option-name">${escapeHtml(p.name)}</div>
              <div class="option-meta">
                <span class="${getCatClass(p.category)}">${p.category}</span>
                <span>·</span>
                <span>${getWriteDaysLabel(p.write_days)}</span>
                <span>·</span>
                <span>D-${getDaysLeft(p.deadline)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div id="ed-goal"></div>
    <div id="ed-body"></div>
  `;

  document.addEventListener('click', _dropdownClose);
  renderGoal();
  renderTextarea();
}

// _daily 계산 — 어제까지 쓴 것 기준
function calcFixed(projectId) {
  const p = getProject(projectId);
  if (!p) return 0;
  const prevWritten = getPostsByProject(projectId)
    .filter(post => getDateStr(post.created_at) < getToday())
    .reduce((s, post) => s + post.char_count, 0);
  return calcDailyTarget(p.target_chars, prevWritten, p.deadline, p.write_days);
}

// 목표 바만 그리기
function renderGoal() {
  const goalEl   = document.getElementById('ed-goal');
  if (!goalEl) return;

  const p        = getProject(_projectId);
  if (!p) return;

  const label    = getWriteDaysLabel(p.write_days);
  const todayPost = getPostByDateAndProject(getToday(), _projectId);
  const canWrite = (isWriteDay(p) && p.start_date <= getToday()) || !!todayPost;

  if (!canWrite) {
    goalEl.innerHTML = `
      <div class="locked-state">
        <div class="locked-icon">📅</div>
        <div class="locked-title">오늘은 납입일이 아니에요</div>
        <div class="locked-desc">
          납입 요일: ${label}<br>
          ${getNextWriteDay(p) ? `다음 납입일: ${getNextWriteDay(p)}` : ''}
        </div>
      </div>
    `;
    return;
  }

  const cur      = todayPost ? todayPost.char_count : 0;
  const progress = calcProgress(cur, _daily);

  goalEl.innerHTML = `
    <div class="goal-bar">
      <div class="goal-label">
        <span>오늘 목표 · ${label}</span>
        <span id="goal-text">
          ${cur.toLocaleString()} / ${_daily.toLocaleString()}자
        </span>
      </div>
      <div class="progress">
        <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
             id="goal-fill" style="width:${progress}%"></div>
      </div>
    </div>
  `;
}

// textarea 만 그리기
function renderTextarea() {
  const bodyEl   = document.getElementById('ed-body');
  if (!bodyEl) return;

  const p        = getProject(_projectId);
  if (!p) return;

  const todayPost = getPostByDateAndProject(getToday(), _projectId);
  const canWrite  = (isWriteDay(p) && p.start_date <= getToday()) || !!todayPost;
  if (!canWrite) return;

  const cur = todayPost ? todayPost.char_count : 0;

  bodyEl.innerHTML = `
    <div class="write-area">
      <textarea id="body"
        placeholder="오늘의 글을 납입하세요."
        spellcheck="false"
      >${todayPost ? escapeHtml(todayPost.body) : ''}</textarea>
    </div>
    <div class="editor-footer">
      <span class="char-count" id="char-count">
        ${cur.toLocaleString()}자
      </span>
      <div class="editor-actions">
        <span class="save-status" id="save-status"></span>
        <button class="save-btn" id="save-btn" onclick="savePost()">
          ${todayPost ? '수정' : '납입'}
        </button>
      </div>
    </div>
  `;

  if (todayPost) {
    document.getElementById('save-btn').dataset.postId = todayPost.id;
  }

  const ta = document.getElementById('body');
  if (ta) {
    ta.addEventListener('input', onInput);
    ta.addEventListener('keydown', onTab);
    resizeTA();
  }
}

function _dropdownClose(e) {
  const wrap = document.getElementById('sel-wrap');
  if (wrap && !wrap.contains(e.target)) closeDropdown();
}

function toggleDropdown() {
  const drop = document.getElementById('sel-drop');
  const arr  = document.getElementById('sel-arrow');
  if (!drop) return;
  const open  = !drop.hidden;
  drop.hidden = open;
  arr.textContent = open ? '▾' : '▴';
}

function closeDropdown() {
  const drop = document.getElementById('sel-drop');
  const arr  = document.getElementById('sel-arrow');
  if (drop) drop.hidden = true;
  if (arr)  arr.textContent = '▾';
}

function pickProject(id) {
  _projectId = id;
  _daily     = calcFixed(id);  // 프로젝트 바뀔 때만 재계산

  const nameEl = document.getElementById('sel-name');
  if (nameEl) nameEl.textContent = getProject(id).name;

  document.querySelectorAll('.select-option').forEach(el => {
    el.classList.toggle('on', el.dataset.id === id);
  });

  closeDropdown();
  renderGoal();
  renderTextarea();
}

function onInput() {
  resizeTA();
  updateBar();
  setStatus('입력 중...');
  clearTimeout(_autoSave);
  _autoSave = setTimeout(() => savePost(true), 1500);
}

function onTab(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const el = e.target;
  const s  = el.selectionStart;
  const en = el.selectionEnd;
  el.value = el.value.slice(0, s) + '  ' + el.value.slice(en);
  el.selectionStart = el.selectionEnd = s + 2;
}

function updateBar() {
  const ta    = document.getElementById('body');
  const fill  = document.getElementById('goal-fill');
  const text  = document.getElementById('goal-text');
  const count = document.getElementById('char-count');
  if (!ta || !fill) return;

  const cur      = ta.value.length;
  const progress = calcProgress(cur, _daily);  // 고정된 _daily 사용

  fill.style.width = progress + '%';
  fill.classList.toggle('complete', progress >= 100);
  if (text)  text.textContent  = `${cur.toLocaleString()} / ${_daily.toLocaleString()}자`;
  if (count) count.textContent = `${cur.toLocaleString()}자`;
}

function resizeTA() {
  const ta = document.getElementById('body');
  if (!ta) return;
  const scrollY = window.scrollY;  // 현재 스크롤 위치 저장
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
  window.scrollTo(0, scrollY);     // 스크롤 위치 복원
}

function savePost(silent = false) {
  const ta      = document.getElementById('body');
  const saveBtn = document.getElementById('save-btn');
  if (!ta) return;

  const body   = ta.value.trim();
  const postId = saveBtn?.dataset.postId;

  if (!body) {
    if (!silent) setStatus('내용을 입력해주세요.');
    return;
  }
  if (!_projectId) {
    if (!silent) setStatus('적금을 선택해주세요.');
    return;
  }

  if (postId) {
    updatePost(postId, _projectId, body);
  } else {
    const post = createPost(_projectId, body);
    if (saveBtn) {
      saveBtn.dataset.postId = post.id;
      // 버튼 텍스트만 바꾸기 — 전체 재렌더링 없음
      saveBtn.textContent = '수정';
    }
  }

  // 저장 후 목표 바, textarea 절대 재렌더링 안 함
  setStatus(silent ? '저장됨' : '납입 완료 ✓');
  setTimeout(() => setStatus(''), 2000);
}

function setStatus(msg) {
  const el = document.getElementById('save-status');
  if (el) el.textContent = msg;
}
