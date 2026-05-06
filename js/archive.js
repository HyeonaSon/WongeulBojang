/* ── 기록 (잔디) ── */

.archive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--s24);
}

.archive-month {
  font-family: var(--serif);
  font-size: var(--md);
  font-weight: 400;
}

.month-btn {
  font-family: var(--sans);
  font-size: var(--base);
  color: var(--muted);
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  transition: all 0.15s;
}

.month-btn:hover { color: var(--text); border-color: var(--text-2); }

/* 통계 */
.grass-stats {
  display: flex;
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
  margin-bottom: var(--s24);
}

.grass-stat {
  flex: 1;
  background: var(--surface);
  padding: var(--s16);
  text-align: center;
}

.grass-stat-value {
  font-family: var(--serif);
  font-size: var(--lg);
  font-weight: 400;
  color: var(--text);
  margin-bottom: 4px;
}

.grass-stat-label {
  font-family: var(--sans);
  font-size: var(--xs);
  color: var(--muted);
  letter-spacing: 0.04em;
}

/* 잔디 그리드 */
.grass-wrap {
  overflow-x: auto;
  margin-bottom: var(--s16);
  padding-bottom: var(--s8);
}

.grass-months {
  display: grid;
  grid-template-columns: repeat(53, 12px);
  gap: 2px;
  margin-bottom: 4px;
  margin-left: 20px;
}

.grass-months span {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
}

.grass-grid {
  display: grid;
  grid-template-columns: repeat(53, 12px);
  grid-template-rows: repeat(7, 12px);
  grid-auto-flow: column;
  gap: 2px;
  margin-left: 20px;
}

.grass-days {
  display: flex;
  flex-direction: column;
  position: absolute;
  gap: 2px;
  margin-top: -98px; /* 7 * 12px + 6 * 2px */
}

.grass-days span {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--muted);
  height: 12px;
  line-height: 12px;
}

.grass-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: var(--line);
}

.grass-cell.empty   { background: transparent; }
.grass-cell.level-future { background: var(--line); opacity: 0.4; }
.grass-cell.level-0 { background: var(--line); }
.grass-cell.level-1 { background: #C8DFD0; }
.grass-cell.level-2 { background: #8BBE9A; }
.grass-cell.level-3 { background: #4A9A6A; }
.grass-cell.level-4 { background: var(--accent); }

.grass-today {
  outline: 1.5px solid var(--accent-2);
  outline-offset: 1px;
}

/* 범례 */
.grass-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--s4);
  margin-top: var(--s8);
}
