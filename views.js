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
    <div class="mh2"><span class="mono tw">${op?'▾':'▸'}</span><b class="mono" style="color:#D9A441">${code(m)}</b><span class="ell" style="font-size:13px;font-weight:600;color:#F4E6CF">${esc(m.title)}</span><span class="bzc">${bizTag(bizOf(m))}</span>
      <span class="mono" style="font-size:10px;color:${sc}"><i class="d" style="background:${sc}"></i>${sl}</span><span class="mono mu" style="font-size:11px">${done}/${ts.length}</span></div>
    <div class="bar2"><i style="width:${pct}%"></i></div>
    <div class="mb">
      <div class="sum">${plan===undefined?'<span class="mu">요약 불러오는 중…</span>':plan?mdLite(plan):'<span class="mu">—</span>'}</div>
      ${ts.map((t,k)=>{const st=statusOf(t),a=S.team.agents[lab(t,'agent:')]||{};return `<div class="tr" data-url="${t.html_url}"><span class="mono mu">${k+1}</span><span class="mono" style="color:#D9A441">${code(t)}</span><span class="ell">${esc(t.title)}</span><span class="mono" style="color:${teamCol(lab(t,'agent:'))}">${esc(a.name||'')}</span><span class="mono" style="color:${SC[st]}"><i class="d" style="background:${SC[st]}"></i>${st}</span><span class="mono r" style="color:${meta(t).score==null?'#7A6654':meta(t).score>=75?'#7DB79A':'#E2704F'}">${meta(t).score==null?'—':meta(t).score>=75?'통과':'보완'}</span><span class="mono r mu ell">${(meta(t).deps||[]).map(codeN).join(' ')||'—'}</span></div>`;}).join('')||'<div class="empty">업무 없음</div>'}
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
        if(!await ask({cap:'DELETE',msg:`${codeN(n)} 미션을 삭제합니다. 남은 업무 ${ts.length}건${ps.length?`, 게시 결재 ${ps.length}건`:''}도 함께 지웁니다.`,ok:'삭제',danger:1})){b.disabled=false;return;}
        for(const x of [...ts,...ps,{number:n}])await gh(`/issues/${x.number}`,{method:'PATCH',body:{state:'closed',state_reason:'not_planned'}});
        const gone=new Set([n,...ts.map(t=>t.number),...ps.map(p=>p.number)]);S.issues=S.issues.filter(i=>!gone.has(i.number));
        toast(`${codeN(n)} 삭제했습니다`);renderMissions();renderApprovals();renderBoard();return;}
      if(a==='pause'){await gh(`/issues/${n}/labels`,{method:'POST',body:{labels:['paused']}});toast(`${codeN(n)} 일시정지 · 진행 중인 업무만 마치고 멈춥니다`);}
      else if(a==='resume'){await gh(`/issues/${n}/labels/paused`,{method:'DELETE'});toast(`${codeN(n)} 재개`);gh('/actions/workflows/engine.yml/dispatches',{method:'POST',body:{ref:'main'}}).catch(()=>{});}
      else{const t=await ask({cap:'COMMENT · '+codeN(n),msg:'담당 TOM이 반영합니다.',input:1,ph:'바꿀 점 · 추가할 점',ok:'보내기'});if(!t){b.disabled=false;return;}await gh(`/issues/${n}/comments`,{method:'POST',body:{body:t}});toast('의견을 남겼습니다');}
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
  const posts=[...txt.matchAll(/\[\[POST\]\]((?:(?!\[\[POST\]\])[\s\S])*?)\[\[\/POST\]\]/g)].map(m=>{const b=m[1];const f=k=>((new RegExp(k+'\\s*[:：]\\s*(.*)')).exec(b)||[])[1]||'';
    const fs=(/파일\s*[:：]([\s\S]*?)(?:\n\s*캡션\s*[:：]|$)/.exec(b)||[])[1]||'';
    return {kind:f('형식').trim(),files:[...new Set(fs.match(/workspace\/[^\s,`'"]+/g)||[])],cap:((/캡션\s*[:：]\s*\n?([\s\S]*?)(?:\n해시태그|\n추천 시각|$)/.exec(b)||[])[1]||'').trim(),tags:f('해시태그').trim(),when:f('추천 시각').trim()};});
  const imgs=posts.length||reel?[]:[...new Set(txt.match(/workspace\/[\w\-\/.가-힣]+\.(?:jpe?g|png|webp)/gi)||[])].filter(p=>!p.includes('/.thumbs/')&&!/\.pptx\.d\/|\.pdf\.d\//.test(p)).slice(0,24);
  return {reel,sec,qa,note,one,posts,imgs};
}
async function renderOutputs(){
  const root=$('#vOutputs');
  const ts=S.issues.filter(i=>has(i,'task')&&(i.state==='closed'||statusOf(i)==='REVIEW')).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const sel=VW.sel&&ts.find(t=>t.number===VW.sel)||(document.documentElement.classList.contains('m')?null:ts[0])||null;
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">OUTPUTS · ${ts.length}</span></div>
  <div class="scroll">${ts.map(t=>{const a=S.team.agents[lab(t,'agent:')]||{};const st=statusOf(t);return `<div class="oi${sel&&sel.number===t.number?' on':''}" data-on="${t.number}"><div style="display:flex;gap:6px;align-items:center"><b class="mono" style="color:#D9A441;font-size:11px">${code(t)}</b>${bizTag(bizOf(t))}<span class="mono" style="margin-left:auto;font-size:10px;color:${SC[st]}">${st}</span></div><div class="ell" style="font-size:12px;color:#F4E6CF;margin-top:2px">${esc(t.title)}</div><div class="mono mu" style="font-size:10px">${esc(a.name||'')} · ${hhmm(t.updated_at)}</div></div>`;}).join('')||'<div class="empty">결과물 없음</div>'}</div></section>
  ${!sel&&document.documentElement.classList.contains('m')?'':`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">${sel?code(sel)+' · '+esc(sel.title):'—'}</span>${sel?`<a class="btn sbtn" style="width:84px" href="${sel.html_url}" target="_blank" rel="noopener">GitHub</a>`:''}</div>
  <div class="scroll"><div class="doc2" id="outView">${sel?'<span class="mu">불러오는 중…</span>':''}</div></div></section>`}`;
  root.querySelectorAll('[data-on]').forEach(el=>el.onclick=()=>{VW.sel=+el.dataset.on;renderOutputs();});
  if(sel){let txt=VW.out[sel.number];
    if(txt===undefined){try{const cs=await commentsOf(sel.number);const c=[...cs].reverse().find(x=>/검수 \d+점/.test(x.body))||cs[cs.length-1];txt=c?c.body:'';}catch{txt='';}VW.out[sel.number]=txt;}
    const v=$('#outView');if(!v)return;if(!txt){v.innerHTML='<span class="mu">제출된 내용 없음</span>';return;}
    if(!/\[\[\/POST\]\]/.test(txt)&&!VW.outx)VW.outx={};
    if(!/\[\[\/POST\]\]/.test(txt)){const k=sel.number;if(VW.outx[k]===undefined){VW.outx[k]='';for(const f of new Set(txt.match(/workspace\/[\w\-.\/가-힣]+\.md/g)||[])){try{VW.outx[k]+='\n'+(await gh('/contents/'+f.split('/').map(encodeURIComponent).join('/'),{raw:true})||'');}catch{}}}
      txt=txt+(VW.outx[k]||'');}
    const o=outParts(txt);
    v.innerHTML=(o.reel?`<div class="ov"><video controls playsinline preload="metadata" id="outVid"></video><div class="mono mu" style="font-size:10px;margin-top:4px">편집한 릴스${o.sec?' · '+o.sec+'초':''}</div></div>`:'')
      +o.posts.map((p,k)=>`<div class="opost">${o.posts.length>1?`<div class="mono mu" style="font-size:10px;margin-bottom:4px">게시물 ${k+1}</div>`:''}${p.files.length?`<div class="apcar${p.files.length===1?' one':''}">${p.files.map((f,j)=>/\.(mp4|mov|m4v|webm)$/i.test(f)?`<span data-vid="${esc(f)}" class="ovv">▶ 영상</span>`:`<span><img data-path="${esc(f)}" alt=""><em>${j+1}</em></span>`).join('')}</div>`:''}
        <div class="ocap">${esc(p.cap||'(캡션 없음)')}</div><div class="mono mu ometa">${esc(p.kind||'')}${p.when?' · '+esc(p.when):''}${p.tags?`<br>첫 댓글 ${esc(p.tags)}`:''}</div></div>`).join('')
      +(()=>{const sh=o.imgs.filter(f=>f.includes('/shots/')),rest=o.imgs.filter(f=>!f.includes('/shots/'));const lab=f=>(f.includes('/ref/')?'기준 사이트 · ':'')+(/-pc-top\.jpg$/.test(f)?'노트북 첫 화면':/-pc\.jpg$/.test(f)?'노트북 전체':/-m\.jpg$/.test(f)?'폰':'');
        return (sh.length?`<div class="oshots">${sh.map(f=>`<figure class="${/-m\.jpg$/.test(f)?'mo':/-pc-top/.test(f)?'top':''}"><figcaption class="mono">${lab(f)} · ${esc(f.split('/').pop().replace(/-[0-9a-f]{5}-(pc-top|pc|m)\.jpg$/,''))}</figcaption><img data-path="${esc(f)}" alt=""></figure>`).join('')}</div>`:'')
          +(rest.length?`<div class="apcar">${rest.map((f,j)=>`<span><img data-path="${esc(f)}" alt=""><em>${j+1}</em></span>`).join('')}</div>`:'');})()
      +`<p class="osum">${esc(o.one||'제출된 내용 없음')}</p>`
      +(o.qa&&!/^\s*$/.test(o.qa)&&statusOf(sel)==='REVIEW'?`<div class="oqa"><b>검수 의견</b> ${esc(o.qa)}</div>`:'')
      +`<div class="ofix"><textarea id="outFb" rows="2" placeholder="고칠 점을 적으면 담당 직원이 다시 합니다"></textarea><div class="ofb">${statusOf(sel)==='REVIEW'?'<button class="btn sbtn pri" id="outOk">승인</button>':''}<button class="btn sbtn" id="outFix">수정 요청</button></div></div>`
      +`<button class="btn sbtn" id="outMore" style="width:100%;margin-top:8px">작업 메모 펼치기</button><div id="outNote" style="display:none;margin-top:8px">${mdLite(o.note)}</div>`;
    if(typeof lazy==='function')lazy(v);
    const n=sel.number;
    const send=async(text,label)=>{try{
        if(sel.state==='closed'){const ls=(sel.labels||[]).map(l=>l.name).filter(x=>!x.startsWith('status:')).concat('status:review');await gh(`/issues/${n}`,{method:'PATCH',body:{state:'open',labels:ls}});}
        await gh(`/issues/${n}/comments`,{method:'POST',body:{body:text}});
        if(typeof markDecided==='function')markDecided(n);toast(label);VW.out[n]=undefined;setTimeout(sync,1500);
      }catch(e){toast('보내기 실패: '+(e.status===403?'접근키 Issues 권한':String(e.message).slice(0,40)));}};
    const fx=$('#outFix');if(fx)fx.onclick=()=>{const t=$('#outFb').value.trim();if(!t){toast('고칠 점을 적어 주세요');$('#outFb').focus();return;}fx.disabled=true;send(t,'수정 요청 보냄 · 담당 직원이 다시 합니다');};
    const okb=$('#outOk');if(okb)okb.onclick=()=>{okb.disabled=true;send('승인','승인했습니다');};
    v.querySelectorAll('[data-vid]').forEach(el=>el.onclick=async()=>{try{el.outerHTML=`<video controls playsinline autoplay src="${await blobUrl(el.dataset.vid)}" style="width:100%"></video>`;}catch{}});
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
const REF_KINDS=[['글',[['말투/캡션','캡션'],['말투/카피','카피']]],['영상',[['영상/릴스','릴스'],['영상/편집','편집']]],['디자인',[['비주얼/사이트','사이트'],['비주얼/사진','사진'],['비주얼/카드','카드']]],['기획',[['기획/콘텐츠','콘텐츠'],['기획/운영','운영']]]];
function refScopes(){return [{id:'_common',name:'회사 공통',kind:'COMMON',col:'#D9A441'}].concat((S.bus||[]).map(b=>({id:b.id,name:b.name,kind:b.kind,col:b.color||KCOL[b.kind]||'#A08A72'})));}
function parseVoice(txt){const sec={};let cur=null;(txt||'').split('\n').forEach(l=>{const h=/^##\s+(.+)/.exec(l);if(h){cur=h[1].trim();sec[cur]=[];return;}if(cur&&/^- /.test(l))sec[cur].push(l.slice(2));});return sec;}
async function renderRefs(){
  const root=$('#vRefs');const sc=refScopes();
  await Promise.all(sc.map(async x=>{if(REF.cache[x.id]===undefined){try{REF.cache[x.id]=await gh(`/contents/workspace/${x.id}/voice.md`,{raw:true})||'';}catch{REF.cache[x.id]='';}}}));
  const ORDER=[['레퍼런스 계정','계정'],['레퍼런스 예시','예시'],['레퍼런스 캡션(대표님이 준 예)','예시'],['레퍼런스 링크','링크'],['레퍼런스 스크린샷','스크린샷'],['레퍼런스 영상','영상'],['대표님이 통과시킨 캡션','통과시킨 것'],['대표님이 싫어한 캡션','싫어한 것'],['대표님 의견','대표님 의견'],['기본','기본 원칙']];
  REF.lib=REF.lib||{};
  await Promise.all(sc.filter(x=>x.id!=='_common').map(async x=>{if(REF.lib[x.id]===undefined){try{REF.lib[x.id]=JSON.parse(await gh(`/contents/workspace/${x.id}/refs/library.json`,{raw:true})||'{}');}catch{REF.lib[x.id]={};}}}));
  REF.sites=REF.sites||{};
  await Promise.all(sc.map(async x=>{if(REF.sites[x.id]===undefined){try{REF.sites[x.id]=JSON.parse(await gh(`/contents/workspace/${x.id}/refs/sites.json`,{raw:true})||'[]');}catch{REF.sites[x.id]=[];}}}));
  const sitesOf=x=>{const a=REF.sites[x.id]||[];return a.length?`<div class="vsub">기준 사이트 <em>${a.length}곳</em></div><div class="rsite">${a.map(i=>`<a ${/^https?:/.test(i.url)?`href="${esc(i.url)}" target="_blank" rel="noopener"`:''}>${(i.shots||[])[0]?`<img data-path="${esc(i.shots[0])}" alt="">`:''}<b class="mono">${esc(/^https?:/.test(i.url)?i.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,40):'첨부 시안 · '+i.url.split('/').pop())}</b><p>${esc(i.note||'')}</p></a>`).join('')}</div>`:'';};
  const num=n=>n==null?'—':n>=1e4?(n/1e4).toFixed(n>=1e5?0:1)+'만':Number(n).toLocaleString();
  const libOf=(x,failed=[])=>{const L=REF.lib[x.id]||{};const its=(L.items||[]).slice().sort((a,b)=>(b.mult||0)-(a.mult||0));const ac=Object.entries(L.accounts||{});
    if(!ac.length&&!failed.length)return '';
    const open=its.find(i=>i.id===REF.open);
    const ul=(t,a,c)=>a&&a.length?`<div class="lbk"><b style="color:${c}">${t}</b>${a.map(v=>`<p>${esc(v)}</p>`).join('')}</div>`:'';
    const det=open?`<div class="lbd"><div class="lbh"><b>${esc(open.title||open.type)}</b><span class="mono">@${esc(open.handle)} · ${open.posted||''} · ${open.metric} ${num(open.value)} · 평소 ${num(open.base)}의 ${open.mult}배 · 좋아요 ${num(open.likes)} · 댓글 ${num(open.comments)}</span>${open.permalink?`<a href="${esc(open.permalink)}" target="_blank" rel="noopener" class="btn sbtn" style="width:64px">원본</a>`:''}</div>
      ${(open.frames||[]).length?`<div class="lbf">${open.frames.map((f,k)=>`<figure><img data-path="${esc(f)}" alt=""><figcaption class="mono">${open.frames.length>1?`0:0${k}`:'표지'}</figcaption></figure>`).join('')}</div>`:''}
      ${open.note?`<div class="libnote">${esc(open.note)}</div>`:''}
      <div class="lbg">${open.hook?`<div class="lbk"><b style="color:#D9A441">첫 3초</b><p>${esc(open.hook)}</p></div>`:''}
      ${(open.structure||[]).length?`<div class="lbk"><b style="color:#D9A441">구조</b>${open.structure.map((u,k)=>`<p><span class="mono" style="color:#8E7861">${k+1} ${esc(u.role)}</span> ${esc(u.text)}</p>`).join('')}</div>`:''}
      ${ul('확인된 것',open.seen,'#7DB79A')}${ul('반응 이유 · 가설',open.guess,'#E2B04A')}${ul('아직 모르는 것',open.unknown,'#8E7861')}${ul('같은 구조 · 우리 기획 5개',open.ideas,'#E08A5A')}
      ${open.speech?`<div class="lbk"><b style="color:#D9A441">말소리 대본</b><p>${esc(open.speech)}</p></div>`:''}${open.caption?`<div class="lbk"><b style="color:#D9A441">캡션</b><p>${esc(open.caption)}</p></div>`:''}</div></div>`:'';
    return `<div class="vsub">보관함 · 평소 조회의 2배 넘게 터진 것 <em>${its.length}편 · 계정 ${ac.length}개</em></div><div class="vg" style="border:0;padding:0">
      <div class="lba">${ac.map(([h,a])=>`<a class="acc${a.problem?' bad':''}" href="https://www.instagram.com/${esc(h)}/" target="_blank" rel="noopener"><b>@${esc(h)}</b><span class="mono">${a.problem?'볼 수 없음':a.base_views?'평소 조회 '+num(a.base_views):a.base_likes?'평소 좋아요 '+num(a.base_likes):'확인 중'}${a.by?' · '+esc(a.by):''}</span></a>`).join('')}${failed.filter(h=>!ac.some(([k])=>k===h.toLowerCase())).map(h=>`<span class="acc bad"><b>@${esc(h)}</b><span class="mono">볼 수 없음 · 개인 계정</span></span>`).join('')}</div>
      ${its.length?`<div class="lbc">${its.map(i=>`<button type="button" class="lbi${i.id===REF.open?' on':''}" data-lb="${i.id}">${(i.thumb||(i.frames||[])[0])?`<img data-path="${esc(i.thumb||i.frames[0])}" alt="">`:`<span class="lbx mono">${esc(i.type)}</span>`}<em class="mono">${i.mult}×</em><b>${esc(i.title||(i.caption||'').slice(0,18)||i.type)}</b><span class="mono">@${esc(i.handle)} · ${i.metric} ${num(i.value)}${i.analyzed?'':' · 분석 전'}</span></button>`).join('')}</div>`:'<div class="empty">아직 기준(평소의 2배)을 넘은 게시물이 없습니다</div>'}${det}</div>`;};
  const cnt=x=>Object.values(parseVoice(REF.cache[x.id])).reduce((n,a)=>n+a.length,0);
  const shown=sc.filter(x=>REF.f==='all'||REF.f===x.id);
  const REFK=[['레퍼런스 예시','예시'],['레퍼런스 캡션(대표님이 준 예)','예시'],['레퍼런스 링크','링크'],['레퍼런스 스크린샷','스크린샷'],['레퍼런스 영상','영상'],['레퍼런스 문서','문서'],['레퍼런스 계정','계정 메모']];
  const STDK=[['대표님이 통과시킨 캡션','통과시킨 캡션'],['대표님이 싫어한 캡션','기각한 캡션'],['대표님 의견','대표님 의견'],['기본','기본 원칙']];
  const bad=v=>/볼 수 없음|찾지 못함|가져오지 못/.test(v);
  const grp=(sec,K)=>K.filter(([k])=>(sec[k]||[]).filter(v=>!bad(v)).length).map(([k,l])=>{const a=sec[k].filter(v=>!bad(v));return `<div class="vg"><div class="vh"><b>${l}</b><em>${a.length}</em></div>${(k==='기본'?a:a.slice().reverse()).map(v=>`<div class="vi">${esc(v)}</div>`).join('')}</div>`;}).join('');
  const list=shown.map(x=>{const sec=parseVoice(REF.cache[x.id]);
    const failed=[...new Set((sec['레퍼런스 계정']||[]).filter(bad).map(v=>(/@([A-Za-z0-9_.]+)/.exec(v)||[])[1]).filter(Boolean))];
    const lib=x.id==='_common'?'':libOf(x,failed);const mine=grp(sec,REFK),std=grp(sec,STDK);
    const ig=(S.bus||[]).some(b=>b.id===x.id&&(b.channel||{}).platform==='instagram');
    const body=(lib||'')+sitesOf(x)+(mine?`<div class="vsub">직접 넣은 레퍼런스</div>${mine}`:'')+(std?`<div class="vsub">캡션 기준 · 대표님 결재에서 쌓임</div>${std}`:'');
    return `<div class="vs"><span style="color:${x.col}">${x.kind}</span><span style="color:#F4E6CF">${esc(x.name)}</span></div>${body||`<div class="empty">${ig?'수집 준비 중':'아직 없음 · 인스타 채널이 없는 사업은 직접 넣은 것만 쌓입니다'}</div>`}`;}).join('');
  root.innerHTML=`<section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">ADD REFERENCE</span></div>
    <form class="rf" id="rfF"><div class="rfr"><label>어디에<select id="rfS">${bizGroups(REF.f==='all'?'_common':REF.f,['_common','회사 공통'])}</select></label>
    <label>종류<select id="rfK">${REF_KINDS.map(([g,a])=>`<optgroup label="${g}">${a.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</optgroup>`).join('')}</select></label></div>
    <div class="libnote">안 넣어도 됩니다. 인스타 사업은 RYAN이 매주 비슷한 계정을 찾아 보관함에 쌓습니다. 꼭 보여 주고 싶은 계정·사이트·캡션·시안 파일만 넣으세요.</div><textarea id="rfT" rows="3" placeholder="@계정 · 링크 · 문구 (캡처·시안 HTML·문서는 첨부파일)"></textarea>
    <div class="rfb"><label class="btn sbtn">첨부파일<input type="file" id="rfI" multiple accept="image/*,video/*,.html,.htm,.pdf,.pptx,.docx" style="display:none"></label><span class="mu" id="rfN"></span><button class="btn sbtn pri" id="rfGo">넣기</button></div></form>
    ${REF.stat?`<div class="libnote">${esc(REF.stat)}</div>`:''}</section>
  <section class="pnl" style="display:flex;flex-direction:column;min-height:0"><div class="ph"><span class="cap">REFERENCE</span></div><div class="rfc rfr"><label>보기<select id="rfV">${(()=>{(S.bus||[]).forEach(b=>b._n=cnt({id:b.id}));const h=`<option value="all"${REF.f==='all'?' selected':''}>전체 (${sc.reduce((n,y)=>n+cnt(y),0)})</option><option value="_common"${REF.f==='_common'?' selected':''}>회사 공통 (${cnt({id:'_common'})})</option>`+bizGroups(REF.f,null);(S.bus||[]).forEach(b=>delete b._n);return h;})()}</select></label><label>항목<span class="rfn">${sc.reduce((n,y)=>n+cnt(y),0)}개 · 사업 ${sc.length-1}곳</span></label></div>
    <div class="scroll">${list}</div></section>`;
  const rv=root.querySelector('#rfV');if(rv)rv.onchange=()=>{REF.f=rv.value;renderRefs();};
  root.querySelectorAll('[data-lb]').forEach(el=>el.onclick=()=>{REF.open=REF.open===el.dataset.lb?null:el.dataset.lb;renderRefs();});if(typeof lazy==='function')lazy(root);
  $('#rfT').addEventListener('input',e=>{const v=e.target.value,k=$('#rfK');if(k.dataset.touched)return;
    if(/https?:\/\/(?!(www\.)?instagram\.com)/i.test(v))k.value='비주얼/사이트';else if(/@[A-Za-z0-9_.]{2,}|instagram\.com/i.test(v))k.value='영상/릴스';});
  $('#rfK').addEventListener('change',e=>{e.target.dataset.touched='1';});
  let files=[];
  $('#rfI').onchange=e=>{files=[...e.target.files];$('#rfN').textContent=files.length?(files.length===1?files[0].name:`${files.length}개`):'';};
  $('#rfF').onsubmit=async e=>{e.preventDefault();const t=$('#rfT').value.trim();if(!t&&!files.length)return;const scope=$('#rfS').value,kind=$('#rfK').value;const go=$('#rfGo');go.disabled=true;
    try{const paths=[];
      for(const [k,f] of files.entries()){const doc=/\.(html?|pdf|pptx|docx)$/i.test(f.name);const vid=!doc&&/^video/.test(f.type);if((vid||doc)&&f.size>40*1048576){toast(`${f.name}: 40MB 넘는 파일은 줄여 주세요`);continue;}
        const blob=vid||doc?f:await shrink(f);const ext=vid||doc?((f.name.split('.').pop()||'mp4').toLowerCase().replace(/^htm$/,'html')):'jpg';const pth=`workspace/${scope}/refs/${stamp(new Date())}-${k}.${ext}`;$('#rfN').textContent=`올리는 중 ${k+1}/${files.length}`;await putFile(pth,blob,'레퍼런스 자료');paths.push(pth);}
      let num=(typeof CH!=='undefined'&&CH.num)||(S.issues.find(i=>i.state==='open'&&has(i,'chat'))||{}).number;
      if(!num){const it=await gh('/issues',{method:'POST',body:{title:'대표님 채팅',body:'대표님과 직원의 채팅방입니다. 닫지 마세요.',labels:['chat']}});num=it.number;}
      await gh(`/issues/${num}/comments`,{method:'POST',body:{body:`레퍼런스 #${scope} !${kind} ${t}${paths.length?'\n'+paths.join('\n'):''}`}});
      const name=(sc.find(x=>x.id===scope)||{}).name;
      REF.stat=`${name}에 넣는 중… 엔진이 화면을 찍고 정리하는 데 1~2분 걸립니다. 끝나면 여기 저절로 나타납니다.`;REF.f=scope;REF.cache[scope]=undefined;REF.sites&&(REF.sites[scope]=undefined);REF.lib&&(REF.lib[scope]=undefined);REF.wait=Date.now();
      const poll=async(n)=>{try{const t=await gh(`/contents/workspace/${scope}/refs/sites.json`,{raw:true});const a=JSON.parse(t||'[]');const had=(REF.sites[scope]||[]).length;if(a.length>had||n>=12){REF.cache[scope]=undefined;REF.sites[scope]=undefined;REF.lib&&(REF.lib[scope]=undefined);REF.stat=n>=12?'':`${name}에 반영됐습니다.`;if(VIEW==='refs')renderRefs();if(n<12)setTimeout(()=>{REF.stat='';if(VIEW==='refs')renderRefs();},6000);return;}}catch{}setTimeout(()=>poll(n+1),15000);};
      REF.sites[scope]=REF.sites[scope]||[];setTimeout(()=>poll(1),20000);renderRefs();
    }catch(err){toast('실패: '+(err.status===403?'접근키 권한(Contents·Issues 쓰기)':err.message.slice(0,60)));go.disabled=false;}};
}
