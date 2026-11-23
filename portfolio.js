'use strict';
/* PORTFOLIO: 사업마다 성격에 맞는 기능 묶음 */
const KINDS={
  BRAND:{tabs:[['calendar','CALENDAR'],['library','LIBRARY'],['queue','POST QUEUE'],['insights','INSIGHTS']]},
  PRODUCT:{tabs:[['milestones','MILESTONES'],['docs','DOCS'],['builds','BUILDS']]},
};
const BIZLIST=[
  {id:'kkumi',kind:'BRAND',name:'꾸미',desc:'반려견 성장기 콘텐츠 · 인스타그램',col:'#E08A5A',media:'workspace/kkumi/media/',dir:'workspace/kkumi/'},
  {id:'game',kind:'PRODUCT',name:'게임 개발',desc:'1인 개발 게임 · 방향 정하는 중',col:'#7DB79A',dir:'workspace/game/'},
];
const PF={biz:'kkumi',tab:{kkumi:'calendar',game:'milestones'},tree:null,folder:'all',sel:null,doc:null};
const BLOB={};

async function loadTree(){
  const t=await gh('/git/trees/main?recursive=1');
  PF.tree=(t&&t.tree)||[];
}
async function blobUrl(path){
  if(BLOB[path]) return BLOB[path];
  const r=await fetch(API+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref=main',{headers:{Accept:'application/vnd.github.raw',Authorization:'Bearer '+TOKEN,'X-GitHub-Api-Version':'2022-11-28'}});
  if(!r.ok) throw new Error(r.status);
  const u=URL.createObjectURL(await r.blob());BLOB[path]=u;return u;
}
async function textOf(path){
  const r=await fetch(API+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref=main',{headers:{Accept:'application/vnd.github.raw',Authorization:'Bearer '+TOKEN}});
  if(!r.ok) throw new Error(r.status);return r.text();
}
const isImg=p=>/\.(jpe?g|png|gif|webp|heic)$/i.test(p), isVid=p=>/\.(mp4|mov|m4v|webm)$/i.test(p);
function mediaFiles(b){return (PF.tree||[]).filter(f=>f.type==='blob'&&f.path.startsWith(b.media)&&(isImg(f.path)||isVid(f.path)));}
function posts(bizId){return S.issues.filter(i=>has(i,'post')&&bizOf(i)===bizId);}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;io.unobserve(el);
  blobUrl(el.dataset.path).then(u=>{if(el.tagName==='IMG')el.src=u;else{el.src=u;}}).catch(()=>{el.alt='불러오기 실패';});}),{rootMargin:'200px'});
function lazy(root){root.querySelectorAll('[data-path]').forEach(el=>io.observe(el));}

window.renderPortfolio=async function(soft){
  const root=$('#portfolio');
  if(!PF.tree||!soft){try{await loadTree();}catch(e){toast('저장소 목록을 못 읽었습니다');}}
  const b=BIZLIST.find(x=>x.id===PF.biz);
  const side=BIZLIST.map(x=>{let s='';
    if(x.kind==='BRAND'){const ps=posts(x.id);s=`자료 ${mediaFiles(x).length} · 게시 결재 ${ps.filter(i=>i.state==='open'&&statusOf(i)==='REVIEW').length}`;}
    else{const t=S.issues.filter(i=>has(i,'task')&&bizOf(i)===x.id);s=`업무 ${t.filter(i=>i.state==='open').length} 진행 · ${t.filter(i=>i.state==='closed').length} 완료`;}
    return `<div class="bz${x.id===PF.biz?' on':''}" data-bz="${x.id}"><div class="bar" style="background:${x.col}"></div><div><div class="k" style="color:${x.col}">${x.kind}</div><div class="n">${esc(x.name)}</div><div class="s">${esc(s)}</div></div></div>`;}).join('');
  const tabs=KINDS[b.kind].tabs, cur=PF.tab[b.id];
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column">
    <div class="ph"><span class="cap">PORTFOLIO</span><span class="mono mu" style="font-size:10px">${BIZLIST.length} BUSINESS</span></div>
    <div class="scroll">${side}</div>
    <div style="padding:6px 8px;border-top:1px solid #3A2A1F"><button class="btn" style="width:100%" disabled title="다음 단계에서 붙입니다">＋ 사업 추가</button></div>
  </section>
  <section class="pnl" data-nofold style="display:flex;flex-direction:column;min-height:0">
    <div class="ph" style="height:40px"><span style="display:flex;align-items:baseline;gap:10px"><span class="mono" style="font-size:11px;letter-spacing:1.4px;color:${b.col}">${b.kind}</span><span style="font-size:16px;font-weight:600;color:#F4E6CF">${esc(b.name)}</span><span class="mu" style="font-size:12px">${esc(b.desc)}</span></span>
    <span class="tabs" style="grid-template-columns:repeat(${tabs.length},120px)">${tabs.map(([k,l])=>`<button class="btn${k===cur?' on':''}" data-tab="${k}">${l}</button>`).join('')}</span></div>
    <div id="pfBody" style="flex:1;min-height:0;display:flex;flex-direction:column"></div>
  </section>`;
  root.querySelectorAll('[data-bz]').forEach(el=>el.onclick=()=>{PF.biz=el.dataset.bz;renderPortfolio(true);});
  root.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{PF.tab[b.id]=el.dataset.tab;renderPortfolio(true);});
  const body=$('#pfBody');
  ({calendar:pCalendar,library:pLibrary,queue:pQueue,insights:pInsights,milestones:pMilestones,docs:pDocs,builds:pBuilds})[cur](body,b);
  foldable(root);
};

/* ---------- BRAND ---------- */
const WD=['일','월','화','수','목','금','토'];
function postDate(i){
  const m=meta(i);const w=(m.when||'').trim();
  const iso=/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(w); if(iso) return new Date(iso[1]+'T'+iso[2]);
  const k=/([일월화수목금토])요일?\s*(\d{1,2}):(\d{2})/.exec(w);
  if(k){const base=new Date(i.created_at);const d=new Date(base);d.setHours(+k[2],+k[3],0,0);let add=(WD.indexOf(k[1])-d.getDay()+7)%7;if(add===0&&d<base)add=7;d.setDate(d.getDate()+add);return d;}
  return null;
}
const PST={REVIEW:['결재 대기','#E2704F'],APPROVED:['게시 대기','#7DB79A'],DONE:['종료','#7A6654'],POSTED:['게시됨','#79B8C9']};
function pStatus(i){if(i.state==='closed')return has(i,'status:posted')?'POSTED':'DONE';return statusOf(i);}
function pCalendar(body,b){
  const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
  const ps=posts(b.id).map(i=>({i,d:postDate(i)})).filter(x=>x.d);
  const nodate=posts(b.id).filter(i=>!postDate(i)&&i.state==='open');
  const days=[...Array(14)].map((_,k)=>{const d=new Date(start);d.setDate(start.getDate()+k);return d;});
  const today=new Date().toDateString();
  const cell=d=>{const items=ps.filter(x=>x.d.toDateString()===d.toDateString()).sort((a,c)=>a.d-c.d);
    return `<div class="day${d.toDateString()===today?' today':''}"><div class="dn">${d.getMonth()+1}/${d.getDate()} ${WD[d.getDay()]}</div>${items.map(({i,d})=>{const m=meta(i);const [l,c]=PST[pStatus(i)]||['',''];
      return `<div class="pc" style="border-left-color:${c}" data-url="${i.html_url}" title="${esc(l)}">${m.media&&isImg(m.media)&&m.media.startsWith('workspace/')?`<img data-path="${esc(m.media)}" alt="">`:'<span class="mono mu" style="font-size:9px">'+esc(m.kind||'')+'</span>'}<span><b class="mono" style="font-size:10px;color:${c}">${code(i)} ${d.toTimeString().slice(0,5)}</b> ${esc(m.caption||i.title)}</span></div>`;}).join('')}</div>`;};
  body.innerHTML=`<div class="ph"><span class="cap">2 WEEKS · ${days[0].getMonth()+1}/${days[0].getDate()} – ${days[13].getMonth()+1}/${days[13].getDate()}</span><span style="display:flex;gap:10px;align-items:center" class="mono"><span style="font-size:10px;color:#E2704F"><i class="d" style="background:#E2704F"></i>결재 대기</span><span style="font-size:10px;color:#7DB79A"><i class="d" style="background:#7DB79A"></i>게시 대기</span><span style="font-size:10px;color:#79B8C9"><i class="d" style="background:#79B8C9"></i>게시됨</span><button class="btn sbtn pri" id="pNew" style="width:84px">＋ 게시물</button></span></div>
  <div class="scroll"><div class="cal">${WD.slice(1).concat(WD[0]).map(w=>`<div class="hd">${w}</div>`).join('')}${days.map(cell).join('')}</div>
  ${nodate.length?`<div class="note">날짜가 정해지지 않은 게시물 ${nodate.length}건 — POST QUEUE에서 확인하세요.</div>`:''}</div>`;
  body.querySelectorAll('[data-url]').forEach(el=>el.onclick=()=>open(el.dataset.url,'_blank','noopener'));
  $('#pNew').onclick=()=>openComposer(b,null);lazy(body);
}
function pLibrary(body,b){
  const files=mediaFiles(b);
  const folders=['all',...new Set(files.map(f=>f.path.slice(b.media.length).split('/')[0]))];
  const shown=files.filter(f=>PF.folder==='all'||f.path.slice(b.media.length).startsWith(PF.folder+'/')).sort((a,c)=>c.path.localeCompare(a.path));
  const label={all:'전체',photos:'사진',posts:'게시 이미지',uploads:'새로 올린 것'};
  body.innerHTML=`<div class="ph"><span class="chips">${folders.map(f=>`<button class="btn sbtn${f===PF.folder?' on':''}" data-f="${f}" style="width:92px">${label[f]||f}</button>`).join('')}</span>
  <span style="display:flex;gap:8px;align-items:center"><span class="mono mu" style="font-size:10px">${shown.length} FILES · ${(shown.reduce((s,f)=>s+(f.size||0),0)/1048576).toFixed(1)} MB</span><label class="btn sbtn pri" style="width:84px">올리기<input type="file" id="pUp" multiple accept="image/*,video/*" style="display:none"></label></span></div>
  <div class="scroll"><div class="grid">${shown.map(f=>{const n=f.path.split('/').pop();
    return `<div class="tile" data-p="${esc(f.path)}">${isImg(f.path)?`<img data-path="${esc(f.path)}" alt="${esc(n)}">`:`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#A08A72" class="mono">VIDEO</div>`}${isVid(f.path)?'<span class="vb">VIDEO</span>':''}<span class="cap2">${esc(n)}</span></div>`;}).join('')||'<div class="empty">아직 자료가 없습니다. 올리기로 사진·영상을 넣어 주세요.</div>'}</div></div>`;
  body.querySelectorAll('[data-f]').forEach(el=>el.onclick=()=>{PF.folder=el.dataset.f;renderPortfolio(true);});
  body.querySelectorAll('[data-p]').forEach(el=>el.onclick=()=>preview(b,el.dataset.p));
  $('#pUp').onchange=e=>upload(b,[...e.target.files]);
  lazy(body);
}
function pQueue(body,b){
  const ps=posts(b.id).sort((a,c)=>(a.state===c.state?0:a.state==='open'?-1:1)||c.number-a.number);
  body.innerHTML=`<div class="ph"><span class="cap">POST QUEUE · ${ps.filter(i=>i.state==='open').length} OPEN</span><button class="btn sbtn pri" id="pNew" style="width:84px">＋ 게시물</button></div>
  <div class="pqh"><span>MEDIA</span><span>CAPTION</span><span>WHEN</span><span>STATUS</span><span>DECISION</span></div>
  <div class="scroll">${ps.map(i=>{const m=meta(i);const st=pStatus(i);const [l,c]=PST[st]||[st,'#A08A72'];const d=postDate(i);
    return `<div class="pq" data-n="${i.number}">${m.media&&isImg(m.media)&&m.media.startsWith('workspace/')?`<img data-path="${esc(m.media)}" alt="">`:`<div class="mono mu" style="font-size:9px;text-align:center">${esc(m.kind||'—')}</div>`}
    <div><div class="cp">${esc(m.caption||i.title)}</div><div class="mono mu" style="font-size:10px;margin-top:2px"><b style="color:#D9A441">${code(i)}</b> · ${esc((m.hashtags||'').slice(0,60))}</div></div>
    <span class="mono" style="font-size:11px">${d?`${d.getMonth()+1}/${d.getDate()} ${WD[d.getDay()]} ${d.toTimeString().slice(0,5)}`:esc(m.when||'—')}</span>
    <span class="mono" style="font-size:11px;color:${c}"><i class="d" style="background:${c}"></i>${l}</span>
    <div>${st==='REVIEW'?`<div class="b3"><button class="btn pri" data-act="승인">게시 승인</button><button class="btn" data-act="">의견</button><button class="btn" data-act="기각">기각</button></div>`:st==='APPROVED'?'<span class="mu" style="font-size:11px">승인됨 · 인스타 게시 연결 전</span>':'<span class="mu" style="font-size:11px">—</span>'}</div></div>`;}).join('')||'<div class="empty">게시물이 없습니다. 직원 결과물의 [[POST]] 블록이나 ＋ 게시물로 생깁니다.</div>'}</div>`;
  body.querySelectorAll('[data-act]').forEach(btn=>btn.onclick=async()=>{const n=+btn.closest('[data-n]').dataset.n;let txt=btn.dataset.act;
    if(!txt){txt=prompt('의견을 적어 주세요. LILY가 반영해서 다시 만듭니다.');if(!txt)return;}
    btn.disabled=true;try{await gh(`/issues/${n}/comments`,{method:'POST',body:{body:txt}});toast(`${codeN(n)} 처리했습니다`);setTimeout(sync,1500);}catch(e){toast('실패: '+e.message.slice(0,60));btn.disabled=false;}});
  $('#pNew').onclick=()=>openComposer(b,null);lazy(body);
}
function pInsights(body){
  body.innerHTML=`<div class="ph"><span class="cap">INSIGHTS</span><span class="mono mu" style="font-size:10px">NOT CONNECTED</span></div>
  <div class="note">인스타그램 반응 지표(도달, 저장, 공유, 팔로워 변화)는 아직 연결 전입니다.<br>엔진이 인스타그램 데이터를 읽으려면 Meta에서 발급하는 인스타 접근키가 GitHub Secrets에 들어가야 합니다. 게시 자동화와 같은 키를 쓰므로, 게시 연결을 정할 때 함께 붙입니다.</div>`;
}

/* ---------- PRODUCT ---------- */
function pMilestones(body,b){
  const ms=S.issues.filter(i=>(has(i,'mission')||has(i,'meeting'))&&bizOf(i)===b.id).sort((a,c)=>c.number-a.number);
  const tasks=S.issues.filter(i=>has(i,'task')&&bizOf(i)===b.id);
  const loose=tasks.filter(t=>!ms.some(m=>m.number===meta(t).mission));
  const block=(title,url,ts,sub)=>{const done=ts.filter(t=>t.state==='closed').length;const pct=ts.length?Math.round(done/ts.length*100):0;
    return `<div class="ms"><div class="mh" style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600;color:#F4E6CF"><span class="mono" style="color:#A08A72;margin-right:6px">▾</span>${esc(title)}</span><span class="mono" style="font-size:11px;color:#A08A72">${done}/${ts.length} · ${pct}%</span></div><div class="mu" style="font-size:11px">${esc(sub)}</div><div class="bar2"><i style="width:${pct}%"></i></div>
    ${ts.map(t=>{const st=statusOf(t),a=S.team.agents[lab(t,'agent:')]||{};return `<div class="tr" data-url="${t.html_url}" style="grid-template-columns:56px minmax(0,1fr) 60px 90px 50px;height:24px"><span class="mono" style="color:#D9A441">${code(t)}</span><span class="ell">${esc(t.title)}</span><span class="mono">${esc(a.name||'')}</span><span class="mono" style="color:${SC[st]}"><i class="d" style="background:${SC[st]}"></i>${st}</span><span class="mono r">${meta(t).score??'—'}</span></div>`;}).join('')}</div>`;};
  body.innerHTML=`<div class="ph"><span class="cap">MILESTONES</span><button class="btn sbtn pri" id="pM" style="width:84px">＋ 미션</button></div><div class="scroll">
  ${ms.map(m=>block(`${code(m)} ${m.title}`,m.html_url,tasks.filter(t=>meta(t).mission===m.number),has(m,'meeting')?'회의에서 나온 일':'미션')).join('')}
  ${loose.length?block('미션 밖 업무','',loose,'이전 기록'):''}
  ${!ms.length&&!loose.length?'<div class="empty">아직 마일스톤이 없습니다. ＋ 미션으로 첫 목표를 정해 주세요.</div>':''}</div>`;
  body.querySelectorAll('[data-url]').forEach(el=>el.onclick=()=>{if(el.dataset.url)open(el.dataset.url,'_blank','noopener');});
  body.querySelectorAll('.mh').forEach(el=>el.onclick=()=>{const ms=el.parentElement;ms.classList.toggle('folded');el.querySelector('.mono').textContent=ms.classList.contains('folded')?'▸':'▾';});
  $('#pM').onclick=()=>{openMission();$('#iBiz').value=b.id;};
}
function pDocs(body,b){
  const files=(PF.tree||[]).filter(f=>f.type==='blob'&&f.path.startsWith(b.dir)).sort((a,c)=>a.path.localeCompare(c.path));
  body.innerHTML=`<div class="ph"><span class="cap">DOCS · ${b.dir}</span><span class="mono mu" style="font-size:10px">${files.length} FILES</span></div>
  <div class="doc"><div class="ls">${files.map(f=>`<div data-doc="${esc(f.path)}" class="${PF.doc===f.path?'on':''}" title="${esc(f.path)}">${esc(f.path.slice(b.dir.length))}</div>`).join('')||'<div class="empty" style="cursor:default">문서가 없습니다.</div>'}</div><pre id="docView" class="mu">왼쪽에서 문서를 고르세요.</pre></div>`;
  const show=async p=>{PF.doc=p;body.querySelectorAll('[data-doc]').forEach(x=>x.classList.toggle('on',x.dataset.doc===p));const v=$('#docView');v.textContent='불러오는 중…';
    try{v.textContent=isImg(p)?'':await textOf(p);if(isImg(p)){v.innerHTML=`<img src="${await blobUrl(p)}" style="max-width:100%">`;}v.classList.remove('mu');}catch{v.textContent='불러오기 실패';}};
  body.querySelectorAll('[data-doc]').forEach(el=>el.onclick=()=>show(el.dataset.doc));
  if(PF.doc&&files.some(f=>f.path===PF.doc))show(PF.doc);
}
function pBuilds(body){
  body.innerHTML=`<div class="ph"><span class="cap">BUILDS</span><span class="mono mu" style="font-size:10px">0 BUILDS</span></div>
  <div class="note">아직 빌드가 없습니다. 시제품 코드가 <code>workspace/game/</code>에 생기면 여기서 버전별 플레이 링크와 변경점을 보여줍니다.</div>`;
}

/* ---------- media: preview, upload, composer ---------- */
function ensureModal(){
  if($('#mPv')) return;
  const d=document.createElement('div');d.className='mask';d.id='mPv';
  d.innerHTML=`<div class="fm pv"><div class="ph"><span class="cap" id="pvCap"></span><button class="btn sbtn" data-close style="width:60px">닫기</button></div><div class="media" id="pvMedia"></div><div class="bd" id="pvBody"></div></div>`;
  $('#stage').append(d);d.querySelector('[data-close]').onclick=()=>d.classList.remove('show');
}
async function preview(b,path){
  ensureModal();const m=$('#mPv');$('#pvCap').textContent=path.slice(b.media.length);m.classList.add('show');
  $('#pvMedia').innerHTML='<div class="empty">불러오는 중…</div>';
  try{const u=await blobUrl(path);$('#pvMedia').innerHTML=isImg(path)?`<img src="${u}" alt="">`:`<video src="${u}" controls playsinline></video>`;}catch{$('#pvMedia').innerHTML='<div class="empty">불러오기 실패</div>';}
  $('#pvBody').innerHTML=`<div class="row"><a class="btn" href="https://github.com/${REPO}/blob/main/${encodeURI(path)}" target="_blank" rel="noopener">GitHub에서 보기</a><button class="btn pri" id="pvUse">이 자료로 게시물 만들기</button></div>`;
  $('#pvUse').onclick=()=>{m.classList.remove('show');openComposer(b,path);};
}
function toB64(blob){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(blob);});}
async function shrink(file){
  if(!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type)) return file;
  try{const bmp=await createImageBitmap(file);const k=Math.min(1,2048/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    return await new Promise(r=>c.toBlob(r,'image/jpeg',.9));}catch{return file;}
}
async function upload(b,files){
  if(!files.length)return;const ym=new Date().toISOString().slice(0,7);let ok=0;
  for(const [k,f] of files.entries()){
    if(/^video/.test(f.type)&&f.size>45*1048576){toast(`${f.name}: 45MB가 넘어 건너뜀 (휴대폰에서 줄여서 올려 주세요)`);continue;}
    toast(`올리는 중 ${k+1}/${files.length} · ${f.name}`);
    const blob=await shrink(f);const ext=blob===f?(f.name.split('.').pop()||'bin').toLowerCase():'jpg';
    const base=f.name.replace(/\.[^.]+$/,'').replace(/[^\w가-힣\-]+/g,'-').slice(0,40)||'file';
    const path=`${b.media}uploads/${ym}/${Date.now().toString(36)}-${base}.${ext}`;
    try{await gh('/contents/'+path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',body:{message:`꾸미 자료 올림: ${f.name}`,content:await toB64(blob),branch:'main'}});ok++;}
    catch(e){toast(`${f.name} 실패: ${e.message.slice(0,50)}`);}
  }
  toast(`${ok}개 올렸습니다`);PF.folder='uploads';await loadTree();renderPortfolio(true);
}
function openComposer(b,path){
  let m=$('#mPost');
  if(!m){m=document.createElement('div');m.className='mask';m.id='mPost';
    m.innerHTML=`<div class="fm" style="width:560px"><div class="ph"><span class="cap">NEW POST · 꾸미</span></div><div class="bd">
    <div style="display:grid;grid-template-columns:140px minmax(0,1fr);gap:10px"><div class="tile" id="cpMedia" style="cursor:default"></div>
    <div style="display:grid;gap:8px"><label>형식<select id="cpKind"><option>사진</option><option>영상</option><option>캐러셀</option></select></label><label>게시 시각<input type="datetime-local" id="cpWhen"></label></div></div>
    <label>캡션 (한 줄 드립)<textarea id="cpCap" rows="3"></textarea></label>
    <label>해시태그 (첫 댓글)<input id="cpTags" value="#꾸미일기 #강아지 #반려견 #댕스타그램"></label>
    <div class="err" id="cpErr"></div>
    <div class="row"><button class="btn" data-close>취소</button><button class="btn pri" id="cpSave">결재 올리기</button></div></div></div>`;
    $('#stage').append(m);m.querySelector('[data-close]').onclick=()=>m.classList.remove('show');}
  PF.sel=path;const mt=$('#cpMedia');
  mt.innerHTML=path?(isImg(path)?`<img data-path="${esc(path)}" alt="">`:'<span class="vb">VIDEO</span>')+`<span class="cap2">${esc(path.split('/').pop())}</span>`:'<div class="empty">LIBRARY에서 자료를 고르면 여기에 붙습니다</div>';lazy(mt);
  $('#cpKind').value=path&&isVid(path)?'영상':'사진';
  const d=new Date();d.setDate(d.getDate()+1);d.setHours(18,0,0,0);$('#cpWhen').value=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);
  $('#cpCap').value='';$('#cpErr').textContent='';m.classList.add('show');
  $('#cpSave').onclick=async()=>{const cap=$('#cpCap').value.trim();if(!cap){$('#cpErr').textContent='캡션을 적어 주세요.';return;}
    const when=$('#cpWhen').value.replace('T',' ');const tags=$('#cpTags').value.trim();const kind=$('#cpKind').value;
    const blk=`[[POST]]\n형식: ${kind}\n파일: ${PF.sel||''}\n캡션:\n${cap}\n해시태그: ${tags}\n추천 시각: ${when}\n[[/POST]]`;
    const mm={kind,media:PF.sel||'',caption:cap,hashtags:tags,when};
    $('#cpSave').disabled=true;
    try{const r=await gh('/issues',{method:'POST',body:{title:'게시 · '+cap.split('\n')[0].slice(0,24),body:blk+'\n\n```json meta\n'+JSON.stringify(mm)+'\n```',labels:['post','status:review','biz:'+b.id]}});
      m.classList.remove('show');toast(`P-${String(r.number).padStart(3,'0')} 결재 대기에 올렸습니다`);PF.tab[b.id]='queue';setTimeout(sync,1200);}
    catch(e){$('#cpErr').textContent='실패: '+e.message.slice(0,80);}finally{$('#cpSave').disabled=false;}};
}
