async function initStats() {
  const now = new Date();
  const container = document.getElementById('screen-stats');
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  const year        = now.getFullYear();
  const month       = now.getMonth();
  const yearlyData  = await getYearlyStats(year);
  const monthlyData = await getMonthlyStats(year, month);
  const streak      = await getStreak();

  const maxMonthly = Math.max(...yearlyData, 1);
  const months     = ['1월','2월','3월','4월','5월','6월',
                      '7월','8월','9월','10월','11월','12월'];

  const monthBars = yearlyData.map((chars, i) => {
    const pct = Math.round((chars / maxMonthly) * 100);
    return `
      <div class="stat-bar-row">
        <span class="stat-bar-label">${months[i]}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="stat-bar-value">${chars ? chars.toLocaleString() : '—'}</span>
      </div>
    `;
  }).join('');

  // 이번 달 히트맵
  const daysInMonth = monthlyData.daysInMonth;
  const heatCells   = Array.from({ length: daysInMonth }, (_, i) => {
    const d       = String(i + 1).padStart(2, '0');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${d}`;
    const chars   = monthlyData.byDate[dateStr] || 0;
    const level   = !chars ? 0 : Math.min(4, Math.ceil((chars / Math.max(...Object.values(monthlyData.byDate), 1)) * 4));
    return `<div class="heat-cell level-${level}" title="${dateStr}: ${chars.toLocaleString()}자"></div>`;
  }).join('');

  container.innerHTML = `
    <div class="stats-header">통계</div>

    <div class="stat-grid">
      <div class="stat-cell">
        <div class="stat-label">이번 달 총계</div>
        <div class="stat-value">${monthlyData.totalChars.toLocaleString()}자</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">작성일</div>
        <div class="stat-value">${monthlyData.writtenDays}<span style="font-size:13px;font-weight:300"> / ${daysInMonth}일</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">일 평균</div>
        <div class="stat-value">${monthlyData.avgChars.toLocaleString()}자</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">연속 작성</div>
        <div class="stat-value">${streak}일</div>
      </div>
    </div>

    <div class="section-header">이번 달 납입 현황</div>
    <div class="heat-grid">${heatCells}</div>

    <div class="section-header" style="margin-top: var(--space-xl)">${year}년 월별 납입</div>
    <div class="stat-bar-list">${monthBars}</div>
  `;
}
