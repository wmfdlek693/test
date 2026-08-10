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
  ratio: '1:1',
  background: 'dark',
  textColor: '#f4f4f5',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 40,
  lineHeightScale: 2.35,
  paragraphGap: 23,
  margin: 76,
  lineBreak: true,
  indent: false,
  smartQuotes: true,
  wrapMode: 'char',
  textAlign: 'center',
  image: null,
  imageFileName: '',
  imageFit: 'cover',
  imagePosition: 'middle-center',
  overlayOpacity: 0,
  imageScale: 1,
  imageX: 0,
  imageY: 0,
  pointers: new Map(),
  pinch: null,
  dragPoint: null
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
  saveImage: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.25 4A2.25 2.25 0 0 0 3 6.25v11.5A2.25 2.25 0 0 0 5.25 20h13.5A2.25 2.25 0 0 0 21 17.75V6.25A2.25 2.25 0 0 0 18.75 4H5.25Zm0 1.75h13.5c.276 0 .5.224.5.5v8.02l-3.03-3.03a2.25 2.25 0 0 0-3.182 0l-1.44 1.44-.535-.535a2.25 2.25 0 0 0-3.182 0L4.75 15.276V6.25c0-.276.224-.5.5-.5Zm-.5 12v-.002l4.369-4.366a.5.5 0 0 1 .707 0l1.154 1.154a.875.875 0 0 0 1.237 0l2.058-2.059a.5.5 0 0 1 .707 0l4.268 4.268v1.005a.5.5 0 0 1-.5.5H5.25a.5.5 0 0 1-.5-.5ZM8.25 8.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" fill="currentColor"/></svg>',
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
    ? `<button class="post-icon-btn" type="button" data-excerpt="${esc(post.id)}" aria-label="마음에 드는 포타 명장면 짤 만들기" title="마음에 드는 포타 명장면 짤 만들기">${icons.saveImage}</button>`
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
    <div class="comments-section ${open ? 'open' : ''}"><div class="comment-list">${renderCommentsHTML(comments)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea placeholder="냐쭙타입에게 힘이 되는 한마디 남기기" rows="1" maxlength="500"></textarea><div class="comment-form-row"><button class="btn" type="button" data-submit-comment="${esc(post.id)}">등록</button></div></div></div>
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
          <div class="excerpt-head-title">
            <button class="excerpt-back" type="button" data-close="excerptModal" aria-label="닫기">‹</button>
            <h3 id="excerptModalTitle">마음에 드는 포타 명장면 짤 만들기</h3>
          </div>
        </div>
        <div class="excerpt-maker">
          <div class="excerpt-preview-wrap">
            <canvas id="excerptCanvas" width="1080" height="1080" aria-label="배경 이미지 위치와 크기를 직접 조절하는 명장면 짤 미리보기"></canvas>
            <p class="excerpt-image-help">이미지를 끌어 위치를 조절하고, 두 손가락으로 확대·축소하세요.</p>
          </div>
          <div class="excerpt-controls">
            <section class="excerpt-section">
              <h4 class="excerpt-section-title">내용 입력</h4>
              <div class="excerpt-chip-row" aria-label="입력 옵션">
                <button class="excerpt-chip" id="excerptIndentToggle" type="button" aria-pressed="false"><span aria-hidden="true">≡</span> 들여쓰기 OFF</button>
                <button class="excerpt-chip active" id="excerptSmartQuoteToggle" type="button" aria-pressed="true"><span aria-hidden="true">“”</span> 둥근 따옴표 자동 변환</button>
                <button class="excerpt-chip accent" id="excerptLargeInputToggle" type="button" aria-pressed="false"><span aria-hidden="true">↗</span> 크게 입력</button>
                <button class="excerpt-chip danger" id="excerptClearInput" type="button" aria-label="입력 내용 지우기" title="입력 내용 지우기">&#128465;&#xfe0e;</button>
              </div>
              <label class="excerpt-field excerpt-body-field"><textarea id="excerptText" rows="7" maxlength="1500" aria-label="명장면 원문"></textarea></label>
              <div class="excerpt-inline-fields">
                <label class="excerpt-field"><span class="excerpt-label">제작자</span><input id="excerptAuthor" maxlength="80" placeholder="제작자 (선택)"></label>
                <label class="excerpt-field"><span class="excerpt-label">캐릭터/제목</span><input id="excerptWorkTitle" maxlength="120" placeholder="캐릭터/제목 (선택)"></label>
              </div>
            </section>
            <section class="excerpt-section">
              <h4 class="excerpt-section-title">캔버스 비율</h4>
              <div class="excerpt-ratio-row" aria-label="캔버스 비율">
                <button class="active" type="button" data-excerpt-ratio="1:1" aria-pressed="true"><span class="ratio-icon square" aria-hidden="true"></span><strong>1:1</strong></button>
                <button type="button" data-excerpt-ratio="4:5" aria-pressed="false"><span class="ratio-icon portrait" aria-hidden="true"></span><strong>4:5</strong></button>
                <button type="button" data-excerpt-ratio="16:9" aria-pressed="false"><span class="ratio-icon landscape" aria-hidden="true"></span><strong>16:9</strong></button>
              </div>
            </section>
            <section class="excerpt-section">
              <h4 class="excerpt-section-title">텍스트 스타일</h4>
            <div class="excerpt-control-group">
              <div class="excerpt-segmented excerpt-font-grid" aria-label="글꼴 선택">
                <button type="button" data-excerpt-font="'Noto Serif KR', NJNanumMyeongjo, 'AppleMyungjo', 'Batang', serif">Noto Serif</button>
                <button type="button" data-excerpt-font="'KoPub Batang', 'Batang', NJNanumMyeongjo, serif">KoPub 바탕</button>
                <button type="button" data-excerpt-font="NJNanumMyeongjo, 'AppleMyungjo', 'Nanum Myeongjo', 'Batang', serif">나눔명조</button>
                <button class="active" type="button" data-excerpt-font="Pretendard, sans-serif">Pretendard</button>
                <button type="button" data-excerpt-font="'Noto Sans KR', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">Noto Sans</button>
                <button type="button" data-excerpt-font="NJNanumGothic, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">나눔고딕</button>
              </div>
            </div>
            <div class="excerpt-text-layout-row">
              <div class="excerpt-layout-switch excerpt-align-switch" aria-label="텍스트 정렬">
                <button type="button" data-excerpt-align="left" aria-label="왼쪽 정렬" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h13M4 10h9M4 14h13M4 18h9"/></svg></button>
                <button class="active" type="button" data-excerpt-align="center" aria-label="가운데 정렬" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 6h13M7.5 10h9M5.5 14h13M7.5 18h9"/></svg></button>
                <button type="button" data-excerpt-align="right" aria-label="오른쪽 정렬" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h13M11 10h9M7 14h13M11 18h9"/></svg></button>
                <button type="button" data-excerpt-align="justify" aria-label="양쪽 정렬" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg></button>
              </div>
              <div class="excerpt-layout-switch excerpt-wrap-switch" aria-label="줄바꿈 기준">
                <button class="active" type="button" data-excerpt-wrap="char" aria-pressed="true">글자</button>
                <button type="button" data-excerpt-wrap="word" aria-pressed="false">단어</button>
              </div>
            </div>
            <p class="excerpt-tip">💡 Tip: 버튼을 꾹 누르면 빠르게 조절돼요</p>
            <div class="excerpt-number-grid">
              <div class="excerpt-number-box"><span>글자 크기</span><div><button type="button" data-excerpt-adjust="fontSize" data-direction="-1" aria-label="글자 크기 줄이기">−</button><input id="excerptFontSize" type="number" min="24" max="72" step="1" value="40"><em>px</em><button type="button" data-excerpt-adjust="fontSize" data-direction="1" aria-label="글자 크기 키우기">＋</button></div></div>
              <div class="excerpt-number-box"><span>줄 간격</span><div><button type="button" data-excerpt-adjust="lineHeightScale" data-direction="-1" aria-label="줄 간격 줄이기">−</button><input id="excerptLineHeight" type="number" min="1.2" max="3.2" step="0.05" value="2.35"><em>x</em><button type="button" data-excerpt-adjust="lineHeightScale" data-direction="1" aria-label="줄 간격 늘리기">＋</button></div></div>
              <div class="excerpt-number-box"><span>문단 간격</span><div><button type="button" data-excerpt-adjust="paragraphGap" data-direction="-1" aria-label="문단 간격 줄이기">−</button><input id="excerptParagraphGap" type="number" min="0" max="90" step="1" value="23"><em>px</em><button type="button" data-excerpt-adjust="paragraphGap" data-direction="1" aria-label="문단 간격 늘리기">＋</button></div></div>
              <div class="excerpt-number-box"><span>여백</span><div><button type="button" data-excerpt-adjust="margin" data-direction="-1" aria-label="여백 줄이기">−</button><input id="excerptMargin" type="number" min="40" max="140" step="1" value="76"><em>px</em><button type="button" data-excerpt-adjust="margin" data-direction="1" aria-label="여백 늘리기">＋</button></div></div>
            </div>
            <div class="excerpt-control-group">
              <span class="excerpt-label">글자 색상</span>
              <div class="excerpt-segmented" aria-label="글자색 선택">
                <button class="excerpt-color-option active" type="button" data-excerpt-color="#f4f4f5">T 흰색</button>
                <button class="excerpt-color-option" type="button" data-excerpt-color="#202124">T 검정색</button>
              </div>
            </div>
            </section>
            <section class="excerpt-section">
              <h4 class="excerpt-section-title">배경 및 이미지</h4>
              <div class="excerpt-control-group">
                <span class="excerpt-label">배경 색상</span>
                <div class="excerpt-option-row excerpt-swatches" aria-label="배경 선택">
                  <button class="excerpt-swatch active" type="button" data-excerpt-bg="dark">검정</button>
                  <button class="excerpt-swatch" type="button" data-excerpt-bg="light">하양</button>
                  <button class="excerpt-swatch" type="button" data-excerpt-bg="purple-blue">보라·파랑</button>
                  <button class="excerpt-swatch" type="button" data-excerpt-bg="dark-purple">어두운 보라</button>
                  <button class="excerpt-swatch" type="button" data-excerpt-bg="sky-blue">연한 하늘</button>
                </div>
              </div>
              <div class="excerpt-photo-uploader">
                <label class="excerpt-photo-add" id="excerptPhotoAddLabel">
                  <span class="excerpt-photo-icon" aria-hidden="true">▧</span>
                  <strong>사진 추가</strong>
                  <span>배경으로 사용할 이미지를 선택해 주세요</span>
                  <input id="excerptImage" type="file" accept="image/*">
                </label>
                <div class="excerpt-image-panel" id="excerptImagePanel" hidden>
                  <div class="excerpt-image-file-row">
                    <span id="excerptImageFileName"></span>
                    <div><label for="excerptImage" class="excerpt-image-link">변경</label><button class="excerpt-image-link danger" id="excerptImageDelete" type="button">삭제</button></div>
                  </div>
                  <div class="excerpt-image-number-grid">
                    <div class="excerpt-image-number-box"><span>이미지 크기</span><div><button type="button" data-excerpt-image-adjust="scale" data-direction="-1" aria-label="이미지 축소">−</button><input id="excerptImageScale" type="number" min="50" max="400" step="5" value="100"><em>%</em><button type="button" data-excerpt-image-adjust="scale" data-direction="1" aria-label="이미지 확대">＋</button></div></div>
                    <div class="excerpt-image-number-box"><span><b>밝게</b><b>어둡게</b></span><div><button type="button" data-excerpt-image-adjust="overlay" data-direction="-1" aria-label="이미지 밝게">−</button><input id="excerptImageOverlay" type="number" min="-80" max="80" step="5" value="0"><button type="button" data-excerpt-image-adjust="overlay" data-direction="1" aria-label="이미지 어둡게">＋</button></div></div>
                  </div>
                  <div class="excerpt-image-fit" aria-label="이미지 맞춤">
                    <button class="active" type="button" data-excerpt-image-fit="cover" aria-pressed="true">채우기</button>
                    <button type="button" data-excerpt-image-fit="contain" aria-pressed="false">맞추기</button>
                  </div>
                  <div class="excerpt-image-position-wrap">
                    <span class="excerpt-label">이미지 위치</span>
                    <div class="excerpt-image-position" aria-label="이미지 위치 선택">
                      ${['top-left','top-center','top-right','middle-left','middle-center','middle-right','bottom-left','bottom-center','bottom-right'].map(position => `<button class="${position === 'middle-center' ? 'active' : ''}" type="button" data-excerpt-image-position="${position}" aria-label="${position}" aria-pressed="${position === 'middle-center'}"></button>`).join('')}
                    </div>
                  </div>
                  <button class="excerpt-reset-button" id="excerptImageReset" type="button">이미지 맞춤·이동 초기화</button>
                </div>
              </div>
            </section>
            <section class="excerpt-section excerpt-section-save">
              <h4 class="excerpt-section-title">저장</h4>
              <div class="excerpt-action-buttons">
                <button class="excerpt-action-button primary" id="excerptDownloadBtn" type="button">이미지 저장</button>
                <button class="excerpt-action-button" id="excerptShareBtn" type="button">공유</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>`);

  ['#excerptWorkTitle', '#excerptAuthor', '#excerptText'].forEach(selector => {
    $(selector).addEventListener('input', drawExcerptCanvas);
  });
  $$('[data-excerpt-bg]').forEach(button => button.addEventListener('click', () => setExcerptBackground(button.dataset.excerptBg)));
  $$('[data-excerpt-ratio]').forEach(button => button.addEventListener('click', () => setExcerptRatio(button.dataset.excerptRatio)));
  $$('[data-excerpt-font]').forEach(button => button.addEventListener('click', () => {
    excerptState.fontFamily = button.dataset.excerptFont;
    setExcerptActive('[data-excerpt-font]', button);
    document.fonts?.load(`24px ${excerptState.fontFamily}`).catch(() => {});
    document.fonts?.ready.then(drawExcerptCanvas);
    drawExcerptCanvas();
  }));
  $$('[data-excerpt-align]').forEach(button => button.addEventListener('click', () => {
    excerptState.textAlign = button.dataset.excerptAlign;
    setExcerptActive('[data-excerpt-align]', button);
    drawExcerptCanvas();
  }));
  $$('[data-excerpt-wrap]').forEach(button => button.addEventListener('click', () => {
    excerptState.wrapMode = button.dataset.excerptWrap === 'word' ? 'word' : 'char';
    setExcerptActive('[data-excerpt-wrap]', button);
    drawExcerptCanvas();
  }));
  $('#excerptFontSize').addEventListener('input', event => updateExcerptNumber('fontSize', event.target.value, 24, 72, 40));
  $('#excerptLineHeight').addEventListener('input', event => updateExcerptNumber('lineHeightScale', event.target.value, 1.2, 3.2, 2.35));
  $('#excerptParagraphGap').addEventListener('input', event => updateExcerptNumber('paragraphGap', event.target.value, 0, 90, 23));
  $('#excerptMargin').addEventListener('input', event => updateExcerptNumber('margin', event.target.value, 40, 140, 76));
  $$('[data-excerpt-color]').forEach(button => button.addEventListener('click', () => {
    excerptState.textColor = button.dataset.excerptColor;
    setExcerptActive('[data-excerpt-color]', button);
    drawExcerptCanvas();
  }));
  $$('[data-excerpt-adjust]').forEach(setupExcerptAdjustButton);
  $('#excerptIndentToggle').addEventListener('click', toggleExcerptIndent);
  $('#excerptSmartQuoteToggle').addEventListener('click', toggleExcerptSmartQuotes);
  $('#excerptLargeInputToggle').addEventListener('click', toggleExcerptLargeInput);
  $('#excerptClearInput').addEventListener('click', clearExcerptInputs);
  $('#excerptImage').addEventListener('change', event => loadExcerptImage(event.target.files?.[0]));
  $('#excerptImageDelete').addEventListener('click', deleteExcerptImage);
  $('#excerptImageReset').addEventListener('click', resetExcerptImageTransform);
  $('#excerptImageScale').addEventListener('input', event => setExcerptImageScale(event.target.value));
  $('#excerptImageOverlay').addEventListener('input', event => setExcerptImageOverlay(event.target.value));
  $$('[data-excerpt-image-adjust]').forEach(setupExcerptImageAdjustButton);
  $$('[data-excerpt-image-fit]').forEach(button => button.addEventListener('click', () => setExcerptImageFit(button.dataset.excerptImageFit)));
  $$('[data-excerpt-image-position]').forEach(button => button.addEventListener('click', () => setExcerptImagePosition(button.dataset.excerptImagePosition)));
  $('#excerptCanvas').addEventListener('pointerdown', handleExcerptPointerDown);
  $('#excerptCanvas').addEventListener('pointermove', handleExcerptPointerMove);
  $('#excerptCanvas').addEventListener('pointerup', handleExcerptPointerEnd);
  $('#excerptCanvas').addEventListener('pointercancel', handleExcerptPointerEnd);
  $('#excerptCanvas').addEventListener('lostpointercapture', handleExcerptPointerEnd);
  $('#excerptCanvas').addEventListener('wheel', handleExcerptWheel, { passive: false });
  $('#excerptDownloadBtn').addEventListener('click', downloadExcerptImage);
  $('#excerptShareBtn').addEventListener('click', shareExcerptImage);
}

function setExcerptActive(selector, activeButton) {
  $$(selector).forEach(button => {
    const active = button === activeButton;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function setExcerptRatio(ratio) {
  const canvas = $('#excerptCanvas');
  const sizes = {
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '16:9': [1920, 1080]
  };
  const [width, height] = sizes[ratio] || sizes['1:1'];
  excerptState.ratio = ratio in sizes ? ratio : '1:1';
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;
  setExcerptActive('[data-excerpt-ratio]', document.querySelector(`[data-excerpt-ratio="${excerptState.ratio}"]`));
  resetExcerptImageTransform();
}

function updateExcerptNumber(key, value, min, max, fallback) {
  const parsed = Number(value);
  excerptState[key] = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  drawExcerptCanvas();
}

const excerptNumberControls = {
  fontSize: { input: '#excerptFontSize', min: 24, max: 72, step: 1, fallback: 40 },
  lineHeightScale: { input: '#excerptLineHeight', min: 1.2, max: 3.2, step: 0.05, fallback: 2.35 },
  paragraphGap: { input: '#excerptParagraphGap', min: 0, max: 90, step: 1, fallback: 23 },
  margin: { input: '#excerptMargin', min: 40, max: 140, step: 1, fallback: 76 }
};

function adjustExcerptNumber(key, direction) {
  const control = excerptNumberControls[key];
  if (!control) return;
  const input = $(control.input);
  const current = Number(input.value);
  const next = Math.min(control.max, Math.max(control.min, (Number.isFinite(current) ? current : control.fallback) + control.step * direction));
  const decimals = control.step < 1 ? 2 : 0;
  input.value = Number(next.toFixed(decimals));
  updateExcerptNumber(key, input.value, control.min, control.max, control.fallback);
}

function setupExcerptAdjustButton(button) {
  let holdTimer = null;
  let repeatTimer = null;
  let held = false;
  const run = () => adjustExcerptNumber(button.dataset.excerptAdjust, Number(button.dataset.direction) || 1);
  const stop = () => {
    clearTimeout(holdTimer);
    clearInterval(repeatTimer);
    holdTimer = null;
    repeatTimer = null;
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    held = false;
    holdTimer = setTimeout(() => {
      held = true;
      run();
      repeatTimer = setInterval(run, 90);
    }, 380);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => button.addEventListener(type, stop));
  button.addEventListener('click', () => {
    if (!held) run();
    held = false;
  });
}

function clearExcerptInputs() {
  $('#excerptText').value = '';
  $('#excerptAuthor').value = '';
  $('#excerptWorkTitle').value = '';
  drawExcerptCanvas();
}

function toggleExcerptIndent() {
  excerptState.indent = !excerptState.indent;
  const button = $('#excerptIndentToggle');
  button.classList.toggle('active', excerptState.indent);
  button.setAttribute('aria-pressed', excerptState.indent ? 'true' : 'false');
  button.innerHTML = `<span aria-hidden="true">≡</span> 들여쓰기 ${excerptState.indent ? 'ON' : 'OFF'}`;
  drawExcerptCanvas();
}

function toggleExcerptSmartQuotes() {
  excerptState.smartQuotes = !excerptState.smartQuotes;
  const button = $('#excerptSmartQuoteToggle');
  button.classList.toggle('active', excerptState.smartQuotes);
  button.setAttribute('aria-pressed', excerptState.smartQuotes ? 'true' : 'false');
  drawExcerptCanvas();
}

function toggleExcerptLargeInput() {
  const textarea = $('#excerptText');
  const button = $('#excerptLargeInputToggle');
  const large = !textarea.classList.contains('is-large');
  textarea.classList.toggle('is-large', large);
  textarea.rows = large ? 13 : 7;
  button.classList.toggle('active', large);
  button.setAttribute('aria-pressed', large ? 'true' : 'false');
}

function setExcerptBackground(background) {
  excerptState.background = background;
  const active = document.querySelector(`[data-excerpt-bg="${background}"]`);
  if (active) setExcerptActive('[data-excerpt-bg]', active);
  if (background === 'dark' || background === 'purple-blue' || background === 'dark-purple') {
    excerptState.textColor = '#f4f4f5';
  } else {
    excerptState.textColor = '#202124';
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
  excerptState.ratio = '1:1';
  excerptState.background = 'dark';
  excerptState.textColor = '#f4f4f5';
  excerptState.fontFamily = 'Pretendard, sans-serif';
  excerptState.fontSize = 40;
  excerptState.lineHeightScale = 2.35;
  excerptState.paragraphGap = 23;
  excerptState.margin = 76;
  excerptState.lineBreak = true;
  excerptState.indent = false;
  excerptState.smartQuotes = true;
  excerptState.wrapMode = 'char';
  excerptState.textAlign = 'center';
  excerptState.image = null;
  excerptState.imageFileName = '';
  excerptState.imageFit = 'cover';
  excerptState.imagePosition = 'middle-center';
  excerptState.overlayOpacity = 0;
  excerptState.imageScale = 1;
  excerptState.imageX = 0;
  excerptState.imageY = 0;
  excerptState.pointers.clear();
  excerptState.pinch = null;
  excerptState.dragPoint = null;
  $('#excerptWorkTitle').value = post.title || '';
  $('#excerptAuthor').value = post.author || '';
  $('#excerptText').value = post.quote || '';
  $('#excerptFontSize').value = 40;
  $('#excerptLineHeight').value = 2.35;
  $('#excerptParagraphGap').value = 23;
  $('#excerptMargin').value = 76;
  $('#excerptImage').value = '';
  $('#excerptImageScale').value = 100;
  $('#excerptImageOverlay').value = 0;
  $('#excerptImagePanel').hidden = true;
  $('#excerptPhotoAddLabel').hidden = false;
  $('#excerptText').classList.remove('is-large');
  $('#excerptText').rows = 7;
  $('#excerptIndentToggle').innerHTML = '<span aria-hidden="true">≡</span> 들여쓰기 OFF';
  $('#excerptIndentToggle').classList.remove('active');
  $('#excerptIndentToggle').setAttribute('aria-pressed', 'false');
  $('#excerptSmartQuoteToggle').classList.add('active');
  $('#excerptSmartQuoteToggle').setAttribute('aria-pressed', 'true');
  $('#excerptLargeInputToggle').classList.remove('active');
  $('#excerptLargeInputToggle').setAttribute('aria-pressed', 'false');
  setExcerptRatio('1:1');
  setExcerptActive('[data-excerpt-bg]', $('[data-excerpt-bg="dark"]'));
  setExcerptActive('[data-excerpt-font]', $('[data-excerpt-font="Pretendard, sans-serif"]'));
  setExcerptActive('[data-excerpt-align]', $('[data-excerpt-align="center"]'));
  setExcerptActive('[data-excerpt-wrap]', $('[data-excerpt-wrap="char"]'));
  setExcerptActive('[data-excerpt-color]', $('[data-excerpt-color="#f4f4f5"]'));
  setExcerptActive('[data-excerpt-image-fit]', $('[data-excerpt-image-fit="cover"]'));
  setExcerptActive('[data-excerpt-image-position]', $('[data-excerpt-image-position="middle-center"]'));
  $('#excerptModalTitle').textContent = excerptState.mode === 'winner'
    ? '냐쭙 포타 명장면 우승짤 만들기👑'
    : '마음에 드는 포타 명장면 짤 만들기';
  openModal('excerptModal');
  requestAnimationFrame(drawExcerptCanvas);
  document.fonts?.ready.then(drawExcerptCanvas);
}

function excerptPalette(ctx, width, height) {
  if (excerptState.background === 'light') return '#f7f5ef';
  if (excerptState.background === 'dark') return '#101114';
  if (excerptState.background === 'purple-blue') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(0.52, '#4f46e5');
    gradient.addColorStop(1, '#0284c7');
    return gradient;
  }
  if (excerptState.background === 'dark-purple') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#160d21');
    gradient.addColorStop(0.55, '#342044');
    gradient.addColorStop(1, '#615174');
    return gradient;
  }
  if (excerptState.background === 'sky-blue') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#edf9ff');
    gradient.addColorStop(0.52, '#cceafb');
    gradient.addColorStop(1, '#a9d3ea');
    return gradient;
  }
  return '#101114';
}

function resetExcerptImageTransform() {
  excerptState.imageScale = 1;
  excerptState.imageX = 0;
  excerptState.imageY = 0;
  excerptState.imageFit = 'cover';
  excerptState.imagePosition = 'middle-center';
  excerptState.pointers.clear();
  excerptState.pinch = null;
  excerptState.dragPoint = null;
  $('#excerptCanvas').classList.remove('is-dragging');
  const scaleInput = $('#excerptImageScale');
  if (scaleInput) scaleInput.value = 100;
  const fitButton = $('[data-excerpt-image-fit="cover"]');
  if (fitButton) setExcerptActive('[data-excerpt-image-fit]', fitButton);
  const positionButton = $('[data-excerpt-image-position="middle-center"]');
  if (positionButton) setExcerptActive('[data-excerpt-image-position]', positionButton);
  drawExcerptCanvas();
}

function loadExcerptImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      excerptState.image = image;
      excerptState.imageFileName = file.name || '선택한 사진';
      $('#excerptImageFileName').textContent = excerptState.imageFileName;
      $('#excerptPhotoAddLabel').hidden = true;
      $('#excerptImagePanel').hidden = false;
      resetExcerptImageTransform();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function deleteExcerptImage() {
  excerptState.image = null;
  excerptState.imageFileName = '';
  excerptState.overlayOpacity = 0;
  $('#excerptImage').value = '';
  $('#excerptImageOverlay').value = 0;
  $('#excerptImageFileName').textContent = '';
  $('#excerptImagePanel').hidden = true;
  $('#excerptPhotoAddLabel').hidden = false;
  resetExcerptImageTransform();
}

function setExcerptImageFit(fit) {
  excerptState.imageFit = fit === 'contain' ? 'contain' : 'cover';
  excerptState.imageX = 0;
  excerptState.imageY = 0;
  const button = document.querySelector(`[data-excerpt-image-fit="${excerptState.imageFit}"]`);
  if (button) setExcerptActive('[data-excerpt-image-fit]', button);
  drawExcerptCanvas();
}

function setExcerptImagePosition(position) {
  const allowed = new Set(['top-left','top-center','top-right','middle-left','middle-center','middle-right','bottom-left','bottom-center','bottom-right']);
  excerptState.imagePosition = allowed.has(position) ? position : 'middle-center';
  excerptState.imageX = 0;
  excerptState.imageY = 0;
  const button = document.querySelector(`[data-excerpt-image-position="${excerptState.imagePosition}"]`);
  if (button) setExcerptActive('[data-excerpt-image-position]', button);
  drawExcerptCanvas();
}

function setExcerptImageScale(value) {
  const percent = Math.min(400, Math.max(50, Number(value) || 100));
  excerptState.imageScale = percent / 100;
  $('#excerptImageScale').value = percent;
  drawExcerptCanvas();
}

function setExcerptImageOverlay(value) {
  const opacity = Math.min(80, Math.max(-80, Number(value) || 0));
  excerptState.overlayOpacity = opacity;
  $('#excerptImageOverlay').value = opacity;
  drawExcerptCanvas();
}

function setupExcerptImageAdjustButton(button) {
  let timer = null;
  let interval = null;
  const run = () => {
    if (button.dataset.excerptImageAdjust === 'scale') {
      setExcerptImageScale(excerptState.imageScale * 100 + (Number(button.dataset.direction) || 1) * 5);
    } else {
      setExcerptImageOverlay(excerptState.overlayOpacity + (Number(button.dataset.direction) || 1) * 5);
    }
  };
  const stop = () => { clearTimeout(timer); clearInterval(interval); timer = null; interval = null; };
  button.addEventListener('click', run);
  button.addEventListener('pointerdown', () => { timer = setTimeout(() => { run(); interval = setInterval(run, 85); }, 420); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => button.addEventListener(type, stop));
}

function excerptCoverMetrics(scale = excerptState.imageScale) {
  const image = excerptState.image;
  const canvas = $('#excerptCanvas');
  if (!image || !canvas) return null;
  const baseScale = excerptState.imageFit === 'contain'
    ? Math.min(canvas.width / image.width, canvas.height / image.height)
    : Math.max(canvas.width / image.width, canvas.height / image.height);
  const actualScale = baseScale * scale;
  const drawWidth = image.width * actualScale;
  const drawHeight = image.height * actualScale;
  const [vertical, horizontal] = excerptState.imagePosition.split('-');
  const baseX = horizontal === 'left' ? 0 : horizontal === 'right' ? canvas.width - drawWidth : (canvas.width - drawWidth) / 2;
  const baseY = vertical === 'top' ? 0 : vertical === 'bottom' ? canvas.height - drawHeight : (canvas.height - drawHeight) / 2;
  return {
    drawWidth,
    drawHeight,
    x: baseX + excerptState.imageX,
    y: baseY + excerptState.imageY
  };
}

function excerptCanvasPoint(event) {
  const canvas = $('#excerptCanvas');
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function zoomExcerptImageAt(point, nextScale, anchor = null) {
  if (!excerptState.image) return;
  const current = excerptCoverMetrics();
  if (!current) return;
  const fixedAnchor = anchor || {
    u: (point.x - current.x) / current.drawWidth,
    v: (point.y - current.y) / current.drawHeight
  };
  const scale = Math.min(4, Math.max(0.5, nextScale));
  const canvas = $('#excerptCanvas');
  const baseScale = excerptState.imageFit === 'contain'
    ? Math.min(canvas.width / excerptState.image.width, canvas.height / excerptState.image.height)
    : Math.max(canvas.width / excerptState.image.width, canvas.height / excerptState.image.height);
  const drawWidth = excerptState.image.width * baseScale * scale;
  const drawHeight = excerptState.image.height * baseScale * scale;
  const [vertical, horizontal] = excerptState.imagePosition.split('-');
  const baseX = horizontal === 'left' ? 0 : horizontal === 'right' ? canvas.width - drawWidth : (canvas.width - drawWidth) / 2;
  const baseY = vertical === 'top' ? 0 : vertical === 'bottom' ? canvas.height - drawHeight : (canvas.height - drawHeight) / 2;
  excerptState.imageScale = scale;
  $('#excerptImageScale').value = Math.round(scale * 100);
  excerptState.imageX = point.x - fixedAnchor.u * drawWidth - baseX;
  excerptState.imageY = point.y - fixedAnchor.v * drawHeight - baseY;
  drawExcerptCanvas();
}

function beginExcerptPinch() {
  if (excerptState.pointers.size < 2 || !excerptState.image) {
    excerptState.pinch = null;
    return;
  }
  const [a, b] = [...excerptState.pointers.values()];
  const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const metrics = excerptCoverMetrics();
  excerptState.pinch = {
    distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    scale: excerptState.imageScale,
    anchor: {
      u: (center.x - metrics.x) / metrics.drawWidth,
      v: (center.y - metrics.y) / metrics.drawHeight
    }
  };
}

function handleExcerptPointerDown(event) {
  if (!excerptState.image) return;
  event.preventDefault();
  $('#excerptCanvas').setPointerCapture?.(event.pointerId);
  const point = excerptCanvasPoint(event);
  excerptState.pointers.set(event.pointerId, point);
  $('#excerptCanvas').classList.add('is-dragging');
  if (excerptState.pointers.size === 1) excerptState.dragPoint = point;
  else beginExcerptPinch();
}

function handleExcerptPointerMove(event) {
  if (!excerptState.pointers.has(event.pointerId) || !excerptState.image) return;
  event.preventDefault();
  const point = excerptCanvasPoint(event);
  excerptState.pointers.set(event.pointerId, point);
  if (excerptState.pointers.size >= 2) {
    if (!excerptState.pinch) beginExcerptPinch();
    const [a, b] = [...excerptState.pointers.values()];
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    zoomExcerptImageAt(center, excerptState.pinch.scale * (distance / excerptState.pinch.distance), excerptState.pinch.anchor);
    return;
  }
  if (excerptState.dragPoint) {
    excerptState.imageX += point.x - excerptState.dragPoint.x;
    excerptState.imageY += point.y - excerptState.dragPoint.y;
    excerptState.dragPoint = point;
    drawExcerptCanvas();
  }
}

function handleExcerptPointerEnd(event) {
  excerptState.pointers.delete(event.pointerId);
  try { $('#excerptCanvas').releasePointerCapture?.(event.pointerId); } catch (_) {}
  excerptState.pinch = null;
  excerptState.dragPoint = excerptState.pointers.size === 1 ? [...excerptState.pointers.values()][0] : null;
  if (!excerptState.pointers.size) $('#excerptCanvas').classList.remove('is-dragging');
}

function handleExcerptWheel(event) {
  if (!excerptState.image) return;
  event.preventDefault();
  const factor = Math.exp(-event.deltaY * 0.0015);
  zoomExcerptImageAt(excerptCanvasPoint(event), excerptState.imageScale * factor);
}

function wrapExcerptText(ctx, value, maxWidth, preserveLineBreaks = true) {
  const normalized = String(value || '').replace(/\r\n?/g, '\n').trim();
  const source = preserveLineBreaks ? normalized : normalized.replace(/\s+/g, ' ');
  const lines = [];
  const paragraphs = preserveLineBreaks ? source.split('\n') : [source];
  paragraphs.forEach(paragraph => {
    if (!paragraph) {
      lines.push('');
    } else if (excerptState.wrapMode === 'word') {
      let line = '';
      const tokens = paragraph.match(/\S+\s*/g) || [paragraph];
      tokens.forEach(token => {
        const next = line + token;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line.trimEnd());
          line = token.trimStart();
        } else if (!line && ctx.measureText(token).width > maxWidth) {
          let charLine = '';
          for (const character of [...token]) {
            const charNext = charLine + character;
            if (charLine && ctx.measureText(charNext).width > maxWidth) {
              lines.push(charLine);
              charLine = character;
            } else {
              charLine = charNext;
            }
          }
          line = charLine;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line.trimEnd());
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
    lines.push('');
  });
  return lines.filter((line, index, all) => line || (index > 0 && index < all.length - 1));
}

function applyExcerptSmartQuotes(value) {
  if (!excerptState.smartQuotes) return value;
  let openDouble = true;
  let openSingle = true;
  return String(value).replace(/["']/g, mark => {
    if (mark === '"') {
      const next = openDouble ? '“' : '”';
      openDouble = !openDouble;
      return next;
    }
    const next = openSingle ? '‘' : '’';
    openSingle = !openSingle;
    return next;
  });
}

function limitExcerptLines(lines, maxTextLines) {
  const visible = [];
  let count = 0;
  for (const line of lines) {
    if (line && count >= maxTextLines) break;
    visible.push(line);
    if (line) count += 1;
  }
  while (visible.length && !visible[visible.length - 1]) visible.pop();
  return visible;
}

function drawJustifiedExcerptLine(ctx, line, x, y, width, isParagraphEnd) {
  if (isParagraphEnd || !line) {
    ctx.fillText(line, x, y);
    return;
  }
  const units = excerptState.wrapMode === 'word'
    ? line.trim().split(/\s+/).filter(Boolean)
    : [...line];
  if (units.length < 2) {
    ctx.fillText(line, x, y);
    return;
  }
  const contentWidth = units.reduce((total, unit) => total + ctx.measureText(unit).width, 0);
  const gap = Math.max(0, (width - contentWidth) / (units.length - 1));
  let cursor = x;
  units.forEach(unit => {
    ctx.fillText(unit, cursor, y);
    cursor += ctx.measureText(unit).width + gap;
  });
}

function drawExcerptCanvas() {
  const canvas = $('#excerptCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const margin = excerptState.margin;
  const textColor = excerptState.textColor;
  const isLightText = textColor === '#f4f4f5';
  const mutedColor = isLightText ? 'rgba(244,244,245,0.78)' : 'rgba(32,33,36,0.72)';
  const darkBackground = !['light', 'sky-blue'].includes(excerptState.background);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = excerptPalette(ctx, width, height);
  ctx.fillRect(0, 0, width, height);

  if (excerptState.image) {
    const metrics = excerptCoverMetrics();
    ctx.drawImage(excerptState.image, metrics.x, metrics.y, metrics.drawWidth, metrics.drawHeight);
    if (excerptState.overlayOpacity) {
      const amount = Math.abs(excerptState.overlayOpacity) / 100;
      ctx.fillStyle = excerptState.overlayOpacity > 0 ? `rgba(0,0,0,${amount})` : `rgba(255,255,255,${amount})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  if (excerptState.mode === 'winner') {
    const roundLabel = '내가 뽑은 냐쭙 포타 명장면 우승👑';
    ctx.font = `600 24px ${excerptState.fontFamily}`;
    const labelPaddingX = 22;
    const labelWidth = Math.ceil(ctx.measureText(roundLabel).width) + labelPaddingX * 2;
    ctx.fillStyle = isLightText ? 'rgba(255,255,255,0.14)' : 'rgba(32,33,36,0.10)';
    roundRect(ctx, margin, 58, labelWidth, 58, 29);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(roundLabel, margin + labelPaddingX, 87);
  }

  let quote = applyExcerptSmartQuotes($('#excerptText').value.trim() || '명장면 본문을 입력해 주세요.');
  const quotePairs = { '"': '"', '“': '”' };
  if (quote.length >= 2 && quotePairs[quote[0]] === quote[quote.length - 1]) quote = quote.slice(1, -1).trim();
  const fontSize = excerptState.fontSize;
  const lineHeight = Math.round(fontSize * excerptState.lineHeightScale);
  const paragraphGap = Math.round(excerptState.paragraphGap);
  ctx.font = `${fontSize}px ${excerptState.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = textColor;
  const textWidth = Math.min(width - margin * 2, Math.round(width * 0.79));
  const textBlockHeight = Math.max(260, Math.round(height * 0.59));
  const maxTextLines = Math.min(11, Math.floor(textBlockHeight / lineHeight) + 1);
  const lines = limitExcerptLines(wrapExcerptText(ctx, quote, textWidth, excerptState.lineBreak), maxTextLines);
  const positionedLines = [];
  let lineOffset = 0;
  let firstVisibleLine = true;
  lines.forEach((line, index) => {
    if (line) {
      positionedLines.push({
        line,
        offset: lineOffset,
        indent: excerptState.indent && firstVisibleLine,
        isParagraphEnd: !lines[index + 1]
      });
      lineOffset += lineHeight;
      firstVisibleLine = false;
    } else {
      lineOffset += paragraphGap;
    }
  });
  const lastLineOffset = positionedLines[positionedLines.length - 1]?.offset || 0;
  const quoteCenterY = Math.round(height * (excerptState.ratio === '4:5' ? 0.38 : 0.407));
  const quoteTop = Math.round(quoteCenterY - lastLineOffset / 2);
  const textLeft = margin;
  const textRight = textLeft + textWidth;
  const textCenter = textLeft + textWidth / 2;
  ctx.textAlign = excerptState.textAlign === 'center' ? 'center' : excerptState.textAlign === 'right' ? 'right' : 'left';
  positionedLines.forEach(({ line, offset, indent, isParagraphEnd }) => {
    const indentWidth = indent ? Math.round(fontSize * 1.15) : 0;
    if (excerptState.textAlign === 'justify') {
      drawJustifiedExcerptLine(ctx, line, textLeft + indentWidth, quoteTop + offset, textWidth - indentWidth, isParagraphEnd);
      return;
    }
    const lineX = excerptState.textAlign === 'center'
      ? textCenter
      : excerptState.textAlign === 'right'
        ? textRight
        : textLeft + indentWidth;
    ctx.fillText(line, lineX, quoteTop + offset);
  });

  const title = $('#excerptWorkTitle').value.trim() || '작품 제목';
  const author = $('#excerptAuthor').value.trim() || '작가';
  ctx.fillStyle = mutedColor;
  const lastLineY = quoteTop + lastLineOffset;
  const metaY = Math.min(Math.max(lastLineY + fontSize + 76, Math.round(height * 0.59)), height - 190);
  ctx.textAlign = excerptState.textAlign === 'justify' ? 'left' : excerptState.textAlign;
  const metaX = excerptState.textAlign === 'center' ? textCenter : excerptState.textAlign === 'right' ? textRight : textLeft;
  ctx.font = `400 40px ${excerptState.fontFamily}`;
  ctx.fillText(title, metaX, metaY);
  ctx.fillStyle = isLightText ? 'rgba(244,244,245,0.58)' : 'rgba(32,33,36,0.56)';
  ctx.font = `32px ${excerptState.fontFamily}`;
  ctx.fillText(author, metaX, metaY + 58);
  ctx.fillStyle = darkBackground ? 'rgba(244,244,245,0.38)' : 'rgba(32,33,36,0.38)';
  ctx.font = `24px ${excerptState.fontFamily}`;
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
  const button = $('#excerptDownloadBtn');
  button.disabled = true;
  const blob = await excerptCanvasBlob();
  if (!blob) {
    showToast('이미지를 만들지 못했어요.');
    button.disabled = false;
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
  button.disabled = false;
}

async function shareExcerptImage() {
  const button = $('#excerptShareBtn');
  button.disabled = true;
  const blob = await excerptCanvasBlob();
  if (!blob) {
    showToast('이미지를 만들지 못했어요.');
    button.disabled = false;
    return;
  }
  const file = new File([blob], excerptFileName(), { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: $('#excerptWorkTitle').value.trim() || '냐쭙짤' });
      showToast('공유창을 열었어요.');
    } else {
      showToast('이 브라우저는 파일 공유를 지원하지 않아 이미지 저장으로 대신할게요.');
      await downloadExcerptImage();
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('공유하지 못했어요.');
  } finally {
    button.disabled = false;
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
  return post.titles ? card.replace(
    '<div class="post-actions">',
    `<div class="ranking-stats"><span class="win-rate">우승👑 ${post.titles}</span></div><div class="post-actions">`
  ) : card;
}

function loadTournamentLeaderboard() {
  const list = $('#rankingList');
  if (!list) return;
  const ranked = posts.filter(post => post.titles > 0).sort((a, b) =>
    b.titles - a.titles || likeCount(b) - likeCount(a) || new Date(b.createdAt) - new Date(a.createdAt)
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
    <div class="comments-section ${open ? 'open' : ''}"><div class="comment-list">${renderCommentsHTML(comments)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea placeholder="냐쭙타입에게 힘이 되는 한마디 남기기" rows="1" maxlength="500"></textarea><div class="comment-form-row"><button class="btn" type="button" data-submit-comment="${esc(post.id)}">등록</button></div></div></div>
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
  $('#tournamentResult').innerHTML = `<div class="tournament-result"><div class="winner-label">🏆 우승</div>${rankCard(ranking[0], 0)}<div class="result-ranking">${ranking.slice(1).map((post, index) => `<div class="result-ranking-item"><div class="result-rank">${index === 0 ? '🥈' : index === 1 ? '🥉' : index + 2}</div><div class="result-ranking-info"><div class="result-ranking-title">${esc(post.title)} <span class="result-ranking-author">· ${esc(post.author)}</span></div><div class="post-body result-quote">${esc(post.quote)}</div></div></div>`).join('')}</div><div class="result-actions"><button class="tournament-btn" id="resultExcerptBtn" type="button">냐쭙 포타 명장면 우승짤 만들기👑</button><button class="tournament-btn tournament-btn-ghost" id="resultRankingBtn" type="button">랭킹 보기</button><button class="tournament-btn tournament-btn-ghost" id="resultAgainBtn" type="button">다시하기</button></div></div>`;
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

  const histories = Array.isArray(legacyState.sortHistory) ? legacyState.sortHistory : [];

  localStorage.setItem(migrationKey, JSON.stringify({
    migratedAt: new Date().toISOString(),
    posts: validPosts.length,
    likes: likeRows.length,
    comments: commentRows.length,
    sortRuns: 0,
    skippedSorts: histories.length
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
