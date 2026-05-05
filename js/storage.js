// Supabase 클라이언트 초기화
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 날짜 유틸 ─────────────────────────────────

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDateStr(isoString) {
  return isoString.slice(0, 10);
}

// ── 인증 ──────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  return error;
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

async function signOut() {
  await supabase.auth.signOut();
}

// ── 프로젝트 ──────────────────────────────────

async function getAllProjects() {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('created_at');
  return data || [];
}

async function getProject(id) {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

async function createProject(name, deadline, targetChars = null) {
  const user = await getCurrentUser();
  const { data } = await supabase.from('projects').insert({
    user_id: user.id,
    name,
    start_date: getToday(),
    deadline,
    target_chars: targetChars
  }).select().single();
  return data;
}

async function updateProject(id, fields) {
  await supabase.from('projects').update(fields).eq('id', id);
}

async function deleteProject(id) {
  await supabase.from('projects').delete().eq('id', id);
}

// ── 글 ────────────────────────────────────────

async function getAllPosts() {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

async function getPostByDate(dateStr) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', dateStr + 'T00:00:00')
    .lte('created_at', dateStr + 'T23:59:59')
    .maybeSingle();
  return data;
}

async function getPostByDateAndProject(dateStr, projectId) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('project_id', projectId)
    .gte('created_at', dateStr + 'T00:00:00')
    .lte('created_at', dateStr + 'T23:59:59')
    .maybeSingle();
  return data;
}

async function createPost(projectId, body) {
  const user = await getCurrentUser();
  const { data } = await supabase.from('posts').insert({
    user_id: user.id,
    project_id: projectId,
    body
  }).select().single();
  return data;
}

async function updatePost(id, projectId, newBody) {
  const post = await supabase
    .from('posts').select('*').eq('id', id).single();

  // 오늘 글인지 확인
  if (getDateStr(post.data.created_at) !== getToday()) return false;

  await supabase.from('posts').update({
    project_id: projectId,
    body: newBody,
    updated_at: new Date().toISOString()
  }).eq('id', id);

  return true;
}

function isEditable(post) {
  return getDateStr(post.created_at) === getToday();
}

// ── 글자 수 ───────────────────────────────────
// DB에서는 body 길이로 직접 계산

async function getCharCountByDate(dateStr) {
  const { data } = await supabase
    .from('posts')
    .select('body')
    .gte('created_at', dateStr + 'T00:00:00')
    .lte('created_at', dateStr + 'T23:59:59');
  return (data || []).reduce((sum, p) => sum + p.body.length, 0);
}

async function getCharCountByDateAndProject(dateStr, projectId) {
  const { data } = await supabase
    .from('posts')
    .select('body')
    .eq('project_id', projectId)
    .gte('created_at', dateStr + 'T00:00:00')
    .lte('created_at', dateStr + 'T23:59:59');
  return (data || []).reduce((sum, p) => sum + p.body.length, 0);
}

async function getCharCountsInRange(startDate, endDate, projectId = null) {
  let query = supabase
    .from('posts')
    .select('body, created_at')
    .gte('created_at', startDate + 'T00:00:00')
    .lte('created_at', endDate + 'T23:59:59');

  if (projectId) query = query.eq('project_id', projectId);

  const { data } = await query;
  const result = {};

  // 날짜 범위 초기화
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    result[current.toISOString().slice(0, 10)] = 0;
    current.setDate(current.getDate() + 1);
  }

  // 글자 수 집계
  (data || []).forEach(p => {
    const d = getDateStr(p.created_at);
    if (result[d] !== undefined) result[d] += p.body.length;
  });

  return result;
}

async function getEarliestPostDate(projectId = null) {
  let query = supabase
    .from('posts')
    .select('created_at')
    .order('created_at')
    .limit(1);

  if (projectId) query = query.eq('project_id', projectId);

  const { data } = await query;
  return data?.[0] ? getDateStr(data[0].created_at) : null;
}
