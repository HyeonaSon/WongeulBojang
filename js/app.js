document.addEventListener('DOMContentLoaded', () => {
  switchScreen('editor');

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchScreen(btn.dataset.screen);
    });
  });
});

function switchScreen(name) {
  const screens = ['editor', 'posts', 'goal'];

  screens.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  // 화면 진입 시 초기화
  if (name === 'editor') initEditor();
  if (name === 'posts') renderPosts();
  if (name === 'goal') initGoal();
}

