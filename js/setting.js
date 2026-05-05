function initSettings() {
  const container = document.getElementById('screen-settings');
  const posts     = getAllPosts();
  const projects  = getAllProjects();
  const totalChars = posts.reduce((s, p) => s + p.char_count, 0);

  container.innerHTML = `
    <div class="settings-header">설정</div>

    <div class="settings-section">
      <div class="settings-label">데이터 현황</div>
      <div class="settings-info">
        <div class="settings-info-row">
          <span>프로젝트</span>
          <span>${projects.length}개</span>
        </div>
        <div class="settings-info-row">
          <span>글</span>
          <span>${posts.length}개</span>
        </div>
        <div class="settings-info-row">
          <span>총 글자 수</span>
          <span>${totalChars.toLocaleString()}자</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-label">백업 / 복원</div>
      <div class="settings-desc">
        데이터를 JSON 파일로 저장하거나 불러올 수 있어요.<br>
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
      <div class="settings-label danger-label">데이터 초기화</div>
      <div class="settings-desc">
        모든 프로젝트와 글이 삭제돼요. 되돌릴 수 없어요.
      </div>
      <button class="settings-btn danger-btn" onclick="clearAllData()">
        🗑 전체 데이터 삭제
      </button>
    </div>
  `;
}
