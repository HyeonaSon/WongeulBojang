function initSettings() {
  const container  = document.getElementById('screen-settings');
  const posts      = getAllPosts();
  const projects   = getAllProjects();
  const totalChars = posts.reduce((s, p) => s + p.char_count, 0);

  container.innerHTML = `

    <div class="settings-section">
      <div class="about-logo">원글보장</div>
      <div class="about-tagline">글을 적금처럼 모으세요</div>
      <div class="about-feature-list">
        <div class="about-feature">
          <span class="about-feature-icon">✍️</span>
          <div>
            <div class="about-feature-title">하루 한 번 납입</div>
            <div class="about-feature-desc">
              하루가 지나면 수정·추가 불가. 그날의 글은 그날에만.
            </div>
          </div>
        </div>
        <div class="about-feature">
          <span class="about-feature-icon">📅</span>
          <div>
            <div class="about-feature-title">요일 납입 설정</div>
            <div class="about-feature-desc">
              매일 또는 원하는 요일만 납입할 수 있어요.
            </div>
          </div>
        </div>
        <div class="about-feature">
          <span class="about-feature-icon">🎯</span>
          <div>
            <div class="about-feature-title">자동 목표 계산</div>
            <div class="about-feature-desc">
              마감일까지 하루에 몇 자씩 써야 하는지 매일 알려줘요.
            </div>
          </div>
        </div>
        <div class="about-feature">
          <span class="about-feature-icon">📚</span>
          <div>
            <div class="about-feature-title">원고지 분류</div>
            <div class="about-feature-desc">
              엽편·단편·중편·경장편·장편 목표 분량에 맞게 자동 분류.
            </div>
          </div>
        </div>
        <div class="about-feature">
          <span class="about-feature-icon">📊</span>
          <div>
            <div class="about-feature-title">월별·연도별 통계</div>
            <div class="about-feature-desc">
              얼마나 꾸준히 납입했는지 한눈에 확인.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">데이터 현황</div>
      <div class="settings-info-card">
        <div class="settings-info-row">
          <span>적금</span>
          <span>${projects.length}개</span>
        </div>
        <div class="settings-info-row">
          <span>납입 내역</span>
          <span>${posts.length}건</span>
        </div>
        <div class="settings-info-row">
          <span>총 잔고</span>
          <span>${totalChars.toLocaleString()}자</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">백업 / 복원</div>
      <div class="settings-desc">
        데이터를 파일로 저장하거나 불러올 수 있어요.<br>
        다른 기기로 옮길 때 사용하세요.
      </div>
      <div class="settings-btn-group">
        <button class="settings-btn" onclick="exportData()">
          📥 백업 파일 내보내기
        </button>
        <button class="settings-btn" onclick="importData()">
          📤 백업 파일 불러오기
        </button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">데이터 초기화</div>
      <div class="settings-desc">
        모든 적금과 납입 내역이 삭제돼요. 되돌릴 수 없어요.
      </div>
      <button class="settings-btn danger" onclick="clearAllData()">
        🗑 전체 데이터 삭제
      </button>
    </div>

    <div class="settings-footer">© 2026 원글보장</div>
  `;
}
