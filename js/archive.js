let archiveYear, archiveMonth;
let selectedDate = null;

async function initArchive() {
  const now = new Date();
  archiveYear  = now.getFullYear();
  archiveMonth = now.getMonth();
  selectedDate = null;
  await renderArchive();
}

async function renderArchive() {
  const container = document.getElementById('screen-archive');
  const { start, end } = getMonthRange(archiveYear, archiveMonth);

  const [posts, projects] = await Promise.all([
    getPostsByDateRange(start, end),
    getAllProjects()
  ]);

  // 날짜별 포스트 맵
  const postByDate = {};
  posts.forEach(p => { postByDate[getDateStr(p.created_at)] = p; });

  // 날짜별 하루 목표 달성 여부
  const doneByDate = {};
  await Promise.all(posts.map(async p => {
    const d       = getDateStr(p.created_at);
    const project = projects.find(pr => pr.id === p.project_id);
    if (!project) return;
    const written = await getProjectWrittenChars(project.id);
    const daily   = calcDailyTarget(project.target_chars, written, project.deadline);
    doneByDate[d] = p.char_count >= daily;
  }));

  const monthLabel = formatMonthLabel(start);
  const firstDay   = new Date(archiveYear, archiveMonth, 1).getDay();
  const lastDate   = new Date(archiveYear, archiveMonth + 1, 0).getDate();
  const dows       = ['일', '월', '화', '수', '목', '금', '토'];

  // 달력 셀
  let cells = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="cal-cell empty"></div>`;
  }

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${archiveYear}-${String(archiveMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const post    = postByDate[dateStr];
    const done    = doneByDate[dateStr];
    const isToday = dateStr === getToday();
    const isSelected = dateStr === selectedDate;
    const project = post ? projects.find(p => p.id === post.project_id) : null;

    // 카테고리 → 영문 변수명
    const dotColor = project
      ? `var(--c-cat-${CATEGORY_CLASS[project.category] || 'jogak'})`
      : 'var(--c-line)';

    cells += `
      <div class="cal-cell
        ${post ? 'has-post' : ''}
        ${isToday ? 'today' : ''}
        ${done ? 'done' : ''}
        ${isSelected ? 'selected' : ''}"
        onclick="selectDate('${dateStr}')">
        <span class="cal-date">${d}</span>
        <div class="cal-dot ${post ? '' : 'empty-dot'}"
             style="${post ? `background:${dotColor}` : ''}"></div>
        ${post ? `<div class="cal-chars">${post.char_count.toLocaleString()}</div>` : ''}
      </div>
    `;
  }

  // 프로젝트 기간 바
  const projectBars = projects
    .filter(p => p.start_date <= end && p.deadline >= start)
    .map(p => {
      const colorClass = CATEGORY_CLASS[p.category] || 'jogak';
      return `
        <div class="project-period-bar">
          <div class="period-color"
               style="background: var(--c-cat-${colorClass})"></div>
          <span class="period-name">${escapeHtml(p.name)}</span>
          <span class="period-range">${p.start_date} — ${p.deadline}</span>
        </div>
      `;
    }).join('');

  container.innerHTML = `
    <div class="archive-nav">
      <button onclick="moveArchive(-1)">←</button>
      <span>${monthLabel}</span>
      <button onclick="moveArchive(1)">→</button>
    </div>

    <div class="cal-grid">${cells}</div>

    ${projectBars ? `
      <div class="project-period-list">${projectBars}</div>
    ` : ''}

    <div id="archive-detail"></div>
  `;

  // 선택된 날짜가 있으면 상세 표시
  if (selectedDate && postByDate[selectedDate]) {
    renderDateDetail(postByDate[selectedDate], projects);
  }
}

async function selectDate(dateStr) {
  // 같은 날짜 다시 클릭하면 닫기
  if (selectedDate === dateStr) {
    selectedDate = null;
    await renderArchive();
    return;
  }

  selectedDate = dateStr;
  await renderArchive();
}

function renderDateDetail(post, projects) {
  const detail  = document.getElementById('archive-detail');
  if (!detail) return;

  const project = projects.find(p => p.id === post.project_id);
  const locked  = !isEditable(post);
  const dateStr = getDateStr(post.created_at);
  const colorClass = project ? (CATEGORY_CLASS[project.category] || 'jogak') : 'jogak';

  detail.innerHTML = `
    <div class="archive-detail-card">
      <div class="archive-detail-header">
        <div>
          <div class="archive-detail-date">${formatDisplayDate(dateStr)}</div>
          ${project ? `
            <div class="archive-detail-project">
              <div class="period-color"
                   style="background: var(--c-cat-${colorClass})"></div>
              <span>${escapeHtml(project.name)}</span>
              <span class="cat-${colorClass}">${project.category}</span>
            </div>
          ` : ''}
        </div>
        <div class="archive-detail-meta">
          <span class="archive-detail-chars">${post.char_count.toLocaleString()}자</span>
          <span class="post-badge ${locked ? 'badge-locked' : 'badge-editable'}">
            ${locked ? '잠김' : '수정 가능'}
          </span>
        </div>
      </div>

      <div class="archive-detail-body">
        ${locked
          ? `<div class="archive-detail-text">
               ${escapeHtml(post.body).replace(/\n/g, '<br>')}
             </div>`
          : `<textarea class="archive-detail-input" id="detail-body"
               spellcheck="false">${escapeHtml(post.body)}</textarea>`
        }
      </div>

      ${!locked ? `
        <div class="archive-detail-footer">
          <span id="detail-save-status"></span>
          <button class="modal-save-btn"
                  onclick="saveFromDetail('${post.id}', '${post.project_id}')">
            저장
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // textarea 자동 높이
  if (!locked) {
    const ta = document.getElementById('detail-body');
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }
  }

  // 스크롤
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveFromDetail(postId, projectId) {
  const body = document.getElementById('detail-body')?.value.trim();
  if (!body) return;

  document.getElementById('detail-save-status').textContent = '저장 중...';
  await updatePost(postId, projectId, body);
  document.getElementById('detail-save-status').textContent = '저장됨';
  setTimeout(() => {
    if (document.getElementById('detail-save-status')) {
      document.getElementById('detail-save-status').textContent = '';
    }
  }, 2000);
}

async function moveArchive(dir) {
  archiveMonth += dir;
  if (archiveMonth > 11) { archiveMonth = 0; archiveYear++; }
  if (archiveMonth < 0)  { archiveMonth = 11; archiveYear--; }
  selectedDate = null;
  await renderArchive();
}

// 기존 모달 방식 유지 (dashboard에서 호출)
function openPost(post, locked) {
  const existing = document.getElementById('post-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id    = 'post-modal';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="post-date">${formatDisplayDate(getDateStr(post.created_at))}</span>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body-wrap">
        ${locked
          ? `<div class="modal-post-body">
               ${escapeHtml(post.body).replace(/\n/g, '<br>')}
             </div>`
          : `<textarea class="modal-body-input" id="modal-body"
               spellcheck="false">${escapeHtml(post.body)}</textarea>`
        }
      </div>
      <div class="modal-footer">
        <span class="modal-charcount">${post.char_count.toLocaleString()}자</span>
        ${locked
          ? `<span class="modal-locked-msg">수정할 수 없는 글이에요.</span>`
          : `<button class="modal-save-btn"
                     onclick="saveFromModal('${post.id}', '${post.project_id}')">
               저장
             </button>`
        }
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (!locked) {
    const ta = document.getElementById('modal-body');
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }
  }

  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', handleModalEsc);
  requestAnimationFrame(() => modal.classList.add('open'));
}

async function saveFromModal(postId, projectId) {
  const body = document.getElementById('modal-body')?.value.trim();
  if (!body) return;
  await updatePost(postId, projectId, body);
  closeModal();
  await renderArchive();
}

function closeModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleModalEsc);
  setTimeout(() => modal.remove(), 200);
}

function handleModalEsc(e) {
  if (e.key === 'Escape') closeModal();
}
