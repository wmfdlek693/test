const STORAGE_KEY='najjubtype-posts-v4';
const STATE_KEY='najjubtype-state-v4';
const avatar='./assets/avatar_blank.png';

const demoPosts=[
  {id:'demo-1',title:'라인을 준수하세요',author:'옥잠',link:'#',quote:`시험 끝났어 유나야.\n\n사실 널 시험하기보다는 날 시험한 거였어.\n\n이제 알 것 같아. 너를 믿고 싶어. 네 마음을 믿고 싶어.\n\n좋아해. 선 넘어도 돼. 그래도 돼.`,reason:'',createdAt:'2026-08-09T03:30:00+09:00',baseLikes:8,comments:[]},
  {id:'demo-2',title:'라인을 준수하세요',author:'옥잠',link:'#',quote:`너 이제 진짜 큰일 난 거야.\n\n나 같은 애들은 한 번 손에 쥐면 절대 안 놔주거든.\n\n노유나가 비죽 웃었다. 멱살이 틀어 잡힌 채 듣는 경고가 뭐가 그리 좋다고 웃었다. 살벌하지만 달콤한 경고가 사랑스러웠다. 참을 수 없이 애타는 속에 고개를 비스듬히 틀며 다가갔다. 단숨에 좁혀진 거리에 놀라 숨을 참는 얼굴 위로 속삭였다. 큰일? 김주은 네가 잘 몰라서 그러는데....\n\n- 그거야말로 내가 바라는 바야.`,reason:'',createdAt:'2026-08-09T03:20:00+09:00',baseLikes:0,comments:[]},
  {id:'demo-3',title:'야 나 좀 아포',author:'옥잠',link:'#',quote:`- 상식적으로, 도의적으로, 인간적으로.\n- ....\n- ....한 번 더 하자.\n- 나도 그 말 하려고 했어...`,reason:'',createdAt:'2026-08-09T03:10:00+09:00',baseLikes:0,comments:[]},
  {id:'demo-4',title:'꼬우면 한판 떠',author:'옥잠',link:'#',quote:`- 야아 너 다 알면서 왜 그러냐 진짜...\n- 빨리 말해. 머리 굴리지 말고.\n- 아... 진짜 주은아 쫌....\n- 예~ 할 말 있으세요?\n- ...귀 대봐바.\n\n진짜니너무귀여우니까그만해... 니 너무 예뻐서 나 죽겠다고 진짜... 존나 사랑해 개사랑해 여기 빨리 파토내고 너 들쳐업고 집으로 튀고 싶어... 이상입니다.`,reason:'',createdAt:'2026-08-09T03:00:00+09:00',baseLikes:0,comments:[]}
];

let posts=loadPosts();
let ui=loadState();
let currentView='top';
let editingPostId=null;
let sortSession=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function loadPosts(){try{return [...demoPosts,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')]}catch{return [...demoPosts]}}
function saveCustomPosts(){localStorage.setItem(STORAGE_KEY,JSON.stringify(posts.filter(p=>!String(p.id).startsWith('demo-'))))}
function loadState(){try{return Object.assign({liked:[],saved:[],likeDelta:{},comments:{},openComments:[],lastSort:null,sortHistory:[],sortStats:{}},JSON.parse(localStorage.getItem(STATE_KEY)||'{}'))}catch{return {liked:[],saved:[],likeDelta:{},comments:{},openComments:[],lastSort:null,sortHistory:[],sortStats:{}}}}
function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(ui))}
function showToast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),2300)}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]))}
function safeLink(url){if(!url||url==='#')return '#';try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:'#'}catch{return '#'}}
function timeAgo(date){const diff=Math.max(0,Date.now()-new Date(date).getTime()),m=Math.floor(diff/60000);if(m<1)return'방금 전';if(m<60)return`${m}분 전`;const h=Math.floor(m/60);if(h<24)return`${h}시간 전`;const d=Math.floor(h/24);return`${d}일 전`}
function commentsFor(p){return [...(p.comments||[]),...(ui.comments[p.id]||[])]}
function likeCount(p){return (p.baseLikes||0)+(ui.likeDelta[p.id]||0)}

const heartPath='m10.82 20.116-.097-.09-6.844-6.355A5.882 5.882 0 0 1 2 9.359v-.13C2 6.48 3.953 4.12 6.656 3.606A5.71 5.71 0 0 1 12 5.417a5.562 5.562 0 0 1 .977-.871 5.73 5.73 0 0 1 4.367-.945A5.73 5.73 0 0 1 22 9.23v.129c0 1.636-.68 3.199-1.879 4.312l-6.844 6.355-.097.09c-.32.297-.742.465-1.18.465a1.72 1.72 0 0 1-1.18-.465Zm.52-12.625a.205.205 0 0 1-.04-.043l-.695-.78-.003-.005A3.85 3.85 0 0 0 3.875 9.23v.13c0 1.113.465 2.18 1.281 2.937L12 18.651l6.844-6.355a4.012 4.012 0 0 0 1.281-2.937v-.13a3.851 3.851 0 0 0-6.723-2.566l-.004.004-.003.004-.696.781c-.011.016-.027.028-.039.043a.935.935 0 0 1-1.32 0v-.004Z';
const icons={
  heart:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="${heartPath}" fill="currentcolor"/></svg>`,
  comment:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6.832 17.535a1.877 1.877 0 0 1 1.742-.25c1.035.375 2.194.59 3.428.59 4.87 0 8.123-3.145 8.123-6.25s-3.253-6.25-8.123-6.25c-4.87 0-8.122 3.145-8.122 6.25 0 1.25.484 2.453 1.394 3.484.336.38.5.88.46 1.387a6.92 6.92 0 0 1-.44 1.93 9.811 9.811 0 0 0 1.538-.887v-.004Zm-3.999 1.586c.07-.105.137-.21.2-.316.39-.649.76-1.5.835-2.457-1.172-1.332-1.863-2.961-1.863-4.723 0-4.488 4.475-8.125 9.997-8.125C17.526 3.5 22 7.137 22 11.625c0 4.488-4.475 8.125-9.998 8.125-1.448 0-2.823-.25-4.065-.7-.465.34-1.222.805-2.12 1.196a9.564 9.564 0 0 1-1.957.629c-.031.008-.062.012-.094.02-.171.03-.34.058-.515.074-.008 0-.02.004-.027.004-.2.02-.399.03-.598.03a.625.625 0 0 1-.445-1.066 5.606 5.606 0 0 0 .629-.797l.011-.019h.012Z" fill="currentcolor"/></svg>`,
  bookmark:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4.5 4.875C4.5 3.84 5.34 3 6.375 3v16.242l5.082-3.629a.93.93 0 0 1 1.09 0l5.078 3.63V4.874H6.375V3h11.25c1.035 0 1.875.84 1.875 1.875v16.188a.938.938 0 0 1-1.48.762L12 17.526l-6.02 4.297a.938.938 0 0 1-1.48-.762z" fill="currentColor"/></svg>`,
  share:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12.664 2.275a.934.934 0 0 0-1.324 0l-5.004 5A.937.937 0 0 0 7.66 8.6l3.399-3.398v9.614c0 .519.418.937.937.937.52 0 .938-.418.938-.938V5.202L16.332 8.6a.937.937 0 0 0 1.324-1.324l-4.992-5ZM5.125 15.44a.935.935 0 0 0-.938-.938.935.935 0 0 0-.937.938v3.124a3.438 3.438 0 0 0 3.438 3.438h10.625a3.438 3.438 0 0 0 3.437-3.438V15.44a.935.935 0 0 0-.938-.938.935.935 0 0 0-.937.938v3.124c0 .864-.7 1.563-1.563 1.563H6.688c-.863 0-1.562-.7-1.562-1.563V15.44Z" fill="currentColor"/></svg>`,
  more:`<svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M20.125 12a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm-6.25 0a1.875 1.875 0 1 1-3.751 0 1.875 1.875 0 0 1 3.751 0ZM5.75 13.875a1.875 1.875 0 1 1 0-3.75 1.875 1.875 0 0 1 0 3.75Z" fill="currentcolor"></path></svg>`
};

function renderFeed(){
  let list=[...posts];
  if(currentView==='top')list.sort((a,b)=>likeCount(b)-likeCount(a)||new Date(b.createdAt)-new Date(a.createdAt));
  if(currentView==='new')list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $('#menuList').innerHTML=list.length?list.map(renderCard).join(''):'<div class="empty-state"><p>추천이 없습니다... 하나 하고 가세요</p></div>';
}

function renderCard(p){
  const cs=commentsFor(p),liked=ui.liked.includes(p.id),saved=ui.saved.includes(p.id),editable=!String(p.id).startsWith('demo-'),link=safeLink(p.link),open=false;
  return `<div class="menu-card" id="card-${esc(p.id)}"><div class="menu-card-body" data-menu-id="${esc(p.id)}">
    <div class="post-header">
      <div class="post-header-left"><div class="post-avatar"><img src="${avatar}" alt="" width="32" height="32"></div><div class="post-header-info"><div class="post-author-badge">${esc(p.author||'익명')}</div><span class="post-meta-line">${timeAgo(p.createdAt)} · 냐쭙 아카이브</span></div></div>
      <div class="post-more-wrapper"><button class="post-more-btn" aria-label="더보기" type="button" data-menu="${esc(p.id)}">${icons.more}</button><div class="post-dropdown" id="menu-${esc(p.id)}">${editable?`<button data-edit="${esc(p.id)}">수정</button><button data-delete="${esc(p.id)}">삭제</button>`:`<button data-copy="${esc(p.id)}">링크 복사</button>`}</div></div>
    </div>
    <div class="post-content"><h2 class="post-title">${link==='#'?esc(p.title):`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">${esc(p.title)}</a>`}</h2><p class="post-body">${esc(p.quote)}</p></div>
    <div class="post-actions"><div class="post-actions-left"><button class="vote-btn up ${liked?'active':''}" data-like="${esc(p.id)}">${icons.heart}<span>${likeCount(p)}</span></button><button class="toggle-comments" data-comment="${esc(p.id)}" aria-expanded="${open?'true':'false'}">${icons.comment}${cs.length}</button></div><div class="post-actions-right"><button class="post-icon-btn ${saved?'saved':''}" data-save="${esc(p.id)}" aria-label="저장">${icons.bookmark}</button><button class="post-icon-btn" data-share="${esc(p.id)}" aria-label="공유">${icons.share}</button></div></div>
    ${p.reason?`<div class="post-comment-bubble"><div class="post-comment-avatar"><img src="${avatar}" width="24" height="24" alt=""></div><p class="post-comment-text">${esc(p.reason)}</p></div>`:''}
    <div class="comments-section ${open?'open':''}" id="comments-${esc(p.id)}"><div class="comment-list">${renderCommentsHTML(cs)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea id="comment-text-${esc(p.id)}" placeholder="공감할래말래" rows="1"></textarea><div class="comment-form-row"><button class="btn" data-submit-comment="${esc(p.id)}">등록</button></div></div></div>
  </div></div>`;
}

function renderCommentsHTML(cs){return cs.map(c=>`<div class="comment-item"><img class="comment-avatar" src="${avatar}" alt=""><div class="comment-body"><div class="comment-header"><span class="comment-nickname">익명</span><span class="comment-time">${timeAgo(c.createdAt)}</span></div><div class="comment-text">${esc(c.text)}</div></div></div>`).join('')}

function setView(view){currentView=view;$$('.sort-bar button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const rank=view==='rank';$('#feedView').hidden=rank;$('#rankView').hidden=!rank;if(rank){showTournamentSection('leaderboard');loadTournamentLeaderboard()}else renderFeed()}

function submitPost(){const quote=$('#quoteInput').value.trim(),title=$('#titleInput').value.trim(),author=$('#authorInput').value.trim(),link=$('#linkInput').value.trim(),reason=$('#reasonInput').value.trim();if(!quote||!title||!author){showToast('명대사, 제목, 작가는 입력해줘.');return}posts.push({id:'user-'+Date.now(),title,author,link,quote,reason,createdAt:new Date().toISOString(),baseLikes:0,comments:[]});saveCustomPosts();['#quoteInput','#titleInput','#authorInput','#linkInput','#reasonInput'].forEach(id=>$(id).value='');setView('new');showToast('명대사가 등록됐어요.')}
function toggleLike(id){
  const p=posts.find(x=>x.id===id);if(!p)return;
  const liked=ui.liked.includes(id);
  ui.liked=liked?ui.liked.filter(x=>x!==id):[...ui.liked,id];
  ui.likeDelta[id]=(ui.likeDelta[id]||0)+(liked?-1:1);
  saveState();
  const card=document.getElementById(`card-${id}`);
  const btn=card?.querySelector('[data-like]');
  if(btn){btn.classList.toggle('active',!liked);const count=btn.querySelector('span');if(count)count.textContent=likeCount(p);}
}
function toggleSave(id){
  const saved=ui.saved.includes(id);
  ui.saved=saved?ui.saved.filter(x=>x!==id):[...ui.saved,id];
  saveState();
  document.getElementById(`card-${id}`)?.querySelector('[data-save]')?.classList.toggle('saved',!saved);
  showToast(saved?'보관함에서 뺐어요.':'보관함에 저장했어요.');
}
function toggleComments(id, triggerEl){
  // 칼윈 아카이브 방식: 누른 게시물 카드 안에서만 댓글 영역을 토글한다.
  // 다른 게시물의 댓글 상태에는 손대지 않고, 새로 렌더링되면 기본은 닫힘이다.
  const card=triggerEl?.closest('.menu-card') || document.getElementById(`card-${id}`);
  if(!card)return;
  const section=card.querySelector('.comments-section');
  if(!section)return;
  const open=section.classList.toggle('open');
  const btn=card.querySelector('.toggle-comments');
  if(btn)btn.setAttribute('aria-expanded',String(open));
}
function submitComment(id, triggerEl){
  // 같은 게시물이 피드/소트 랭킹에 동시에 렌더링될 수 있으므로
  // document.getElementById()로 전역 textarea를 잡지 않고, 실제로 누른 등록 버튼의 카드 안에서 찾는다.
  const card=triggerEl?.closest('.menu-card, .rank-post-card, .leaderboard-post, .post-card') || document.getElementById(`card-${id}`);
  const section=triggerEl?.closest('.comments-section') || card?.querySelector('.comments-section');
  const input=section?.querySelector('textarea');
  const text=input?.value.trim();
  if(!text){showToast('댓글을 입력해줘.');return}

  ui.comments[id]=ui.comments[id]||[];
  ui.comments[id].push({id:'comment-'+Date.now(),text,createdAt:new Date().toISOString()});
  saveState();

  const p=posts.find(x=>x.id===id);
  if(p&&section){
    const cs=commentsFor(p);
    const list=section.querySelector('.comment-list');
    if(list)list.innerHTML=renderCommentsHTML(cs);

    // 지금 보고 있는 카드의 댓글 수를 즉시 갱신한다.
    const countBtn=card?.querySelector('.toggle-comments');
    if(countBtn){
      countBtn.innerHTML=`${icons.comment}${cs.length}`;
      countBtn.setAttribute('aria-expanded','true');
    }

    // 등록 직후 작성한 첫 댓글도 바로 보이도록 댓글 영역을 유지한다.
    section.classList.add('open');
    input.value='';
    requestAnimationFrame(()=>{
      const last=list?.lastElementChild;
      last?.scrollIntoView({block:'nearest',behavior:'smooth'});
      input.focus();
    });
  }

  // 같은 게시물이 다른 화면에도 보이면 댓글 숫자만 동기화한다.
  if(p){
    const total=commentsFor(p).length;
    document.querySelectorAll(`[data-comment="${CSS.escape(id)}"]`).forEach(btn=>{
      if(btn!==card?.querySelector('.toggle-comments')) btn.innerHTML=`${icons.comment}${total}`;
    });
  }
  showToast('댓글을 등록했어요.');
}
async function sharePost(id){const p=posts.find(x=>x.id===id);if(!p)return;const text=`${p.title} — ${p.author}\n\n${p.quote}\n\n#NAJJUBTYPE`,url=safeLink(p.link)==='#'?location.href:safeLink(p.link);try{if(navigator.share)await navigator.share({title:p.title,text,url});else{await navigator.clipboard.writeText(`${text}\n${url}`);showToast('공유 문구를 복사했어요.')}}catch(e){if(e.name!=='AbortError')showToast('공유하지 못했어요.')}}
function copyPost(id){const p=posts.find(x=>x.id===id),url=safeLink(p?.link);navigator.clipboard?.writeText(url==='#'?location.href:url);showToast('링크를 복사했어요.')}

function openEdit(id){const p=posts.find(x=>x.id===id);if(!p||String(id).startsWith('demo-'))return;editingPostId=id;$('#editQuote').value=p.quote;$('#editWorkTitle').value=p.title;$('#editAuthor').value=p.author;$('#editLink').value=p.link||'';$('#editReason').value=p.reason||'';openModal('editModal')}
function saveEdit(){const p=posts.find(x=>x.id===editingPostId);if(!p)return;const quote=$('#editQuote').value.trim(),title=$('#editWorkTitle').value.trim(),author=$('#editAuthor').value.trim();if(!quote||!title||!author){showToast('필수 항목을 확인해줘.');return}Object.assign(p,{quote,title,author,link:$('#editLink').value.trim(),reason:$('#editReason').value.trim()});saveCustomPosts();closeModal('editModal');renderFeed();showToast('수정했어요.')}
function deletePost(id){if(String(id).startsWith('demo-'))return;if(!confirm('이 등록글을 삭제할까요?'))return;posts=posts.filter(x=>x.id!==id);saveCustomPosts();renderFeed();showToast('삭제했어요.')}
function openModal(id){const m=$('#'+id);m.classList.add('show');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeModal(id){const m=$('#'+id);m.classList.remove('show');m.setAttribute('aria-hidden','true');document.body.style.overflow=''}

function showTournamentSection(which){
  const map={leaderboard:'#tournamentLeaderboard',game:'#tournamentGame',result:'#tournamentResult',history:'#tournamentHistory'};
  Object.entries(map).forEach(([k,sel])=>{const el=$(sel);if(el)el.hidden=k!==which});
}

function rankCard(p,position){
  const medal=position===0?'🥇':position===1?'🥈':position===2?'🥉':`${position+1}위`;
  const stats=ui.sortStats?.[p.id]||{wins:0,losses:0,titles:0};
  const cs=commentsFor(p);
  return `<div class="menu-card tournament-ranking-card"><div class="menu-card-body">
    <div class="post-header"><div class="post-header-left"><div class="post-avatar"><img src="${avatar}" alt="" width="32" height="32"></div><div class="post-header-info"><div class="post-author-badge">${esc(p.author||'익명')}</div><span class="post-meta-line">${medal} · 냐쭙 아카이브</span></div></div><div class="post-more-wrapper"><button class="post-more-btn" aria-label="더보기" type="button">${icons.more}</button></div></div>
    <div class="post-content"><h2 class="post-title">${esc(p.title)}</h2><p class="post-body">${esc(p.quote)}</p></div>
    <div class="ranking-stats"><span>승 ${stats.wins||0}</span><span>패 ${stats.losses||0}</span>${stats.titles?`<span class="win-rate">우승 ${stats.titles}</span>`:''}</div>
    <div class="post-actions"><div class="post-actions-left"><button class="vote-btn up ${ui.liked.includes(p.id)?'active':''}" data-like="${esc(p.id)}">${icons.heart}<span>${likeCount(p)}</span></button><button class="toggle-comments" data-comment="${esc(p.id)}">${icons.comment}${cs.length}</button></div><div class="post-actions-right"><button class="post-icon-btn ${ui.saved.includes(p.id)?'saved':''}" data-save="${esc(p.id)}">${icons.bookmark}</button><button class="post-icon-btn" data-share="${esc(p.id)}">${icons.share}</button></div></div>
    ${p.reason?`<div class="post-comment-bubble"><div class="post-comment-avatar"><img src="${avatar}" width="24" height="24" alt=""></div><p class="post-comment-text">${esc(p.reason)}</p></div>`:''}
    <div class="comments-section" id="rank-comments-${esc(p.id)}"><div class="comment-list">${renderCommentsHTML(cs)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea id="comment-text-${esc(p.id)}" placeholder="공감할래말래" rows="1"></textarea><div class="comment-form-row"><button class="btn" data-submit-comment="${esc(p.id)}">등록</button></div></div></div>
  </div></div>`;
}

function loadTournamentLeaderboard(){
  const list=$('#rankingList');
  if(!list)return;
  const ranked=[...posts].sort((a,b)=>{
    const as=ui.sortStats?.[a.id]||{},bs=ui.sortStats?.[b.id]||{};
    return (bs.titles||0)-(as.titles||0)||(bs.wins||0)-(as.wins||0)||likeCount(b)-likeCount(a)||new Date(b.createdAt)-new Date(a.createdAt);
  });
  if(!ranked.length){list.innerHTML='<div class="leaderboard-empty"><div class="icon">🏆</div><p>아직 랭킹 기록이 없습니다.<br>참여해서 원하는 작품을 붐업하세요!</p></div>';return}
  list.innerHTML=ranked.map(rankCard).join('');
}

function openRoundSelect(){
  showTournamentSection('game');
  $('#gameTitle').textContent='라운드 선택';
  $('#matchArea').innerHTML='';
  $('#tournamentBackBtn').hidden=true;
  renderRoundSelect();
}

function renderRoundSelect(){
  const available=posts.length;
  const select=$('#roundSelect');
  if(available<4){select.innerHTML='<p class="round-message">추천이 부족합니다 (최소 4개)</p>';return}
  const fixed=[4,8,16,32].filter(n=>n<=available);
  if(!fixed.includes(available))fixed.push(available);
  select.innerHTML=fixed.map(n=>`<button data-round-size="${n}">${n}강</button>`).join('');
}

function startTournament(size){
  const shuffled=[...posts].sort(()=>Math.random()-.5).slice(0,size);
  const nextPow2=Math.pow(2,Math.ceil(Math.log2(shuffled.length)));
  const byeCount=nextPow2-shuffled.length;
  const byes=shuffled.slice(0,byeCount);
  const firstRound=shuffled.slice(byeCount);
  sortSession={roundSize:size,currentRound:firstRound,matchIndex:0,winners:[...byes],eliminated:[],history:[],matches:[]};
  $('#roundSelect').innerHTML='';
  $('#tournamentBackBtn').hidden=false;
  renderMatch();
}

function getRoundLabel(count){if(count===2)return'결승';if(count===4)return'준결승';return`${count}강`}

function matchCardHtml(p,side){
  const cs=commentsFor(p);
  return `<div class="match-card" id="match-${side}" data-pick-side="${side}"><div class="menu-card-body">
    <div class="post-header"><div class="post-header-left"><div class="post-avatar"><img src="${avatar}" alt="" width="32" height="32"></div><div class="post-header-info"><div class="post-author-badge">${esc(p.author||'익명')}</div><span class="post-meta-line">${timeAgo(p.createdAt)} · 냐쭙 아카이브</span></div></div></div>
    <div class="post-content"><h2 class="post-title">${esc(p.title)}</h2><p class="post-body">${esc(p.quote)}</p></div>
    <div class="post-actions"><div class="post-actions-left"><span class="vote-btn up">${icons.heart}<span>${likeCount(p)}</span></span><button class="toggle-comments" data-match-comment="${esc(p.id)}" data-side="${side}">${icons.comment}${cs.length}</button></div><div class="post-actions-right"><span class="post-icon-btn">${icons.bookmark}</span><span class="post-icon-btn">${icons.share}</span></div></div>
    ${p.reason?`<div class="post-comment-bubble"><div class="post-comment-avatar"><img src="${avatar}" width="24" height="24" alt=""></div><p class="post-comment-text">${esc(p.reason)}</p></div>`:''}
    <div class="comments-section" id="match-comments-${side}"><div class="comment-list">${renderCommentsHTML(cs)}</div><div class="add-comment-form"><div class="comment-input-header"><img src="${avatar}" alt=""><span>익명</span></div><textarea id="match-comment-text-${side}" placeholder="공감할래말래" rows="1"></textarea><div class="comment-form-row"><button class="btn" data-match-submit="${esc(p.id)}" data-side="${side}">등록</button></div></div></div>
  </div></div>`;
}

function renderMatch(){
  const s=sortSession;if(!s)return;
  const totalMatches=s.currentRound.length/2;
  if(s.matchIndex>=totalMatches){
    if(s.winners.length===1){finishTournament(s.winners[0]);return}
    s.currentRound=[...s.winners];s.winners=[];s.matchIndex=0;renderMatch();return;
  }
  const a=s.currentRound[s.matchIndex*2],b=s.currentRound[s.matchIndex*2+1];
  const roundTotal=s.currentRound.length+s.winners.length;
  $('#gameTitle').textContent=`${getRoundLabel(roundTotal)} ${s.matchIndex+1}/${totalMatches}`;
  $('#matchArea').innerHTML=`<div class="match-container">${matchCardHtml(a,'a')}<div class="match-vs">VS</div>${matchCardHtml(b,'b')}</div>`;
  $('#match-a').addEventListener('click',e=>{if(e.target.closest('button,textarea,.post-comment-bubble'))return;pickWinner(a,b)});
  $('#match-b').addEventListener('click',e=>{if(e.target.closest('button,textarea,.post-comment-bubble'))return;pickWinner(b,a)});
}

function pickWinner(winner,loser){
  const s=sortSession;if(!s)return;
  s.history.push({currentRound:[...s.currentRound],matchIndex:s.matchIndex,winners:[...s.winners],eliminated:[...s.eliminated],matches:[...s.matches]});
  s.winners.push(winner);s.eliminated.push(loser);s.matches.push({winnerId:winner.id,loserId:loser.id});s.matchIndex++;renderMatch();
}

function finishTournament(winner){
  const s=sortSession;
  const ranking=[winner,...[...s.eliminated].reverse()];
  ui.lastSort=ranking.map(x=>x.id);
  ui.sortHistory=ui.sortHistory||[];
  ui.sortHistory.unshift({date:new Date().toISOString(),roundSize:s.roundSize,ranking:ranking.map(x=>x.id)});
  if(ui.sortHistory.length>20)ui.sortHistory.length=20;
  ui.sortStats=ui.sortStats||{};
  s.matches.forEach(m=>{
    ui.sortStats[m.winnerId]=Object.assign({wins:0,losses:0,titles:0},ui.sortStats[m.winnerId]||{});ui.sortStats[m.winnerId].wins++;
    ui.sortStats[m.loserId]=Object.assign({wins:0,losses:0,titles:0},ui.sortStats[m.loserId]||{});ui.sortStats[m.loserId].losses++;
  });
  ui.sortStats[winner.id]=Object.assign({wins:0,losses:0,titles:0},ui.sortStats[winner.id]||{});ui.sortStats[winner.id].titles++;
  saveState();
  showTournamentSection('result');
  $('#tournamentResult').innerHTML=`<div class="tournament-result"><div class="winner-label">🏆 우승</div>${rankCard(winner,0)}<div class="result-ranking">${ranking.slice(1).map((p,i)=>`<div class="result-ranking-item"><div class="result-rank">${i===0?'🥈':i===1?'🥉':i+2}</div><div class="result-ranking-info"><div class="result-ranking-title">${esc(p.title)} <span class="result-ranking-author">· ${esc(p.author)}</span></div><div class="post-body result-quote">${esc(p.quote)}</div></div></div>`).join('')}</div><div class="result-actions"><button class="tournament-btn tournament-btn-ghost" id="resultRankingBtn">랭킹 보기</button><button class="tournament-btn" id="resultAgainBtn">다시하기</button></div></div>`;
  $('#resultRankingBtn').addEventListener('click',()=>{showTournamentSection('leaderboard');loadTournamentLeaderboard()});
  $('#resultAgainBtn').addEventListener('click',openRoundSelect);
}

function renderHistory(){
  const list=$('#historyList'),history=ui.sortHistory||[];
  if(!history.length){list.innerHTML='<div class="leaderboard-empty"><div class="icon">📋</div><p>아직 기록이 없습니다.<br>소트에 참여해보세요!</p></div>';return}
  const counts={};history.forEach(h=>{const id=h.ranking[0];counts[id]=(counts[id]||0)+1});
  const top=Math.max(...Object.values(counts));const topIds=Object.keys(counts).filter(id=>counts[id]===top);
  list.innerHTML=`<div class="top-winner-summary">내 최다 우승: ${topIds.map(id=>{const p=posts.find(x=>x.id===id);return p?`<strong>${esc(p.title)}</strong>`:''}).filter(Boolean).join(', ')} (${top}회)</div><div class="history-section">${history.map((h,idx)=>{const p=posts.find(x=>x.id===h.ranking[0]);const d=new Date(h.date);return `<button class="history-item" data-history-index="${idx}"><span class="history-date">${d.getMonth()+1}/${d.getDate()}</span><span class="history-round">${h.roundSize}강</span><span class="history-winner">🏆 ${p?esc(p.title):'삭제된 항목'}</span><span class="history-arrow">▼</span></button><div class="history-detail" id="history-detail-${idx}" hidden>${h.ranking.map((id,i)=>{const x=posts.find(p=>p.id===id);return x?`<div class="result-ranking-item"><div class="result-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div><div class="result-ranking-info"><div class="result-ranking-title">${esc(x.title)} <span class="result-ranking-author">· ${esc(x.author)}</span></div><div class="post-body result-quote">${esc(x.quote)}</div></div></div>`:''}).join('')}</div>`}).join('')}</div>`;
}

function leaveGameForRanking(){
  if(sortSession&&sortSession.matches?.length){if(!confirm('진행 중인 소트가 사라집니다. 랭킹 페이지로 이동하시겠습니까?'))return;sortSession=null}
  showTournamentSection('leaderboard');loadTournamentLeaderboard();
}

function undoTournamentPick(){
  const s=sortSession;if(!s||!s.history.length){showTournamentSection('leaderboard');loadTournamentLeaderboard();return}
  const prev=s.history.pop();s.currentRound=prev.currentRound;s.matchIndex=prev.matchIndex;s.winners=prev.winners;s.eliminated=prev.eliminated;s.matches=prev.matches;renderMatch();
}

$('#submitPostBtn').addEventListener('click',submitPost);
$('#sortTop').addEventListener('click',()=>setView('top'));
$('#sortNew').addEventListener('click',()=>setView('new'));
$('#sortRank').addEventListener('click',()=>setView('rank'));
$('#saveEditBtn').addEventListener('click',saveEdit);
$('#tournamentPlayBtn').addEventListener('click',openRoundSelect);
$('#tournamentHistoryBtn').addEventListener('click',()=>{showTournamentSection('history');renderHistory()});
$('#gameRankingBtn').addEventListener('click',leaveGameForRanking);
$('#tournamentBackBtn').addEventListener('click',undoTournamentPick);
$('#historyRankingBtn').addEventListener('click',()=>{showTournamentSection('leaderboard');loadTournamentLeaderboard()});
$('#historyPlayBtn').addEventListener('click',openRoundSelect);

document.addEventListener('click',e=>{
  const menuBtn=e.target.closest('[data-menu]');if(menuBtn){e.stopPropagation();const menu=document.getElementById(`menu-${menuBtn.dataset.menu}`);$$('.post-dropdown.show').filter(x=>x!==menu).forEach(x=>x.classList.remove('show'));menu?.classList.toggle('show');return}
  const like=e.target.closest('[data-like]');if(like){toggleLike(like.dataset.like);return}
  const comment=e.target.closest('[data-comment]');if(comment){toggleComments(comment.dataset.comment, comment);return}
  const submit=e.target.closest('[data-submit-comment]');if(submit){submitComment(submit.dataset.submitComment, submit);return}
  const save=e.target.closest('[data-save]');if(save){toggleSave(save.dataset.save);return}
  const share=e.target.closest('[data-share]');if(share){sharePost(share.dataset.share);return}
  const edit=e.target.closest('[data-edit]');if(edit){openEdit(edit.dataset.edit);return}
  const del=e.target.closest('[data-delete]');if(del){deletePost(del.dataset.delete);return}
  const copy=e.target.closest('[data-copy]');if(copy){copyPost(copy.dataset.copy);return}
  const round=e.target.closest('[data-round-size]');if(round){startTournament(Number(round.dataset.roundSize));return}
  const matchComment=e.target.closest('[data-match-comment]');if(matchComment){e.stopPropagation();const side=matchComment.dataset.side;document.getElementById(`match-comments-${side}`)?.classList.toggle('open');return}
  const matchSubmit=e.target.closest('[data-match-submit]');if(matchSubmit){e.stopPropagation();const id=matchSubmit.dataset.matchSubmit,side=matchSubmit.dataset.side,input=document.getElementById(`match-comment-text-${side}`),text=input?.value.trim();if(!text){showToast('댓글을 입력해줘.');return}ui.comments[id]=ui.comments[id]||[];ui.comments[id].push({id:'comment-'+Date.now(),text,createdAt:new Date().toISOString()});saveState();renderMatch();setTimeout(()=>document.getElementById(`match-comments-${side}`)?.classList.add('open'),0);return}
  const hist=e.target.closest('[data-history-index]');if(hist){const detail=document.getElementById(`history-detail-${hist.dataset.historyIndex}`);if(detail)detail.hidden=!detail.hidden;return}
  const close=e.target.closest('[data-close]');if(close){closeModal(close.dataset.close);return}
  if(e.target.classList.contains('modal-overlay'))closeModal(e.target.id);
  if(!e.target.closest('.post-more-wrapper'))$$('.post-dropdown.show').forEach(x=>x.classList.remove('show'));
});

document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal-overlay.show').forEach(m=>closeModal(m.id))});
renderFeed();
