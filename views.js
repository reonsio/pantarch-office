'use strict';
/* MISSIONS · OUTPUTS · PLAYBOOK · CONNECTIONS 화면 */
const VW={open:{},plan:{},out:{},sel:null};
const mdLite=t=>esc(t||'').replace(/^### (.*)$/gm,'<b class="h3">$1</b>').replace(/^## (.*)$/gm,'<b class="h2">$1</b>').replace(/^# (.*)$/gm,'<b class="h1">$1</b>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>');
async function commentsOf(n){return await gh(`/issues/${n}/comments?per_page=100`)||[];}

/* ---------- MISSIONS ---------- */
function missionState(m,ts){
  if(m.state==='closed') return ['완료','#7A6654'];
  if(has(m,'paused')) return ['일시정지','#B79C7E'];
  if(!has(m,'planned')) return ['계획 중','#79B8C9'];
  if(ts.length&&ts.every(t=>t.state==='closed')) return ['업무 완료','#7DB79A'];
  return ['진행 중','#E2B04A'];
}
async function renderMissions(){
  const root=$('#vMissions');
  const ms=S.issues.filter(i=>has(i,'mission')||has(i,'meeting')).sort((a,b)=>(a.state===b.state?0:a.state==='open'?-1:1)||b.number-a.number);
  const tasks=S.issues.filter(i=>has(i,'task'));
  const row=m=>{const ts=tasks.filter(t=>meta(t).mission===m.number).sort((a,b)=>a.number-b.number);
    const done=ts.filter(t=>t.state==='closed').length,pct=ts.length?Math.round(done/ts.length*100):0;const [sl,sc]=missionState(m,ts);const op=VW.open[m.number];
    const plan=VW.plan[m.number];
    return `<div class="msn${op?' op':''}" data-mn="${m.number}">
    <div class="mh2"><span class="mono tw">${op?'▾':'▸'}</span><b class="mono" style="color:#D9A441">${code(m)}</b><span class="ell" style="font-size:13px;font-weight:600;color:#F4E6CF">${esc(m.title)}</span>${bizTag(bizOf(m))}
      <span class="mono" style="font-size:10px;color:${sc}"><i class="d" style="background:${sc}"></i>${sl}</span><span class="mono mu" style="font-size:11px">${done}/${ts.length}</span></div>
    <div class="bar2"><i style="width:${pct}%"></i></div>
    <div class="mb">
      <div class="sum">${plan===undefined?'<span class="mu">요약 불러오는 중…</span>':plan?mdLite(plan):'<span class="mu">—</span>'}</div>
      ${ts.map((t,k)=>{const st=statusOf(t),a=S.team.agents[lab(t,'agent:')]||{};return `<div class="tr" data-url="${t.html_url}" style="grid-template-columns:22px 52px minmax(0,1fr) 54px 78px 30px 70px"><span class="mono mu">${k+1}</span><span class="mono" style="color:#D9A441">${code(t)}</span><span class="ell">${esc(t.title)}</span><span class="mono" style="color:${teamCol(lab(t,'agent:'))}">${esc(a.name||'')}</span><span class="mono" style="color:${SC[st]}"><i class="d" style="background:${SC[st]}"></i>${st}</span><span class="mono r" style="color:${meta(t).score==null?'#7A6654':meta(t).score>=75?'#7DB79A':'#E2704F'}">${meta(t).score==null?'—':meta(t).score>=75?'통과':'보완'}</span><span class="mono r mu">${(meta(t).deps||[]).map(codeN).join(' ')||'—'}</span></div>`;}).join('')||'<div class="empty">업무 없음</div>'}
      <div class="b3" style="grid-template-columns:repeat(3,1fr);margin-top:8px">${has(m,'mission')&&m.state==='open'?(has(m,'paused')?'<button class="btn pri" data-ma="resume">재개</button>':'<button class="btn" data-ma="pause">일시정지</button>'):'<span></span>'}<button class="btn" data-ma="comment">의견 남기기</button>${m.state==='open'?'<button class="btn" data-ma="del">삭제</button>':'<span></span>'}</div>
    </div></div>`;};
  const openN=ms.filter(m=>m.state==='open').length;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0;flex:1"><div class="ph"><span class="cap">MISSIONS · ${openN} OPEN · ${ms.length-openN} CLOSED</span><span style="display:flex;gap:4px"><button class="btn sbtn" id="mvMeet" style="width:84px">＋ 회의</button><button class="btn sbtn pri" id="mvNew" style="width:84px">＋ 미션</button></span></div>
  <div class="scroll">${ms.map(row).join('')||'<div class="empty">미션 없음</div>'}</div></section>`;
  root.querySelectorAll('.mh2').forEach(h=>h.onclick=async()=>{const n=+h.parentElement.dataset.mn;VW.open[n]=!VW.open[n];renderMissions();
    if(VW.open[n]&&VW.plan[n]===undefined){try{const cs=await commentsOf(n);const c=cs.map(x=>x.body).find(b=>/## (계획|결론)/.test(b))||'';const m=/## (?:계획|결론)\s*\n+([\s\S]*?)(?=\n## |$)/.exec(c);VW.plan[n]=m?strip(m[1]):strip(c).slice(0,600);}catch{VW.plan[n]='';}renderMissions();}});
  root.querySelectorAll('[data-url]').forEach(el=>el.onclick=()=>open(el.dataset.url,'_blank','noopener'));
  root.querySelectorAll('[data-ma]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const n=+b.closest('[data-mn]').dataset.mn;const a=b.dataset.ma;b.disabled=true;
    try{if(a==='del'){
        const ts=tasks.filter(t=>meta(t).mission===n&&t.state==='open');const tn=new Set(tasks.filter(t=>meta(t).mission===n).map(t=>t.number));
        const ps=S.issues.filter(i=>has(i,'post')&&i.state==='open'&&!has(i,'status:scheduled')&&tn.has(meta(i).task));
        if(!confirm(`${codeN(n)} 미션을 삭제합니다. 남은 업무 ${ts.length}건${ps.length?`, 게시 결재 ${ps.length}건`:''}도 함께 지웁니다.`)){b.disabled=false;return;}
        for(const x of [...ts,...ps,{number:n}])await gh(`/issues/${x.number}`,{method:'PATCH',body:{state:'closed',state_reason:'not_planned'}});
        const gone=new Set([n,...ts.map(t=>t.number),...ps.map(p=>p.number)]);S.issues=S.issues.filter(i=>!gone.has(i.number));
        toast(`${codeN(n)} 삭제했습니다`);renderMissions();renderApprovals();renderBoard();return;}
      if(a==='pause'){await gh(`/issues/${n}/labels`,{method:'POST',body:{labels:['paused']}});toast(`${codeN(n)} 일시정지 · 진행 중인 업무만 마치고 멈춥니다`);}
      else if(a==='resume'){await gh(`/issues/${n}/labels/paused`,{method:'DELETE'});toast(`${codeN(n)} 재개`);gh('/actions/workflows/engine.yml/dispatches',{method:'POST',body:{ref:'main'}}).catch(()=>{});}
      else{const t=prompt('의견을 적어 주세요. 이 미션 담당 TOM이 반영합니다.');if(!t){b.disabled=false;return;}await gh(`/issues/${n}/comments`,{method:'POST',body:{body:t}});toast('의견을 남겼습니다');}
      setTimeout(sync,1200);}catch(err){toast('실패: '+err.message.slice(0,60));b.disabled=false;}});
  $('#mvNew').onclick=()=>openMission();$('#mvMeet').onclick=()=>$('#bMeet').click();
}

/* ---------- OUTPUTS ---------- */
function outParts(txt){
  const reel=(/완성 릴스\s*[:：]\s*(workspace\/\S+?\.mp4)/.exec(txt)||/\[엔진 편집 결과\]\s*(workspace\/\S+?\.mp4)/.exec(txt)||[])[1]||'';
  const sec=(/\.mp4\s*[·(]\s*([\d.]+)초/.exec(txt)||[])[1]||'';
  const qaRaw=(/<summary>[^<]*<\/summary>\s*([\s\S]*?)<\/details>/.exec(txt)||[])[1]||'';
  const qa=strip(qaRaw).replace(/^\s*1\)\s*/,'').split(/\s2\)\s/)[0].split(/(?<=[.다요])\s/).slice(0,2).join(' ').trim();
  const note=strip(txt.replace(/\[\[HANDOFF\]\][\s\S]*?\[\[\/HANDOFF\]\]/g,'').replace(/\[\[EDIT\]\][\s\S]*?\[\[\/EDIT\]\]/g,'').replace(/<details>[\s\S]*?<\/details>/g,'').replace(/\[엔진 편집 결과\].*$/gm,'')).replace(/`?workspace\/[\w\-\/.]+\/([\w\-.]+)`?/g,'$1').trim();
  const plain=note.replace(/^#+.*$/gm,'').replace(/\n{2,}/g,'\n').trim();
  const sm=/^\s*\**요약\**\s*[:：]\**\s*(.+)$/m.exec(plain)||/^\s*결론\s*[:：]\s*(.+)$/m.exec(plain);
  let one=sm?sm[1]:plain.split('\n').find(l=>l.trim().length>8)||'';one=one.split(/(?<=[.다요])\s/)[0];
  return {reel,sec,qa,note,one};
}
async function renderOutputs(){
  const root=$('#vOutputs');
  const ts=S.issues.filter(i=>has(i,'task')&&(i.state==='closed'||statusOf(i)==='REVIEW')).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const sel=VW.sel&&ts.find(t=>t.number===VW.sel)||null;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">OUTPUTS · ${ts.length}</span></div>
  <div class="scroll">${ts.map(t=>{const a=S.team.agents[lab(t,'agent:')]||{};const st=statusOf(t);return `<div class="oi${sel&&sel.number===t.number?' on':''}" data-on="${t.number}"><div style="display:flex;gap:6px;align-items:center"><b class="mono" style="color:#D9A441;font-size:11px">${code(t)}</b>${bizTag(bizOf(t))}<span class="mono" style="margin-left:auto;font-size:10px;color:${SC[st]}">${st}</span></div><div class="ell" style="font-size:12px;color:#F4E6CF;margin-top:2px">${esc(t.title)}</div><div class="mono mu" style="font-size:10px">${esc(a.name||'')} · ${hhmm(t.updated_at)}</div></div>`;}).join('')||'<div class="empty">결과물 없음</div>'}</div></section>
  ${!sel&&document.documentElement.classList.contains('m')?'':`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">${sel?code(sel)+' · '+esc(sel.title):'—'}</span>${sel?`<a class="btn sbtn" style="width:84px" href="${sel.html_url}" target="_blank" rel="noopener">GitHub</a>`:''}</div>
  <div class="scroll"><div class="doc2" id="outView">${sel?'<span class="mu">불러오는 중…</span>':''}</div></div></section>`}`;
  root.querySelectorAll('[data-on]').forEach(el=>el.onclick=()=>{VW.sel=+el.dataset.on;renderOutputs();});
  if(sel){let txt=VW.out[sel.number];
    if(txt===undefined){try{const cs=await commentsOf(sel.number);const c=[...cs].reverse().find(x=>/검수 \d+점/.test(x.body))||cs[cs.length-1];txt=c?c.body:'';}catch{txt='';}VW.out[sel.number]=txt;}
    const v=$('#outView');if(!v)return;if(!txt){v.innerHTML='<span class="mu">제출된 내용 없음</span>';return;}
    const o=outParts(txt);
    v.innerHTML=(o.reel?`<div class="ov"><video controls playsinline preload="metadata" id="outVid"></video><div class="mono mu" style="font-size:10px;margin-top:4px">편집한 릴스${o.sec?' · '+o.sec+'초':''}</div></div>`:'')
      +`<p class="osum">${esc(o.one||'제출된 내용 없음')}</p>`
      +(o.qa&&!/^\s*$/.test(o.qa)&&statusOf(sel)==='REVIEW'?`<div class="oqa"><b>검수 의견</b> ${esc(o.qa)}</div>`:'')
      +`<button class="btn sbtn" id="outMore" style="width:100%;margin-top:8px">작업 메모 펼치기</button><div id="outNote" style="display:none;margin-top:8px">${mdLite(o.note)}</div>`;
    $('#outMore').onclick=()=>{const n=$('#outNote');const on=n.style.display==='none';n.style.display=on?'block':'none';$('#outMore').textContent=on?'작업 메모 접기':'작업 메모 펼치기';};
    if(o.reel){try{$('#outVid').src=await blobUrl(o.reel);}catch{const w=$('#outVid');if(w)w.outerHTML='<div class="mu" style="font-size:11px">릴스를 불러오지 못했습니다</div>';}}}
}

/* ---------- PLAYBOOK ---------- */
let PB={text:null,sha:null,edit:false};
async function renderPlaybook(){
  const root=$('#vPlaybook');
  if(PB.text===null){try{const r=await gh('/contents/CLAUDE.md');PB.sha=r.sha;PB.text=decodeURIComponent(escape(atob(r.content.replace(/\n/g,''))));}catch(e){PB.text='';}}
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0;flex:1"><div class="ph"><span class="cap">PLAYBOOK</span><span style="display:flex;gap:4px">${PB.edit?'<button class="btn sbtn" id="pbCancel" style="width:72px">취소</button><button class="btn sbtn pri" id="pbSave" style="width:72px">저장</button>':'<button class="btn sbtn" id="pbEdit" style="width:72px">고치기</button>'}</span></div>
  <div class="scroll">${PB.edit?`<textarea id="pbText" style="width:100%;height:100%;min-height:560px;background:#17110D;border:0;color:#EFE2CC;font:12px/1.7 'IBM Plex Sans KR',sans-serif;padding:12px;resize:none">${esc(PB.text)}</textarea>`:`<div class="doc2">${mdLite(PB.text)}</div>`}</div></section>`;
  const e=$('#pbEdit');if(e)e.onclick=()=>{PB.edit=true;renderPlaybook();};
  const c=$('#pbCancel');if(c)c.onclick=()=>{PB.edit=false;renderPlaybook();};
  const s=$('#pbSave');if(s)s.onclick=async()=>{const t=$('#pbText').value;s.disabled=true;
    try{const r=await gh('/contents/CLAUDE.md',{method:'PUT',body:{message:'플레이북 수정 (대표님)',content:btoa(unescape(encodeURIComponent(t))),sha:PB.sha,branch:'main'}});PB.sha=(r&&r.content&&r.content.sha)||PB.sha;PB.text=t;PB.edit=false;toast('플레이북 저장 · 다음 업무부터 반영');renderPlaybook();}
    catch(err){toast(err.status===403?'저장 권한 없음: 접근키 Contents를 Read and write로':'저장 실패: '+err.message.slice(0,60));s.disabled=false;}};
}

/* ---------- CONNECTIONS ---------- */
async function renderConnections(){
  const root=$('#vConn');
  let runs=[],mruns=[],last='',mlast='';
  try{runs=((await gh('/actions/workflows/engine.yml/runs?per_page=6'))||{}).workflow_runs||[];}catch{}
  try{mruns=((await gh('/actions/workflows/media.yml/runs?per_page=4'))||{}).workflow_runs||[];}catch{}
  try{last=await gh('/contents/workspace/engine-last-run.md',{raw:true});}catch{}
  try{mlast=await gh('/contents/workspace/media-last-run.md',{raw:true});}catch{}
  let cx={};try{cx=JSON.parse(await gh('/contents/workspace/connections.json',{raw:true})||'{}');}catch{}
  const ig=cx.instagram||null,mods=cx.models||{};const ia=cx.ig_api||{};await loadKeys();const dk=KEYS.list.find(k=>k.id==='dev');
  const igState=!ig?'점검 전':ig.ok?'연결됨':'문제 있음';
  let qn=0;try{const q=JSON.parse(await gh('/contents/workspace/upload-count.json',{raw:true})||'{}');const k=new Date(Date.now()+9*36e5).toISOString().slice(0,7);qn=q[k]||0;}catch{}
  const igDesc=!ig?'점검 전':ig.ok?`@${esc(ig.instagram)} · 이번 달 게시 ${qn}/10`:esc(ig.problem||'');
  const mState=k=>mods[k]===false?'키 없음':'연결됨';const em=cx.engine_models||{};const gm=em.grok||{};
  const list=agents();const cnt={claude:0,gpt:0,grok:0};list.forEach(a=>cnt[a.model]=(cnt[a.model]||0)+1);
  const runRow=r=>{const run=r.status!=='completed';const col=run?'#E2B04A':(r.conclusion==='success'?'#7DB79A':'#E2704F');const dur=r.run_started_at?Math.round((new Date(r.updated_at)-new Date(r.run_started_at))/1000):0;
    return `<div class="tr" style="grid-template-columns:60px 90px minmax(0,1fr) 70px" onclick="open('${r.html_url}','_blank','noopener')"><span class="mono" style="color:#D9A441">#${r.run_number}</span><span class="mono" style="color:${col}"><i class="d" style="background:${col}"></i>${run?'RUNNING':(r.conclusion||'').toUpperCase()}</span><span class="mono mu">${esc(r.event)} · ${hhmm(r.run_started_at||r.created_at)}</span><span class="mono r mu">${Math.floor(dur/60)}m ${String(dur%60).padStart(2,'0')}s</span></div>`;};
  const card=(k,name,col,state,ok,desc)=>`<div class="cn"><div style="display:flex;justify-content:space-between;align-items:center"><span class="mono" style="font-size:11px;letter-spacing:1.2px;color:${col}">${k}</span><span class="mono" style="font-size:10px;color:${ok?'#7DB79A':'#E2704F'}"><i class="d" style="background:${ok?'#7DB79A':'#E2704F'}"></i>${state}</span></div><div style="font-size:14px;font-weight:600;color:#F4E6CF;margin:3px 0">${name}</div><div class="mu" style="font-size:11px;line-height:1.5">${desc}</div></div>`;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0;overflow:auto"><div class="ph"><span class="cap">CONNECTIONS</span></div>
   <div class="cgrid">
    ${card('MODEL','Claude',MC.claude,mState('claude'),mods.claude!==false,`직원 ${cnt.claude}명`)}
    ${card('MODEL','GPT',MC.gpt,mState('gpt'),mods.gpt!==false,`${esc((em.gpt||{}).model||'')} · 직원 ${cnt.gpt}명`)}
    ${card('MODEL','Grok',MC.grok,mState('grok'),mods.grok!==false,`${esc(gm.model||'')} · 직원 ${cnt.grok}명 · ${gm.search?'웹·X 검색 됨':gm.search===false?'검색 실패':'검색 점검 전'}`)}
    ${card('ENGINE','GitHub Actions','#D9A441',runs[0]?(runs[0].status!=='completed'?'실행 중':runs[0].conclusion==='success'?'정상':'오류'):'—',!runs[0]||runs[0].conclusion!=='failure',runs[0]?`마지막 실행 ${hhmm(runs[0].updated_at)}`:'')}
    ${card('CHANNEL','Instagram · 꾸미','#E08A5A',igState,!!(ig&&ig.ok),igDesc)}
    ${card('REFERENCE','인스타 공식 API','#E08A5A',ia.ok?'연결됨':ia.problem?'문제 있음':'점검 전',!!ia.ok,ia.ok?`@${esc(ia.account||'')} 조회 됨${ia.expires?` · 만료 ${ia.expires} (D-${Math.max(0,Math.ceil((new Date(ia.expires)-Date.now())/864e5))})`:''}`:esc(ia.problem||''))}
    ${card('DEVICE','이 기기 접근키','#A3ACDB',TOKEN?'연결됨':'없음',!!TOKEN,dk?`만료 ${dk.due} 무렵 (D-${keyDays(dk)})`:'')}
   </div>
   <div class="ph" style="border-top:1px solid #3A2A1F"><span class="cap">ENGINE RUNS</span><span class="cnb"><button class="btn sbtn pri" id="cnWake">엔진 깨우기</button><button class="btn sbtn" id="cnMedia">자료 분석</button><button class="btn sbtn" id="cnCheck">연결 점검</button></span></div>
   ${runs.map(runRow).join('')||'<div class="empty">기록 없음</div>'}
   <div class="ph" style="border-top:1px solid #3A2A1F"><span class="cap">MEDIA RUNS</span></div>
   ${mruns.map(runRow).join('')||'<div class="empty">기록 없음</div>'}
   <div class="ph" style="border-top:1px solid #3A2A1F"><span class="cap">LAST LOG</span></div>
   <div class="doc2" style="font-size:11px;line-height:1.6">${esc(((last||'')+'\n'+(mlast||'')).split('\n').filter(l=>/^- /.test(l)).map(l=>l.slice(2)).slice(-14).join('\n'))||'기록 없음'}</div>
  </section>`;
  $('#cnWake').onclick=async()=>{try{await gh('/actions/workflows/engine.yml/dispatches',{method:'POST',body:{ref:'main'}});toast('엔진을 깨웠습니다');setTimeout(renderConnections,4000);}catch{toast('실패: Actions 권한을 확인해 주세요');}};
  $('#cnCheck').onclick=async()=>{try{await gh('/actions/workflows/connect.yml/dispatches',{method:'POST',body:{ref:'main'}});toast('연결 점검을 시작했습니다. 1분 뒤 새로고침하세요');}catch{toast('실패: Actions 권한을 확인해 주세요');}};
  $('#cnMedia').onclick=async()=>{try{await gh('/actions/workflows/media.yml/dispatches',{method:'POST',body:{ref:'main'}});toast('자료 분석을 시작했습니다');setTimeout(renderConnections,4000);}catch{toast('실패: Actions 권한을 확인해 주세요');}};
}

/* ---------- REFERENCE (회사 공통 기능) ----------
   계정·링크·예시·스크린샷을 '회사 공통' 또는 사업별로 쌓는다. 직원·검수는 공통 + 자기 사업 기준을 함께 읽는다. */
const REF={f:'all',cache:{},stat:''};
const REF_KINDS=[['말투','말투·캡션'],['영상','영상·편집'],['비주얼','비주얼'],['기획','기획·기타']];
function refScopes(){return [{id:'_common',name:'회사 공통',kind:'COMMON',col:'#D9A441'}].concat((S.bus||[]).map(b=>({id:b.id,name:b.name,kind:b.kind,col:b.color||KCOL[b.kind]||'#A08A72'})));}
function parseVoice(txt){const sec={};let cur=null;(txt||'').split('\n').forEach(l=>{const h=/^##\s+(.+)/.exec(l);if(h){cur=h[1].trim();sec[cur]=[];return;}if(cur&&/^- /.test(l))sec[cur].push(l.slice(2));});return sec;}
async function renderRefs(){
  const root=$('#vRefs');const sc=refScopes();
  await Promise.all(sc.map(async x=>{if(REF.cache[x.id]===undefined){try{REF.cache[x.id]=await gh(`/contents/workspace/${x.id}/voice.md`,{raw:true})||'';}catch{REF.cache[x.id]='';}}}));
  const ORDER=[['레퍼런스 계정','계정'],['레퍼런스 예시','예시'],['레퍼런스 캡션(대표님이 준 예)','예시'],['레퍼런스 링크','링크'],['레퍼런스 스크린샷','스크린샷'],['레퍼런스 영상','영상'],['대표님이 통과시킨 캡션','통과시킨 것'],['대표님이 싫어한 캡션','싫어한 것'],['대표님 의견','대표님 의견'],['기본','기본 원칙']];
  const cnt=x=>Object.values(parseVoice(REF.cache[x.id])).reduce((n,a)=>n+a.length,0);
  const shown=sc.filter(x=>REF.f==='all'||REF.f===x.id);
  const list=shown.map(x=>{const sec=parseVoice(REF.cache[x.id]);
    const groups=ORDER.filter(([k])=>sec[k]&&sec[k].length).map(([k,l])=>`<div class="vg"><div class="vh"><b>${l}</b><em>${sec[k].length}</em></div>${(k==='기본'?sec[k]:sec[k].slice().reverse()).map(v=>`<div class="vi">${esc(v)}</div>`).join('')}</div>`).join('');
    return `<div class="vs"><span style="color:${x.col}">${x.kind}</span><span style="color:#F4E6CF">${esc(x.name)}</span></div>${groups||'<div class="empty">없음</div>'}`;}).join('');
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">ADD REFERENCE</span></div>
    <form class="rf" id="rfF"><div class="rfr"><label>어디에<select id="rfS">${sc.map(x=>`<option value="${x.id}"${x.id===(REF.f==='all'?'_common':REF.f)?' selected':''}>${x.id==='_common'?'회사 공통':`${x.kind} · ${esc(x.name)}`}</option>`).join('')}</select></label>
    <label>종류<select id="rfK">${REF_KINDS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label></div>
    <textarea id="rfT" rows="3" placeholder="@계정, 링크, 문구 · 인스타는 화면 녹화·캡처가 가장 정확"></textarea>
    <div class="rfb"><label class="btn sbtn">사진·영상<input type="file" id="rfI" multiple accept="image/*,video/*" style="display:none"></label><span class="mu" id="rfN"></span><button class="btn sbtn pri" id="rfGo">넣기</button></div></form>
    ${REF.stat?`<div class="libnote">${esc(REF.stat)}</div>`:''}</section>
  <section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">REFERENCE</span><span class="chips">${[{id:'all',name:'전체'}].concat(sc).map(x=>`<button class="btn sbtn${REF.f===x.id?' on':''}" data-rf="${x.id}" style="width:auto;padding:0 10px">${esc(x.id==='_common'?'공통':x.name)} ${x.id==='all'?sc.reduce((n,y)=>n+cnt(y),0):cnt(x)}</button>`).join('')}</span></div>
    <div class="scroll">${list}</div></section>`;
  root.querySelectorAll('[data-rf]').forEach(el=>el.onclick=()=>{REF.f=el.dataset.rf;renderRefs();});
  let files=[];
  $('#rfI').onchange=e=>{files=[...e.target.files];$('#rfN').textContent=files.length?`${files.length}장`:'';};
  $('#rfF').onsubmit=async e=>{e.preventDefault();const t=$('#rfT').value.trim();if(!t&&!files.length)return;const scope=$('#rfS').value,kind=$('#rfK').value;const go=$('#rfGo');go.disabled=true;
    try{const paths=[];
      for(const [k,f] of files.entries()){const vid=/^video/.test(f.type);if(vid&&f.size>40*1048576){toast(`${f.name}: 40MB 넘는 영상은 짧게 잘라 주세요`);continue;}
        const blob=vid?f:await shrink(f);const ext=vid?((f.name.split('.').pop()||'mp4').toLowerCase()):'jpg';const pth=`workspace/${scope}/refs/${stamp(new Date())}-${k}.${ext}`;$('#rfN').textContent=`올리는 중 ${k+1}/${files.length}`;await putFile(pth,blob,'레퍼런스 자료');paths.push(pth);}
      let num=(typeof CH!=='undefined'&&CH.num)||(S.issues.find(i=>i.state==='open'&&has(i,'chat'))||{}).number;
      if(!num){const it=await gh('/issues',{method:'POST',body:{title:'대표님 채팅',body:'대표님과 직원의 채팅방입니다. 닫지 마세요.',labels:['chat']}});num=it.number;}
      await gh(`/issues/${num}/comments`,{method:'POST',body:{body:`레퍼런스 #${scope} !${kind} ${t}${paths.length?'\n'+paths.join('\n'):''}`}});
      const name=(sc.find(x=>x.id===scope)||{}).name;
      REF.stat=`${name}에 넣었습니다. 1~2분 뒤 목록에 반영됩니다.`;REF.f=scope;REF.cache[scope]=undefined;
      setTimeout(()=>{REF.cache[scope]=undefined;REF.stat='';if(VIEW==='refs')renderRefs();},90000);renderRefs();
    }catch(err){toast('실패: '+(err.status===403?'접근키 권한(Contents·Issues 쓰기)':err.message.slice(0,60)));go.disabled=false;}};
}
