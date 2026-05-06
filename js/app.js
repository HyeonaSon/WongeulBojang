document.addEventListener('DOMContentLoaded', () => {
  // 마지막으로 보던 화면 기억
  const lastScreen = localStorage.getItem('lastScreen') || 'dashboard';
  switchScreen(lastScreen);

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
});

function switchScreen(name) {
  const screens = ['dashboard', 'editor', 'archive', 'stats', 'settings'];

  // 유효한 화면인지 확인
  if (!screens.includes(name)) name = 'dashboard';

  screens.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  // 현재 화면 저장
  localStorage.setItem('lastScreen', name);

  if (name === 'dashboard') initDashboard();
  if (name === 'editor')    initEditor();
  if (name === 'archive')   initArchive();
  if (name === 'stats')     initStats();
  if (name === 'settings')  initSettings();
}
