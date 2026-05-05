let archiveYear, archiveMonth;

async function initArchive() {
  const now = new Date();
  archiveYear  = now.getFullYear();
  archiveMonth = now.getMonth();
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
    const dateStr  = `${archiveYear}-${String(archiveMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const post     = postByDate[dateStr];
    const done     = doneByDate[dateStr];
    const isToday  = dateStr === getToday();
    const project  = post ? projects.find(p => p.id === post.project_id) : null;

    cells += `
      <div class="cal-cell ${post ? 'has-post' : ''} ${isToday ? 'today' : ''} ${done ? 'done' : ''}"
           onclick="${post ? `openArchivePost('${post.id}')` : ''}">
        <span class="cal-date">${d}</span>
        ${post ? `
          <div class="cal-dot" style="background: var(--c-cat-${project?.category || '조각글'})"></div>
          <div class="cal-chars">${post.char_count.toLocaleString()}</div>
        ` : '<div class="cal-dot empty-dot"></div>'}
      </div>
    `;
  }

  // 프로젝트 기간 바
  const projectBars = projects
    .filter(p => p.start_date <= end && p.deadline >= start)
    .map(p => `
      <div class="project-period-bar">
        <div class="period-color" style="background: var(--c-cat-${p.category})"></div>
        <span class="period-name">${escapeHtml(p.name)}</span>
        <span class="period-range">${p.start_date} — ${p.deadline}</span>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="archive-nav">
      <button onclick="moveArchive(-1)">←</button>
      <span>${monthLabel}</span>
      <button onclick="moveArchive(1)">→</button>
    </div>

    <div class="cal-grid">${cells}</div>

    ${projectBars ? `
      <div class="project-period-list">
        ${projectBars}
      </div>
    ` : ''}

    <div id="archive-post-detail"></div>
  `;
}

async function moveArchive(dir) {
  archiveMonth += dir;
  if (archiveMonth > 11) { archiveMonth = 0; archiveYear++; }
  if (archiveMonth < 0)  { archiveMonth = 11; archiveYear--; }
  await renderArchive();
}

async function openArchivePost(postId) {
  const { data: post } = await supabase
    .from('posts').select('*').eq('id', postId).single();
  if (!post) return;
  openPost(post, !isEditable(post));
}

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
          : `<button class="modal-save-btn" onclick="saveFromModal('${post.id}', '${post.project_id}')">저장</button>`
        }
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (!locked) {
    const ta = document.getElementById('modal-body');
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
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
