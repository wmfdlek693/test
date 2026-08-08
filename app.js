const STORAGE_KEY = 'najjubtype_posts_v1';
const SORT_KEY = 'najjubtype_sort_record_v1';

const seedPosts = [
  {
    id:'seed-1', nickname:'유나의여름', title:'허물', author:'익명작가',
    quote:'“나는 네가 괜찮은 줄 알았어.”\n\n말하고 나서야 그 문장이 얼마나 늦었는지 알았다.',
    reason:'마지막에 다시 읽으면 처음과 완전히 다른 의미가 되는 문장이라 좋아해요.',
    link:'', likes:42, createdAt:Date.now()-1000*60*60*2, saved:false,
    comments:[{name:'냐쭙러1',text:'여기 진짜 오래 남음…'},{name:'08x80',text:'이 문장 때문에 다시 정주행함'}]
  },
  {
    id:'seed-2', nickname:'팥소없는빵', title:'여름의 정점에서 우리는', author:'빈제이',
    quote:'우리가 지나온 계절을 사랑이라고 부르기까지 너무 오래 걸렸다.',
    reason:'냐쭙 여름물 좋아하면 그냥 못 지나가는 문장.',
    link:'', likes:31, createdAt:Date.now()-1000*60*60*9, saved:false,
    comments:[{name:'guest',text:'여름 냐쭙은 진짜 필승'}]
  },
  {
    id:'seed-3', nickname:'주은아문열어', title:'비가 그친 뒤', author:'A',
    quote:'“너는 왜 항상 다 지난 다음에 와.”\n“그래도 왔잖아.”',
    reason:'대사 두 줄로 관계가 다 설명되는 느낌.',
    link:'', likes:18, createdAt:Date.now()-1000*60*60*24, saved:false, comments:[]
  }
];

let posts = loadPosts();
let currentView = 'popular';
let searchQuery = '';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function loadPosts(){
  try{ const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(saved)&&saved.length?saved:seedPosts; }
  catch{return seedPosts}
}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(posts))}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function timeAgo(ts){
  const d=Math.max(0,Date.now()-ts),m=Math.floor(d/60000),h=Math.floor(m/60),day=Math.floor(h/24);
  if(m<1)return '방금 전'; if(m<60)return `${m}분 전`; if(h<24)return `${h}시간 전`; if(day<30)return `${day}일 전`; return new Date(ts).toLocaleDateString('ko-KR');
}
function initials(n='익명'){return n.trim().slice(0,2)}
function heartIcon(){return `<svg viewBox="0 0 24 24"><path d="M20.8 4.6c-2-2-5.2-2-7.2 0L12 6.2l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 20.5l8.8-8.7a5.1 5.1 0 0 0 0-7.2Z"></path></svg>`}
function commentIcon(){return `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.2 8.2 0 0 1-8.5 8.1 9.1 9.1 0 0 1-4-.9L3 20l1.4-4.4A7.8 7.8 0 0 1 3 11.2 8.2 8.2 0 0 1 11.5 3 8.2 8.2 0 0 1 21 11.5Z"></path></svg>`}
function bookmarkIcon(){return `<svg viewBox="0 0 24 24"><path d="M6 3.8h12v17l-6-4-6 4Z"></path></svg>`}
function shareIcon(){return `<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"></path><path d="M5 12.5v7h14v-7"></path></svg>`}

function renderFeed(){
  const feed=$('#feed');
  let list=[...posts];
  if(currentView==='popular') list.sort((a,b)=>b.likes-a.likes||b.createdAt-a.createdAt);
  else list.sort((a,b)=>b.createdAt-a.createdAt);
  if(searchQuery){const q=searchQuery.toLowerCase();list=list.filter(p=>[p.title,p.author,p.quote,p.reason,p.nickname].some(v=>(v||'').toLowerCase().includes(q)))}
  if(!list.length){feed.innerHTML=`<div class="empty-state"><strong>추천이 없습니다</strong>하나 남기고 가세요.</div>`;return}
  feed.innerHTML=list.map(p=>`
  <article class="post" data-id="${p.id}">
    <div class="post-head">
      <div class="avatar">${escapeHtml(initials(p.nickname))}</div>
      <div class="post-meta"><div class="post-user">${escapeHtml(p.nickname||'익명')}</div><div class="post-sub">${timeAgo(p.createdAt)} · ${escapeHtml(p.title)}</div></div>
      <button class="more-btn" aria-label="더보기">···</button>
    </div>
    <h2 class="post-title">${escapeHtml(p.title)}</h2>
    <p class="quote">${escapeHtml(p.quote)}</p>
    ${p.reason?`<div class="reason"><b>추천 이유</b> · ${escapeHtml(p.reason)}</div>`:''}
    ${p.link?`<a class="work-link" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">작품 보러가기 ↗</a>`:''}
    <div class="post-actions">
      <div class="action-left">
        <button class="action-btn ${p.userLiked?'liked':''}" data-action="like">${heartIcon()}<span>${p.likes}</span></button>
        <button class="action-btn" data-action="comment">${commentIcon()}<span>${p.comments?.length||0}</span></button>
      </div>
      <div class="action-right">
        <button class="action-btn ${p.saved?'saved':''}" data-action="save">${bookmarkIcon()}</button>
        <button class="action-btn" data-action="share">${shareIcon()}</button>
      </div>
    </div>
    ${(p.comments&&p.comments.length)?`<div class="comments">${p.comments.slice(0,2).map(c=>`<div class="comment-row"><span class="comment-name">${escapeHtml(c.name)}</span><span class="comment-text">${escapeHtml(c.text)}</span></div>`).join('')}</div>`:''}
  </article>`).join('');
}

function renderRanking(){
  const list=[...posts].sort((a,b)=>b.likes-a.likes).slice(0,10);
  $('#globalRanking').innerHTML=list.map((p,i)=>`<li><span class="rank-number">${i+1}</span><span>${escapeHtml(p.title)} <small>· ${escapeHtml(p.author)}</small></span><span class="rank-score">♥ ${p.likes}</span></li>`).join('');
}
function setView(view){
  currentView=view; $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
  const isSort=view==='sort'; $('#feed').classList.toggle('hidden',isSort); $('#sortSection').classList.toggle('hidden',!isSort); $('#searchPanel').classList.toggle('hidden',isSort||!$('#searchPanel').dataset.open);
  if(isSort)renderRanking();else renderFeed();
}
function openModal(id){$('#'+id).classList.remove('hidden');document.body.style.overflow='hidden'}
function closeModal(id){$('#'+id).classList.add('hidden');document.body.style.overflow=''}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),1800)}

$$('.tab').forEach(t=>t.addEventListener('click',()=>setView(t.dataset.view)));
['#openComposer','#floatingWrite'].forEach(sel=>$(sel).addEventListener('click',()=>openModal('composerModal')));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
$$('.modal-backdrop').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)closeModal(bg.id)}));
$('#brandBtn').addEventListener('click',()=>{setView('popular');window.scrollTo({top:0,behavior:'smooth'})});
$('#searchBtn').addEventListener('click',()=>{const p=$('#searchPanel');const next=p.dataset.open!=='1';p.dataset.open=next?'1':'0';p.classList.toggle('hidden',!next);if(next)setTimeout(()=>$('#searchInput').focus(),50)});
$('#searchInput').addEventListener('input',e=>{searchQuery=e.target.value.trim();renderFeed()});

$('#submitPost').addEventListener('click',()=>{
  const quote=$('#quoteInput').value.trim(),title=$('#titleInput').value.trim(),author=$('#authorInput').value.trim();
  if(!quote||!title||!author){toast('명대사, 작품 제목, 작가는 필수예요.');return}
  const post={id:'p-'+Date.now(),nickname:$('#nicknameInput').value.trim()||'익명',title,author,quote,reason:$('#reasonInput').value.trim(),link:$('#linkInput').value.trim(),likes:0,createdAt:Date.now(),saved:false,userLiked:false,comments:[]};
  posts.unshift(post);persist();['quoteInput','titleInput','authorInput','reasonInput','linkInput','nicknameInput'].forEach(id=>$('#'+id).value='');closeModal('composerModal');setView('latest');toast('명대사가 등록됐어요.');
});

$('#feed').addEventListener('click',async e=>{
  const btn=e.target.closest('[data-action]'); if(!btn)return;
  const article=e.target.closest('.post'),p=posts.find(x=>x.id===article.dataset.id); if(!p)return;
  const action=btn.dataset.action;
  if(action==='like'){p.userLiked=!p.userLiked;p.likes=Math.max(0,p.likes+(p.userLiked?1:-1));persist();renderFeed()}
  if(action==='save'){p.saved=!p.saved;persist();renderFeed();toast(p.saved?'보관함에 저장했어요.':'저장을 취소했어요.')}
  if(action==='share'){
    const text=`NAJJUBTYPE | ${p.title} · ${p.author}\n${p.quote.slice(0,90)}${p.quote.length>90?'…':''}`;
    try{if(navigator.share)await navigator.share({title:'NAJJUBTYPE',text});else{await navigator.clipboard.writeText(text);toast('공유 문구를 복사했어요.')}}catch{}
  }
  if(action==='comment'){
    const txt=prompt('댓글을 입력해주세요.'); if(!txt||!txt.trim())return;p.comments=p.comments||[];p.comments.push({name:'guest',text:txt.trim()});persist();renderFeed();
  }
});

let sortState=null;
$('#startSort').addEventListener('click',startSort);
$('#showMyRecord').addEventListener('click',()=>{const r=JSON.parse(localStorage.getItem(SORT_KEY)||'null');if(!r){toast('아직 저장된 소트 기록이 없어요.');return}showSortResult(r)});

function startSort(){
  if(posts.length<2){toast('소트를 하려면 추천이 2개 이상 필요해요.');return}
  const pool=[...posts].sort(()=>Math.random()-.5).slice(0,Math.min(8,posts.length));
  sortState={remaining:pool.slice(1),champion:pool[0],ranked:[],step:1,total:pool.length-1};openModal('sortModal');renderSortPair();
}
function renderSortPair(){
  const s=sortState;if(!s)return;
  if(!s.remaining.length){const result=[s.champion,...s.ranked.reverse()];localStorage.setItem(SORT_KEY,JSON.stringify(result));showSortResult(result);return}
  const challenger=s.remaining[0];$('#roundLabel').textContent=`${s.step} / ${s.total}`;
  $('#sortArena').innerHTML=`<div class="sort-progress">더 좋아하는 장면을 선택하세요.</div><div class="choice-grid">
  ${choiceHtml(s.champion,'champion')}${choiceHtml(challenger,'challenger')}</div>`;
  $$('.choice-card').forEach(b=>b.addEventListener('click',()=>chooseSort(b.dataset.choice)));
}
function choiceHtml(p,key){return `<button class="choice-card" data-choice="${key}"><div class="choice-title">${escapeHtml(p.title)}</div><div class="choice-author">${escapeHtml(p.author)}</div><div class="choice-quote">${escapeHtml(p.quote)}</div></button>`}
function chooseSort(choice){
  const s=sortState,challenger=s.remaining.shift();
  if(choice==='challenger'){s.ranked.push(s.champion);s.champion=challenger}else{s.ranked.push(challenger)}
  s.step++;renderSortPair();
}
function showSortResult(result){
  if($('#sortModal').classList.contains('hidden'))openModal('sortModal');$('#roundLabel').textContent='완료';
  $('#sortArena').innerHTML=`<div class="sort-result"><h3>나의 냐쭙 명장면 순위</h3><p>결과는 이 브라우저에 저장돼요.</p><ol>${result.map(p=>`<li>${escapeHtml(p.title)} · ${escapeHtml(p.author)}</li>`).join('')}</ol><button class="primary-btn" id="againSort">다시 하기</button></div>`;
  $('#againSort').addEventListener('click',startSort);
}

renderFeed();
