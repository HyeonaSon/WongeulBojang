function startApp() {
  document.getElementById('screen-landing').hidden = true;
  document.getElementById('app').hidden = false;
  switchScreen('dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
  // 랜딩 표시, 앱 숨김 확인
  document.getElementById('screen-landing').hidden = false;
  document.getElementById('app').hidden = true;

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
});

async function switchScreen(name) {
  const screens = ['dashboard', 'editor', 'archive', 'stats', 'settings'];
  screens.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  if (name === 'dashboard') await initDashboard();
  if (name === 'editor')    initEditor();
  if (name === 'archive')   await initArchive();
  if (name === 'stats')     initStats();
  if (name === 'settings')  initSettings();
}
