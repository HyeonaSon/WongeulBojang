function showNewProjectForm() {
  const container = document.getElementById('screen-dashboard');
  container.innerHTML = `
    <div class="form-header">
      <button class="back-btn" onclick="initDashboard()">← 취소</button>
      <span>새 적금 만들기</span>
    </div>

    <div class="form-body">

      <div class="form-group">
        <label>프로젝트 이름</label>
        <input type="text" id="proj-name" placeholder="예: 5월의 단편" />
      </div>

      <div class="form-group">
        <label>목표 글자 수</label>
        <div class="char-input-row">
          <input type="number" id="proj-chars" placeholder="0"
                 oninput="onCharsInput()" />
        </div>
        <div class="char-pad">
          <button onclick="appendZeros('proj-chars', 2, onCharsInput)">00</button>
          <button onclick="appendZeros('proj-chars', 3, onCharsInput)">000</button>
          <button onclick="appendZeros('proj-chars', 4, onCharsInput)">0000</button>
        </div>
        <div id="category-display"></div>
      </div>

      <div class="form-group">
        <label>시작일</label>
        <input type="date" id="proj-start" value="${getToday()}" />
      </div>

      <div class="form-group">
        <label>마감일</label>
        <input type="date" id="proj-deadline" min="${getToday()}"
               oninput="onDeadlineInput()" />
      </div>

      <div id="daily-preview"></div>

      <button class="btn-primary" onclick="submitNewProject()">적금 개설하기</button>
    </div>
  `;
}

function onCharsInput() {
  const input   = document.getElementById('proj-chars');
  const display = document.getElementById('category-display');

  if (!input || !display) return;

  const chars = Number(input.value);

  if (!chars || chars <= 0) {
    display.innerHTML = '';
    updateDailyPreview();
    return;
  }

  const pages = charsToPages(chars);
  const cat   = getCategory(chars);

  display.innerHTML = `
    <div class="category-badge">
      <span class="category-name ${getCatClass(cat.name)}">${cat.name}</span>
      <span class="category-detail">${chars.toLocaleString()}자 · ${pages}매 · ${cat.desc}</span>
    </div>
  `;

  updateDailyPreview();
}

function onDeadlineInput() {
  updateDailyPreview();
}

function updateDailyPreview() {
  const chars    = Number(document.getElementById('proj-chars')?.value || 0);
  const deadline = document.getElementById('proj-deadline')?.value;
  const preview  = document.getElementById('daily-preview');

  if (!preview) return;

  if (!chars || !deadline) {
    preview.innerHTML = '';
    return;
  }

  const daily    = calcDailyTarget(chars, 0, deadline);
  const daysLeft = getDaysLeft(deadline);

  preview.innerHTML = `
    <div class="daily-preview-card">
      <div class="daily-preview-row">
        <span>납입 기간</span>
        <span>${daysLeft}일</span>
      </div>
      <div class="daily-preview-row">
        <span>하루 납입액</span>
        <span><strong>${daily.toLocaleString()}자</strong></span>
      </div>
      <div class="daily-preview-row">
        <span>원고지</span>
        <span>${charsToPages(daily)}매 / 일</span>
      </div>
    </div>
  `;
}

function submitNewProject() {
  const name     = document.getElementById('proj-name').value.trim();
  const chars    = Number(document.getElementById('proj-chars').value);
  const start    = document.getElementById('proj-start').value;
  const deadline = document.getElementById('proj-deadline').value;

  if (!name)     return alert('프로젝트 이름을 입력해주세요.');
  if (!chars)    return alert('목표 글자 수를 입력해주세요.');
  if (!deadline) return alert('마감일을 입력해주세요.');

  const cat = getCategory(chars);
  createProject(name, cat.name, start, deadline, chars);
  initDashboard();
}

function openProjectDetail(projectId) {
  const project = getProject(projectId);
  const written = getProjectWrittenChars(projectId);
  const daily   = calcDailyTarget(project.target_chars, written, project.deadline);
  const daysLeft = getDaysLeft(project.deadline);
  const progress = calcProgress(written, project.target_chars);
  const posts    = getPostsByProject(projectId);
  const catClass = getCatClass(project.category);

  const container = document.getElementById('screen-dashboard');
  container.innerHTML = `
    <div class="form-header">
      <button class="back-btn" onclick="initDashboard()">← 목록</button>
      <button class="text-btn" onclick="showEditProjectForm('${projectId}')">수정</button>
    </div>

    <div class="project-detail-hero">
      <div class="cat-badge ${catClass}">${project.category}</div>
      <h2 class="project-detail-name">${escapeHtml(project.name)}</h2>
      <div class="project-meta-row">
        ${project.start_date} — ${project.deadline} · D-${daysLeft}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-cell">
        <div class="stat-label">누적 납입</div>
        <div class="stat-value">${written.toLocaleString()}자</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">달성률</div>
        <div class="stat-value">${progress}%</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">하루 목표</div>
        <div class="stat-value">${daily.toLocaleString()}자</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">남은 분량</div>
        <div class="stat-value">${Math.max(0, project.target_chars - written).toLocaleString()}자</div>
      </div>
    </div>

    <div class="progress-bar large">
      <div class="progress-fill" style="width:${progress}%"></div>
    </div>

    <div class="section-header" style="margin-top: var(--space-xl)">
      <span>납입 내역</span>
    </div>

    <div class="post-list">
      ${posts.length
        ? posts.map(p => `
          <div class="post-row" onclick="openPost('${p.id}', ${!isEditable(p)})">
            <span class="post-row-date">${getDateStr(p.created_at)}</span>
            <span class="post-row-chars">${p.char_count.toLocaleString()}자</span>
            ${isEditable(p) ? '<span class="badge-editable">수정 가능</span>' : ''}
          </div>`).join('')
        : '<div class="empty-state">아직 납입 내역이 없어요.</div>'
      }
    </div>
  `;
}

function showEditProjectForm(projectId) {
  const project  = getProject(projectId);
  const container = document.getElementById('screen-dashboard');

  container.innerHTML = `
    <div class="form-header">
      <button class="back-btn" onclick="openProjectDetail('${projectId}')">← 취소</button>
      <span>프로젝트 수정</span>
    </div>

    <div class="form-body">

      <div class="form-group">
        <label>프로젝트 이름</label>
        <input type="text" id="proj-name" value="${escapeHtml(project.name)}" />
      </div>

      <div class="form-group">
        <label>목표 글자 수</label>
        <input type="number" id="proj-chars" value="${project.target_chars}"
               oninput="onCharsInput()" />
        <div class="char-pad">
          <button onclick="appendZeros('proj-chars', 2, onCharsInput)">00</button>
          <button onclick="appendZeros('proj-chars', 3, onCharsInput)">000</button>
          <button onclick="appendZeros('proj-chars', 4, onCharsInput)">0000</button>
        </div>
        <div id="category-display"></div>
      </div>

      <div class="form-group">
        <label>시작일</label>
        <input type="date" id="proj-start" value="${project.start_date}" />
      </div>

      <div class="form-group">
        <label>마감일</label>
        <input type="date" id="proj-deadline" value="${project.deadline}"
               oninput="onDeadlineInput()" />
      </div>

      <div id="daily-preview"></div>

      <button class="btn-primary" onclick="submitEditProject('${projectId}')">저장하기</button>
      <button class="settings-btn danger-btn"
              onclick="confirmDeleteProject('${projectId}')">
        프로젝트 삭제
      </button>
    </div>
  `;

  // 현재 값으로 카테고리 미리 표시
  onCharsInput();
  onDeadlineInput();
}

function submitEditProject(projectId) {
  const name     = document.getElementById('proj-name').value.trim();
  const chars    = Number(document.getElementById('proj-chars').value);
  const start    = document.getElementById('proj-start').value;
  const deadline = document.getElementById('proj-deadline').value;

  if (!name)     return alert('프로젝트 이름을 입력해주세요.');
  if (!chars)    return alert('목표 글자 수를 입력해주세요.');
  if (!deadline) return alert('마감일을 입력해주세요.');

  const cat = getCategory(chars);
  updateProject(projectId, {
    name,
    category:     cat.name,
    start_date:   start,
    deadline,
    target_chars: chars
  });
  openProjectDetail(projectId);
}

function confirmDeleteProject(projectId) {
  const project = getProject(projectId);
  const confirmed = confirm(
    `"${project.name}" 프로젝트를 삭제할까요?\n글은 삭제되지 않아요.`
  );
  if (!confirmed) return;
  deleteProject(projectId);
  initDashboard();
}
