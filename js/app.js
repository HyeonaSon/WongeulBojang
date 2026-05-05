document.addEventListener('DOMContentLoaded', async () => {
  await switchScreen('dashboard');

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
