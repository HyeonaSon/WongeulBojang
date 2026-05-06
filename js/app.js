document.addEventListener('DOMContentLoaded', () => {
  // Ctrl+S 단축키 — 딱 한 번만 등록
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const saveBtn = document.getElementById('save-btn');
      if (saveBtn) savePost();
    }
  });

  const lastScreen = localStorage.getItem('lastScreen') || 'dashboard';
  switchScreen(lastScreen);

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
});

function switchScreen(name) {
  const screens = ['dashboard', 'editor', 'archive', 'stats', 'settings'];
  if (!screens.includes(name)) name = 'dashboard';

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
