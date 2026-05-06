function initStats() {
  const container = document.getElementById('screen-stats');
  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth();

  const monthly  = getMonthlyStats(year, month);
  const yearly   = getYearlyStats(year);
  const streak   = getStreak();
  const maxMonth = Math.max(...yearly, 1);
  const months   = ['1월','2월','3월','4월','5월','6월',
                    '7월','8월','9월','10월','11월','12월'];

  // 이번 달 히트맵
  const maxDay   = Math.max(...Object.values(monthly.byDate), 1);
  const heatCells = Array.from({ length: monthly.daysInMonth }, (_, i) => {
    const d       = String(i + 1).padStart(2, '0');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${d}`;
    const chars   = monthly.byDate[dateStr] || 0;
    const level   = !chars ? 0
      : Math.min(4, Math.ceil((chars / maxDay) * 4));
    return `<div class="heat-cell level-${level}"
                 title="${dateStr}: ${chars.toLocaleString()}자"></div>`;
  }).join('');

  // 월별 바 차트
  const barRows = yearly.map((chars, i) => {
    const pct = Math.round((chars / maxMonth) * 100);
    return `
      <div class="bar-row">
        <span class="bar-label">${months[i]}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="bar-value">
          ${chars ? chars.toLocaleString() : '—'}
        </span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="stats-section">
      <div class="stat-grid">
        <div class="stat-cell">
          <div class="stat-cell-label">이번 달 총계</div>
          <div class="stat-cell-value">
            ${monthly.totalChars.toLocaleString()}자
          </div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell-label">작성일</div>
          <div class="stat-cell-value">
            ${monthly.writtenDays}
            <span style="font-size:var(--text-sm);font-weight:300">
              / ${monthly.daysInMonth}일
            </span>
          </div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell-label">일 평균</div>
          <div class="stat-cell-value">
            ${monthly.avgChars.toLocaleString()}자
          </div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell-label">연속 납입</div>
          <div class="stat-cell-value">${streak}일</div>
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">이번 달 납입 현황</div>
      <div class="heat-grid">${heatCells}</div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">${year}년 월별 납입</div>
      <div class="bar-list">${barRows}</div>
    </div>
  `;
}
