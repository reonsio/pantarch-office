'use strict';
/* PORTFOLIO: 사업마다 성격에 맞는 기능 묶음 */
const KINDS={
  BRAND:{tabs:[['calendar','CALENDAR'],['library','LIBRARY'],['queue','POSTS'],['refs','REFERENCE'],['insights','INSIGHTS']]},
  PRODUCT:{tabs:[['milestones','MILESTONES'],['docs','DOCS'],['builds','BUILDS']]},
  SERVICE:{tabs:[['milestones','MILESTONES'],['docs','DOCS']]},
};
function bizList(){return (S.bus||[]).map(b=>({...b,col:b.color||KCOL[b.kind],media:`workspace/${b.id}/media/`,dir:`workspace/${b.id}/`}));}
const PF={biz:null,tab:{},tree:null,folder:'all',sel:null,doc:null,asc:true};
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
function mediaFiles(b){return (PF.tree||[]).filter(f=>f.type==='blob'&&f.path.startsWith(b.media)&&!f.path.includes('/.thumbs/')&&(isImg(f.path)||isVid(f.path)));}
const CAT={};
async function loadCatalog(b){const f=(PF.tree||[]).find(x=>x.path===b.media+'catalog.json');if(!f){CAT[b.id]={sha:null,items:[]};return CAT[b.id];}
  if(CAT[b.id]&&CAT[b.id].sha===f.sha)return CAT[b.id];
  try{const t=await textOf(f.path);CAT[b.id]={sha:f.sha,items:(JSON.parse(t).items||[])};}catch{CAT[b.id]={sha:f.sha,items:[]};}return CAT[b.id];}
function libItems(b){const cat=(CAT[b.id]||{items:[]}).items;const by={};cat.forEach(it=>by[it.path]=it);
  const out=mediaFiles(b).map(f=>by[f.path]?{...by[f.path],size:f.size}:{path:f.path,kind:isVid(f.path)?'video':'image',date:dateFromName(f.path),size:f.size,pending:true});
  const parts=(PF.tree||[]).filter(f=>f.path.startsWith(b.media)&&/\.parts\.json$/.test(f.path)).map(f=>({path:f.path.replace(/\.parts\.json$/,''),kind:'video',parts:true,size:0,date:dateFromName(f.path),pending:true}));
  return out.concat(parts);}
function dateFromName(p){const m=/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})(?:[-_ T]?(\d{2})[-_:]?(\d{2}))?/.exec(p.split('/').pop());return m?`${m[1]}-${m[2]}-${m[3]} ${m[4]||'00'}:${m[5]||'00'}`:'';}
function posts(bizId){return S.issues.filter(i=>has(i,'post')&&bizOf(i)===bizId);}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;io.unobserve(el);
  blobUrl(el.dataset.path).then(u=>{if(el.tagName==='IMG')el.src=u;else{el.src=u;}}).catch(()=>{el.alt='불러오기 실패';});}),{rootMargin:'200px'});
function lazy(root){root.querySelectorAll('[data-path]').forEach(el=>io.observe(el));}

window.renderPortfolio=async function(soft){
  const root=$('#portfolio');
  if(!PF.tree||!soft){try{await loadTree();}catch(e){toast('저장소 목록을 못 읽었습니다');}}
  const BL=bizList();if(!BL.length){root.innerHTML='<div class="empty">사업 목록을 불러오는 중…</div>';return;}
  const b=BL.find(x=>x.id===PF.biz)||BL[0];PF.biz=b.id;
  const side=BL.map(x=>{let s='';
    if(x.kind==='BRAND'){const ps=posts(x.id);s=`자료 ${mediaFiles(x).length} · 게시 결재 ${ps.filter(i=>i.state==='open'&&statusOf(i)==='REVIEW').length}`;}
    else{const t=S.issues.filter(i=>has(i,'task')&&bizOf(i)===x.id);s=`업무 ${t.filter(i=>i.state==='open').length} 진행 · ${t.filter(i=>i.state==='closed').length} 완료`;}
    return `<div class="bz${x.id===PF.biz?' on':''}" data-bz="${x.id}"><div class="bar" style="background:${x.col}"></div><div><div class="k" style="color:${x.col}">${x.kind}</div><div class="n">${esc(x.name)}</div><div class="s">${esc(s)}</div></div></div>`;}).join('');
  const tabs=(KINDS[b.kind]||KINDS.SERVICE).tabs;if(!PF.tab[b.id]||!tabs.some(t=>t[0]===PF.tab[b.id]))PF.tab[b.id]=tabs[0][0];const cur=PF.tab[b.id];
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column">
    <div class="ph"><span class="cap">PORTFOLIO</span><span class="mono mu" style="font-size:10px">${BL.length} BUSINESS</span></div>
    <div class="scroll bzlist">${side}</div>
    <div style="padding:6px 8px;border-top:1px solid #3A2A1F"><button class="btn" style="width:100%" id="pAddBiz">＋ 사업 추가</button></div>
  </section>
  <section class="pnl" data-nofold style="display:flex;flex-direction:column;min-height:0">
    <div class="ph" style="height:40px"><span style="display:flex;align-items:baseline;gap:10px"><span class="mono" style="font-size:11px;letter-spacing:1.4px;color:${b.col}">${b.kind}</span><span style="font-size:16px;font-weight:600;color:#F4E6CF">${esc(b.name)}</span><span class="mu bdesc" style="font-size:12px">${esc(b.desc)}</span></span>
    <span class="tabs" style="grid-template-columns:repeat(${tabs.length},104px);--nt:${tabs.length}">${tabs.map(([k,l])=>`<button class="btn${k===cur?' on':''}" data-tab="${k}">${l}</button>`).join('')}</span></div>
    <div id="pfBody" style="flex:1;min-height:0;display:flex;flex-direction:column"></div>
  </section>`;
  root.querySelectorAll('[data-bz]').forEach(el=>el.onclick=()=>{PF.biz=el.dataset.bz;PF.folder='all';PF.doc=null;renderPortfolio(true);});
  $('#pAddBiz').onclick=openAddBiz;
  root.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{PF.tab[b.id]=el.dataset.tab;renderPortfolio(true);});
  const body=$('#pfBody');
  ({calendar:pCalendar,library:pLibrary,queue:pQueue,refs:pRefs,insights:pInsights,milestones:pMilestones,docs:pDocs,builds:pBuilds})[cur](body,b);
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
const PST={REVIEW:['결재 대기','#E2704F'],APPROVED:['예약 접수 중','#E2B04A'],SCHEDULED:['게시 예약됨','#7DB79A'],DONE:['종료','#7A6654'],POSTED:['게시됨','#79B8C9']};
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
function chron(xs,W){const out=[];let key=null;
  for(const x of xs){const w=W(x);const k=w?w.slice(0,7):'미정';
    if(k!==key){key=k;const ages=[...new Set(xs.filter(y=>(W(y)||'').slice(0,7)===k&&'age_m' in y).map(y=>y.age_m))];
      out.push([[k==='미정'?'시기 미정':`${k.slice(0,4)}.${k.slice(5,7)}`,k==='미정'?'분석이 끝나면 자리를 찾아갑니다':ages.length?`생후 ${Math.min(...ages)}${ages.length>1?'~'+Math.max(...ages):''}개월`:''],[]]);}
    out[out.length-1][1].push(x);}
  return out;}
async function pLibrary(body,b){
  await loadCatalog(b);
  const all=libItems(b);
  const cnt={all:all.length,image:all.filter(x=>x.kind==='image').length,video:all.filter(x=>x.kind==='video').length,todo:all.filter(x=>!x.analyzed).length};
  const f=PF.folder in cnt?PF.folder:'all';
  const W=x=>x.when||(x.date_src==='추정'?'':x.date)||'';
  const shown=all.filter(x=>f==='all'||(f==='todo'?!x.analyzed:x.kind===f)).sort((a,c)=>{const A=W(a),C=W(c);if(!A||!C)return (!A)-(!C);return PF.asc?A.localeCompare(C):C.localeCompare(A);});
  const lab={all:'전체',image:'사진',video:'영상'};if(cnt.todo)lab.todo='미분석';
  const md=x=>{const m=/\d{4}-(\d{2})-(\d{2})/.exec(x||'');return m?`${+m[1]}/${+m[2]}`:'';};
  const per=d=>(d.period||'').replace(/\s*\(.*?\)\s*/g,'').trim();
  body.innerHTML=`<div class="ph libbar"><span class="chips">${Object.keys(lab).map(k=>`<button class="btn sbtn${k===f?' on':''}" data-f="${k}">${lab[k]} ${cnt[k]}</button>`).join('')}</span>
  <span class="chips"><button class="btn sbtn" id="pSort" title="정렬">${PF.asc?'↑ 어릴 때부터':'↓ 지금부터'}</button>${cnt.todo?`<button class="btn sbtn" id="pAna">분석 ${cnt.todo}</button>`:''}<label class="btn sbtn pri" id="pUpL" title="사진은 한 장씩, 영상은 장면 3컷을 Claude가 보고 시기·장면·스토리를 적습니다. 40MB 넘는 영상은 나눠 올려 자동으로 합칩니다.">＋ 올리기<input type="file" id="pUp" multiple accept="image/*,video/*" style="display:none"></label></span></div>
  ${PF.upStat?`<div class="libnote" id="upStat">${esc(PF.upStat)}</div>`:''}
  <div class="scroll">${chron(shown,W).map(([h,xs])=>`<div class="chh2"><b>${esc(h[0])}</b><span>${esc(h[1])}</span><em>${xs.length}</em></div><div class="grid">${xs.map(x=>{const th=(x.thumbs||[])[0];const d=x.desc||{};const cap=x.pending?(x.parts?'합치는 중':'분석 대기'):('age_m' in x?`${x.age_m}개월${x.age_est?' 추정':''}`:'')+(d.scene?` · ${d.scene}`:'');
    return `<div class="tile${x.analyzed?'':' todo'}" data-p="${esc(x.path)}" title="${esc([md(x.date),d.scene,d.story].filter(Boolean).join(' / '))}">${th?`<img data-path="${esc(th)}" alt="">`:(x.kind==='image'?`<img data-path="${esc(x.path)}" alt="">`:'<div class="vph mono">VIDEO</div>')}${x.kind==='video'?`<span class="vb">${x.duration?Math.round(x.duration)+'s':'REEL'}</span>`:''}${cap?`<span class="cap2">${esc(cap)}</span>`:''}</div>`;}).join('')}</div>`).join('')||'<div class="empty">자료 없음</div>'}</div>`;
  body.querySelectorAll('[data-f]').forEach(el=>el.onclick=()=>{PF.folder=el.dataset.f;renderPortfolio(true);});
  $('#pSort').onclick=()=>{PF.asc=!PF.asc;renderPortfolio(true);};
  if($('#pAna'))$('#pAna').onclick=async()=>{try{await gh('/actions/workflows/media.yml/dispatches',{method:'POST',body:{ref:'main'}});PF.upStat='분석을 시작했습니다. 몇 분 뒤 설명이 붙습니다.';renderPortfolio(true);}catch{toast('실패: 접근키 Actions 권한을 확인해 주세요');}};
  body.querySelectorAll('[data-p]').forEach(el=>el.onclick=()=>preview(b,el.dataset.p));
  $('#pUp').onchange=e=>upload(b,[...e.target.files]);
  lazy(body);
}
function pQueue(body,b){
  const ps=posts(b.id).sort((a,c)=>(a.state===c.state?0:a.state==='open'?-1:1)||c.number-a.number);
  body.innerHTML=`<div class="ph"><span class="cap">POST QUEUE · ${ps.filter(i=>i.state==='open').length} OPEN</span><button class="btn sbtn pri" id="pNew" style="width:84px">＋ 게시물</button></div>
  <div class="pqh"><span>MEDIA</span><span>CAPTION</span><span>WHEN</span><span>STATUS</span><span>DECISION</span></div>
  <div class="scroll">${ps.map(i=>{const m=meta(i);const st=pStatus(i);const [l,c]=PST[st]||[st,'#A08A72'];const d=postDate(i);
    return `<div class="pq" data-n="${i.number}">${m.media&&isImg(m.media)&&m.media.startsWith('workspace/')?`<img data-path="${esc(m.media)}" data-pv2="${esc(m.media)}" alt="" style="cursor:pointer">`:m.media&&isVid(m.media)?`<div class="mono" data-pv2="${esc(m.media)}" style="font-size:9px;text-align:center;color:#D9A441;cursor:pointer">▶ 릴스</div>`:`<div class="mono mu" style="font-size:9px;text-align:center">${esc(m.kind||'—')}</div>`}
    <div><div class="cp">${esc(m.caption||i.title)}</div><div class="mono mu" style="font-size:10px;margin-top:2px"><b style="color:#D9A441">${code(i)}</b> · ${esc((m.hashtags||'').slice(0,60))}</div></div>
    <span class="mono" style="font-size:11px">${d?`${d.getMonth()+1}/${d.getDate()} ${WD[d.getDay()]} ${d.toTimeString().slice(0,5)}`:esc(m.when||'—')}</span>
    <span class="mono" style="font-size:11px;color:${c}"><i class="d" style="background:${c}"></i>${l}</span>
    <div>${st==='REVIEW'?`<div class="b3"><button class="btn pri" data-act="승인">게시 승인</button><button class="btn" data-act="">의견</button><button class="btn" data-act="기각">기각</button></div>`:(st==='APPROVED'||st==='SCHEDULED')?`<div class="b3" style="grid-template-columns:repeat(2,1fr)"><button class="btn pri" data-act="지금 올리기">지금 올리기</button>${m.pub_error?'<button class="btn" data-act="다시">다시 시도</button>':'<button class="btn" data-act="기각">취소</button>'}</div>${m.pub_error?`<div style="font-size:11px;color:#E2704F;margin-top:3px">${esc(m.pub_error)}</div>`:''}`:'<span class="mu" style="font-size:11px">—</span>'}</div></div>`;}).join('')||'<div class="empty">게시물 없음</div>'}</div>`;
  body.querySelectorAll('[data-pv2]').forEach(el=>el.onclick=()=>preview(b,el.dataset.pv2));
  body.querySelectorAll('[data-act]').forEach(btn=>btn.onclick=async()=>{const n=+btn.closest('[data-n]').dataset.n;let txt=btn.dataset.act;
    if(!txt){txt=prompt('의견을 적어 주세요. LILY가 반영해서 다시 만듭니다.');if(!txt)return;}
    btn.disabled=true;try{await gh(`/issues/${n}/comments`,{method:'POST',body:{body:txt}});toast(`${codeN(n)} 처리했습니다`);setTimeout(sync,1500);}catch(e){toast('실패: '+e.message.slice(0,60));btn.disabled=false;}});
  $('#pNew').onclick=()=>openComposer(b,null);lazy(body);
}
/* 레퍼런스: 계정·링크·캡션·스크린샷을 던지면 말투 기준(voice.md)에 쌓인다. 직원·검수가 매번 읽는다 */
const VOICE={};
async function pRefs(body,b){
  const vp=`${b.dir}voice.md`;
  if(VOICE[b.id]===undefined){try{VOICE[b.id]=await textOf(vp);}catch{VOICE[b.id]='';}}
  const sec={};let cur=null;
  (VOICE[b.id]||'').split('\n').forEach(l=>{const h=/^##\s+(.+)/.exec(l);if(h){cur=h[1].trim();sec[cur]=[];return;}if(cur&&/^- /.test(l))sec[cur].push(l.slice(2));});
  const order=[['레퍼런스 계정','계정'],['레퍼런스 캡션(대표님이 준 예)','캡션'],['레퍼런스 스크린샷','스크린샷'],['대표님이 통과시킨 캡션','통과'],['대표님이 싫어한 캡션','싫어함'],['대표님 의견','의견'],['기본','기본']];
  const rows=order.filter(([k])=>sec[k]&&sec[k].length).map(([k,l])=>`<div class="vg"><div class="vh"><b>${l}</b><em>${sec[k].length}</em></div>${(k==='기본'?sec[k]:sec[k].slice().reverse()).map(x=>`<div class="vi">${esc(x)}</div>`).join('')}</div>`).join('');
  body.innerHTML=`<div class="ph"><span class="cap">REFERENCE · 말투 기준</span></div>
  <form class="rf" id="rfF"><textarea id="rfT" rows="2" placeholder="@계정아이디, 인스타 링크, 마음에 드는 캡션"></textarea>
  <div class="rfb"><label class="btn sbtn">스크린샷<input type="file" id="rfI" multiple accept="image/*" style="display:none"></label><span class="mu" id="rfN"></span><button class="btn sbtn pri" id="rfGo">넣기</button></div></form>
  ${PF.refStat?`<div class="libnote">${esc(PF.refStat)}</div>`:''}
  <div class="scroll">${rows||'<div class="empty">레퍼런스 없음</div>'}</div>`;
  let files=[];
  $('#rfI').onchange=e=>{files=[...e.target.files];$('#rfN').textContent=files.length?`${files.length}장`:'';};
  $('#rfF').onsubmit=async e=>{e.preventDefault();const t=$('#rfT').value.trim();if(!t&&!files.length)return;const go=$('#rfGo');go.disabled=true;
    try{const paths=[];
      for(const [k,f] of files.entries()){const blob=await shrink(f);const pth=`${b.dir}refs/${stamp(new Date())}-${k}.jpg`;await putFile(pth,blob,`${b.name} 레퍼런스 스크린샷`);paths.push(pth);}
      let num=(typeof CH!=='undefined'&&CH.num)||(S.issues.find(i=>i.state==='open'&&has(i,'chat'))||{}).number;
      if(!num){const it=await gh('/issues',{method:'POST',body:{title:'대표님 채팅',body:'대표님과 직원의 채팅방입니다. 닫지 마세요.',labels:['chat']}});num=it.number;}
      await gh(`/issues/${num}/comments`,{method:'POST',body:{body:`레퍼런스 #${b.id} ${t}${paths.length?'\n'+paths.join('\n'):''}`}});
      PF.refStat=`넣었습니다. ${/@|instagram\.com/.test(t)?'계정은 MAX가 찾아 정리하고, ':''}${paths.length?'스크린샷은 LILY가 읽어서 ':''}1~2분 뒤 아래에 반영됩니다.`;
      VOICE[b.id]=undefined;setTimeout(()=>{VOICE[b.id]=undefined;if(PF.tab[b.id]==='refs')renderPortfolio(true);},90000);renderPortfolio(true);
    }catch(err){toast('실패: '+(err.status===403?'접근키 권한(Contents·Issues 쓰기)':err.message.slice(0,60)));go.disabled=false;}};
}
function pInsights(body){
  body.innerHTML=`<div class="ph"><span class="cap">INSIGHTS</span><span class="mono mu" style="font-size:10px">첫 게시 후 연결</span></div><div class="empty">반응 지표 없음</div>`;
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
  ${!ms.length&&!loose.length?'<div class="empty">마일스톤 없음</div>':''}</div>`;
  body.querySelectorAll('[data-url]').forEach(el=>el.onclick=()=>{if(el.dataset.url)open(el.dataset.url,'_blank','noopener');});
  body.querySelectorAll('.mh').forEach(el=>el.onclick=()=>{const ms=el.parentElement;ms.classList.toggle('folded');el.querySelector('.mono').textContent=ms.classList.contains('folded')?'▸':'▾';});
  $('#pM').onclick=()=>{openMission();$('#iBiz').value=b.id;};
}
function pDocs(body,b){
  const files=(PF.tree||[]).filter(f=>f.type==='blob'&&f.path.startsWith(b.dir)).sort((a,c)=>a.path.localeCompare(c.path));
  body.innerHTML=`<div class="ph"><span class="cap">DOCS · ${b.dir}</span><span class="mono mu" style="font-size:10px">${files.length} FILES</span></div>
  <div class="doc"><div class="ls">${files.map(f=>`<div data-doc="${esc(f.path)}" class="${PF.doc===f.path?'on':''}" title="${esc(f.path)}">${esc(f.path.slice(b.dir.length))}</div>`).join('')||'<div class="empty" style="cursor:default">문서가 없습니다.</div>'}</div><pre id="docView" class="mu"></pre></div>`;
  const show=async p=>{PF.doc=p;body.querySelectorAll('[data-doc]').forEach(x=>x.classList.toggle('on',x.dataset.doc===p));const v=$('#docView');v.textContent='불러오는 중…';
    try{v.textContent=isImg(p)?'':await textOf(p);if(isImg(p)){v.innerHTML=`<img src="${await blobUrl(p)}" style="max-width:100%">`;}v.classList.remove('mu');}catch{v.textContent='불러오기 실패';}};
  body.querySelectorAll('[data-doc]').forEach(el=>el.onclick=()=>show(el.dataset.doc));
  if(PF.doc&&files.some(f=>f.path===PF.doc))show(PF.doc);
}
function pBuilds(body,b){
  body.innerHTML=`<div class="ph"><span class="cap">BUILDS</span></div><div class="empty">빌드 없음</div>`;
}

/* ---------- media: preview, upload, composer ---------- */
function ensureModal(){
  if($('#mPv')) return;
  const d=document.createElement('div');d.className='mask';d.id='mPv';
  d.innerHTML=`<div class="fm pv"><div class="ph"><span class="cap" id="pvCap"></span><button class="btn sbtn" data-close style="width:60px">닫기</button></div><div class="media" id="pvMedia"></div><div class="bd" id="pvBody"></div></div>`;
  $('#stage').append(d);d.querySelector('[data-close]').onclick=()=>d.classList.remove('show');
}
async function preview(b,path){
  ensureModal();const m=$('#mPv');const it=libItems(b).find(x=>x.path===path)||{path,kind:isVid(path)?'video':'image'};const d=it.desc||{};
  $('#pvCap').textContent=(/\/reels\//.test(path)?'편집한 릴스':isVid(path)?'원본 영상':'사진')+(it.duration?` · ${Math.round(it.duration)}초`:'')+' · '+path.split('/').pop();m.classList.add('show');
  $('#pvMedia').innerHTML='<div class="empty">불러오는 중…</div>';
  try{const u=await blobUrl(path);$('#pvMedia').innerHTML=it.kind==='image'?`<img src="${u}" alt="">`:`<video src="${u}" controls playsinline></video>`;}catch{$('#pvMedia').innerHTML='<div class="empty">불러오기 실패</div>';}
  $('#pvBody').innerHTML=!path.startsWith(b.media)?`<div class="mu" style="font-size:12px">직원이 만든 결과물입니다(${esc(path.split('/').slice(-2,-1)[0]||'')}). 재생해 보고 결재함에서 승인하거나 의견을 남기세요.</div><div class="row"><a class="btn" href="https://github.com/${REPO}/blob/main/${encodeURI(path)}" target="_blank" rel="noopener">GitHub에서 보기</a><button class="btn" data-close2>닫기</button></div>`:`${it.analyzed?`<div class="ana"><b>시기</b><span>${esc(d.period)}</span><b>장면</b><span>${esc(d.scene)}</span><b>표정</b><span>${esc(d.expression)}</span><b>스토리</b><span>${esc(d.story)}</span>${(it.tags||[]).length?`<b>태그</b><span>${it.tags.map(esc).join(' · ')}</span>`:''}</div>`:'<div class="mu" style="font-size:12px">분석 대기</div>'}
  <div class="row"><a class="btn" href="https://github.com/${REPO}/blob/main/${encodeURI(path)}" target="_blank" rel="noopener">GitHub에서 보기</a><button class="btn pri" id="pvUse">이 자료로 게시물 만들기</button></div>`;
  if($('#pvUse'))$('#pvUse').onclick=()=>{m.classList.remove('show');openComposer(b,path);};
  const c2=m.querySelector('[data-close2]');if(c2)c2.onclick=()=>m.classList.remove('show');
}
async function exifDate(file){
  try{if(!/jpe?g/i.test(file.type))return null;const buf=new DataView(await file.slice(0,262144).arrayBuffer());
    if(buf.getUint16(0)!==0xFFD8)return null;let o=2;
    while(o<buf.byteLength-4){const mk=buf.getUint16(o),len=buf.getUint16(o+2);
      if(mk===0xFFE1&&buf.getUint32(o+4)===0x45786966){const t=o+10;const le=buf.getUint16(t)===0x4949;const u16=x=>buf.getUint16(x,le),u32=x=>buf.getUint32(x,le);
        const ifd=(start,want)=>{const n=u16(start);for(let i=0;i<n;i++){const e=start+2+i*12;if(u16(e)===want)return e;}return 0;};
        const i0=t+u32(t+4);let e=ifd(i0,0x8769);let str=0;
        if(e){const ex=t+u32(e+8);const d=ifd(ex,0x9003);if(d)str=t+u32(d+8);}
        if(!str){const d=ifd(i0,0x0132);if(d)str=t+u32(d+8);}
        if(!str)return null;let s='';for(let i=0;i<19;i++)s+=String.fromCharCode(buf.getUint8(str+i));
        const m=/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(s);return m?`${m[1]}${m[2]}${m[3]}-${m[4]}${m[5]}`:null;}
      o+=2+len;}
  }catch{}return null;
}
const stamp=d=>{const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;};
function toB64(blob){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(blob);});}
async function shrink(file){
  if(!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type)) return file;
  try{const bmp=await createImageBitmap(file);const k=Math.min(1,2048/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    return await new Promise(r=>c.toBlob(r,'image/jpeg',.9));}catch{return file;}
}
function setUp(t){PF.upStat=t;const e=$('#upStat');if(e)e.textContent=t;else if(t&&$('#pfBody'))renderPortfolio(true);}
async function putFile(path,blob,msg){return gh('/contents/'+path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',body:{message:msg,content:await toB64(blob),branch:'main'}});}
async function upload(b,files){
  if(!files.length)return;const ym=new Date().toISOString().slice(0,7);let ok=0;const fails=[];const PART=20*1048576;
  for(const [k,f] of files.entries()){
    const shot=await exifDate(f);const when=shot||('u'+Math.random().toString(36).replace(/[^a-z]/g,'').slice(0,6));
    const base=f.name.replace(/\.[^.]+$/,'').replace(/[^\w가-힣\-]+/g,'-').slice(0,40)||'file';
    try{
      if(/^image/.test(f.type)){setUp(`올리는 중 ${k+1}/${files.length} · ${f.name}`);const blob=(!shot&&!/jpe?g/i.test(f.type)&&f.size<25*1048576)?f:await shrink(f);/* 촬영 정보를 못 읽은 HEIC 등은 원본 그대로: 엔진이 직접 읽는다 */const ext=blob===f?(f.name.split('.').pop()||'jpg').toLowerCase():'jpg';
        await putFile(`${b.media}uploads/${ym}/${when}-${base}.${ext}`,blob,`${b.name} 자료: ${f.name}`);}
      else{const ext=(f.name.split('.').pop()||'mp4').toLowerCase();const path=`${b.media}uploads/${ym}/${when}-${base}.${ext}`;
        if(f.size<=40*1048576){setUp(`영상 올리는 중 ${k+1}/${files.length} · ${f.name}`);await putFile(path,f,`${b.name} 자료: ${f.name}`);}
        else{const n=Math.ceil(f.size/PART);
          for(let i=0;i<n;i++){setUp(`큰 영상 나눠 올리는 중 ${i+1}/${n} · ${f.name}`);await putFile(`${path}.part${String(i+1).padStart(3,'0')}`,f.slice(i*PART,(i+1)*PART),`${b.name} 자료 조각 ${i+1}/${n}: ${f.name}`);}
          await putFile(`${path}.parts.json`,new Blob([JSON.stringify({name:f.name,total:n,size:f.size})]),`${b.name} 자료 조각 완료: ${f.name}`);}}
      ok++;
    }catch(e){fails.push(`${f.name} — ${e.status===403?'접근키 Contents 권한이 읽기 전용':e.message.slice(0,60)}`);if(e.status===403)break;}
  }
  setUp(`${ok}개 올렸어요. 엔진이 몇 분 안에 합치기·분석을 끝냅니다.${fails.length?` 실패 ${fails.length}개: ${fails.join(' / ')}`:''}`);
  PF.folder='all';await loadTree();renderPortfolio(true);
}
function openComposer(b,path){
  let m=$('#mPost');
  if(!m){m=document.createElement('div');m.className='mask';m.id='mPost';
    m.innerHTML=`<div class="fm" style="width:560px"><div class="ph"><span class="cap" id="cpTitle">NEW POST</span></div><div class="bd">
    <div style="display:grid;grid-template-columns:140px minmax(0,1fr);gap:10px"><div class="tile" id="cpMedia" style="cursor:default"></div>
    <div style="display:grid;gap:8px"><label>형식<select id="cpKind"><option>사진</option><option>영상</option><option>캐러셀</option></select></label><label>게시 시각<input type="datetime-local" id="cpWhen"></label></div></div>
    <label>캡션 (한 줄 드립)<textarea id="cpCap" rows="2" placeholder="비워 두고 LILY에게 맡기면 써서 결재로 올립니다"></textarea></label>
    <label>해시태그 (첫 댓글)<input id="cpTags" value="#꾸미일기 #강아지 #반려견 #댕스타그램"></label>
    <div class="err" id="cpErr"></div>
    <div class="row" style="grid-template-columns:1fr 1.4fr 1.4fr"><button class="btn" data-close>취소</button><button class="btn" id="cpLily">LILY에게 맡기기</button><button class="btn pri" id="cpSave">승인하고 예약</button></div></div></div>`;
    $('#stage').append(m);m.querySelector('[data-close]').onclick=()=>m.classList.remove('show');}
  $('#cpTitle').textContent='NEW POST · '+b.name;PF.sel=path;const mt=$('#cpMedia');const it0=path&&libItems(b).find(x=>x.path===path);const th0=it0&&(it0.thumbs||[])[0];
  mt.innerHTML=path?(th0||isImg(path)?`<img data-path="${esc(th0||path)}" alt="">`:'<span class="vb">VIDEO</span>')+`<span class="cap2">${esc(path.split('/').pop())}</span>`:'<div class="empty">자료 없음</div>';lazy(mt);
  $('#cpKind').value=!path||isVid(path)?'영상':'사진';
  const d=new Date();d.setDate(d.getDate()+1);d.setHours(18,0,0,0);$('#cpWhen').value=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);
  $('#cpCap').value='';$('#cpErr').textContent='';m.classList.add('show');
  $('#cpLily').onclick=async()=>{if(!PF.sel){$('#cpErr').textContent='LIBRARY에서 자료를 먼저 골라 주세요.';return;}
    const when=$('#cpWhen').value.replace('T',' ');const kind=$('#cpKind').value;const hint=$('#cpCap').value.trim();const tags=$('#cpTags').value.trim();
    const body=`꾸미 인스타 ${kind} 게시물 1건의 캡션을 써 주세요.\n\n- 자료: ${PF.sel} (첨부 그림을 직접 보고 쓰세요)\n- 게시 시각: ${when}\n- 캡션: 꾸미 시점 한 줄 드립. 설명조·감성 문구·이모지 남발 금지. 자료실의 시기·장면·스토리 포인트를 살릴 것.\n${hint?`- 대표님 메모: ${hint}\n`:''}- 해시태그: ${tags} 를 기본으로 6~10개 (첫 댓글로 달림)\n\n후보 3개를 짧게 보여 준 뒤, 가장 좋은 것 하나로 [[POST]] 블록을 정확히 1개 만드세요. 파일 경로와 추천 시각은 위 값을 그대로 씁니다.`;
    const mm={focus:PF.sel,needs_approval:false};
    $('#cpLily').disabled=true;
    try{const r=await gh('/issues',{method:'POST',body:{title:'캡션 · '+PF.sel.split('/').pop().slice(0,28),body:body+'\n\n```json meta\n'+JSON.stringify(mm)+'\n```',labels:['task','agent:lily','status:queued','biz:'+b.id]}});
      m.classList.remove('show');toast(`T-${String(r.number).padStart(3,'0')} LILY가 캡션을 씁니다. 몇 분 뒤 결재함에 올라옵니다`);setTimeout(sync,1200);}
    catch(e){$('#cpErr').textContent='실패: '+e.message.slice(0,80);}finally{$('#cpLily').disabled=false;}};
  $('#cpSave').onclick=async()=>{const cap=$('#cpCap').value.trim();if(!cap){$('#cpErr').textContent='캡션을 적어 주세요.';return;}
    const when=$('#cpWhen').value.replace('T',' ');const tags=$('#cpTags').value.trim();const kind=$('#cpKind').value;
    const blk=`[[POST]]\n형식: ${kind}\n파일: ${PF.sel||''}\n캡션:\n${cap}\n해시태그: ${tags}\n추천 시각: ${when}\n[[/POST]]`;
    const mm={kind,media:PF.sel||'',caption:cap,hashtags:tags,when};
    $('#cpSave').disabled=true;
    try{const r=await gh('/issues',{method:'POST',body:{title:'게시 · '+cap.split('\n')[0].slice(0,24),body:blk+'\n\n```json meta\n'+JSON.stringify(mm)+'\n```',labels:['post','status:approved','biz:'+b.id]}});
      m.classList.remove('show');toast(`P-${String(r.number).padStart(3,'0')} 승인했습니다. 엔진이 곧 인스타 예약을 겁니다`);PF.tab[b.id]='queue';setTimeout(sync,1200);}
    catch(e){$('#cpErr').textContent='실패: '+e.message.slice(0,80);}finally{$('#cpSave').disabled=false;}};
}

/* ---------- 새 사업 등록 ---------- */
function openAddBiz(){
  let m=$('#mBiz');
  if(!m){m=document.createElement('div');m.className='mask';m.id='mBiz';
    m.innerHTML=`<div class="fm"><div class="ph"><span class="cap">NEW BUSINESS</span></div><div class="bd">
    <div class="row"><label>사업 이름<input id="bzName" maxlength="30" placeholder="예: 동네 카페"></label><label>영문 코드<input id="bzId" maxlength="20" placeholder="예: cafe"></label></div>
    <label>유형<select id="bzKind"><option value="BRAND">BRAND · 콘텐츠·SNS 브랜드 (캘린더·자료실·게시)</option><option value="PRODUCT">PRODUCT · 만드는 제품 (마일스톤·문서·빌드)</option><option value="SERVICE">SERVICE · 운영·서비스 (마일스톤·문서)</option></select></label>
    <label>한 줄 설명<input id="bzDesc" maxlength="60"></label>
    <label>첫 미션 (선택)<textarea id="bzMission" rows="4" placeholder="적으면 등록과 동시에 TOM이 업무로 나눕니다"></textarea></label>
    <div class="err" id="bzErr"></div>
    <div class="row"><button class="btn" data-close>취소</button><button class="btn pri" id="bzSave">사업 등록</button></div></div></div>`;
    $('#stage').append(m);m.querySelector('[data-close]').onclick=()=>m.classList.remove('show');}
  ['bzName','bzId','bzDesc','bzMission'].forEach(k=>$('#'+k).value='');$('#bzErr').textContent='';m.classList.add('show');
  $('#bzSave').onclick=async()=>{const name=$('#bzName').value.trim(),id=$('#bzId').value.trim().toLowerCase();
    if(!name){$('#bzErr').textContent='사업 이름을 적어 주세요.';return;}
    if(!/^[a-z][a-z0-9-]{1,19}$/.test(id)){$('#bzErr').textContent='영문 코드는 영문 소문자로 시작하고 영문·숫자·하이픈만 씁니다.';return;}
    if((S.bus||[]).some(b=>b.id===id)){$('#bzErr').textContent='이미 있는 코드입니다.';return;}
    const meta={id,name,kind:$('#bzKind').value,desc:$('#bzDesc').value.trim(),mission:$('#bzMission').value.trim()};
    $('#bzSave').disabled=true;
    try{await gh('/issues',{method:'POST',body:{title:'사업 등록: '+name,body:`${meta.kind} · ${name}\n${meta.desc}\n\n\`\`\`json meta\n${JSON.stringify(meta)}\n\`\`\``,labels:['business']}});
      m.classList.remove('show');toast(`${name} 등록 요청 · 엔진이 1~2분 안에 사업 목록에 넣습니다`);setTimeout(sync,1500);}
    catch(e){$('#bzErr').textContent='실패: '+e.message.slice(0,80);}finally{$('#bzSave').disabled=false;}};
}
