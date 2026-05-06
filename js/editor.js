function initEditor() {
  // 기존 이벤트 먼저 제거
  document.removeEventListener('click', handleDropdownOutsideClick);

  const projects = getActiveProjects();
  renderEditorUI(projects);
}

function renderEditorUI(projects) {
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

  const today = getToday();
  const defaultProject = projects.find(p =>
    getPostByDateAndProject(today, p.id) !== null
  ) || projects[0];

  screen.innerHTML = `
    <div class="editor-header">
      <div class="editor-date">${formatDisplayDate(getToday())}</div>
      <div class="editor-project-select">
        <div class="custom-select-wrap" id="custom-select-wrap">
          <button class="custom-select-trigger" id="custom-select-trigger"
                  onclick="toggleProjectDropdown()">
            <span id="selected-project-name">
              ${escapeHtml(defaultProject.name)}
            </span>
            <span class="custom-select-arrow" id="select-arrow">▾</span>
          </button>
          <div class="custom-select-dropdown" id="project-dropdown" hidden>
            ${projects.map(p => {
              const catClass   = getCatClass(p.category);
              const isSelected = p.id === defaultProject.id;
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

  // 한 번만 등록
  document.addEventListener('click', handleDropdownOutsideClick);

  renderEditorBody(defaultProject.id);
}
