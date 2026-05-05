// ── 내보내기 ──────────────────────────────────

function exportData() {
  const data = {
    version:   '1.0',
    exportedAt: new Date().toISOString(),
    projects:  getAllProjects(),
    posts:     getAllPosts()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a    = document.createElement('a');
  a.href     = url;
  a.download = `원글보장_백업_${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 불러오기 ──────────────────────────────────

function importData() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';

  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.projects || !data.posts) {
        alert('올바른 백업 파일이 아니에요.');
        return;
      }

      const confirmed = confirm(
        `백업 파일을 불러오면 현재 데이터에 추가돼요.\n` +
        `프로젝트 ${data.projects.length}개, 글 ${data.posts.length}개\n\n` +
        `계속할까요?`
      );

      if (!confirmed) return;

      // 프로젝트 저장
      data.projects.forEach(p => {
        localStorage.setItem(`project_${p.id}`, JSON.stringify(p));
      });

      // 글 저장
      data.posts.forEach(p => {
        localStorage.setItem(`post_${p.id}`, JSON.stringify(p));
      });

      alert('불러오기 완료!');
      await switchScreen('dashboard');

    } catch (e) {
      alert('파일을 읽는 중 오류가 생겼어요.');
    }
  });

  input.click();
}

// ── 전체 데이터 초기화 ────────────────────────

function clearAllData() {
  const confirmed = confirm(
    '모든 데이터를 삭제할까요?\n이 작업은 되돌릴 수 없어요.'
  );
  if (!confirmed) return;

  const keys = Object.keys(localStorage).filter(k =>
    k.startsWith('project_') || k.startsWith('post_')
  );
  keys.forEach(k => localStorage.removeItem(k));
  switchScreen('dashboard');
}
