'use strict';

const LEGACY_POSTS_KEY = 'najjubtype-posts-v4';
const LEGACY_STATE_KEY = 'najjubtype-state-v4';
const SAVED_KEY = 'najjubtype-saved-v1';
const MIGRATION_PREFIX = 'najjubtype-supabase-migration-v1:';
const avatar = './assets/avatar_blank.png';

let db = null;
let userId = null;
let posts = [];
let commentsByPost = Object.create(null);
let likedIds = new Set();
let savedIds = loadSet(SAVED_KEY);
let openCommentIds = new Set();
let sortHistory = [];
let currentView = 'top';
let editingPostId = null;
let sortSession = null;
let excerptState = {
  post: null,
  mode: 'post',
  roundSize: null,
  background: 'blush',
  textColor: '#141415',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 44
};
let realtimeChannel = null;
let refreshTimer = null;
let isReady = false;
const likeLocks = new Set();

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const heartPath = 'm10.82 20.116-.097-.09-6.844-6.355A5.882 5.882 0 0 1 2 9.359v-.13C2 6.48 3.953 4.12 6.656 3.606A5.71 5.71 0 0 1 12 5.417a5.562 5.562 0 0 1 .977-.871 5.73 5.73 0 0 1 4.367-.945A5.73 5.73 0 0 1 22 9.23v.129c0 1.636-.68 3.199-1.879 4.312l-6.844 6.355-.097.09c-.32.297-.742.465-1.18.465a1.72 1.72 0 0 1-1.18-.465Zm.52-12.625a.205.205 0 0 1-.04-.043l-.695-.78-.003-.005A3.85 3.85 0 0 0 3.875 9.23v.13c0 1.113.465 2.18 1.281 2.937L12 18.651l6.844-6.355a4.012 4.012 0 0 0 1.281-2.937v-.13a3.851 3.851 0 0 0-6.723-2.566l-.004.004-.003.004-.696.781c-.011.016-.027.028-.039.043a.935.935 0 0 1-1.32 0v-.004Z';
const icons = {
  heart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${heartPath}" fill="currentcolor"/></svg>`,
  comment: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.832 17.535a1.877 1.877 0 0 1 1.742-.25c1.035.375 2.194.59 3.428.59 4.87 0 8.123-3.145 8.123-6.25s-3.253-6.25-8.123-6.25c-4.87 0-8.122 3.145-8.122 6.25 0 1.25.484 2.453 1.394 3.484.336.38.5.88.46 1.387a6.92 6.92 0 0 1-.44 1.93 9.811 9.811 0 0 0 1.538-.887v-.004Zm-3.999 1.586c.07-.105.137-.21.2-.316.39-.649.76-1.5.835-2.457-1.172-1.332-1.863-2.961-1.863-4.723 0-4.488 4.475-8.125 9.997-8.125C17.526 3.5 22 7.137 22 11.625c0 4.488-4.475 8.125-9.998 8.125-1.448 0-2.823-.25-4.065-.7-.465.34-1.222.805-2.12 1.196a9.564 9.564 0 0 1-1.957.629c-.031.008-.062.012-.094.02-.171.03-.34.058-.515.074-.008 0-.02.004-.027.004-.2.02-.399.03-.598.03a.625.625 0 0 1-.445-1.066 5.606 5.606 0 0 0 .629-.797l.011-.019h.012Z" fill="currentcolor"/></svg>',
  bookmark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 4.875C4.5 3.84 5.34 3 6.375 3v16.242l5.082-3.629a.93.93 0 0 1 1.09 0l5.078 3.63V4.874H6.375V3h11.25c1.035 0 1.875.84 1.875 1.875v16.188a.938.938 0 0 1-1.48.762L12 17.526l-6.02 4.297a.938.938 0 0 1-1.48-.762z" fill="currentColor"/></svg>',
  share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.664 2.275a.934.934 0 0 0-1.324 0l-5.004 5A.937.937 0 0 0 7.66 8.6l3.399-3.398v9.614c0 .519.418.937.937.937.52 0 .938-.418.938-.938V5.202L16.332 8.6a.937.937 0 0 0 1.324-1.324l-4.992-5ZM5.125 15.44a.935.935 0 0 0-.938-.938.935.935 0 0 0-.937.938v3.124a3.438 3.438 0 0 0 3.438 3.438h10.625a3.438 3.438 0 0 0 3.437-3.438V15.44a.935.935 0 0 0-.938-.938.935.935 0 0 0-.937.938v3.124c0 .864-.7 1.563-1.563 1.563H6.688c-.863 0-1.562-.7-1.562-1.563V15.44Z" fill="currentColor"/></svg>',
  more: '<svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M20.125 12a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm-6.25 0a1.875 1.875 0 1 1-3.751 0 1.875 1.875 0 0 1 3.751 0ZM5.75 13.875a1.875 1.875 0 1 1 0-3.75 1.875 1.875 0 0 1 0 3.75Z" fill="currentcolor"></path></svg>'
};

function loadSet(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function saveSet(key, value) {
  localStorage.setItem(key, JSON.stringify([...value]));
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function safeLink(value) {
  if (!value || value === '#') return null;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function timeAgo(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function setNotice(message) {
  const notice = $('#connectionNotice');
  notice.textContent = message;
  notice.hidden = !message;
}

function disableMutations(disabled) {
  ['#submitPostBtn', '#saveEditBtn', '#tournamentPlayBtn', '#historyPlayBtn'].forEach(selector => {
    const element = $(selector);
    if (element) element.disabled = disabled;
  });
}

function postById(id) {
  return posts.find(post => post.id === id);
}

function commentsFor(post) {
  return commentsByPost[post.id] || [];
}

function likeCount(post) {
  return Number(post.likeCount || 0);
}

function mapPost(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    link: row.source_url || '',
    quote: row.quote,
    reason: row.reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOwner: Boolean(row.is_owner),
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    titles: Number(row.titles || 0)
  };
}

async function bootstrap() {
  const config = window.NAJJUBTYPE_CONFIG || {};
  if (!window.supabase?.createClient) {
    failSetup('Supabase 클라이언트 파일을 불러오지 못했습니다.');
    return;
  }

  if (!safeSupabaseConfig(config)) {
    failSetup('DB 연결 전입니다. config.js에 Supabase URL과 Publishable Key를 입력해주세요.');
    return;
  }

  disableMutations(true);
  try {
    db = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });

    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;

    let session = sessionData.session;
    if (!session) {
      const { data, error } = await db.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    if (!session?.user?.id) throw new Error('익명 사용자 세션을 만들지 못했습니다.');
    userId = session.user.id;

    await migrateLegacyData(config.supabaseUrl);
    await loadSharedData();
    subscribeToMetrics();
    isReady = true;
    disableMutations(false);
    setNotice('');
  } catch (error) {
    console.error(error);
    failSetup(readableError(error));
  }
}

function safeSupabaseConfig(config) {
  return typeof config.supabaseUrl === 'string'
    && /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl)
    && typeof config.supabasePublishableKey === 'string'
    && config.supabasePublishableKey.length > 20;
}

function failSetup(message) {
  isReady = false;
  disableMutations(true);
  setNotice(message);
  $('#menuList').innerHTML = '<div class="empty-state"><p>공용 DB 연결이 필요합니다.</p></div>';
}

function readableError(error) {
  const message = String(error?.message || error || 'DB 연결 중 오류가 발생했습니다.');
  if (/anonymous sign-ins/i.test(message) || /Anonymous sign-ins are disabled/i.test(message)) {
    return 'Supabase에서 Anonymous Sign-In을 활성화해주세요.';
  }
  if (/relation .* does not exist/i.test(message) || /schema cache/i.test(message)) {
    return 'Supabase SQL Editor에서 supabase/schema.sql을 먼저 실행해주세요.';
  }
  return `DB 연결 오류: ${message}`;
}

async function loadSharedData() {
  if (!db || !userId) return;
  const [feedResult, likesResult, commentsResult, historyResult] = await Promise.all([
    db.from('post_feed').select('*'),
    db.from('likes').select('post_id'),
    db.from('public_comments').select('id,post_id,body,created_at').order('created_at', { ascending: true }),
    db.from('sort_runs').select('id,round_size,ranking,winner_post_id,played_at,is_legacy')
      .order('played_at', { ascending: false }).limit(50)
  ]);

  const error = feedResult.error || likesResult.error || commentsResult.error || historyResult.error;
  if (error) throw error;

  posts = (feedResult.data || []).map(mapPost);
  likedIds = new Set((likesResult.data || []).map(row => row.post_id));
  commentsByPost = Object.create(null);
  (commentsResult.data || []).forEach(row => {
    commentsByPost[row.post_id] ||= [];
    commentsByPost[row.post_id].push({ id: row.id, text: row.body, createdAt: row.created_at });
  });
  sortHistory = (historyResult.data || []).map(row => ({
    id: row.id,
    date: row.played_at,
    roundSize: row.round_size,
    ranking: row.ranking || [],
    isLegacy: Boolean(row.is_legacy)
  }));

  renderCurrentView();
}

function subscribeToMetrics() {
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db
    .channel('najjubtype-shared-metrics')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_metrics' }, scheduleRefresh)
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setNotice('실시간 연결이 잠시 끊겼습니다. 새로고침하면 최신 데이터가 표시됩니다.');
      }
      if (status === 'SUBSCRIBED') setNotice('');
    });
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      await loadSharedData();
    } catch (error) {
      console.error(error);
      setNotice('최신 데이터를 불러오지 못했습니다. 잠시 후 새로고침해주세요.');
    }
  }, 140);
}

function renderCurrentView() {
  if (currentView === 'rank') loadTournamentLeaderboard();
  else renderFeed();
}

function renderFeed() {
  let list = [...posts];
  if (currentView === 'top') {
    list.sort((a, b) => likeCount(b) - likeCount(a) || new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  $('#menuList').innerHTML = list.length
    ? list.map(post => renderCard(post, 'feed')).join('')
    : '<div class="empty-state"><p>추천이 없습니다... 하나 하고 가세요</p></div>';
}

function renderCard(post, context) {
  const cardKey = `${context}-${post.id}`;
  const comments = commentsFor(post);
  const liked = likedIds.has(post.id);
  const saved = savedIds.has(post.id);
  const link = safeLink(post.link);
  const open = openCommentIds.has(cardKey);
  const excerptAction = context === 'feed' && currentView === 'top';
  const bookmarkButton = excerptAction
    ? `<button class="post-icon-btn" type="button" data-excerpt="${esc(post.id)}" aria-label="발췌짤 만들기" title="발췌짤 만들기">${icons.bookmark}</button>`
    : `<button class="post-icon-btn ${saved ? 'saved' : ''}" type="button" data-save="${esc(post.id)}" aria-label="저장" aria-pressed="${saved}">${icons.bookmark}</button>`;
  const dropdown = post.isOwner
    ? `<button type="button" data-edit="${esc(post.id)}">수정</button><button type="button" data-delete="${esc(post.id)}">삭제</button>`
    : `<button type="button" data-copy="${esc(post.id)}">링크 복사</button>`;

  return `<article class="menu-card" data-card-key="${esc(cardKey)}" data-post-id="${esc(post.id)}"><div class="menu-card-body">
    <div class="post-header">
      <div class="post-header-left"><div class="post-avatar"><img src="${avatar}" alt="" width="32" height="32"></div><div class="post-header-info"><div class="post-author-badge">${esc(post.author || '익명')}</div><span class="post-meta-line">${timeAgo(post.createdAt)} · 냐쭙 아카이브</span></div></div>
      <div class="post-more-wrapper"><button class="post-more-btn" aria-label="더보기" type="button" data-menu="${esc(cardKey)}">${icons.more}</button><div class="post-dropdown" data-dropdown="${esc(cardKey)}">${dropdown}</div></div>
    </div>
    <div class="post-content"><h2 class="post-title">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">${esc(post.title)}</a>` : esc(post.title)}</h2><p class="post-body">${esc(post.quote)}</p></div>
    <div class="post-actions"><div class="post-actions-left"><button class="vote-btn up ${liked ? 'active' : ''}" type="button" data-like="${esc(post.id)}" aria-pressed="${liked}">${icons.heart}<span>${likeCount(post)}</span></button><button class="toggle-comments" type="button" data-comment="${esc(post.id)}" aria-expanded="${open}">${icons.comment}<span>${comments.length}</span></button></div><div class="post-actions-right">${bookmarkButton}<button class="post-icon-btn" type="button" data-share="${esc(post.id)}" aria-label="공유">${icons.share}</button></div></div>
    ${post.reason ? `<div class="post-comment-bubble"><div class="post-comment-avatar"><img src="${avatar}" width="24" height="24" alt=""></div><p class="post-comment-text">${esc(post.reason)}</p></div>` : ''}
    <div class="comments-section ${open ? 'open' : ''}"><div class="comment-list">${renderCommentsHTML(comments)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea placeholder="공감할래말래" rows="1" maxlength="500"></textarea><div class="comment-form-row"><button class="btn" type="button" data-submit-comment="${esc(post.id)}">등록</button></div></div></div>
  </div></article>`;
}

function renderCommentsHTML(comments) {
  return comments.map(comment => `<div class="comment-item"><img class="comment-avatar" src="${avatar}" alt=""><div class="comment-body"><div class="comment-header"><span class="comment-nickname">익명</span><span class="comment-time">${timeAgo(comment.createdAt)}</span></div><div class="comment-text">${esc(comment.text)}</div></div></div>`).join('');
}

function setView(view) {
  currentView = view;
  $$('.sort-bar button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const isRank = view === 'rank';
  $('#feedView').hidden = isRank;
  $('#rankView').hidden = !isRank;
  if (isRank) {
    showTournamentSection('leaderboard');
    loadTournamentLeaderboard();
  } else {
    renderFeed();
  }
}

async function submitPost() {
  if (!isReady) return;
  const quote = $('#quoteInput').value.trim();
  const title = $('#titleInput').value.trim();
  const author = $('#authorInput').value.trim();
  const linkInput = $('#linkInput').value.trim();
  const reason = $('#reasonInput').value.trim();
  if (!quote || !title || !author || !reason) {
    showToast('명대사, 제목, 작가, 추천 이유를 입력해줘.');
    return;
  }
  const link = linkInput ? safeLink(linkInput) : null;
  if (linkInput && !link) {
    showToast('링크는 http 또는 https 주소로 입력해줘.');
    return;
  }

  const button = $('#submitPostBtn');
  button.disabled = true;
  try {
    const { error } = await db.from('posts').insert({
      id: crypto.randomUUID(), title, author, source_url: link, quote, reason
    });
    if (error) throw error;
    ['#quoteInput', '#titleInput', '#authorInput', '#linkInput', '#reasonInput'].forEach(id => { $(id).value = ''; });
    await loadSharedData();
    setView('new');
    showToast('명대사가 등록됐어요.');
  } catch (error) {
    console.error(error);
    showToast('명대사를 등록하지 못했어요.');
  } finally {
    button.disabled = false;
  }
}

async function toggleLike(id) {
  const post = postById(id);
  if (!isReady || !post || likeLocks.has(id)) return;
  likeLocks.add(id);
  const wasLiked = likedIds.has(id);
  if (wasLiked) {
    likedIds.delete(id);
    post.likeCount = Math.max(0, post.likeCount - 1);
  } else {
    likedIds.add(id);
    post.likeCount += 1;
  }
  updateLikeButtons(post);

  try {
    const result = wasLiked
      ? await db.from('likes').delete().eq('post_id', id).eq('user_id', userId)
      : await db.from('likes').insert({ post_id: id });
    if (result.error) throw result.error;
  } catch (error) {
    console.error(error);
    if (wasLiked) {
      likedIds.add(id);
      post.likeCount += 1;
    } else {
      likedIds.delete(id);
      post.likeCount = Math.max(0, post.likeCount - 1);
    }
    updateLikeButtons(post);
    showToast('하트를 반영하지 못했어요.');
  } finally {
    likeLocks.delete(id);
  }
}

function updateLikeButtons(post) {
  const liked = likedIds.has(post.id);
  document.querySelectorAll(`[data-like="${CSS.escape(post.id)}"]`).forEach(button => {
    button.classList.toggle('active', liked);
    button.setAttribute('aria-pressed', String(liked));
    const count = button.querySelector('span');
    if (count) count.textContent = String(likeCount(post));
  });
}

function toggleSave(id) {
  const saved = savedIds.has(id);
  if (saved) savedIds.delete(id);
  else savedIds.add(id);
  saveSet(SAVED_KEY, savedIds);
  document.querySelectorAll(`[data-save="${CSS.escape(id)}"]`).forEach(button => {
    button.classList.toggle('saved', !saved);
    button.setAttribute('aria-pressed', String(!saved));
  });
  showToast(saved ? '보관함에서 뺐어요.' : '보관함에 저장했어요.');
}

function toggleComments(id, trigger) {
  const card = trigger.closest('[data-card-key]');
  if (!card) return;
  const key = card.dataset.cardKey;
  const section = card.querySelector('.comments-section');
  if (!section) return;
  const open = !section.classList.contains('open');
  section.classList.toggle('open', open);
  trigger.setAttribute('aria-expanded', String(open));
  if (open) openCommentIds.add(key);
  else openCommentIds.delete(key);
}

async function submitComment(id, trigger) {
  if (!isReady) return;
  const card = trigger.closest('[data-card-key]');
  const input = card?.querySelector('.comments-section textarea');
  const text = input?.value.trim();
  if (!text) {
    showToast('댓글을 입력해줘.');
    return;
  }

  trigger.disabled = true;
  try {
    const { error } = await db.from('comments').insert({ post_id: id, body: text });
    if (error) throw error;
    openCommentIds.add(card.dataset.cardKey);
    input.value = '';
    await loadSharedData();
    requestAnimationFrame(() => {
      const refreshed = document.querySelector(`[data-card-key="${CSS.escape(card.dataset.cardKey)}"]`);
      refreshed?.querySelector('.comment-list')?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    showToast('댓글을 등록했어요.');
  } catch (error) {
    console.error(error);
    showToast('댓글을 등록하지 못했어요.');
  } finally {
    trigger.disabled = false;
  }
}

async function sharePost(id) {
  const post = postById(id);
  if (!post) return;
  const text = `${post.title} — ${post.author}\n\n${post.quote}\n\n#NAJJUBTYPE`;
  const url = safeLink(post.link) || location.href;
  try {
    if (navigator.share) await navigator.share({ title: post.title, text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast('공유 문구를 복사했어요.');
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('공유하지 못했어요.');
  }
}

async function copyPost(id) {
  const post = postById(id);
  const url = safeLink(post?.link) || location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast('링크를 복사했어요.');
  } catch {
    showToast('링크를 복사하지 못했어요.');
  }
}

function openEdit(id) {
  const post = postById(id);
  if (!post?.isOwner) return;
  editingPostId = id;
  $('#editQuote').value = post.quote;
  $('#editWorkTitle').value = post.title;
  $('#editAuthor').value = post.author;
  $('#editLink').value = post.link || '';
  $('#editReason').value = post.reason || '';
  openModal('editModal');
}

async function saveEdit() {
  const post = postById(editingPostId);
  if (!post?.isOwner) return;
  const quote = $('#editQuote').value.trim();
  const title = $('#editWorkTitle').value.trim();
  const author = $('#editAuthor').value.trim();
  const reason = $('#editReason').value.trim();
  const linkInput = $('#editLink').value.trim();
  const link = linkInput ? safeLink(linkInput) : null;
  if (!quote || !title || !author || !reason) {
    showToast('명대사, 제목, 작가, 추천 이유를 확인해줘.');
    return;
  }
  if (linkInput && !link) {
    showToast('링크는 http 또는 https 주소로 입력해줘.');
    return;
  }

  const button = $('#saveEditBtn');
  button.disabled = true;
  try {
    const { error } = await db.from('posts').update({
      quote, title, author, source_url: link, reason
    }).eq('id', post.id);
    if (error) throw error;
    closeModal('editModal');
    await loadSharedData();
    showToast('수정했어요.');
  } catch (error) {
    console.error(error);
    showToast('수정하지 못했어요.');
  } finally {
    button.disabled = false;
  }
}

async function deletePost(id) {
  const post = postById(id);
  if (!post?.isOwner || !confirm('이 등록글을 삭제할까요?')) return;
  try {
    const { error } = await db.from('posts').delete().eq('id', id);
    if (error) throw error;
    openCommentIds.forEach(key => { if (key.endsWith(`-${id}`)) openCommentIds.delete(key); });
    await loadSharedData();
    showToast('삭제했어요.');
  } catch (error) {
    console.error(error);
    showToast('삭제하지 못했어요.');
  }
}

function openModal(id) {
  const modal = $(`#${id}`);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = $(`#${id}`);
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initExcerptMaker() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="excerptModal" class="modal-overlay excerpt-modal" aria-hidden="true">
      <div class="modal-box excerpt-modal-box" role="dialog" aria-modal="true" aria-labelledby="excerptModalTitle">
        <div class="modal-header excerpt-modal-header">
          <h3 id="excerptModalTitle">냐쭙짤 만들기</h3>
          <button type="button" data-close="excerptModal" aria-label="닫기">✕</button>
        </div>
        <div class="excerpt-maker">
          <div class="excerpt-preview-wrap">
            <canvas id="excerptCanvas" width="1080" height="1080" aria-label="발췌짤 미리보기"></canvas>
          </div>
          <div class="excerpt-controls">
            <div class="excerpt-control-group">
              <span class="excerpt-label">배경</span>
              <div class="excerpt-option-row excerpt-swatches" aria-label="배경 선택">
                <button class="excerpt-swatch active" type="button" data-excerpt-bg="blush" style="--swatch:#F4F2F3" aria-label="연분홍"></button>
                <button class="excerpt-swatch" type="button" data-excerpt-bg="paper" style="--swatch:#FFFFFF" aria-label="흰색"></button>
                <button class="excerpt-swatch" type="button" data-excerpt-bg="night" style="--swatch:#141415" aria-label="검정"></button>
                <button class="excerpt-swatch excerpt-swatch-blue" type="button" data-excerpt-bg="blue" aria-label="파랑 그라데이션"></button>
                <button class="excerpt-swatch excerpt-swatch-violet" type="button" data-excerpt-bg="violet" aria-label="보라 그라데이션"></button>
              </div>
            </div>
            <label class="excerpt-field"><span class="excerpt-label">제목</span><input id="excerptWorkTitle" maxlength="120"></label>
            <label class="excerpt-field"><span class="excerpt-label">작가</span><input id="excerptAuthor" maxlength="80"></label>
            <label class="excerpt-field"><span class="excerpt-label">발췌문</span><textarea id="excerptText" rows="8" maxlength="700"></textarea></label>
            <div class="excerpt-control-group">
              <span class="excerpt-label">글꼴</span>
              <div class="excerpt-segmented" aria-label="글꼴 선택">
                <button class="active" type="button" data-excerpt-font="Pretendard, sans-serif">기본</button>
                <button type="button" data-excerpt-font="serif">명조</button>
              </div>
            </div>
            <div class="excerpt-control-group">
              <span class="excerpt-label">글자 크기</span>
              <div class="excerpt-segmented" aria-label="글자 크기 선택">
                <button type="button" data-excerpt-size="36">작게</button>
                <button class="active" type="button" data-excerpt-size="44">보통</button>
                <button type="button" data-excerpt-size="52">크게</button>
              </div>
            </div>
            <div class="excerpt-control-group">
              <span class="excerpt-label">글자색</span>
              <div class="excerpt-segmented" aria-label="글자색 선택">
                <button class="active" type="button" data-excerpt-color="#141415">검정</button>
                <button type="button" data-excerpt-color="#FFFFFF">흰색</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer excerpt-modal-footer">
          <button class="btn-cancel" type="button" data-close="excerptModal">취소</button>
          <button class="btn-cancel" id="excerptShareBtn" type="button">공유</button>
          <button class="btn-confirm" id="excerptDownloadBtn" type="button">이미지 저장</button>
        </div>
      </div>
    </div>`);

  ['#excerptWorkTitle', '#excerptAuthor', '#excerptText'].forEach(selector => {
    $(selector).addEventListener('input', drawExcerptCanvas);
  });
  $$('[data-excerpt-bg]').forEach(button => button.addEventListener('click', () => setExcerptBackground(button.dataset.excerptBg)));
  $$('[data-excerpt-font]').forEach(button => button.addEventListener('click', () => {
    excerptState.fontFamily = button.dataset.excerptFont;
    setExcerptActive('[data-excerpt-font]', button);
    drawExcerptCanvas();
  }));
  $$('[data-excerpt-size]').forEach(button => button.addEventListener('click', () => {
    excerptState.fontSize = Number(button.dataset.excerptSize);
    setExcerptActive('[data-excerpt-size]', button);
    drawExcerptCanvas();
  }));
  $$('[data-excerpt-color]').forEach(button => button.addEventListener('click', () => {
    excerptState.textColor = button.dataset.excerptColor;
    setExcerptActive('[data-excerpt-color]', button);
    drawExcerptCanvas();
  }));
  $('#excerptDownloadBtn').addEventListener('click', downloadExcerptImage);
  $('#excerptShareBtn').addEventListener('click', shareExcerptImage);
}

function setExcerptActive(selector, activeButton) {
  $$(selector).forEach(button => button.classList.toggle('active', button === activeButton));
}

function setExcerptBackground(background) {
  excerptState.background = background;
  const active = document.querySelector(`[data-excerpt-bg="${background}"]`);
  if (active) setExcerptActive('[data-excerpt-bg]', active);
  if (background === 'night' || background === 'blue' || background === 'violet') {
    excerptState.textColor = '#FFFFFF';
  } else {
    excerptState.textColor = '#141415';
  }
  const colorButton = document.querySelector(`[data-excerpt-color="${excerptState.textColor}"]`);
  if (colorButton) setExcerptActive('[data-excerpt-color]', colorButton);
  drawExcerptCanvas();
}

function openExcerptMaker(post, options = {}) {
  if (!post) return;
  excerptState.post = post;
  excerptState.mode = options.mode === 'winner' ? 'winner' : 'post';
  excerptState.roundSize = Number(options.roundSize) || null;
  excerptState.background = 'blush';
  excerptState.textColor = '#141415';
  excerptState.fontFamily = 'Pretendard, sans-serif';
  excerptState.fontSize = 44;
  $('#excerptWorkTitle').value = post.title || '';
  $('#excerptAuthor').value = post.author || '';
  $('#excerptText').value = post.quote || '';
  setExcerptActive('[data-excerpt-bg]', $('[data-excerpt-bg="blush"]'));
  setExcerptActive('[data-excerpt-font]', $('[data-excerpt-font="Pretendard, sans-serif"]'));
  setExcerptActive('[data-excerpt-size]', $('[data-excerpt-size="44"]'));
  setExcerptActive('[data-excerpt-color]', $('[data-excerpt-color="#141415"]'));
  $('#excerptModalTitle').textContent = excerptState.mode === 'winner' ? '우승짤 만들기' : '발췌짤 만들기';
  openModal('excerptModal');
  requestAnimationFrame(drawExcerptCanvas);
  document.fonts?.ready.then(drawExcerptCanvas);
}

function excerptPalette(ctx, width, height) {
  if (excerptState.background === 'paper') return '#FFFFFF';
  if (excerptState.background === 'night') return '#141415';
  if (excerptState.background === 'blue') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#D9E7FF');
    gradient.addColorStop(0.48, '#6593E6');
    gradient.addColorStop(1, '#244B91');
    return gradient;
  }
  if (excerptState.background === 'violet') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#EEE6F7');
    gradient.addColorStop(0.5, '#8067A4');
    gradient.addColorStop(1, '#342743');
    return gradient;
  }
  return '#F4F2F3';
}

function wrapExcerptText(ctx, value, maxWidth) {
  const source = String(value || '').replace(/\r\n?/g, '\n').trim();
  const lines = [];
  source.split('\n').forEach((paragraph, paragraphIndex, paragraphs) => {
    if (!paragraph) {
      lines.push('');
    } else {
      let line = '';
      for (const character of [...paragraph]) {
        const next = line + character;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = character.trimStart();
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
    }
    if (paragraphIndex < paragraphs.length - 1 && paragraph && paragraphs[paragraphIndex + 1]) lines.push('');
  });
  return lines;
}

function fitExcerptText(ctx, value, maxWidth, maxHeight) {
  let size = excerptState.fontSize;
  let lines = [];
  let lineHeight = 0;
  let height = Infinity;
  while (size >= 24) {
    ctx.font = `400 ${size}px ${excerptState.fontFamily}`;
    lines = wrapExcerptText(ctx, value, maxWidth);
    lineHeight = Math.round(size * 1.66);
    height = lines.reduce((sum, line) => sum + (line ? lineHeight : Math.round(lineHeight * 0.55)), 0);
    if (height <= maxHeight || size === 24) break;
    size -= 2;
  }
  if (height > maxHeight) {
    const visible = [];
    let used = 0;
    for (const line of lines) {
      const step = line ? lineHeight : Math.round(lineHeight * 0.55);
      if (used + step > maxHeight) break;
      visible.push(line);
      used += step;
    }
    const lastTextIndex = visible.map(Boolean).lastIndexOf(true);
    if (lastTextIndex >= 0) visible[lastTextIndex] = `${visible[lastTextIndex].replace(/[.\s…]+$/, '')}…`;
    lines = visible;
    height = used;
  }
  return { size, lines, lineHeight, height };
}

function drawExcerptCanvas() {
  const canvas = $('#excerptCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const margin = 82;
  const textColor = excerptState.textColor;
  const mutedColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.66)' : 'rgba(20,20,21,0.58)';
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = excerptPalette(ctx, width, height);
  ctx.fillRect(0, 0, width, height);

  if (excerptState.mode === 'winner') {
    ctx.fillStyle = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.16)' : 'rgba(20,20,21,0.08)';
    roundRect(ctx, margin, 72, 220, 62, 31);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = `600 26px ${excerptState.fontFamily}`;
    ctx.textBaseline = 'middle';
    const roundLabel = excerptState.roundSize ? `${excerptState.roundSize}강 소트 우승` : '소트 우승';
    ctx.fillText(roundLabel, margin + 28, 103);
  }

  const quote = $('#excerptText').value.trim() || '발췌문을 입력해 주세요.';
  const quoteTopLimit = excerptState.mode === 'winner' ? 185 : 140;
  const fitted = fitExcerptText(ctx, quote, width - margin * 2, 540);
  ctx.font = `400 ${fitted.size}px ${excerptState.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = textColor;
  let y = quoteTopLimit + Math.max(0, (540 - fitted.height) / 2);
  fitted.lines.forEach(line => {
    if (line) {
      ctx.fillText(line, margin, y);
      y += fitted.lineHeight;
    } else {
      y += Math.round(fitted.lineHeight * 0.55);
    }
  });

  const title = $('#excerptWorkTitle').value.trim() || '작품 제목';
  const author = $('#excerptAuthor').value.trim() || '작가';
  ctx.fillStyle = textColor;
  ctx.font = `600 34px ${excerptState.fontFamily}`;
  ctx.fillText(title, margin, 822);
  ctx.fillStyle = mutedColor;
  ctx.font = `400 28px ${excerptState.fontFamily}`;
  ctx.fillText(author, margin, 878);
  ctx.font = `600 25px ${excerptState.fontFamily}`;
  ctx.textAlign = 'right';
  ctx.fillText('N♥JTYPE', width - margin, height - 78);
  ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function excerptCanvasBlob() {
  drawExcerptCanvas();
  return new Promise(resolve => $('#excerptCanvas').toBlob(resolve, 'image/png'));
}

function excerptFileName() {
  const title = $('#excerptWorkTitle').value.trim() || 'najjubtype-excerpt';
  const suffix = excerptState.mode === 'winner' ? '-winner' : '-excerpt';
  return `${title}${suffix}.png`.replace(/[\\/:*?"<>|]/g, '_');
}

async function downloadExcerptImage() {
  const blob = await excerptCanvasBlob();
  if (!blob) {
    showToast('이미지를 만들지 못했어요.');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = excerptFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('이미지를 저장했어요.');
}

async function shareExcerptImage() {
  const blob = await excerptCanvasBlob();
  if (!blob) {
    showToast('이미지를 만들지 못했어요.');
    return;
  }
  const file = new File([blob], excerptFileName(), { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: $('#excerptWorkTitle').value.trim() || '냐쭙짤' });
    } else {
      await downloadExcerptImage();
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('공유하지 못했어요.');
  }
}

function showTournamentSection(which) {
  const sections = {
    leaderboard: '#tournamentLeaderboard',
    game: '#tournamentGame',
    result: '#tournamentResult',
    history: '#tournamentHistory'
  };
  Object.entries(sections).forEach(([name, selector]) => { $(selector).hidden = name !== which; });
}

function rankCard(post, position) {
  const medal = position === 0 ? '🥇' : position === 1 ? '🥈' : position === 2 ? '🥉' : `${position + 1}위`;
  const card = renderCard(post, `rank-${position}`).replace(
    `<span class="post-meta-line">${timeAgo(post.createdAt)} · 냐쭙 아카이브</span>`,
    `<span class="post-meta-line">${medal} · 냐쭙 아카이브</span>`
  );
  return card.replace(
    '<div class="post-actions">',
    `<div class="ranking-stats"><span>승 ${post.wins}</span><span>패 ${post.losses}</span>${post.titles ? `<span class="win-rate">우승 ${post.titles}</span>` : ''}</div><div class="post-actions">`
  );
}

function loadTournamentLeaderboard() {
  const list = $('#rankingList');
  if (!list) return;
  const ranked = [...posts].sort((a, b) =>
    b.titles - a.titles || b.wins - a.wins || likeCount(b) - likeCount(a) || new Date(b.createdAt) - new Date(a.createdAt)
  );
  list.innerHTML = ranked.length
    ? ranked.map(rankCard).join('')
    : '<div class="leaderboard-empty"><div class="icon">🏆</div><p>아직 랭킹 기록이 없습니다.<br>참여해서 원하는 작품을 붐업하세요!</p></div>';
}

function openRoundSelect() {
  showTournamentSection('game');
  $('#gameTitle').textContent = '라운드 선택';
  $('#matchArea').innerHTML = '';
  $('#tournamentBackBtn').hidden = true;
  renderRoundSelect();
}

function renderRoundSelect() {
  const available = posts.length;
  const select = $('#roundSelect');
  if (available < 4) {
    select.innerHTML = '<p class="round-message">추천이 부족합니다 (최소 4개)</p>';
    return;
  }
  const sizes = [4, 8, 16, 32, 64].filter(size => size <= available);
  if (!sizes.includes(available) && available <= 64) sizes.push(available);
  sizes.sort((a, b) => a - b);
  select.innerHTML = sizes.map(size => `<button type="button" data-round-size="${size}">${size}강</button>`).join('');
}

function shuffledPosts(size) {
  const result = [...posts];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result.slice(0, size);
}

function startTournament(size) {
  const selected = shuffledPosts(size);
  const nextPower = 2 ** Math.ceil(Math.log2(selected.length));
  const byeCount = nextPower - selected.length;
  const byes = selected.slice(0, byeCount);
  sortSession = {
    runId: crypto.randomUUID(),
    roundSize: size,
    currentRound: selected.slice(byeCount),
    matchIndex: 0,
    winners: [...byes],
    eliminated: [],
    history: [],
    matches: [],
    submitting: false
  };
  $('#roundSelect').innerHTML = '';
  $('#tournamentBackBtn').hidden = false;
  renderMatch();
}

function getRoundLabel(count) {
  if (count === 2) return '결승';
  if (count === 4) return '준결승';
  return `${count}강`;
}

function matchCardHtml(post, side) {
  const comments = commentsFor(post);
  const cardKey = `match-${side}-${post.id}`;
  const open = openCommentIds.has(cardKey);
  return `<article class="match-card" data-card-key="${esc(cardKey)}" data-post-id="${esc(post.id)}" data-pick-side="${side}"><div class="menu-card-body">
    <div class="post-header"><div class="post-header-left"><div class="post-avatar"><img src="${avatar}" alt="" width="32" height="32"></div><div class="post-header-info"><div class="post-author-badge">${esc(post.author || '익명')}</div><span class="post-meta-line">${timeAgo(post.createdAt)} · 냐쭙 아카이브</span></div></div></div>
    <div class="post-content"><h2 class="post-title">${esc(post.title)}</h2><p class="post-body">${esc(post.quote)}</p></div>
    <div class="post-actions"><div class="post-actions-left"><span class="vote-btn up">${icons.heart}<span>${likeCount(post)}</span></span><button class="toggle-comments" type="button" data-comment="${esc(post.id)}" aria-expanded="${open}">${icons.comment}<span>${comments.length}</span></button></div><div class="post-actions-right"><span class="post-icon-btn">${icons.bookmark}</span><span class="post-icon-btn">${icons.share}</span></div></div>
    ${post.reason ? `<div class="post-comment-bubble"><div class="post-comment-avatar"><img src="${avatar}" width="24" height="24" alt=""></div><p class="post-comment-text">${esc(post.reason)}</p></div>` : ''}
    <div class="comments-section ${open ? 'open' : ''}"><div class="comment-list">${renderCommentsHTML(comments)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea placeholder="공감할래말래" rows="1" maxlength="500"></textarea><div class="comment-form-row"><button class="btn" type="button" data-submit-comment="${esc(post.id)}">등록</button></div></div></div>
  </div></article>`;
}

function renderMatch() {
  const session = sortSession;
  if (!session) return;
  const totalMatches = session.currentRound.length / 2;
  if (session.matchIndex >= totalMatches) {
    if (session.winners.length === 1) {
      finishTournament(session.winners[0]);
      return;
    }
    session.currentRound = [...session.winners];
    session.winners = [];
    session.matchIndex = 0;
    renderMatch();
    return;
  }

  const left = session.currentRound[session.matchIndex * 2];
  const right = session.currentRound[session.matchIndex * 2 + 1];
  $('#gameTitle').textContent = `${getRoundLabel(session.currentRound.length)} ${session.matchIndex + 1}/${totalMatches}`;
  $('#matchArea').innerHTML = `<div class="match-container">${matchCardHtml(left, 'a')}<div class="match-vs">VS</div>${matchCardHtml(right, 'b')}</div>`;
  $('#matchArea').querySelector('[data-pick-side="a"]').addEventListener('click', event => {
    if (event.target.closest('button,textarea,.post-comment-bubble')) return;
    pickWinner(left, right);
  });
  $('#matchArea').querySelector('[data-pick-side="b"]').addEventListener('click', event => {
    if (event.target.closest('button,textarea,.post-comment-bubble')) return;
    pickWinner(right, left);
  });
}

function pickWinner(winner, loser) {
  const session = sortSession;
  if (!session || session.submitting) return;
  session.history.push({
    currentRound: [...session.currentRound],
    matchIndex: session.matchIndex,
    winners: [...session.winners],
    eliminated: [...session.eliminated],
    matches: [...session.matches]
  });
  session.winners.push(winner);
  session.eliminated.push(loser);
  session.matches.push({ winner_id: winner.id, loser_id: loser.id });
  session.matchIndex += 1;
  renderMatch();
}

async function finishTournament(winner) {
  const session = sortSession;
  if (!session || session.submitting) return;
  session.submitting = true;
  $('#matchArea').innerHTML = '<div class="empty-state"><p>결과를 저장하는 중...</p></div>';
  const ranking = [winner, ...[...session.eliminated].reverse()];
  try {
    const { error } = await db.rpc('submit_sort_result', {
      p_run_id: session.runId,
      p_round_size: session.roundSize,
      p_ranking: ranking.map(post => post.id),
      p_matches: session.matches
    });
    if (error) throw error;
    await loadSharedData();
    showTournamentResult(ranking);
  } catch (error) {
    console.error(error);
    session.submitting = false;
    showToast('소트 결과를 저장하지 못했어요. 다시 시도해주세요.');
    renderMatch();
  }
}

function showTournamentResult(ranking) {
  showTournamentSection('result');
  $('#tournamentResult').innerHTML = `<div class="tournament-result"><div class="winner-label">🏆 우승</div>${rankCard(ranking[0], 0)}<div class="result-ranking">${ranking.slice(1).map((post, index) => `<div class="result-ranking-item"><div class="result-rank">${index === 0 ? '🥈' : index === 1 ? '🥉' : index + 2}</div><div class="result-ranking-info"><div class="result-ranking-title">${esc(post.title)} <span class="result-ranking-author">· ${esc(post.author)}</span></div><div class="post-body result-quote">${esc(post.quote)}</div></div></div>`).join('')}</div><div class="result-actions"><button class="tournament-btn" id="resultExcerptBtn" type="button">우승짤 만들기</button><button class="tournament-btn tournament-btn-ghost" id="resultRankingBtn" type="button">랭킹 보기</button><button class="tournament-btn tournament-btn-ghost" id="resultAgainBtn" type="button">다시하기</button></div></div>`;
  $('#resultExcerptBtn').addEventListener('click', () => {
    openExcerptMaker(ranking[0], { mode: 'winner', roundSize: sortSession?.roundSize || ranking.length });
  });
  $('#resultRankingBtn').addEventListener('click', () => {
    showTournamentSection('leaderboard');
    loadTournamentLeaderboard();
  });
  $('#resultAgainBtn').addEventListener('click', openRoundSelect);
}

function renderHistory() {
  const list = $('#historyList');
  if (!sortHistory.length) {
    list.innerHTML = '<div class="leaderboard-empty"><div class="icon">📋</div><p>아직 기록이 없습니다.<br>소트에 참여해보세요!</p></div>';
    return;
  }

  const titleCounts = Object.create(null);
  sortHistory.forEach(history => { titleCounts[history.ranking[0]] = (titleCounts[history.ranking[0]] || 0) + 1; });
  const topCount = Math.max(...Object.values(titleCounts));
  const topNames = Object.keys(titleCounts).filter(id => titleCounts[id] === topCount)
    .map(id => postById(id)?.title).filter(Boolean);

  list.innerHTML = `<div class="top-winner-summary">내 최다 우승: ${topNames.length ? topNames.map(name => `<strong>${esc(name)}</strong>`).join(', ') : '<strong>삭제된 항목</strong>'} (${topCount}회)</div><div class="history-section">${sortHistory.map((history, index) => {
    const winner = postById(history.ranking[0]);
    const date = new Date(history.date);
    const dateText = Number.isFinite(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : '-';
    return `<button class="history-item" type="button" data-history-index="${index}"><span class="history-date">${dateText}</span><span class="history-round">${history.roundSize}강</span><span class="history-winner">🏆 ${winner ? esc(winner.title) : '삭제된 항목'}</span><span class="history-arrow">▼</span></button><div class="history-detail" data-history-detail="${index}" hidden>${history.ranking.map((id, rankIndex) => {
      const post = postById(id);
      return post ? `<div class="result-ranking-item"><div class="result-rank">${rankIndex === 0 ? '🥇' : rankIndex === 1 ? '🥈' : rankIndex === 2 ? '🥉' : rankIndex + 1}</div><div class="result-ranking-info"><div class="result-ranking-title">${esc(post.title)} <span class="result-ranking-author">· ${esc(post.author)}</span></div><div class="post-body result-quote">${esc(post.quote)}</div></div></div>` : '';
    }).join('')}</div>`;
  }).join('')}</div>`;
}

function leaveGameForRanking() {
  if (sortSession?.matches?.length && !sortSession.submitting) {
    if (!confirm('진행 중인 소트가 사라집니다. 랭킹 페이지로 이동하시겠습니까?')) return;
  }
  sortSession = null;
  showTournamentSection('leaderboard');
  loadTournamentLeaderboard();
}

function undoTournamentPick() {
  const session = sortSession;
  if (!session || session.submitting) return;
  if (!session.history.length) {
    showTournamentSection('leaderboard');
    loadTournamentLeaderboard();
    return;
  }
  const previous = session.history.pop();
  session.currentRound = previous.currentRound;
  session.matchIndex = previous.matchIndex;
  session.winners = previous.winners;
  session.eliminated = previous.eliminated;
  session.matches = previous.matches;
  renderMatch();
}

async function migrateLegacyData(projectUrl) {
  const projectKey = new URL(projectUrl).hostname;
  const migrationKey = `${MIGRATION_PREFIX}${projectKey}`;
  if (localStorage.getItem(migrationKey)) return;

  let legacyPosts = [];
  let legacyState = {};
  try {
    legacyPosts = JSON.parse(localStorage.getItem(LEGACY_POSTS_KEY) || '[]');
    legacyState = JSON.parse(localStorage.getItem(LEGACY_STATE_KEY) || '{}');
  } catch (error) {
    console.warn('기존 localStorage를 읽지 못했습니다.', error);
  }

  if (!Array.isArray(legacyPosts)) legacyPosts = [];
  const idMap = new Map();
  ['demo-1', 'demo-2', 'demo-3', 'demo-4'].forEach(id => idMap.set(id, id));
  for (const post of legacyPosts) {
    idMap.set(String(post.id), await deterministicUuid(`post:${userId}:${post.id}`));
  }

  const validPosts = legacyPosts.filter(post => post?.quote && post?.title && post?.author).map(post => ({
    id: idMap.get(String(post.id)),
    title: String(post.title).slice(0, 120),
    author: String(post.author).slice(0, 80),
    source_url: safeLink(post.link),
    quote: String(post.quote).slice(0, 700),
    reason: String(post.reason || '').slice(0, 300),
    created_at: validDate(post.createdAt)
  }));

  if (validPosts.length) {
    const { error } = await db.from('posts').upsert(validPosts, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  const liked = Array.isArray(legacyState.liked) ? legacyState.liked : [];
  const likeRows = liked.map(id => idMap.get(String(id))).filter(Boolean).map(postId => ({ post_id: postId }));
  if (likeRows.length) {
    const { error } = await db.from('likes').upsert(likeRows, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  }

  const commentRows = [];
  const stateComments = legacyState.comments && typeof legacyState.comments === 'object' ? legacyState.comments : {};
  for (const [oldPostId, list] of Object.entries(stateComments)) {
    const postId = idMap.get(String(oldPostId));
    if (!postId || !Array.isArray(list)) continue;
    for (let index = 0; index < list.length; index += 1) {
      const comment = list[index];
      if (!comment?.text) continue;
      commentRows.push({
        id: await deterministicUuid(`comment:${userId}:${oldPostId}:${comment.id || index}:${comment.createdAt || ''}`),
        post_id: postId,
        body: String(comment.text).slice(0, 500),
        created_at: validDate(comment.createdAt)
      });
    }
  }
  for (const post of legacyPosts) {
    if (!Array.isArray(post.comments)) continue;
    for (let index = 0; index < post.comments.length; index += 1) {
      const comment = post.comments[index];
      if (!comment?.text) continue;
      commentRows.push({
        id: await deterministicUuid(`embedded-comment:${userId}:${post.id}:${comment.id || index}:${comment.createdAt || ''}`),
        post_id: idMap.get(String(post.id)),
        body: String(comment.text).slice(0, 500),
        created_at: validDate(comment.createdAt)
      });
    }
  }
  if (commentRows.length) {
    const { error } = await db.from('comments').upsert(commentRows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  let skippedSorts = 0;
  const histories = Array.isArray(legacyState.sortHistory) ? legacyState.sortHistory : [];
  for (let index = 0; index < histories.length; index += 1) {
    const history = histories[index];
    const ranking = Array.isArray(history.ranking)
      ? history.ranking.map(id => idMap.get(String(id))).filter(Boolean)
      : [];
    const roundSize = Number(history.roundSize || ranking.length);
    if (ranking.length !== roundSize || roundSize < 4) {
      skippedSorts += 1;
      continue;
    }
    const legacyKey = await deterministicUuid(`sort:${userId}:${history.date || index}:${history.ranking.join(',')}`);
    const { error } = await db.rpc('import_legacy_sort_result', {
      p_legacy_key: legacyKey,
      p_played_at: validDate(history.date),
      p_round_size: roundSize,
      p_ranking: ranking
    });
    if (error) {
      console.warn('기존 소트 기록을 이전하지 못했습니다.', error);
      skippedSorts += 1;
    }
  }

  localStorage.setItem(migrationKey, JSON.stringify({
    migratedAt: new Date().toISOString(),
    posts: validPosts.length,
    likes: likeRows.length,
    comments: commentRows.length,
    sortRuns: histories.length - skippedSorts,
    skippedSorts
  }));
}

function validDate(value) {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

async function deterministicUuid(input) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

$('#submitPostBtn').addEventListener('click', submitPost);
$('#sortTop').addEventListener('click', () => setView('top'));
$('#sortNew').addEventListener('click', () => setView('new'));
$('#sortRank').addEventListener('click', () => setView('rank'));
$('#saveEditBtn').addEventListener('click', saveEdit);
$('#tournamentPlayBtn').addEventListener('click', openRoundSelect);
$('#tournamentHistoryBtn').addEventListener('click', () => {
  showTournamentSection('history');
  renderHistory();
});
$('#gameRankingBtn').addEventListener('click', leaveGameForRanking);
$('#tournamentBackBtn').addEventListener('click', undoTournamentPick);
$('#historyRankingBtn').addEventListener('click', () => {
  showTournamentSection('leaderboard');
  loadTournamentLeaderboard();
});
$('#historyPlayBtn').addEventListener('click', openRoundSelect);

initExcerptMaker();

document.addEventListener('click', event => {
  const menuButton = event.target.closest('[data-menu]');
  if (menuButton) {
    event.stopPropagation();
    const menu = document.querySelector(`[data-dropdown="${CSS.escape(menuButton.dataset.menu)}"]`);
    $$('.post-dropdown.show').filter(item => item !== menu).forEach(item => item.classList.remove('show'));
    menu?.classList.toggle('show');
    return;
  }
  const like = event.target.closest('[data-like]');
  if (like) { toggleLike(like.dataset.like); return; }
  const comment = event.target.closest('[data-comment]');
  if (comment) { event.stopPropagation(); toggleComments(comment.dataset.comment, comment); return; }
  const submit = event.target.closest('[data-submit-comment]');
  if (submit) { event.stopPropagation(); submitComment(submit.dataset.submitComment, submit); return; }
  const excerpt = event.target.closest('[data-excerpt]');
  if (excerpt) { openExcerptMaker(postById(excerpt.dataset.excerpt)); return; }
  const save = event.target.closest('[data-save]');
  if (save) { toggleSave(save.dataset.save); return; }
  const share = event.target.closest('[data-share]');
  if (share) { sharePost(share.dataset.share); return; }
  const edit = event.target.closest('[data-edit]');
  if (edit) { openEdit(edit.dataset.edit); return; }
  const remove = event.target.closest('[data-delete]');
  if (remove) { deletePost(remove.dataset.delete); return; }
  const copy = event.target.closest('[data-copy]');
  if (copy) { copyPost(copy.dataset.copy); return; }
  const round = event.target.closest('[data-round-size]');
  if (round) { startTournament(Number(round.dataset.roundSize)); return; }
  const history = event.target.closest('[data-history-index]');
  if (history) {
    const detail = document.querySelector(`[data-history-detail="${history.dataset.historyIndex}"]`);
    if (detail) detail.hidden = !detail.hidden;
    return;
  }
  const close = event.target.closest('[data-close]');
  if (close) { closeModal(close.dataset.close); return; }
  if (event.target.classList.contains('modal-overlay')) closeModal(event.target.id);
  if (!event.target.closest('.post-more-wrapper')) $$('.post-dropdown.show').forEach(item => item.classList.remove('show'));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') $$('.modal-overlay.show').forEach(modal => closeModal(modal.id));
});

window.addEventListener('online', scheduleRefresh);
window.addEventListener('beforeunload', () => {
  if (db && realtimeChannel) db.removeChannel(realtimeChannel);
});

bootstrap();
