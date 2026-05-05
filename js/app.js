document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  session ? showApp() : showAuth();

  supabase.auth.onAuthStateChange((event, session) => {
    session ? showApp() : showAuth();
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
});

function showAuth() {
  document.getElementById('screen-auth').hidden = false;
  document.getElementById('app').hidden = true;
}

async function showApp() {
  document.getElementById('screen-auth').hidden = true;
  document.getElementById('app').hidden = false;
  await switchScreen('dashboard');
}

async function switchScreen(name) {
  const screens = ['dashboard', 'editor', 'archive', 'stats'];

  screens.forEach(s => {
    document.getElementById(`screen-${s}`).hidden = (s !== name);
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  if (name === 'dashboard') await initDashboard();
  if (name === 'editor')    await initEditor();
  if (name === 'archive')   await initArchive();
  if (name === 'stats')     await initStats();
}

async function handleLogin() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  setAuthMessage('');
  const error = await signIn(email, password);
  if (error) setAuthMessage('이메일 또는 비밀번호를 확인해주세요.');
}

async function handleSignup() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  setAuthMessage('');
  const error = await signUp(email, password);
  if (error) setAuthMessage(error.message);
  else setAuthMessage('가입 확인 이메일을 보냈어요. 확인 후 로그인해주세요.');
}

async function handleLogout() {
  await signOut();
}

function setAuthMessage(msg) {
  document.getElementById('auth-message').textContent = msg;
}
