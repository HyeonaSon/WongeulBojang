// ── 프로젝트 ──────────────────────────────────

function getAllProjects() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('project_'));
  return keys
    .map(k => JSON.parse(localStorage.getItem(k)))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function getProject(id) {
  return JSON.parse(localStorage.getItem(`project_${id}`));
}

function getWritableProjects() {
  const today    = getToday();
  const allPosts = getAllPosts();
  const todayIds = new Set(
    allPosts
      .filter(p => getDateStr(p.created_at) === today)
      .map(p => p.project_id)
  );

  return getAllProjects().filter(p => {
    // 오늘 이 프로젝트에 쓴 글 있으면 무조건 포함 (수정 가능)
    if (todayIds.has(p.id)) return true;
    // 마감일 지나면 제외
    if (p.deadline < today) return false;
    // 목표 달성하면 제외
    const written = getProjectWrittenChars(p.id);
    if (written >= p.target_chars) return false;
    return true;
  });
}

function createProject(name, category, startDate, deadline, targetChars, writeDays) {
  const project = {
    id:           Date.now().toString(),
    name,
    category,
    start_date:   startDate,
    deadline,
    target_chars: targetChars,
    write_days:   writeDays || [],
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
  return keys
    .map(k => JSON.parse(localStorage.getItem(k)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function getPostsByProject(projectId) {
  return getAllPosts().filter(p => p.project_id === projectId);
}

function getPostByDateAndProject(dateStr, projectId) {
  return getAllPosts().find(p =>
    getDateStr(p.created_at) === dateStr &&
    p.project_id === projectId
  ) || null;
}

function getPostsByDateRange(startDate, endDate) {
  return getAllPosts()
    .filter(p => {
      const d = getDateStr(p.created_at);
      return d >= startDate && d <= endDate;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
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
  post.project_id = projectId;
  post.body       = newBody;
  post.char_count = newBody.length;
  post.updated_at = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(post));
  return true;
}

function isEditable(post) {
  return getDateStr(post.created_at) === getToday();
}

// ── 통계 ──────────────────────────────────────

function getProjectWrittenChars(projectId) {
  return getPostsByProject(projectId)
    .reduce((s, p) => s + p.char_count, 0);
}

function getTotalChars() {
  return getAllPosts().reduce((s, p) => s + p.char_count, 0);
}

function getStreak() {
  const dates   = new Set(getAllPosts().map(p => getDateStr(p.created_at)));
  let streak    = 0;
  let current   = new Date(getToday());
  while (true) {
    const d = current.toISOString().slice(0, 10);
    if (dates.has(d)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }
  return streak;
}

function isProjectDone(p) {
  if (p.deadline < getToday()) return true;
  return getProjectWrittenChars(p.id) >= p.target_chars;
}

// ── 백업 ──────────────────────────────────────

function exportData() {
  const data = {
    version:    '1.0',
    exportedAt: new Date().toISOString(),
    projects:   getAllProjects(),
    posts:      getAllPosts()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `원글보장_${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.projects || !data.posts) {
        alert('올바른 백업 파일이 아니에요.');
        return;
      }
      if (!confirm(`적금 ${data.projects.length}개, 글 ${data.posts.length}개를 불러올까요?`)) return;
      data.projects.forEach(p => localStorage.setItem(`project_${p.id}`, JSON.stringify(p)));
      data.posts.forEach(p => localStorage.setItem(`post_${p.id}`, JSON.stringify(p)));
      if (callback) callback();
    } catch {
      alert('파일을 읽는 중 오류가 생겼어요.');
    }
  };
  reader.readAsText(file);
}
