async function initDashboard() {
  const container = document.getElementById('screen-dashboard');
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  const [projects, streak] = await Promise.all([
    getAllProjects(),
    getStreak()
  ]);

  // 프로젝트별 작성 글자 수 병렬 조회
  const writtenList = await Promise.all(
    projects.map(p => getProjectWrittenChars(p.id))
  );

  const totalChars = writtenList.reduce((a, b) => a + b, 0);
  const activeProjects = projects.filter(p => p.deadline >= getToday());

  const projectCards = await Promise.all(
    activeProjects.map(async (p, i) => {
      const idx     = projects.indexOf(p);
      const written = writtenList[idx];
      const daily   = calcDailyTarget(p.target_chars, written, p.deadline);
      const daysLeft = getDaysLeft(p.deadline);
      const progress = calcProgress(written, p.target_chars);

      // 오늘 이 프로젝트에 쓴 글
      const todayPost = await getPostByDateAndProject(getToday(), p.id);
      const todayChars = todayPost ? todayPost.char_count : 0;
      const todayDone  = todayChars >= daily;

      return `
        <div class="project-card" onclick="openProjectDetail('${p.id}')">
          <div class="project-card-top">
            <div>
              <div class="project-card-name">${escapeHtml(p.name)}</div>
              <div class="project-card-category getCatClass(p.category)">${getCatClass(p.category)}</div>
            </div>
            <div class="project-card-dday ${daysLeft <= 7 ? 'urgent' : ''}">
              D-${daysLeft}
            </div>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="progress-label">
            <span>${written.toLocaleString()}자</span>
            <span>${progress}% · ${p.target_chars.toLocaleString()}자 목표</span>
          </div>

          <div class="daily-row ${todayDone ? 'done' : ''}">
            <span class="daily-label">오늘 납입</span>
            <span class="daily-value">
              ${todayChars.toLocaleString()}자
              ${todayDone ? '✓' : `/ 목표 ${daily.toLocaleString()}자`}
            </span>
          </div>
        </div>
      `;
    })
  );

  container.innerHTML = `
    <div class="dashboard-header">
      <span class="brand">원글보장</span>
      <button class="icon-btn" onclick="handleLogout()">로그아웃</button>
    </div>

    <div class="total-card">
      <div class="total-label">총 누적 잔고</div>
      <div class="total-value">${totalChars.toLocaleString()}<span>자</span></div>
      <div class="total-sub">${charsToPages(totalChars)}매 · 연속 ${streak}일</div>
    </div>

    <div class="section-header">
      <span>진행 중인 적금</span>
      <button class="text-btn" onclick="switchScreen('stats')">전체 보기</button>
    </div>

    <div class="project-list">
      ${projectCards.length
        ? projectCards.join('')
        : `<div class="empty-state">진행 중인 프로젝트가 없어요.<br>새 적금을 만들어보세요.</div>`
      }
    </div>

    <button class="fab" onclick="showNewProjectForm()">+ 새 적금 만들기</button>
  `;
}
