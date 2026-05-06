// ── 적금 개설 폼 ──────────────────────────────

function showNewProjectForm() {
  const container = document.getElementById('screen-dashboard');
  window._selectedDays = [];

  container.innerHTML = `
    <div class="form-page-header">
      <button class="back-btn" onclick="initDashboard()">← 취소</button>
      <span class="form-page-title">새 적금 개설</span>
    </div>

    <div class="form-section">
      <label class="form-label">적금 이름</label>
      <input class="form-input" type="text" id="proj-name"
             placeholder="예: 5월의 단편소설" />
    </div>

    <div class="form-section">
      <label class="form-label">목표 글자 수</label>
      <div class="char-input-wrap">
        <input class="form-input" type="number" id="proj-chars"
               placeholder="0" oninput="onCharsInput()" />
        <div class="char-pad">
          <button class="char-pad-btn"
                  onclick="appendZeros('proj-chars', 2, onCharsInput)">00</button>
          <button class="char-pad-btn"
                  onclick="appendZeros('proj-chars', 3, onCharsInput)">000</button>
          <button class="char-pad-btn"
                  onclick="appendZeros('proj-chars', 4, onCharsInput)">0000</button>
        </div>
        <div id="category-display"></div>
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">시작일</label>
      <input class="form-input" type="date" id="proj-start"
             value="${getToday()}" />
    </div>

    <div class="form-section">
      <label class="form-label">마감일</label>
      <input class="form-input" type="date" id="proj-deadline"
             min="${getToday()}" oninput="onDeadlineInput()" />
    </div>

    <div class="form-section">
      <label class="form-label">납입 요일</label>
      <div class="day-selector" id="day-selector">
        <button class="day-btn everyday selected" data-day="all"
                onclick="toggleDay('all')">매일</button>
        ${['일','월','화','수','목','금','토'].map((d, i) => `
          <button class="day-btn" data-day="${i}"
                  onclick="toggleDay(${i})">${d}</button>
        `).join('')}
      </div>
      <div id="write-days-preview"
           style="font-family:var(--font-sans);font-size:var(--text-xs);
                  color:var(--c-muted);margin-top:var(--space-sm)">
        매일 납입
      </div>
    </div>

    <div id="deposit-preview"></div>

    <button class="submit-btn" onclick="submitNewProject()">
      적금 개설하기
    </button>
  `;
}

// ── 요일 토글 ─────────────────────────────────

function toggleDay(day) {
  if (day === 'all') {
    window._selectedDays = [];
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.day === 'all');
    });
  } else {
    const allBtn = document.querySelector('.day-btn.everyday');
    allBtn.classList.remove('selected');

    const idx = window._selectedDays.indexOf(Number(day));
    if (idx > -1) {
      window._selectedDays.splice(idx, 1);
    } else {
      window._selectedDays.push(Number(day));
    }

    window._selectedDays.sort((a, b) => a - b);

    document.querySelectorAll('.day-btn:not(.everyday)').forEach(btn => {
      btn.classList.toggle('selected',
        window._selectedDays.includes(Number(btn.dataset.day))
      );
    });

    if (window._selectedDays.length === 0) {
      allBtn.classList.add('selected');
    }
  }

  updateWriteDaysPreview();
  updateDepositPreview();
}

function updateWriteDaysPreview() {
  const el = document.getElementById('write-days-preview');
  if (!el) return;
  el.textContent = getWriteDaysLabel(window._selectedDays) + ' 납입';
}

// ── 글자 수 입력 ──────────────────────────────

function onCharsInput() {
  const input   = document.getElementById('proj-chars');
  const display = document.getElementById('category-display');
  if (!input || !display) return;

  const chars = Number(input.value);
  if (!chars || chars <= 0) {
    display.innerHTML = '';
    updateDepositPreview();
    return;
  }

  const pages = charsToPages(chars);
  const cat   = getCategory(chars);
  const cls   = getCatClass(cat.name);

  display.innerHTML = `
    <div class="category-result">
      <span class="category-result-name ${cls}">${cat.name}</span>
      <span class="category-result-detail">
        ${chars.toLocaleString()}자 · ${pages}매 · ${cat.desc}
      </span>
    </div>
  `;

  updateDepositPreview();
}

function onDeadlineInput() {
  updateDepositPreview();
}

function updateDepositPreview() {
  const chars    = Number(document.getElementById('proj-chars')?.value || 0);
  const deadline = document.getElementById('proj-deadline')?.value;
  const preview  = document.getElementById('deposit-preview');
  if (!preview) return;

  if (!chars || !deadline) {
    preview.innerHTML = '';
    return;
  }

  const writeDays = window._selectedDays || [];
  const daily     = calcDailyTarget(chars, 0, deadline, writeDays);
  const days      = countRemainingWritableDays(deadline, writeDays);
  const pages     = charsToPages(daily);

  preview.innerHTML = `
    <div class="deposit-preview">
      <div class="deposit-preview-row">
        <span>납입 가능 일수</span>
        <span>${days}일</span>
      </div>
      <div class="deposit-preview-row">
        <span>하루 납입 목표</span>
        <span><strong>${daily.toLocaleString()}자</strong></span>
      </div>
      <div class="deposit-preview-row">
        <span>원고지 환산</span>
        <span>${pages}매 / 일</span>
      </div>
    </div>
  `;
}

// ── 적금 개설 제출 ────────────────────────────

function submitNewProject() {
  const name     = document.getElementById('proj-name').value.trim();
  const chars    = Number(document.getElementById('proj-chars').value);
  const start    = document.getElementById('proj-start').value;
  const deadline = document.getElementById('proj-deadline').value;

  if (!name)            return alert('적금 이름을 입력해주세요.');
  if (!chars)           return alert('목표 글자 수를 입력해주세요.');
  if (!deadline)        return alert('마감일을 입력해주세요.');
  if (deadline < start) return alert('마감일이 시작일보다 앞입니다.');

  const cat       = getCategory(chars);
  const writeDays = window._selectedDays || [];

  createProject(name, cat.name, start, deadline, chars, writeDays);
  initDashboard();
}

// ── 적금 상세 ─────────────────────────────────

function openProjectDetail(projectId) {
  const project        = getProject(projectId);
  const written        = getProjectWrittenChars(projectId);
  const daily          = calcDailyTarget(
    project.target_chars, written, project.deadline, project.write_days
  );
  const daysLeft       = getDaysLeft(project.deadline);
  const progress       = calcProgress(written, project.target_chars);
  const catClass       = getCatClass(project.category);
  const writeDaysLabel = getWriteDaysLabel(project.write_days);
  const isDone         = project.deadline < getToday();

  const rangeEnd = isDone ? project.deadline : getToday();
  const allDates = dateRange(project.start_date, rangeEnd).reverse();

  const depositRows = allDates.map(dateStr => {
    const dayOfWeek  = new Date(dateStr + 'T00:00:00').getDay();
    const isWritable = !project.write_days || project.write_days.length === 0
      || project.write_days.includes(dayOfWeek);

    if (!isWritable) return '';

    const post = getPostByDateAndProject(dateStr, projectId);

    if (post) {
      const achieved = post.char_count >= daily;
      const locked   = !isEditable(post);
      return `
        <div class="deposit-row" onclick="openPostDetail('${post.id}')">
          <span class="deposit-row-date">${dateStr.slice(5)}</span>
          <span class="deposit-row-chars">${post.char_count.toLocaleString()}자</span>
          <span class="deposit-row-status ${achieved ? 'achieved' : 'missed'}">
            ${achieved ? '✓ 달성' : '✗ 미달'}
          </span>
        </div>
      `;
    } else if (dateStr < getToday()) {
      return `
        <div class="deposit-row">
          <span class="deposit-row-date">${dateStr.slice(5)}</span>
          <span class="deposit-row-chars" style="color:var(--c-muted)">—</span>
          <span class="deposit-row-status skipped">미납</span>
        </div>
      `;
    }
    return '';
  }).filter(Boolean).join('');

  const container = document.getElementById('screen-dashboard');
  container.innerHTML = `
    <div class="form-page-header">
      <button class="back-btn" onclick="initDashboard()">← 목록</button>
      ${!isDone
        ? `<button class="text-btn"
                   onclick="showEditProjectForm('${projectId}')">수정</button>`
        : ''
      }
    </div>

    <div class="project-hero">
      <div class="project-hero-category ${catClass}">${project.category}</div>
      <h2 class="project-hero-name">${escapeHtml(project.name)}</h2>
      <div class="project-hero-period">
        ${project.start_date} — ${project.deadline}
        · ${writeDaysLabel} 납입
        ${isDone ? '· 완료' : `· D-${daysLeft}`}
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-lg)">
      <div class="stat-cell">
        <div class="stat-cell-label">누적 납입</div>
        <div class="stat-cell-value">${written.toLocaleString()}자</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">달성률</div>
        <div class="stat-cell-value">${progress}%</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">하루 목표</div>
        <div class="stat-cell-value">${daily.toLocaleString()}자</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">
          ${isDone ? '최종 분량' : '잔여 분량'}
        </div>
        <div class="stat-cell-value">
          ${isDone
            ? `${charsToPages(written)}매`
            : `${Math.max(0, project.target_chars - written).toLocaleString()}자`
          }
        </div>
      </div>
    </div>

    <div class="progress-track" style="margin-bottom:var(--space-xl)">
      <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
           style="width:${progress}%"></div>
    </div>

    <div class="section-header">
      <span class="section-title">납입 내역</span>
    </div>

    <div class="deposit-list">
      ${depositRows || `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          아직 납입 내역이 없어요.
        </div>
      `}
    </div>
  `;
}

// ── 글 상세 보기 (납입 내역 클릭) ────────────

function openPostDetail(postId) {
  const post = JSON.parse(localStorage.getItem(`post_${postId}`));
  if (!post) {
    alert('글을 불러올 수 없어요.');
    return;
  }
  // 항상 읽기 전용으로 열기
  openPost(post, true);
}

// ── 적금 수정 폼 ──────────────────────────────

function showEditProjectForm(projectId) {
  const project   = getProject(projectId);
  const container = document.getElementById('screen-dashboard');

  window._selectedDays = project.write_days ? [...project.write_days] : [];

  container.innerHTML = `
    <div class="form-page-header">
      <button class="back-btn"
              onclick="openProjectDetail('${projectId}')">← 취소</button>
      <span class="form-page-title">적금 수정</span>
    </div>

    <div class="form-section">
      <label class="form-label">적금 이름</label>
      <input class="form-input" type="text" id="proj-name"
             value="${escapeHtml(project.name)}" />
    </div>

    <div class="form-section">
      <label class="form-label">목표 글자 수</label>
      <div class="char-input-wrap">
        <input class="form-input" type="number" id="proj-chars"
               value="${project.target_chars}" oninput="onCharsInput()" />
        <div class="char-pad">
          <button class="char-pad-btn"
                  onclick="appendZeros('proj-chars', 2, onCharsInput)">00</button>
          <button class="char-pad-btn"
                  onclick="appendZeros('proj-chars', 3, onCharsInput)">000</button>
          <button class="char-pad-btn"
                  onclick="appendZeros('proj-chars', 4, onCharsInput)">0000</button>
        </div>
        <div id="category-display"></div>
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">시작일</label>
      <input class="form-input" type="date" id="proj-start"
             value="${project.start_date}" />
    </div>

    <div class="form-section">
      <label class="form-label">마감일</label>
      <input class="form-input" type="date" id="proj-deadline"
             value="${project.deadline}" oninput="onDeadlineInput()" />
    </div>

    <div class="form-section">
      <label class="form-label">납입 요일</label>
      <div class="day-selector" id="day-selector">
        <button class="day-btn everyday
          ${window._selectedDays.length === 0 ? 'selected' : ''}"
          data-day="all" onclick="toggleDay('all')">매일</button>
        ${['일','월','화','수','목','금','토'].map((d, i) => `
          <button class="day-btn
            ${window._selectedDays.includes(i) ? 'selected' : ''}"
            data-day="${i}" onclick="toggleDay(${i})">${d}</button>
        `).join('')}
      </div>
      <div id="write-days-preview"
           style="font-family:var(--font-sans);font-size:var(--text-xs);
                  color:var(--c-muted);margin-top:var(--space-sm)">
        ${getWriteDaysLabel(window._selectedDays)} 납입
      </div>
    </div>

    <div id="deposit-preview"></div>

    <button class="submit-btn" onclick="submitEditProject('${projectId}')">
      저장하기
    </button>

    <button class="settings-btn danger"
            style="margin-top:var(--space-md);width:100%;text-align:center"
            onclick="confirmDeleteProject('${projectId}')">
      적금 삭제
    </button>
  `;

  onCharsInput();
  onDeadlineInput();
}

function submitEditProject(projectId) {
  const name     = document.getElementById('proj-name').value.trim();
  const chars    = Number(document.getElementById('proj-chars').value);
  const start    = document.getElementById('proj-start').value;
  const deadline = document.getElementById('proj-deadline').value;

  if (!name)     return alert('적금 이름을 입력해주세요.');
  if (!chars)    return alert('목표 글자 수를 입력해주세요.');
  if (!deadline) return alert('마감일을 입력해주세요.');

  const cat       = getCategory(chars);
  const writeDays = window._selectedDays || [];

  updateProject(projectId, {
    name,
    category:     cat.name,
    start_date:   start,
    deadline,
    target_chars: chars,
    write_days:   writeDays
  });

  openProjectDetail(projectId);
}

function confirmDeleteProject(projectId) {
  const project = getProject(projectId);
  if (!confirm(
    `"${project.name}" 적금을 삭제할까요?\n납입 내역은 삭제되지 않아요.`
  )) return;
  deleteProject(projectId);
  initDashboard();
}

function openPost(post, locked) {
  const existing = document.getElementById('post-modal');
  if (existing) existing.remove();

  const modal     = document.createElement('div');
  modal.id        = 'post-modal';
  modal.className = 'modal-overlay';

  const project   = getProject(post.project_id);
  const colorClass = project
    ? (CATEGORY_CLASS[project.category] || 'jogak')
    : 'jogak';

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>

      <div class="modal-header">
        <div>
          <div class="detail-date">
            ${formatDisplayDate(getDateStr(post.created_at))}
          </div>
          ${project ? `
            <div class="detail-project" style="margin-top:4px">
              <div class="detail-dot"
                   style="background:var(--c-cat-${colorClass})">
              </div>
              <span style="font-family:var(--font-sans);
                           font-size:var(--text-sm);
                           color:var(--c-text-2)">
                ${escapeHtml(project.name)}
              </span>
            </div>
          ` : ''}
        </div>
        <button class="modal-close" onclick="closePostModal()">✕</button>
      </div>

      <div style="font-family:var(--font-sans);font-size:var(--text-xs);
                  color:var(--c-muted);padding-bottom:var(--space-md);
                  border-bottom:1px solid var(--c-line)">
        ${post.char_count.toLocaleString()}자 · ${charsToPages(post.char_count)}매
      </div>

      <div style="padding:var(--space-md) 0">
        <div class="modal-post-body">
          ${escapeHtml(post.body).replace(/\n/g, '<br>')}
        </div>
      </div>

      <div class="modal-footer">
        <span class="modal-locked-msg">
          ${isEditable(post) ? '납입 메뉴에서 수정할 수 있어요.' : '수정할 수 없는 글이에요.'}
        </span>
      </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closePostModal();
  });

  document.addEventListener('keydown', handlePostModalEsc);
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closePostModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handlePostModalEsc);
  setTimeout(() => modal.remove(), 300);
}

function handlePostModalEsc(e) {
  if (e.key === 'Escape') closePostModal();
}
