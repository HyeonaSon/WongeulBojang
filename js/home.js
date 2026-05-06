function initHome() {
  const el       = document.getElementById('screen-home');
  const projects = getAllProjects();
  const done     = projects.filter(p => isProjectDone(p));
  const active   = projects.filter(p => !isProjectDone(p));

  active.sort((a, b) => {
    const pa = cardPriority(a);
    const pb = cardPriority(b);
    if (pa !== pb) return pa - pb;
    return a.deadline.localeCompare(b.deadline);
  });

  el.innerHTML = `
    <div class="home-header">
      <span class="brand">원글보장</span>
      <button class="text-btn" onclick="showSettings()">설정</button>
    </div>

    ${renderBalanceCard()}

    <div class="section-header">
      <span class="section-title">진행 중인 적금</span>
    </div>

    ${active.length
      ? active.map(p => renderSavingsCard(p, false)).join('')
      : `<div class="empty">
           <div class="empty-icon">🏦</div>
           진행 중인 적금이 없어요.
         </div>`
    }

    ${done.length ? `
      <div class="section-header" style="margin-top:var(--s32)">
        <span class="section-title">완료된 적금</span>
      </div>
      ${done.map(p => renderSavingsCard(p, true)).join('')}
    ` : ''}

    <button class="fab" onclick="showNewProject()">+ 새 적금 개설</button>
  `;
}

function cardPriority(p) {
  if (p.start_date > getToday()) return 3;
  const canWrite    = isWriteDay(p);
  const prevWritten = getPostsByProject(p.id)
    .filter(post => getDateStr(post.created_at) < getToday())
    .reduce((s, post) => s + post.char_count, 0);
  const daily      = calcDailyTarget(p.target_chars, prevWritten, p.deadline, p.write_days);
  const todayPost  = getPostByDateAndProject(getToday(), p.id);
  const todayChars = todayPost ? todayPost.char_count : 0;
  if (canWrite && todayChars < daily) return 0;
  if (canWrite && todayChars >= daily) return 1;
  return 2;
}

function renderBalanceCard() {
  const total  = getTotalChars();
  const streak = getStreak();
  return `
    <div class="balance-card">
      <div class="balance-label">총 잔고</div>
      <div class="balance-amount">
        ${total.toLocaleString()}<span>자</span>
      </div>
      <div class="balance-sub">
        ${charsToPages(total)}매
        <span class="streak-badge">🔥 ${streak}일 연속</span>
      </div>
    </div>
  `;
}

function renderSavingsCard(p, isDone) {
  const written     = getProjectWrittenChars(p.id);
  const prevWritten = getPostsByProject(p.id)
    .filter(post => getDateStr(post.created_at) < getToday())
    .reduce((s, post) => s + post.char_count, 0);
  const daily      = calcDailyTarget(p.target_chars, prevWritten, p.deadline, p.write_days);
  const progress   = calcProgress(written, p.target_chars);
  const daysLeft   = getDaysLeft(p.deadline);
  const catClass   = getCatClass(p.category);
  const label      = getWriteDaysLabel(p.write_days);
  const canWrite   = isWriteDay(p) && p.start_date <= getToday();
  const todayPost  = getPostByDateAndProject(getToday(), p.id);
  const todayChars = todayPost ? todayPost.char_count : 0;
  const todayDone  = todayChars >= daily;
  const achieved   = written >= p.target_chars;

  const ddayClass = isDone ? 'done'
    : daysLeft <= 7 ? 'urgent' : todayDone ? 'done' : '';

  const ddayText = isDone
    ? (achieved ? '목표 달성 🎉' : '만기 완료')
    : daysLeft === 0 ? 'D-0' : `D-${daysLeft}`;

  let todayText  = '';
  let todayClass = '';
  if (isDone) {
    todayText  = `${progress}% 달성 · ${written.toLocaleString()}자`;
    todayClass = 'done';
  } else if (p.start_date > getToday()) {
    todayText  = '납입 시작 전';
    todayClass = 'muted';
  } else if (!canWrite) {
    todayText  = '납입일 아님';
    todayClass = 'muted';
  } else if (todayDone) {
    todayText  = `${todayChars.toLocaleString()}자 완료 ✓`;
    todayClass = 'done';
  } else {
    todayText = todayChars > 0
      ? `${todayChars.toLocaleString()} / ${daily.toLocaleString()}자`
      : `${daily.toLocaleString()}자 납입 필요`;
  }

  return `
    <div class="savings-card ${isDone ? 'done' : ''}"
         onclick="showProjectDetail('${p.id}')">
      <div class="card-top">
        <div>
          <div class="card-name">${escapeHtml(p.name)}</div>
          <div class="card-meta">
            <span class="${catClass}">${p.category}</span>
            <span>·</span>
            <span>${label}</span>
          </div>
        </div>
        <div class="dday ${ddayClass}">${ddayText}</div>
      </div>

      <div class="progress">
        <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
             style="width:${progress}%"></div>
      </div>
      <div class="progress-label">
        <span>${written.toLocaleString()}자</span>
        <span>${progress}% · ${p.target_chars.toLocaleString()}자</span>
      </div>

      <div class="today-row">
        <span class="today-label">${isDone ? '최종' : '오늘'}</span>
        <span class="today-value ${todayClass}">${todayText}</span>
      </div>
    </div>
  `;
}

// ── 적금 개설 ─────────────────────────────────

function showNewProject() {
  window._days = [];
  const el = document.getElementById('screen-home');
  el.innerHTML = `
    <div class="form-header">
      <button class="back-btn" onclick="initHome()">← 취소</button>
      <span class="form-title">새 적금 개설</span>
    </div>

    <div class="form-section">
      <label class="form-label">이름</label>
      <input class="form-input" id="f-name" type="text"
             placeholder="예: 5월의 단편소설" />
    </div>

    <div class="form-section">
      <label class="form-label">목표 글자 수</label>
      <input class="form-input" id="f-chars" type="number"
             placeholder="0" oninput="onCharsChange()" />
      <div class="char-pad">
        <button class="char-pad-btn"
                onclick="appendZeros('f-chars',2,onCharsChange)">00</button>
        <button class="char-pad-btn"
                onclick="appendZeros('f-chars',3,onCharsChange)">000</button>
        <button class="char-pad-btn"
                onclick="appendZeros('f-chars',4,onCharsChange)">0000</button>
      </div>
      <div id="cat-box"></div>
    </div>

    <div class="form-section">
      <label class="form-label">시작일</label>
      <input class="form-input" id="f-start" type="date"
             value="${getToday()}" />
    </div>

    <div class="form-section">
      <label class="form-label">마감일</label>
      <input class="form-input" id="f-deadline" type="date"
             min="${getToday()}" oninput="onDeadlineChange()" />
    </div>

    <div class="form-section">
      <label class="form-label">납입 요일</label>
      <div class="day-selector">
        <button class="day-btn all on" data-d="all"
                onclick="toggleDay('all')">매일</button>
        ${DAY_NAMES.map((d, i) => `
          <button class="day-btn" data-d="${i}"
                  onclick="toggleDay(${i})">${d}</button>
        `).join('')}
      </div>
      <div id="days-label"
           style="font-family:var(--sans);font-size:var(--xs);
                  color:var(--muted);margin-top:var(--s8)">
        매일 납입
      </div>
    </div>

    <div id="preview-box"></div>

    <button class="submit-btn" onclick="submitProject()">개설하기</button>
  `;
}

function toggleDay(d) {
  if (d === 'all') {
    window._days = [];
    document.querySelectorAll('.day-btn').forEach(b => {
      b.classList.toggle('on', b.dataset.d === 'all');
    });
  } else {
    document.querySelector('.day-btn[data-d="all"]').classList.remove('on');
    const idx = window._days.indexOf(Number(d));
    if (idx > -1) window._days.splice(idx, 1);
    else window._days.push(Number(d));
    window._days.sort((a, b) => a - b);
    document.querySelectorAll('.day-btn:not(.all)').forEach(b => {
      b.classList.toggle('on', window._days.includes(Number(b.dataset.d)));
    });
    if (window._days.length === 0) {
      document.querySelector('.day-btn[data-d="all"]').classList.add('on');
    }
  }
  updateDaysLabel();
  updatePreview();
}

function updateDaysLabel() {
  const el = document.getElementById('days-label');
  if (el) el.textContent = getWriteDaysLabel(window._days) + ' 납입';
}

function onCharsChange() {
  const chars  = Number(document.getElementById('f-chars')?.value || 0);
  const catBox = document.getElementById('cat-box');
  if (!catBox) return;
  if (!chars) { catBox.innerHTML = ''; updatePreview(); return; }

  const pages = charsToPages(chars);
  const cat   = getCategory(chars);
  const cls   = getCatClass(cat.name);

  catBox.innerHTML = `
    <div class="category-box">
      <span class="category-name ${cls}">${cat.name}</span>
      <span class="category-desc">
        ${chars.toLocaleString()}자 · ${pages}매 · ${cat.desc}
      </span>
    </div>
  `;
  updatePreview();
}

function onDeadlineChange() { updatePreview(); }

function updatePreview() {
  const chars    = Number(document.getElementById('f-chars')?.value || 0);
  const deadline = document.getElementById('f-deadline')?.value;
  const box      = document.getElementById('preview-box');
  if (!box) return;
  if (!chars || !deadline) { box.innerHTML = ''; return; }

  const days  = countWritableDays(getToday(), deadline, window._days || []);
  const daily = Math.ceil(chars / days);

  box.innerHTML = `
    <div class="preview-box">
      <div class="preview-row">
        <span>납입 가능 일수</span><span>${days}일</span>
      </div>
      <div class="preview-row">
        <span>하루 목표</span>
        <span><strong>${daily.toLocaleString()}자</strong></span>
      </div>
      <div class="preview-row">
        <span>원고지 환산</span>
        <span>${charsToPages(daily)}매 / 일</span>
      </div>
    </div>
  `;
}

function submitProject() {
  const name     = document.getElementById('f-name').value.trim();
  const chars    = Number(document.getElementById('f-chars').value);
  const start    = document.getElementById('f-start').value;
  const deadline = document.getElementById('f-deadline').value;

  if (!name)            return alert('이름을 입력해주세요.');
  if (!chars)           return alert('목표 글자 수를 입력해주세요.');
  if (!deadline)        return alert('마감일을 입력해주세요.');
  if (deadline < start) return alert('마감일이 시작일보다 앞입니다.');

  const cat = getCategory(chars);
  createProject(name, cat.name, start, deadline, chars, window._days || []);
  initHome();
}

// ── 적금 상세 ─────────────────────────────────

function showProjectDetail(projectId) {
  const p           = getProject(projectId);
  const written     = getProjectWrittenChars(projectId);
  const prevWritten = getPostsByProject(projectId)
    .filter(post => getDateStr(post.created_at) < getToday())
    .reduce((s, post) => s + post.char_count, 0);
  const daily    = calcDailyTarget(p.target_chars, prevWritten, p.deadline, p.write_days);
  const progress = calcProgress(written, p.target_chars);
  const daysLeft = getDaysLeft(p.deadline);
  const catClass = getCatClass(p.category);
  const label    = getWriteDaysLabel(p.write_days);
  const isDone   = isProjectDone(p);

  const rangeEnd = isDone ? p.deadline : getToday();
  const rows = dateRange(p.start_date, rangeEnd)
    .reverse()
    .map(dateStr => {
      const dow      = new Date(dateStr + 'T00:00:00').getDay();
      const writable = !p.write_days || p.write_days.length === 0
        || p.write_days.includes(dow);
      if (!writable) return '';

      const post = getPostByDateAndProject(dateStr, p.id);
      if (post) {
        const ok = post.char_count >= daily;
        return `
          <div class="deposit-row"
               onclick="showPostModal('${post.id}')">
            <span class="deposit-date">${dateStr.slice(5)}</span>
            <span class="deposit-chars">${post.char_count.toLocaleString()}자</span>
            <span class="deposit-status ${ok ? 'ok' : 'miss'}">
              ${ok ? '✓ 달성' : '✗ 미달'}
            </span>
          </div>
        `;
      } else if (dateStr < getToday()) {
        return `
          <div class="deposit-row">
            <span class="deposit-date">${dateStr.slice(5)}</span>
            <span class="deposit-chars" style="color:var(--muted)">—</span>
            <span class="deposit-status skip">미납</span>
          </div>
        `;
      }
      return '';
    })
    .filter(Boolean)
    .join('');

  const el = document.getElementById('screen-home');
  el.innerHTML = `
    <div class="form-header">
      <button class="back-btn" onclick="initHome()">← 목록</button>
      ${!isDone
        ? `<button class="text-btn"
                   onclick="showEditProject('${projectId}')">수정</button>`
        : ''}
    </div>

    <div class="project-header">
      <div class="project-category ${catClass}">${p.category}</div>
      <div class="project-name">${escapeHtml(p.name)}</div>
      <div class="project-period">
        ${p.start_date} — ${p.deadline} · ${label}
        ${isDone ? ' · 완료' : ` · D-${daysLeft}`}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-cell">
        <div class="stat-label">납입 총계</div>
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
        <div class="stat-label">${isDone ? '최종 분량' : '잔여'}</div>
        <div class="stat-value">
          ${isDone
            ? `${charsToPages(written)}매`
            : `${Math.max(0, p.target_chars - written).toLocaleString()}자`}
        </div>
      </div>
    </div>

    <div class="progress" style="margin-bottom:var(--s32)">
      <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
           style="width:${progress}%"></div>
    </div>

    <div class="section-header">
      <span class="section-title">납입 내역</span>
    </div>

    ${rows || `<div class="empty">아직 납입 내역이 없어요.</div>`}
  `;
}

// ── 적금 수정 ─────────────────────────────────

function showEditProject(projectId) {
  const p = getProject(projectId);
  window._days = p.write_days ? [...p.write_days] : [];

  const el = document.getElementById('screen-home');
  el.innerHTML = `
    <div class="form-header">
      <button class="back-btn"
              onclick="showProjectDetail('${projectId}')">← 취소</button>
      <span class="form-title">적금 수정</span>
    </div>

    <div class="form-section">
      <label class="form-label">이름</label>
      <input class="form-input" id="f-name" type="text"
             value="${escapeHtml(p.name)}" />
    </div>

    <div class="form-section">
      <label class="form-label">목표 글자 수</label>
      <input class="form-input" id="f-chars" type="number"
             value="${p.target_chars}" oninput="onCharsChange()" />
      <div class="char-pad">
        <button class="char-pad-btn"
                onclick="appendZeros('f-chars',2,onCharsChange)">00</button>
        <button class="char-pad-btn"
                onclick="appendZeros('f-chars',3,onCharsChange)">000</button>
        <button class="char-pad-btn"
                onclick="appendZeros('f-chars',4,onCharsChange)">0000</button>
      </div>
      <div id="cat-box"></div>
    </div>

    <div class="form-section">
      <label class="form-label">시작일</label>
      <input class="form-input" id="f-start" type="date"
             value="${p.start_date}" />
    </div>

    <div class="form-section">
      <label class="form-label">마감일</label>
      <input class="form-input" id="f-deadline" type="date"
             value="${p.deadline}" oninput="onDeadlineChange()" />
    </div>

    <div class="form-section">
      <label class="form-label">납입 요일</label>
      <div class="day-selector">
        <button class="day-btn all ${window._days.length === 0 ? 'on' : ''}"
                data-d="all" onclick="toggleDay('all')">매일</button>
        ${DAY_NAMES.map((d, i) => `
          <button class="day-btn ${window._days.includes(i) ? 'on' : ''}"
                  data-d="${i}" onclick="toggleDay(${i})">${d}</button>
        `).join('')}
      </div>
      <div id="days-label"
           style="font-family:var(--sans);font-size:var(--xs);
                  color:var(--muted);margin-top:var(--s8)">
        ${getWriteDaysLabel(window._days)} 납입
      </div>
    </div>

    <div id="preview-box"></div>

    <button class="submit-btn"
            onclick="submitEditProject('${projectId}')">저장하기</button>
    <button class="danger-btn"
            style="display:block;width:100%;text-align:center;
                   margin-top:var(--s16);padding:var(--s12)"
            onclick="confirmDelete('${projectId}')">
      적금 삭제
    </button>
  `;

  onCharsChange();
  onDeadlineChange();
}

function submitEditProject(projectId) {
  const name     = document.getElementById('f-name').value.trim();
  const chars    = Number(document.getElementById('f-chars').value);
  const start    = document.getElementById('f-start').value;
  const deadline = document.getElementById('f-deadline').value;

  if (!name)     return alert('이름을 입력해주세요.');
  if (!chars)    return alert('목표 글자 수를 입력해주세요.');
  if (!deadline) return alert('마감일을 입력해주세요.');

  const cat = getCategory(chars);
  updateProject(projectId, {
    name, category: cat.name,
    start_date: start, deadline,
    target_chars: chars,
    write_days: window._days || []
  });
  showProjectDetail(projectId);
}

function confirmDelete(projectId) {
  const p = getProject(projectId);
  if (!confirm(`"${p.name}" 을 삭제할까요?\n글은 유지돼요.`)) return;
  deleteProject(projectId);
  initHome();
}

// ── 글 모달 ───────────────────────────────────

function showPostModal(postId) {
  const post = JSON.parse(localStorage.getItem(`post_${postId}`));
  if (!post) return;

  const project  = getProject(post.project_id);
  const colorVar = project
    ? `var(--${CATEGORY_CLASS[project.category]?.replace('cat-', '') || 'jogak'})`
    : 'var(--jogak)';
  const editable = isEditable(post);

  const modal = document.createElement('div');
  modal.id    = 'post-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.45);
    display:flex;align-items:flex-end;justify-content:center;
    z-index:200;opacity:0;transition:opacity 0.25s;
  `;

  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:var(--max-w);
                max-height:85vh;overflow-y:auto;
                border-radius:var(--r-lg) var(--r-lg) 0 0;
                padding:var(--s24);transform:translateY(100%);
                transition:transform 0.3s ease;">
      <div style="width:36px;height:4px;background:var(--line);
                  border-radius:2px;margin:0 auto var(--s16)"></div>

      <div style="display:flex;justify-content:space-between;
                  align-items:flex-start;padding-bottom:var(--s16);
                  border-bottom:1px solid var(--line);margin-bottom:var(--s16)">
        <div>
          <div style="font-family:var(--sans);font-size:var(--sm);
                      color:var(--muted);margin-bottom:4px">
            ${formatDate(getDateStr(post.created_at))}
          </div>
          ${project ? `
            <div style="display:flex;align-items:center;gap:6px;
                        font-family:var(--sans);font-size:var(--sm);
                        color:var(--text-2)">
              <div style="width:8px;height:8px;border-radius:50%;
                          background:${colorVar};flex-shrink:0"></div>
              <span>${escapeHtml(project.name)}</span>
            </div>
          ` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--serif);font-size:var(--lg);
                      color:var(--text)">
            ${post.char_count.toLocaleString()}자
          </div>
          ${editable ? `
            <div style="font-family:var(--sans);font-size:var(--xs);
                        color:var(--accent-2);margin-top:4px">수정 가능</div>
          ` : ''}
        </div>
      </div>

      <div style="font-family:var(--serif);font-size:var(--base);
                  line-height:var(--lh-body);color:var(--text);
                  white-space:pre-wrap;padding-bottom:var(--s24)">
        ${escapeHtml(post.body).replace(/\n/g, '<br>')}
      </div>

      <div style="display:flex;justify-content:space-between;
                  align-items:center;padding-top:var(--s16);
                  border-top:1px solid var(--line);
                  font-family:var(--sans);font-size:var(--sm);
                  color:var(--muted)">
        <span>
          ${editable ? '납입 메뉴에서 수정할 수 있어요.' : '수정할 수 없는 글이에요.'}
        </span>
        <button class="back-btn" onclick="closePostModal()">닫기</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const inner = modal.querySelector('div');
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    inner.style.transform = 'translateY(0)';
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) closePostModal();
  });
}

function closePostModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  modal.querySelector('div').style.transform = 'translateY(100%)';
  setTimeout(() => modal.remove(), 300);
}

// ── 설정 ──────────────────────────────────────

function showSettings() {
  const posts    = getAllPosts();
  const projects = getAllProjects();
  const total    = getTotalChars();

  const el = document.getElementById('screen-home');
  el.innerHTML = `
    <div class="form-header">
      <button class="back-btn" onclick="initHome()">← 돌아가기</button>
      <span class="form-title">설정</span>
    </div>

    <div style="margin-bottom:var(--s32)">
      <div class="brand" style="margin-bottom:var(--s8)">원글보장</div>
      <div style="font-family:var(--sans);font-size:var(--sm);
                  color:var(--muted)">
        글을 적금처럼 모으세요
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--line);
                border-radius:var(--r-md);padding:var(--s16);
                margin-bottom:var(--s24)">
      ${[
        ['적금', `${projects.length}개`],
        ['납입 내역', `${posts.length}건`],
        ['총 잔고', `${total.toLocaleString()}자`],
      ].map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;
                    font-family:var(--sans);font-size:var(--base);
                    color:var(--text-2);padding:var(--s8) 0;
                    border-bottom:1px solid var(--line)">
          <span>${k}</span><span>${v}</span>
        </div>
      `).join('')}
    </div>

    <button class="submit-btn" style="margin-bottom:var(--s12)"
            onclick="exportData()">
      📥 백업 파일 내보내기
    </button>

    <button class="submit-btn"
            style="background:var(--surface);color:var(--accent);
                   border:1.5px solid var(--accent);margin-bottom:var(--s32)"
            onclick="document.getElementById('import-input').click()">
      📤 백업 파일 불러오기
    </button>
    <input id="import-input" type="file" accept=".json" hidden
           onchange="handleImport(this)" />

    <button class="danger-btn"
            style="display:block;width:100%;text-align:center;
                   padding:var(--s12)"
            onclick="confirmClear()">
      전체 데이터 삭제
    </button>
  `;
}

function handleImport(input) {
  const file = input.files[0];
  if (!file) return;
  importData(file, () => {
    alert('불러오기 완료!');
    initHome();
  });
}

function confirmClear() {
  if (!confirm('모든 데이터를 삭제할까요?\n되돌릴 수 없어요.')) return;
  Object.keys(localStorage)
    .filter(k => k.startsWith('project_') || k.startsWith('post_'))
    .forEach(k => localStorage.removeItem(k));
  initHome();
}
