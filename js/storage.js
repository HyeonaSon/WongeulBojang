// ── 날짜 유틸 ──────────────────────────────

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDateStr(isoString) {
  return isoString.slice(0, 10);
}

// ── 프로젝트 ──────────────────────────────────

function getAllProjects() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('project_'));
  return keys.map(k => JSON.parse(localStorage.getItem(k)))
             .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function getActiveProjects() {
  return getAllProjects().filter(p => p.deadline >= getToday());
}

function getProject(id) {
  return JSON.parse(localStorage.getItem(`project_${id}`));
}

function createProject(name, category, startDate, deadline, targetChars) {
  const project = {
    id:           Date.now().toString(),
    name,
    category,
    start_date:   startDate,
    deadline,
    target_chars: targetChars,
    created_at:   new Date().toISOString()
  };
  localStorage.setItem(`project_${project.id}`, JSON.stringify(project));
  return project;
}

function updateProject(id, fields) {
  const key     = `project_${id}`;
  const project = JSON.parse(localStorage.getItem(key));
  if (!project) return false;
  Object.assign(project, fields);
  localStorage.setItem(key, JSON.stringify(project));
  return true;
}

function deleteProject(id) {
  localStorage.removeItem(`project_${id}`);
}

// ── 글 ────────────────────────────────────────

function getAllPosts() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('post_'));
  return keys.map(k => JSON.parse(localStorage.getItem(k)))
             .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function getPostsByProject(projectId) {
  return getAllPosts().filter(p => p.project_id === projectId);
}

function getPostByDate(dateStr) {
  return getAllPosts().find(p => getDateStr(p.created_at) === dateStr) || null;
}

function getPostByDateAndProject(dateStr, projectId) {
  return getAllPosts().find(p =>
    getDateStr(p.created_at) === dateStr &&
    p.project_id === projectId
  ) || null;
}

function getPostsByDateRange(startDate, endDate) {
  return getAllPosts().filter(p => {
    const d = getDateStr(p.created_at);
    return d >= startDate && d <= endDate;
  }).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function createPost(projectId, body) {
  const post = {
    id:         Date.now().toString(),
    project_id: projectId,
    body,
    char_count: body.length,
    created_at: new Date().toISOString()
  };
  localStorage.setItem(`post_${post.id}`, JSON.stringify(post));
  return post;
}

function updatePost(id, projectId, newBody) {
  const key  = `post_${id}`;
  const post = JSON.parse(localStorage.getItem(key));
  if (!post || getDateStr(post.created_at) !== getToday()) return false;

  post.project_id  = projectId;
  post.body        = newBody;
  post.char_count  = newBody.length;
  post.updated_at  = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(post));
  return true;
}

function isEditable(post) {
  return getDateStr(post.created_at) === getToday();
}

// ── 통계 ──────────────────────────────────────

function getMonthlyStats(year, month) {
  const { start, end } = getMonthRange(year, month);
  const posts = getPostsByDateRange(start, end);

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

function getYearlyStats(year) {
  const posts    = getPostsByDateRange(`${year}-01-01`, `${year}-12-31`);
  const byMonth  = Array(12).fill(0);
  posts.forEach(p => {
    const m = new Date(p.created_at).getMonth();
    byMonth[m] += p.char_count;
  });
  return byMonth;
}

function getProjectWrittenChars(projectId) {
  return getPostsByProject(projectId).reduce((s, p) => s + p.char_count, 0);
}

function getStreak() {
  const posts = getAllPosts();
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

function getEarliestPostDate(projectId = null) {
  let posts = getAllPosts();
  if (projectId) posts = posts.filter(p => p.project_id === projectId);
  if (!posts.length) return null;
  return posts.map(p => getDateStr(p.created_at)).sort()[0];
}
