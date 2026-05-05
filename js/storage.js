const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function getActiveProjects() {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .gte('deadline', getToday())
    .order('deadline');
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

async function createProject(name, category, startDate, deadline, targetChars) {
  const user = await getCurrentUser();
  const { data } = await supabase.from('projects').insert({
    user_id:      user.id,
    name,
    category,
    start_date:   startDate,
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

async function getPostsByProject(projectId) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function getPostByDate(dateStr) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', dateStr + 'T00:00:00.000Z')
    .lte('created_at', dateStr + 'T23:59:59.999Z')
    .maybeSingle();
  return data;
}

async function getPostByDateAndProject(dateStr, projectId) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('project_id', projectId)
    .gte('created_at', dateStr + 'T00:00:00.000Z')
    .lte('created_at', dateStr + 'T23:59:59.999Z')
    .maybeSingle();
  return data;
}

async function getPostsByDateRange(startDate, endDate) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', startDate + 'T00:00:00.000Z')
    .lte('created_at', endDate + 'T23:59:59.999Z')
    .order('created_at');
  return data || [];
}

async function createPost(projectId, body) {
  const user = await getCurrentUser();
  const { data } = await supabase.from('posts').insert({
    user_id:    user.id,
    project_id: projectId,
    body,
    char_count: body.length
  }).select().single();
  return data;
}

async function updatePost(id, projectId, newBody) {
  const { data: post } = await supabase
    .from('posts').select('created_at').eq('id', id).single();
  if (!post || getDateStr(post.created_at) !== getToday()) return false;

  await supabase.from('posts').update({
    project_id: projectId,
    body:       newBody,
    char_count: newBody.length,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  return true;
}

function isEditable(post) {
  return getDateStr(post.created_at) === getToday();
}

// ── 통계 ──────────────────────────────────────

async function getMonthlyStats(year, month) {
  const { start, end } = getMonthRange(year, month);
  const posts = await getPostsByDateRange(start, end);

  const byDate = {};
  posts.forEach(p => {
    const d = getDateStr(p.created_at);
    byDate[d] = (byDate[d] || 0) + p.char_count;
  });

  const totalChars  = posts.reduce((s, p) => s + p.char_count, 0);
  const writtenDays = Object.keys(byDate).length;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const avgChars    = writtenDays ? Math.round(totalChars / writtenDays) : 0;

  return { byDate, totalChars, writtenDays, daysInMonth, avgChars };
}

async function getYearlyStats(year) {
  const start = `${year}-01-01`;
  const end   = `${year}-12-31`;
  const posts = await getPostsByDateRange(start, end);

  const byMonth = Array(12).fill(0);
  posts.forEach(p => {
    const m = new Date(p.created_at).getMonth();
    byMonth[m] += p.char_count;
  });

  return byMonth;
}

async function getProjectWrittenChars(projectId) {
  const { data } = await supabase
    .from('posts')
    .select('char_count')
    .eq('project_id', projectId);
  return (data || []).reduce((s, p) => s + p.char_count, 0);
}

async function getStreak() {
  const posts = await getAllPosts();
  const dates = new Set(posts.map(p => getDateStr(p.created_at)));

  let streak  = 0;
  let current = new Date(getToday());

  while (true) {
    const d = current.toISOString().slice(0, 10);
    if (dates.has(d)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}
