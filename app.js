const STORAGE_KEY = 'najjubtype-posts-v3';
const STATE_KEY = 'najjubtype-state-v3';
const avatar = './assets/avatar_blank.png';

const demoPosts = [
  {
    id: 'demo-1', title: '라인을 준수하세요', author: '옥잠', link: '#',
    quote: `시험 끝났어 유나야.\n\n사실 널 시험하기보다는 날 시험한 거였어.\n\n이제 알 것 같아. 너를 믿고 싶어. 네 마음을 믿고 싶어.\n\n좋아해. 선 넘어도 돼. 그래도 돼.`,
    reason: '', createdAt: '2026-08-09T03:30:00+09:00', baseLikes: 0,
    comments: []
  },
  {
    id: 'demo-2', title: '라인을 준수하세요', author: '옥잠', link: '#',
    quote: `너 이제 진짜 큰일 난 거야.\n\n나 같은 애들은 한 번 손에 쥐면 절대 안 놔주거든.\n\n노유나가 비죽 웃었다. 멱살이 틀어 잡힌 채 듣는 경고가 뭐가 그리 좋다고 웃었다. 살벌하지만 달콤한 경고가 사랑스러웠다. 참을 수 없이 애타는 속에 고개를 비스듬히 틀며 다가갔다. 단숨에 좁혀진 거리에 놀라 숨을 참는 얼굴 위로 속삭였다. 큰일? 김주은 네가 잘 몰라서 그러는데....\n\n- 그거야말로 내가 바라는 바야.`,
    reason: '', createdAt: '2026-08-09T03:20:00+09:00', baseLikes: 0,
    comments: []
  },
  {
    id: 'demo-3', title: '야 나 좀 아포', author: '옥잠', link: '#',
    quote: `- 상식적으로, 도의적으로, 인간적으로.\n- ....\n- ....한 번 더 하자.\n- 나도 그 말 하려고 했어...`,
    reason: '', createdAt: '2026-08-09T03:10:00+09:00', baseLikes: 0,
    comments: []
  },
  {
    id: 'demo-4', title: '꼬우면 한판 떠', author: '옥잠', link: '#',
    quote: `- 야아 너 다 알면서 왜 그러냐 진짜...\n- 빨리 말해. 머리 굴리지 말고.\n- 아... 진짜 주은아 쫌....\n- 예~ 할 말 있으세요?\n- ...귀 대봐바.\n\n진짜니너무귀여우니까그만해... 니 너무 예뻐서 나 죽겠다고 진짜... 존나 사랑해 개사랑해 여기 빨리 파토내고 너 들쳐업고 집으로 튀고 싶어... 이상입니다.`,
    reason: '', createdAt: '2026-08-09T03:00:00+09:00', baseLikes: 0,
    comments: []
  }
];

let posts = loadPosts();
let ui = loadState();
let currentView = 'top';
let currentCommentPostId = null;
let editingPostId = null;
let sortSession = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function loadPosts(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return [...demoPosts, ...saved];
  }catch{return [...demoPosts];}
}
function saveCustomPosts(){
  const custom = posts.filter(p => !String(p.id).startsWith('demo-'));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}
function loadState(){
  try{return Object.assign({liked:[],saved:[],likeDelta:{},comments:{},lastSort:null}, JSON.parse(localStorage.getItem(STATE_KEY)||'{}'));}
  catch{return {liked:[],saved:[],likeDelta:{},comments:{},lastSort:null};}
}
function saveState(){localStorage.setItem(STATE_KEY, JSON.stringify(ui));}
function showToast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200);}
function escapeHTML(str=''){return String(str).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));}
function safeLink(url){if(!url || url==='#') return '#'; try{const u=new URL(url); return /^https?:$/.test(u.protocol)?u.href:'#';}catch{return '#';}}
function timeAgo(date){
  const diff=Math.max(0,Date.now()-new Date(date).getTime()); const m=Math.floor(diff/60000);
  if(m<1)return '방금 전'; if(m<60)return `${m}분 전`; const h=Math.floor(m/60); if(h<24)return `${h}시간 전`; const d=Math.floor(h/24); if(d<30)return `${d}일 전`; return new Date(date).toLocaleDateString('ko-KR',{year:'numeric',month:'numeric',day:'numeric'}).replace(/\s/g,'');
}
function getComments(p){return [...(p.comments||[]), ...(ui.comments[p.id]||[])];}
function likeCount(p){return (p.baseLikes||0)+(ui.likeDelta[p.id]||0);}

const icons = {
  heart:`<svg viewBox="0 0 24 24" fill="none"><path d="m10.82 20.116-.097-.09-6.844-6.355A5.882 5.882 0 0 1 2 9.359v-.13C2 6.48 3.953 4.12 6.656 3.606A5.71 5.71 0 0 1 12 5.417a5.562 5.562 0 0 1 .977-.871 5.73 5.73 0 0 1 4.367-.945A5.73 5.73 0 0 1 22 9.23v.129c0 1.636-.68 3.199-1.879 4.312l-6.844 6.355-.097.09c-.32.297-.742.465-1.18.465a1.72 1.72 0 0 1-1.18-.465Z" stroke="currentColor" stroke-width="1.65"/></svg>`,
  comment:`<svg viewBox="0 0 24 24" fill="none"><path d="M6.8 17.5c.6-.35 1.23-.45 1.8-.25 1 .38 2.18.63 3.4.63 4.87 0 8.12-3.15 8.12-6.25S16.87 5.38 12 5.38 3.88 8.52 3.88 11.63c0 1.25.48 2.45 1.39 3.48.34.38.5.88.46 1.39-.05.72-.2 1.36-.44 1.93.53-.22 1.04-.52 1.51-.93Z" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/></svg>`,
  bookmark:`<svg viewBox="0 0 24 24" fill="none"><path d="M5.25 4.88c0-1.04.84-1.88 1.88-1.88h9.74c1.04 0 1.88.84 1.88 1.88v15.65a.75.75 0 0 1-1.18.61L12 17.18l-5.57 3.96a.75.75 0 0 1-1.18-.61V4.88Z" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/></svg>`,
  share:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 14.8V3m0 0L7.5 7.5M12 3l4.5 4.5M4.25 14.5v4.25c0 .97.78 1.75 1.75 1.75h12c.97 0 1.75-.78 1.75-1.75V14.5" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  more:`<svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>`
};

function renderFeed(){
  let list=[...posts];
  if(currentView==='top') list.sort((a,b)=>likeCount(b)-likeCount(a)||new Date(b.createdAt)-new Date(a.createdAt));
  if(currentView==='new') list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $('#menuList').innerHTML = list.length ? list.map(renderCard).join('') : `<div class="empty-state">아직 등록된 명대사가 없어요.</div>`;
  bindCardMenus();
}
function renderCard(p){
  const comments=getComments(p); const first=comments[0]; const liked=ui.liked.includes(p.id); const saved=ui.saved.includes(p.id); const editable=!String(p.id).startsWith('demo-');
  const link=safeLink(p.link);
  return `<article class="menu-card" id="card-${escapeHTML(p.id)}"><div class="menu-card-body">
    <div class="post-header"><div class="post-header-left"><div class="post-avatar"><img src="${avatar}" alt=""></div><div class="post-header-info"><div class="post-author-badge">${escapeHTML(p.author||'익명')}</div><div class="post-meta-line">${timeAgo(p.createdAt)} · NAJJUBTYPE</div></div></div>
      <div class="post-more-wrapper"><button class="post-more-btn" data-menu="${escapeHTML(p.id)}" aria-label="더보기">${icons.more}</button><div class="post-dropdown" id="menu-${escapeHTML(p.id)}">${editable?`<button data-edit="${escapeHTML(p.id)}">수정</button><button class="danger" data-delete="${escapeHTML(p.id)}">삭제</button>`:`<button data-copy="${escapeHTML(p.id)}">링크 복사</button>`}</div></div></div>
    <div class="post-content"><h2 class="post-title">${link==='#'?escapeHTML(p.title):`<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.title)}</a>`}</h2><p class="post-body">${escapeHTML(p.quote)}</p>${p.reason?`<p class="post-reason">${escapeHTML(p.reason)}</p>`:''}</div>
    <div class="post-actions"><div class="post-actions-left"><button class="action-btn ${liked?'liked':''}" data-like="${escapeHTML(p.id)}">${icons.heart}<span>${likeCount(p)}</span></button><button class="action-btn" data-comment="${escapeHTML(p.id)}">${icons.comment}<span>${comments.length}</span></button></div><div class="post-actions-right"><button class="action-btn icon-only ${saved?'saved':''}" data-save="${escapeHTML(p.id)}" aria-label="저장">${icons.bookmark}</button><button class="action-btn icon-only" data-share="${escapeHTML(p.id)}" aria-label="공유">${icons.share}</button></div></div>
    <div class="post-comment-bubble" data-comment="${escapeHTML(p.id)}"><div class="post-comment-avatar"><img src="${avatar}" alt=""></div><p class="post-comment-text ${first?'':'no-comment'}">${first?escapeHTML(first.text):'첫 댓글을 남겨보세요.'}</p></div>
  </div></article>`;
}
function bindCardMenus(){
  $$('[data-menu]').forEach(b=>b.onclick=(e)=>{e.stopPropagation(); const menu=$(`#menu-${CSS.escape(b.dataset.menu)}`); $$('.post-dropdown.show').filter(x=>x!==menu).forEach(x=>x.classList.remove('show')); menu.classList.toggle('show');});
}

function setView(view){
  currentView=view;
  $$('.sort-bar button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const rank=view==='rank'; $('#feedView').hidden=rank; $('#rankView').hidden=!rank;
  if(!rank) renderFeed();
}

function toggleSubmit(){const form=$('#submitForm'); const btn=$('#submitToggle'); const next=form.hidden; form.hidden=!next; btn.setAttribute('aria-expanded',String(next)); if(next) $('#quoteInput').focus();}
function submitPost(){
  const quote=$('#quoteInput').value.trim(), title=$('#titleInput').value.trim(), author=$('#authorInput').value.trim(), link=$('#linkInput').value.trim(), reason=$('#reasonInput').value.trim();
  if(!quote||!title||!author){showToast('명대사, 작품 제목, 작가명은 입력해줘.');return;}
  const post={id:'user-'+Date.now(),title,author,link,quote,reason,createdAt:new Date().toISOString(),baseLikes:0,comments:[]}; posts.push(post); saveCustomPosts(); ['#quoteInput','#titleInput','#authorInput','#linkInput','#reasonInput'].forEach(id=>$(id).value=''); $('#submitForm').hidden=true; $('#submitToggle').setAttribute('aria-expanded','false'); setView('new'); showToast('명대사가 등록됐어요.');
}
function toggleLike(id){const p=posts.find(x=>x.id===id); if(!p)return; const liked=ui.liked.includes(id); if(liked){ui.liked=ui.liked.filter(x=>x!==id);ui.likeDelta[id]=(ui.likeDelta[id]||0)-1;}else{ui.liked.push(id);ui.likeDelta[id]=(ui.likeDelta[id]||0)+1;}saveState();renderFeed();}
function toggleSave(id){const saved=ui.saved.includes(id); ui.saved=saved?ui.saved.filter(x=>x!==id):[...ui.saved,id]; saveState();renderFeed();showToast(saved?'보관함에서 뺐어요.':'보관함에 저장했어요.');}
async function sharePost(id){const p=posts.find(x=>x.id===id);if(!p)return; const text=`${p.title} — ${p.author}\n\n${p.quote}\n\n#NAJJUBTYPE`; const url=safeLink(p.link)==='#'?location.href:safeLink(p.link); try{if(navigator.share) await navigator.share({title:p.title,text,url}); else{await navigator.clipboard.writeText(`${text}\n${url}`);showToast('공유 문구를 복사했어요.');}}catch(e){if(e.name!=='AbortError')showToast('공유하지 못했어요.');}}
function copyPost(id){const p=posts.find(x=>x.id===id);const url=safeLink(p?.link);navigator.clipboard?.writeText(url==='#'?location.href:url);showToast('링크를 복사했어요.');}

function openComments(id){currentCommentPostId=id;const p=posts.find(x=>x.id===id);if(!p)return; $('#commentPostPreview').innerHTML=`<div class="comment-preview"><div class="comment-preview-title">${escapeHTML(p.title)}</div><div class="comment-preview-quote">${escapeHTML(p.quote.replace(/\n/g,' '))}</div></div>`; renderComments(); openModal('commentModal'); setTimeout(()=>$('#commentInput').focus(),100);}
function renderComments(){const p=posts.find(x=>x.id===currentCommentPostId);const list=getComments(p);$('#commentList').innerHTML=list.length?list.map(c=>`<div class="comment-item"><img class="comment-avatar" src="${avatar}" alt=""><div class="comment-content"><div class="comment-head"><span class="comment-name">익명</span><span class="comment-time">${timeAgo(c.createdAt)}</span></div><div class="comment-text">${escapeHTML(c.text)}</div></div></div>`).join(''):`<div class="empty-state" style="padding:28px 0">아직 댓글이 없어요.</div>`;}
function submitComment(){const text=$('#commentInput').value.trim();if(!text){showToast('댓글을 입력해줘.');return;} const id=currentCommentPostId; ui.comments[id]=ui.comments[id]||[]; ui.comments[id].push({id:'comment-'+Date.now(),text,createdAt:new Date().toISOString()}); saveState(); $('#commentInput').value=''; renderComments(); renderFeed(); showToast('댓글을 등록했어요.');}

function openEdit(id){const p=posts.find(x=>x.id===id);if(!p||String(id).startsWith('demo-'))return; editingPostId=id; $('#editQuote').value=p.quote;$('#editWorkTitle').value=p.title;$('#editAuthor').value=p.author;$('#editLink').value=p.link||'';$('#editReason').value=p.reason||'';openModal('editModal');}
function saveEdit(){const p=posts.find(x=>x.id===editingPostId);if(!p)return; const quote=$('#editQuote').value.trim(),title=$('#editWorkTitle').value.trim(),author=$('#editAuthor').value.trim(); if(!quote||!title||!author){showToast('필수 항목을 확인해줘.');return;} Object.assign(p,{quote,title,author,link:$('#editLink').value.trim(),reason:$('#editReason').value.trim()});saveCustomPosts();closeModal('editModal');renderFeed();showToast('수정했어요.');}
function deletePost(id){if(String(id).startsWith('demo-'))return;if(!confirm('이 등록글을 삭제할까요?'))return;posts=posts.filter(x=>x.id!==id);saveCustomPosts();renderFeed();showToast('삭제했어요.');}

function openModal(id){const m=$('#'+id);m.classList.add('show');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closeModal(id){const m=$('#'+id);m.classList.remove('show');m.setAttribute('aria-hidden','true');document.body.style.overflow='';}

// Pairwise insertion sort: each choice places every item into a total order.
function startSort(){
  const items=[...posts].sort(()=>Math.random()-.5).slice(0,Math.min(12,posts.length));
  if(items.length<2){showToast('소트할 항목이 부족해요.');return;}
  sortSession={source:items, ranked:[items[0]], index:1, insertLow:0, insertHigh:0, current:items[1], comparisons:0, estimated:estimateComparisons(items.length)};
  $('#rankIntro').hidden=true;$('#rankResult').hidden=true;$('#rankGame').hidden=false;prepareInsertion();renderCompare();
}
function estimateComparisons(n){return Math.max(1,Math.ceil(n*Math.log2(Math.max(2,n))));}
function prepareInsertion(){const s=sortSession;if(s.index>=s.source.length){finishSort();return;}s.current=s.source[s.index];s.insertLow=0;s.insertHigh=s.ranked.length;}
function renderCompare(){
  const s=sortSession;if(!s||s.index>=s.source.length)return; if(s.insertLow>=s.insertHigh){s.ranked.splice(s.insertLow,0,s.current);s.index++;prepareInsertion();if(s.index>=s.source.length)return;}
  const mid=Math.floor((s.insertLow+s.insertHigh)/2);s.mid=mid; const left=s.current,right=s.ranked[mid];
  $('#rankProgress').textContent=`${Math.min(s.comparisons+1,s.estimated)} / ${s.estimated}`;$('#rankProgressBar').style.width=`${Math.min(100,(s.comparisons/s.estimated)*100)}%`;
  $('#compareGrid').innerHTML=[left,right].map((p,i)=>`<button class="compare-card" data-pick="${i===0?'current':'ranked'}"><div class="compare-work">${escapeHTML(p.title)}</div><div class="compare-author">${escapeHTML(p.author)}</div><div class="compare-quote">${escapeHTML(p.quote)}</div><div class="compare-pick">이 장면 선택 →</div></button>`).join('');
}
function pickSort(which){const s=sortSession;if(!s)return;s.comparisons++; if(which==='current'){s.insertHigh=s.mid;}else{s.insertLow=s.mid+1;} if(s.insertLow>=s.insertHigh){s.ranked.splice(s.insertLow,0,s.current);s.index++; if(s.index>=s.source.length){finishSort();return;}prepareInsertion();} renderCompare();}
function finishSort(){const s=sortSession;ui.lastSort=s.ranked.map(x=>x.id);saveState();$('#rankGame').hidden=true;$('#rankResult').hidden=false;$('#rankProgressBar').style.width='100%';renderRanking(s.ranked);}
function renderRanking(ranked){$('#rankingList').innerHTML=ranked.map((p,i)=>`<div class="ranking-item"><div class="ranking-num">${i+1}</div><div class="ranking-info"><div class="ranking-title">${escapeHTML(p.title)}</div><div class="ranking-meta">${escapeHTML(p.author)}</div><div class="ranking-quote">${escapeHTML(p.quote.replace(/\n/g,' '))}</div></div></div>`).join('');}
async function shareSort(){if(!ui.lastSort?.length)return;const ranked=ui.lastSort.map(id=>posts.find(p=>p.id===id)).filter(Boolean);const text=['NAJJUBTYPE 명장면 소트',...ranked.slice(0,5).map((p,i)=>`${i+1}. ${p.title}`),'','#NAJJUBTYPE'].join('\n');try{if(navigator.share)await navigator.share({title:'NAJJUBTYPE 소트 결과',text,url:location.href});else{await navigator.clipboard.writeText(text);showToast('소트 결과를 복사했어요.');}}catch(e){if(e.name!=='AbortError')showToast('공유하지 못했어요.');}}

// Events
$('#submitToggle').addEventListener('click',toggleSubmit);$('#submitPostBtn').addEventListener('click',submitPost);$('#sortTop').addEventListener('click',()=>setView('top'));$('#sortNew').addEventListener('click',()=>setView('new'));$('#sortRank').addEventListener('click',()=>setView('rank'));$('#aboutBtn').addEventListener('click',()=>openModal('aboutModal'));$('#commentSubmitBtn').addEventListener('click',submitComment);$('#saveEditBtn').addEventListener('click',saveEdit);$('#startSortBtn').addEventListener('click',startSort);$('#restartSortBtn').addEventListener('click',startSort);$('#shareSortBtn').addEventListener('click',shareSort);

document.addEventListener('click',(e)=>{
  const like=e.target.closest('[data-like]'); if(like){toggleLike(like.dataset.like);return;}
  const comment=e.target.closest('[data-comment]'); if(comment){openComments(comment.dataset.comment);return;}
  const save=e.target.closest('[data-save]'); if(save){toggleSave(save.dataset.save);return;}
  const share=e.target.closest('[data-share]'); if(share){sharePost(share.dataset.share);return;}
  const edit=e.target.closest('[data-edit]'); if(edit){openEdit(edit.dataset.edit);return;}
  const del=e.target.closest('[data-delete]'); if(del){deletePost(del.dataset.delete);return;}
  const copy=e.target.closest('[data-copy]'); if(copy){copyPost(copy.dataset.copy);return;}
  const close=e.target.closest('[data-close]'); if(close){closeModal(close.dataset.close);return;}
  const pick=e.target.closest('[data-pick]'); if(pick){pickSort(pick.dataset.pick);return;}
  if(e.target.classList.contains('modal-overlay'))closeModal(e.target.id);
  if(!e.target.closest('.post-more-wrapper'))$$('.post-dropdown.show').forEach(x=>x.classList.remove('show'));
});

document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal-overlay.show').forEach(m=>closeModal(m.id));});

renderFeed();
