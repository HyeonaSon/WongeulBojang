let currentProjectFilter = null;

async function renderPosts() {
  const container = await document.getElementById('posts-list');
  const projects  = await getAllProjects();

  container.innerHTML = `
    <div id="archive-filter">
      <button class="filter-btn ${currentProjectFilter === null ? 'active' : ''}"
              onclick="setPostFilter(null)">전체</button>
      ${projects.map(p => `
        <button class="filter-btn ${currentProjectFilter === p.id ? 'active' : ''}"
                onclick="setPostFilter(${p.id})">${escapeHtml(p.name)}</button>
      `).join('')}
    </div>
    <div id="post-card-list"></div>
  `;

  renderFilteredPosts();
}

function setPostFilter(projectId) {
  currentProjectFilter = projectId;
  renderPosts();
}

async function renderFilteredPosts() {
  const container = await document.getElementById('post-card-list');
  let posts = await getAllPosts();

  // 프로젝트 필터
  if (currentProjectFilter !== null) {
    posts = posts.filter(p => p.projectId === currentProjectFilter);
  }

  // 최신순 정렬
  posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!posts.length) {
    container.innerHTML = `<div class="empty-state">아직 작성한 글이 없어요.</div>`;
    return;
  }

  container.innerHTML = '';
  posts.forEach(post => {
    container.appendChild(renderPostCard(post));
  });
}

function renderPostCard(post) {
  const card      = document.createElement('div');
  const dateStr   = post.createdAt.slice(0, 10);
  const locked    = !isEditable(post);
  const charCount = getCharCountByDateAndProject(dateStr, post.projectId);
  const project   = getProject(post.projectId);

  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-card-header">
      <span class="post-date">${formatDisplayDate(dateStr)}</span>
      <span class="post-badge ${locked ? 'badge-locked' : 'badge-editable'}">
        ${locked ? '잠김' : '수정 가능'}
      </span>
    </div>
    ${project
      ? `<div class="post-project-tag">${escapeHtml(project.name)}</div>`
      : ''
    }
    <div class="post-preview">${escapeHtml(post.body)}</div>
    <div class="post-charcount">${charCount.toLocaleString()}자</div>
  `;

  card.addEventListener('click', () => openPost(post, locked));
  return card;
}

function openPost(post, locked) {
  const existing = document.getElementById('post-modal');
  if (existing) existing.remove();

  const dateStr   = post.createdAt.slice(0, 10);
  const charCount = getCharCountByDateAndProject(dateStr, post.projectId);
  const project   = getProject(post.projectId);
  const projects  = getAllProjects();

  const modal = document.createElement('div');
  modal.id = 'post-modal';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">

      <div class="modal-header">
        <div>
          <div class="post-date">${formatDisplayDate(dateStr)}</div>
          ${locked && project
            ? `<div class="post-project-tag">${escapeHtml(project.name)}</div>`
            : ''
          }
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      ${!locked ? `
        <div id="modal-project-wrap">
          <select id="modal-project-select">
            <option value="">프로젝트 선택</option>
            ${projects.filter(p => p.deadline >= getToday()).map(p => `
              <option value="${p.id}" ${post.projectId === p.id ? 'selected' : ''}>
                ${escapeHtml(p.name)}
              </option>
            `).join('')}
          </select>
        </div>
      ` : ''}

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
        <span class="modal-charcount">${charCount.toLocaleString()}자</span>
        ${locked
          ? `<span class="modal-locked-msg">수정할 수 없는 글이에요.</span>`
          : `<button class="modal-save-btn" onclick="saveFromModal(${post.id})">저장</button>`
        }
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  // textarea 자동 높이
  if (!locked) {
    const ta = document.getElementById('modal-body');
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  }

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', handleModalEsc);
  requestAnimationFrame(() => modal.classList.add('open'));
}

function saveFromModal(postId) {
  const body      = document.getElementById('modal-body')?.value.trim();
  const projectId = Number(document.getElementById('modal-project-select')?.value);

  if (!body)      return;
  if (!projectId) return;

  updatePost(postId, projectId, body);
  closeModal();
  renderFilteredPosts();
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
