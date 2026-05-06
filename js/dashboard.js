// ── 완료 판단 ─────────────────────────────────

function isProjectDone(p) {
  if (p.deadline < getToday()) return true;
  const written = getProjectWrittenChars(p.id);
  return written >= p.target_chars;
}

// ── 대시보드 ──────────────────────────────────

function initDashboard() {
  const container  = document.getElementById('screen-dashboard');
  const projects   = getAllProjects();
  const streak     = getStreak();
  const totalChars = projects.reduce((s, p) =>
    s + getProjectWrittenChars(p.id), 0
  );

  const activeProjects = projects.filter(p => !isProjectDone(p));
  const doneProjects   = projects.filter(p => isProjectDone(p));

  // ── 진행 중 정렬 ──────────────────────────
  // 0: 오늘 납입 필요 (미납)
  // 1: 오늘 납입 완료
  // 2: 오늘 납입일 아님
  // 3: 납입 시작 전

  function getCardPriority(p) {
    if (p.start_date > getToday()) return 3;

    const canWrite   = isWriteDay(p);
    const written    = getProjectWrittenChars(p.id);
    const daily      = calcDailyTarget(
      p.target_chars, written, p.deadline, p.write_days
    );
    const todayPost  = getPostByDateAndProject(getToday(), p.id);
    const todayChars = todayPost ? todayPost.char_count : 0;
    const todayDone  = todayChars >= daily;

    if (canWrite && !todayDone) return 0;
    if (canWrite && todayDone)  return 1;
    return 2;
  }

  const sortedActive = [...activeProjects].sort((a, b) => {
    const pa = getCardPriority(a);
    const pb = getCardPriority(b);
    if (pa !== pb) return pa - pb;
    return a.deadline.localeCompare(b.deadline);
  });

  const sortedDone = [...doneProjects].sort((a, b) =>
    b.deadline.localeCompare(a.deadline)
  );

  // ── 카드 렌더링 ───────────────────────────

  function renderCard(p, isDone) {
    const written        = getProjectWrittenChars(p.id);
    const daily          = calcDailyTarget(
      p.target_chars, written, p.deadline, p.write_days
    );
    const daysLeft       = getDaysLeft(p.deadline);
    const progress       = calcProgress(written, p.target_chars);
    const catClass       = getCatClass(p.category);
    const writeDaysLabel = getWriteDaysLabel(p.write_days);
    const canWrite       = isWriteDay(p) && p.start_date <= getToday();
    const todayPost      = getPostByDateAndProject(getToday(), p.id);
    const todayChars     = todayPost ? todayPost.char_count : 0;
    const todayDone      = todayChars >= daily;
    const achieved       = written >= p.target_chars;

    const ddayClass = isDone     ? 'done'
      : daysLeft <= 7            ? 'urgent'
      : todayDone                ? 'done'
      : '';

    const ddayText = isDone
      ? (achieved ? '목표 달성 🎉' : '만기 완료')
      : daysLeft === 0 ? '만기' : `D-${daysLeft}`;

    let depositStatus = '';
    if (isDone) {
      depositStatus = `
        <span class="today-deposit-value done">
          ${progress}% 달성 · ${written.toLocaleString()}자
        </span>`;
    } else if (p.start_date > getToday()) {
      depositStatus = `
        <span class="today-deposit-value not-today">납입 시작 전</span>`;
    } else if (!canWrite) {
      depositStatus = `
        <span class="today-deposit-value not-today">납입일 아님</span>`;
    } else if (todayDone) {
      depositStatus = `
        <span class="today-deposit-value done">
          ${todayChars.toLocaleString()}자 납입 완료 ✓
        </span>`;
    } else {
      depositStatus = `
        <span class="today-deposit-value">
          ${todayChars > 0
            ? `${todayChars.toLocaleString()}자 / 목표 ${daily.toLocaleString()}자`
            : `${daily.toLocaleString()}자 납입 필요`
          }
        </span>`;
    }

    return `
      <div class="savings-card ${isDone ? 'savings-card-done' : ''}"
           onclick="openProjectDetail('${p.id}')">
        <div class="savings-card-top">
          <div class="savings-card-info">
            <div class="savings-card-name">${escapeHtml(p.name)}</div>
            <div class="savings-card-meta">
              <span class="${catClass}">${p.category}</span>
              <span>·</span>
              <span>${writeDaysLabel}</span>
            </div>
          </div>
          <div class="savings-card-dday ${ddayClass}">${ddayText}</div>
        </div>

        <div class="progress-track">
          <div class="progress-fill ${progress >= 100 ? 'complete' : ''}"
               style="width:${progress}%"></div>
        </div>
        <div class="progress-label">
          <span>${written.toLocaleString()}자</span>
          <span>${progress}% · 목표 ${p.target_chars.toLocaleString()}자</span>
        </div>

        <div class="today-deposit">
          <span class="today-deposit-label">
            ${isDone ? '최종 결과' : '오늘 납입'}
          </span>
          ${depositStatus}
        </div>
      </div>
    `;
  }

  const activeCards = sortedActive.map(p => renderCard(p, false)).join('');
  const doneCards   = sortedDone.map(p => renderCard(p, true)).join('');

  container.innerHTML = `
    <div class="dashboard-header">
      <span class="brand">원글보장</span>
      <button class="header-btn" onclick="switchScreen('settings')">설정</button>
    </div>

    <div class="balance-card">
      <div class="balance-label">총 잔고</div>
      <div class="balance-amount">
        ${totalChars.toLocaleString()}<span>자</span>
      </div>
      <div class="balance-sub">
        ${charsToPages(totalChars)}매
        <span class="balance-streak">🔥 ${streak}일 연속</span>
      </div>
    </div>

    <div class="section-header">
      <span class="section-title">진행 중인 적금</span>
      <button class="section-action" onclick="switchScreen('stats')">
        전체 보기
      </button>
    </div>

    ${activeCards || `
      <div class="empty-state">
        <div class="empty-state-icon">🏦</div>
        진행 중인 적금이 없어요.<br>새 적금을 개설해보세요.
      </div>
    `}

    ${doneCards ? `
      <div class="section-header" style="margin-top:var(--space-xl)">
        <span class="section-title">완료된 적금</span>
      </div>
      ${doneCards}
    ` : ''}

    <button class="fab" onclick="showNewProjectForm()">
      + 새 적금 개설하기
    </button>
  `;
}
