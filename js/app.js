let authMode = 'login'; // 'login' | 'signup'

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  session ? showApp() : showLanding();

  supabase.auth.onAuthStateChange((event, session) => {
    session ? showApp() : showLanding();
  });

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });
});

function showLanding() {
  document.getElementById('screen-landing').hidden = false;
  document.getElementById('auth-modal').hidden     = true;
  document.getElementById('app').hidden            = true;
}

function showAuthModal() {
  document.getElementById('auth-modal').hidden = false;
}

function hideAuthModal() {
  document.getElementById('auth-modal').hidden = true;
  document.getElementById('auth-message').textContent = '';
}

function switchAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.textContent === (mode === 'login' ? '로그인' : '회원가입'));
  });
  document.getElementById('btn-auth-submit').textContent =
    mode === 'login' ? '로그인' : '회원가입';
  document.getElementById('auth-message').textContent = '';
}

async function handleAuthSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    setAuthMessage('이메일과 비밀번호를 입력해주세요.');
    return;
  }

  setAuthMessage('처리 중...');

  if (authMode === 'login') {
    const error = await signIn(email, password);
    if (error) setAuthMessage('이메일 또는 비밀번호를 확인해주세요.');
  } else {
    const error = await signUp(email, password);
    if (error) setAuthMessage(error.message);
    else setAuthMessage('가입 확인 이메일을 보냈어요. 확인 후 로그인해주세요.');
  }
}

async function showApp() {
  document.getElementById('screen-landing').hidden = true;
  document.getElementById('auth-modal').hidden     = true;
  document.getElementById('app').hidden            = false;
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

async function handleLogout() {
  await signOut();
}

function setAuthMessage(msg) {
  document.getElementById('auth-message').textContent = msg;
}
