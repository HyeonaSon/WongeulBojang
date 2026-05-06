// 화면 전환 — 이벤트 중복 방지를 위해 각 화면 init 에서 직접 관리
const SCREENS = ['home', 'editor', 'archive'];

// 기존 DOMContentLoaded 안에 추가
document.addEventListener('DOMContentLoaded', () => {

  // 서비스 워커 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  const last = localStorage.getItem('lastScreen') || 'home';
  go(last);

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.screen));
  });
});

function go(name) {
  if (!SCREENS.includes(name)) name = 'home';

  SCREENS.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  localStorage.setItem('lastScreen', name);

  if (name === 'home')    initHome();
  if (name === 'editor')  initEditor();
  if (name === 'archive') initArchive();
}
