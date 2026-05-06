function switchScreen(name) {
  const screens = ['dashboard', 'editor', 'archive', 'stats', 'settings'];
  if (!screens.includes(name)) name = 'dashboard';

  // 다른 화면으로 갈 때 드롭다운 이벤트 제거
  if (name !== 'editor') {
    document.removeEventListener('click', handleDropdownOutsideClick);
  }

  screens.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  localStorage.setItem('lastScreen', name);

  if (name === 'dashboard') initDashboard();
  if (name === 'editor')    initEditor();
  if (name === 'archive')   initArchive();
  if (name === 'stats')     initStats();
  if (name === 'settings')  initSettings();
}
