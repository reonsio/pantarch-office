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
      <div class="sum">${plan===undefined?'<span class="mu">요약 불러오는 중…</span>':plan?mdLite(plan):'<span class="mu">아직 계획 요약이 없습니다.</span>'}</div>
      ${ts.map((t,k)=>{const st=statusOf(t),a=S.team.agents[lab(t,'agent:')]||{};return `<div class="tr" data-url="${t.html_url}" style="grid-template-columns:22px 52px minmax(0,1fr) 54px 78px 30px 70px"><span class="mono mu">${k+1}</span><span class="mono" style="color:#D9A441">${code(t)}</span><span class="ell">${esc(t.title)}</span><span class="mono" style="color:${MC[(a.model||'').toLowerCase()]||'#A08A72'}">${esc(a.name||'')}</span><span class="mono" style="color:${SC[st]}"><i class="d" style="background:${SC[st]}"></i>${st}</span><span class="mono r">${meta(t).score??'—'}</span><span class="mono r mu">${(meta(t).deps||[]).map(codeN).join(' ')||'—'}</span></div>`;}).join('')||'<div class="empty">아직 나눠진 업무가 없습니다.</div>'}
      <div class="b3" style="grid-template-columns:repeat(3,1fr);margin-top:8px">${has(m,'mission')&&m.state==='open'?(has(m,'paused')?'<button class="btn pri" data-ma="resume">재개</button>':'<button class="btn" data-ma="pause">일시정지</button>'):'<span></span>'}<button class="btn" data-ma="comment">의견 남기기</button><a class="btn" href="${m.html_url}" target="_blank" rel="noopener">GitHub에서 보기</a></div>
    </div></div>`;};
  const openN=ms.filter(m=>m.state==='open').length;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0;flex:1"><div class="ph"><span class="cap">MISSIONS · ${openN} OPEN · ${ms.length-openN} CLOSED</span><span style="display:flex;gap:4px"><button class="btn sbtn" id="mvMeet" style="width:84px">＋ 회의</button><button class="btn sbtn pri" id="mvNew" style="width:84px">＋ 미션</button></span></div>
  <div class="scroll">${ms.map(row).join('')||'<div class="empty">미션이 없습니다. ＋ 미션으로 시작하세요.</div>'}</div></section>`;
  root.querySelectorAll('.mh2').forEach(h=>h.onclick=async()=>{const n=+h.parentElement.dataset.mn;VW.open[n]=!VW.open[n];renderMissions();
    if(VW.open[n]&&VW.plan[n]===undefined){try{const cs=await commentsOf(n);const c=cs.map(x=>x.body).find(b=>/## (계획|결론)/.test(b))||'';const m=/## (?:계획|결론)\s*\n+([\s\S]*?)(?=\n## |$)/.exec(c);VW.plan[n]=m?strip(m[1]):strip(c).slice(0,600);}catch{VW.plan[n]='';}renderMissions();}});
  root.querySelectorAll('[data-url]').forEach(el=>el.onclick=()=>open(el.dataset.url,'_blank','noopener'));
  root.querySelectorAll('[data-ma]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const n=+b.closest('[data-mn]').dataset.mn;const a=b.dataset.ma;b.disabled=true;
    try{if(a==='pause'){await gh(`/issues/${n}/labels`,{method:'POST',body:{labels:['paused']}});toast(`${codeN(n)} 일시정지 · 진행 중인 업무만 마치고 멈춥니다`);}
      else if(a==='resume'){await gh(`/issues/${n}/labels/paused`,{method:'DELETE'});toast(`${codeN(n)} 재개`);gh('/actions/workflows/engine.yml/dispatches',{method:'POST',body:{ref:'main'}}).catch(()=>{});}
      else{const t=prompt('의견을 적어 주세요. 이 미션 담당 TOM이 반영합니다.');if(!t){b.disabled=false;return;}await gh(`/issues/${n}/comments`,{method:'POST',body:{body:t}});toast('의견을 남겼습니다');}
      setTimeout(sync,1200);}catch(err){toast('실패: '+err.message.slice(0,60));b.disabled=false;}});
  $('#mvNew').onclick=()=>openMission();$('#mvMeet').onclick=()=>$('#bMeet').click();
}

/* ---------- OUTPUTS ---------- */
async function renderOutputs(){
  const root=$('#vOutputs');
  const ts=S.issues.filter(i=>has(i,'task')&&(i.state==='closed'||statusOf(i)==='REVIEW')).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const sel=VW.sel&&ts.find(t=>t.number===VW.sel)||null;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">OUTPUTS · ${ts.length}</span><span class="mono mu" style="font-size:10px">검수 통과·결재 대기 결과물</span></div>
  <div class="scroll">${ts.map(t=>{const a=S.team.agents[lab(t,'agent:')]||{};const st=statusOf(t);return `<div class="oi${sel&&sel.number===t.number?' on':''}" data-on="${t.number}"><div style="display:flex;gap:6px;align-items:center"><b class="mono" style="color:#D9A441;font-size:11px">${code(t)}</b>${bizTag(bizOf(t))}<span class="mono" style="margin-left:auto;font-size:10px;color:${SC[st]}">${st}</span></div><div class="ell" style="font-size:12px;color:#F4E6CF;margin-top:2px">${esc(t.title)}</div><div class="mono mu" style="font-size:10px">${esc(a.name||'')} · QA ${meta(t).score??'—'} · ${hhmm(t.updated_at)}</div></div>`;}).join('')||'<div class="empty">아직 결과물이 없습니다.</div>'}</div></section>
  <section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">${sel?code(sel)+' · '+esc(sel.title):'결과물을 고르세요'}</span>${sel?`<a class="btn sbtn" style="width:84px" href="${sel.html_url}" target="_blank" rel="noopener">GitHub</a>`:''}</div>
  <div class="scroll"><div class="doc2" id="outView">${sel?'<span class="mu">불러오는 중…</span>':'<span class="mu">왼쪽 목록에서 결과물을 누르면 내용이 여기 나옵니다. 인계 편지와 검수 의견도 함께 보입니다.</span>'}</div></div></section>`;
  root.querySelectorAll('[data-on]').forEach(el=>el.onclick=()=>{VW.sel=+el.dataset.on;renderOutputs();});
  if(sel){let txt=VW.out[sel.number];
    if(txt===undefined){try{const cs=await commentsOf(sel.number);const c=[...cs].reverse().find(x=>/검수 \d+점/.test(x.body))||cs[cs.length-1];txt=c?c.body:'';}catch{txt='';}VW.out[sel.number]=txt;}
    const v=$('#outView');if(v)v.innerHTML=txt?mdLite(strip(txt).replace(/<\/?details>|<\/?summary>/g,'\n')):'<span class="mu">아직 제출된 내용이 없습니다.</span>';}
}

/* ---------- PLAYBOOK ---------- */
let PB={text:null,sha:null,edit:false};
async function renderPlaybook(){
  const root=$('#vPlaybook');
  if(PB.text===null){try{const r=await gh('/contents/CLAUDE.md');PB.sha=r.sha;PB.text=decodeURIComponent(escape(atob(r.content.replace(/\n/g,''))));}catch(e){PB.text='';}}
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0;flex:1"><div class="ph"><span class="cap">PLAYBOOK · 회사 규칙 (모든 직원이 매 업무마다 읽음)</span><span style="display:flex;gap:4px">${PB.edit?'<button class="btn sbtn" id="pbCancel" style="width:72px">취소</button><button class="btn sbtn pri" id="pbSave" style="width:72px">저장</button>':'<button class="btn sbtn" id="pbEdit" style="width:72px">고치기</button>'}</span></div>
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
  const ig=cx.instagram||null,mods=cx.models||{};
  const igState=!ig?'점검 전':ig.ok?'연결됨':'문제 있음';
  const igDesc=!ig?'아직 연결 점검을 돌리지 않았습니다. 아래 연결 점검을 누르세요.':ig.ok?`Upload-Post 프로필 ${esc(ig.profile)} · ${esc(ig.instagram)}. 게시 승인하면 추천 시각에 예약되고 해시태그는 첫 댓글로 답니다.${ig.plan?' · 플랜 '+esc(String(ig.plan)):''} · ${hhmm(ig.checked)} 점검`:`${esc(ig.problem||'')} · ${hhmm(ig.checked)} 점검`;
  const mState=k=>mods[k]===false?'키 없음':'연결됨';
  const list=agents();const cnt={claude:0,gpt:0,grok:0};list.forEach(a=>cnt[a.model]=(cnt[a.model]||0)+1);
  const runRow=r=>{const run=r.status!=='completed';const col=run?'#E2B04A':(r.conclusion==='success'?'#7DB79A':'#E2704F');const dur=r.run_started_at?Math.round((new Date(r.updated_at)-new Date(r.run_started_at))/1000):0;
    return `<div class="tr" style="grid-template-columns:60px 90px minmax(0,1fr) 70px" onclick="open('${r.html_url}','_blank','noopener')"><span class="mono" style="color:#D9A441">#${r.run_number}</span><span class="mono" style="color:${col}"><i class="d" style="background:${col}"></i>${run?'RUNNING':(r.conclusion||'').toUpperCase()}</span><span class="mono mu">${esc(r.event)} · ${hhmm(r.run_started_at||r.created_at)}</span><span class="mono r mu">${Math.floor(dur/60)}m ${String(dur%60).padStart(2,'0')}s</span></div>`;};
  const card=(k,name,col,state,ok,desc)=>`<div class="cn"><div style="display:flex;justify-content:space-between;align-items:center"><span class="mono" style="font-size:11px;letter-spacing:1.2px;color:${col}">${k}</span><span class="mono" style="font-size:10px;color:${ok?'#7DB79A':'#E2704F'}"><i class="d" style="background:${ok?'#7DB79A':'#E2704F'}"></i>${state}</span></div><div style="font-size:14px;font-weight:600;color:#F4E6CF;margin:3px 0">${name}</div><div class="mu" style="font-size:11px;line-height:1.5">${desc}</div></div>`;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0;overflow:auto"><div class="ph"><span class="cap">CONNECTIONS</span><span class="mono mu" style="font-size:10px">키는 GitHub Secrets에만 있습니다</span></div>
   <div class="cgrid">
    ${card('MODEL','Claude',MC.claude,mState('claude'),mods.claude!==false,`Pro 구독 · 직원 ${cnt.claude}명 · 자료 분석 담당`)}
    ${card('MODEL','GPT',MC.gpt,mState('gpt'),mods.gpt!==false,`OpenAI 크레딧 · 직원 ${cnt.gpt}명 · 그림을 같이 봄`)}
    ${card('MODEL','Grok',MC.grok,mState('grok'),mods.grok!==false,`xAI 선불 · 직원 ${cnt.grok}명 · 그림을 같이 봄`)}
    ${card('ENGINE','GitHub Actions','#D9A441',runs[0]?(runs[0].status!=='completed'?'실행 중':runs[0].conclusion==='success'?'정상':'오류'):'—',!runs[0]||runs[0].conclusion!=='failure','미션·회의·결재·업무 처리. 새 일이 생기면 바로, 남은 일이 있으면 스스로 이어서 돕니다.')}
    ${card('CHANNEL','Instagram · 꾸미','#E08A5A',igState,!!(ig&&ig.ok),igDesc)}
    ${card('DEVICE','이 기기 접근키','#A3ACDB',TOKEN?'연결됨':'없음',!!TOKEN,'이 브라우저에만 저장. 다른 기기는 따로 키를 넣습니다.')}
   </div>
   <div class="ph" style="border-top:1px solid #3A2A1F"><span class="cap">ENGINE RUNS</span><span style="display:flex;gap:4px"><button class="btn sbtn pri" id="cnWake" style="width:96px">엔진 깨우기</button><button class="btn sbtn" id="cnMedia" style="width:96px">자료 분석 돌리기</button><button class="btn sbtn" id="cnCheck" style="width:96px">연결 점검</button></span></div>
   ${runs.map(runRow).join('')||'<div class="empty">실행 기록이 없습니다.</div>'}
   <div class="ph" style="border-top:1px solid #3A2A1F"><span class="cap">MEDIA RUNS</span></div>
   ${mruns.map(runRow).join('')||'<div class="empty">아직 자료 처리 기록이 없습니다.</div>'}
   <div class="ph" style="border-top:1px solid #3A2A1F"><span class="cap">LAST LOG</span></div>
   <div class="doc2" style="font-size:11px">${mdLite((last||'')+'\n'+(mlast||''))}</div>
  </section>`;
  $('#cnWake').onclick=async()=>{try{await gh('/actions/workflows/engine.yml/dispatches',{method:'POST',body:{ref:'main'}});toast('엔진을 깨웠습니다');setTimeout(renderConnections,4000);}catch{toast('실패: Actions 권한을 확인해 주세요');}};
  $('#cnCheck').onclick=async()=>{try{await gh('/actions/workflows/connect.yml/dispatches',{method:'POST',body:{ref:'main'}});toast('연결 점검을 시작했습니다. 1분 뒤 새로고침하세요');}catch{toast('실패: Actions 권한을 확인해 주세요');}};
  $('#cnMedia').onclick=async()=>{try{await gh('/actions/workflows/media.yml/dispatches',{method:'POST',body:{ref:'main'}});toast('자료 분석을 시작했습니다');setTimeout(renderConnections,4000);}catch{toast('실패: Actions 권한을 확인해 주세요');}};
}
