'use strict';
/* 운영 설정(일하는 방식)과 업무 제어: 대표님이 오피스에서 엔진의 결재 방식·동시 실행·모델 등급, 업무별 담당·순서를 직접 바꾼다.
   설정은 config/team.json 에 저장되고 엔진이 다음 실행부터 따른다. */
const OPS={busy:false};
async function teamFile(){const f=await gh('/contents/config/team.json?ref=main');const bin=atob(String(f.content||'').replace(/\s/g,''));
  const txt=new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));return {sha:f.sha,json:JSON.parse(txt)};}
async function teamSave(mut,msg){const f=await teamFile();mut(f.json);await putFile('config/team.json',new Blob([JSON.stringify(f.json,null,2)+'\n'],{type:'application/json'}),msg,f.sha);S.team=f.json;return f.json;}
const OPS_SEG=(id,opts,val)=>`<div class="oseg" id="${id}">${opts.map(([v,l])=>`<button type="button" data-v="${v}" class="${String(v)===String(val)?'on':''}">${l}</button>`).join('')}</div>`;
function opsBind(root){root.querySelectorAll('.oseg').forEach(sg=>sg.querySelectorAll('button').forEach(b=>b.onclick=()=>{sg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));}));}
const segVal=id=>{const b=document.querySelector(`#${id} button.on`);return b?b.dataset.v:'';};
window.openOps=async function(){
  const box=$('#opsBody');$('#eOps').textContent='';box.innerHTML='<div class="mu" style="font-size:11px">불러오는 중…</div>';$('#mOps').classList.add('show');
  let t;try{t=(await teamFile()).json;}catch(e){box.innerHTML='';$('#eOps').textContent='불러오지 못했습니다: '+String(e.message).slice(0,60);return;}
  const L=t.limits||{};const A=t.agents||{};const teams=t.teams||{};
  const cl=Object.keys(A).filter(k=>A[k].model==='claude'&&!A[k].pending);
  const order=Object.keys(teams);cl.sort((a,b)=>order.indexOf(A[a].team)-order.indexOf(A[b].team));
  box.innerHTML=`
    <div class="osec">일하는 방식</div>
    <div class="orow"><span>대표님 결재</span>${OPS_SEG('opGate',[['final','마지막 결과물만'],['all','모든 업무']],L.gate==='all'?'all':'final')}</div>
    <div class="orow"><span>동시에 일하는 직원</span>${OPS_SEG('opPar',[1,2,3,4,6].map(n=>[n,n+'명']),L.parallel||4)}</div>
    <div class="orow"><span>한 번에 처리할 업무</span>${OPS_SEG('opMax',[4,6,10,15].map(n=>[n,n+'건']),L.max_tasks_per_run||10)}</div>
    <div class="orow"><span>검수 통과 점수</span>${OPS_SEG('opPass',[70,75,80,85].map(n=>[n,n+'점']),L.pass_score||75)}</div>
    <div class="orow"><span>재작업 횟수</span>${OPS_SEG('opRe',[0,1,2,3].map(n=>[n,n+'번']),L.max_rework??2)}</div>
    <div class="osec">Claude 직원 모델 등급</div>
    <div class="omod">${cl.map(k=>`<div class="orow"><span><b style="color:${teamCol(k)}">${esc(A[k].name)}</b> ${esc(A[k].title||'')}</span>${OPS_SEG('opM_'+k,[['','기본'],['opus','Opus'],['fable','Fable']],A[k].claude_model||'')}</div>`).join('')}</div>
    <div class="onote">저장하면 다음 엔진 실행부터 적용됩니다. Fable·Opus는 구독 사용량을 빨리 씁니다.</div>`;
  opsBind(box);OPS.cl=cl;
};
window.saveOps=async function(){if(OPS.busy)return;OPS.busy=true;$('#bOpsSave').disabled=true;$('#eOps').textContent='';
  try{const v={gate:segVal('opGate'),parallel:+segVal('opPar'),max:+segVal('opMax'),pass:+segVal('opPass'),re:+segVal('opRe')};const mods={};(OPS.cl||[]).forEach(k=>mods[k]=segVal('opM_'+k));
    await teamSave(t=>{t.limits=t.limits||{};t.limits.gate=v.gate==='all'?'all':'final';if(v.parallel)t.limits.parallel=v.parallel;if(v.max)t.limits.max_tasks_per_run=v.max;if(v.pass)t.limits.pass_score=v.pass;t.limits.max_rework=v.re;
      Object.keys(mods).forEach(k=>{if(!t.agents[k])return;if(mods[k])t.agents[k].claude_model=mods[k];else delete t.agents[k].claude_model;});},'운영 설정 변경(오피스)');
    $('#mOps').classList.remove('show');toast('운영 설정 저장 · 다음 실행부터 적용');
  }catch(e){$('#eOps').textContent='저장 실패: '+(e.status===403?'접근키 Contents 쓰기 권한':e.status===409?'방금 엔진이 파일을 바꿨습니다. 다시 눌러 주세요':String(e.message).slice(0,60));}
  finally{OPS.busy=false;$('#bOpsSave').disabled=false;}
};
/* 업무 제어: 담당·결재·기다리는 업무 */
function metaSet(body,m){const blk='```json meta\n'+JSON.stringify(m)+'\n```';return /```json meta\n[\s\S]*?\n```/.test(body||'')?(body||'').replace(/```json meta\n[\s\S]*?\n```/,()=>blk):((body||'')+'\n\n'+blk);}
window.openTask=function(num){const it=S.issues.find(i=>i.number===num);if(!it||!has(it,'task')){if(it)open(it.html_url,'_blank','noopener');return;}
  const m=meta(it),st=statusOf(it),aid=lab(it,'agent:'),A=S.team.agents,teams=S.team.teams||{};const pad=n=>String(n).padStart(3,'0');
  const lock=it.state==='closed'||st==='RUNNING';OPS.task={num,deps:[...(m.deps||[])]};
  const opts=Object.keys(teams).map(tk=>{const ms=Object.keys(A).filter(k=>A[k].team===tk&&!A[k].pending);return ms.length?`<optgroup label="${esc(tk)} ${esc(teams[tk])}">${ms.map(k=>`<option value="${k}"${k===aid?' selected':''}>${esc(A[k].name)} · ${esc(A[k].title||'')} · ${String(A[k].model).toUpperCase()}</option>`).join('')}</optgroup>`:'';}).join('');
  const depRow=()=>OPS.task.deps.length?OPS.task.deps.map(d=>{const x=S.issues.find(i=>i.number===d);return `<span class="fac">T-${pad(d)} ${esc(x?x.title.slice(0,16):'')}${lock?'':`<b data-dep="${d}">×</b>`}</span>`;}).join(''):'<span class="mu">없음 · 바로 시작할 수 있음</span>';
  $('#tkCap').textContent=`T-${pad(num)} · ${st}`;$('#eTask').textContent=lock?(it.state==='closed'?'끝난 업무라 바꿀 수 없습니다.':'진행 중인 업무는 끝난 뒤에 바꿀 수 있습니다.'):'';
  $('#tkBody').innerHTML=`<div class="otit">${esc(it.title)}</div>
    <label>담당<select id="tkWho"${lock?' disabled':''}>${opts}</select></label>
    <div class="orow"><span>대표님 결재</span>${OPS_SEG('tkAp',[['1','받음'],['0','안 받음']],m.needs_approval?'1':'0')}</div>
    <div class="olab">기다리는 업무 <span class="mu">× 를 누르면 기다리지 않습니다</span></div><div class="fatt" id="tkDeps">${depRow()}</div>`;
  const bindDeps=()=>$('#tkDeps').querySelectorAll('[data-dep]').forEach(b=>b.onclick=()=>{OPS.task.deps=OPS.task.deps.filter(d=>d!==+b.dataset.dep);$('#tkDeps').innerHTML=depRow();bindDeps();});
  bindDeps();if(!lock)opsBind($('#tkBody'));$('#bTaskSave').style.display=lock?'none':'';$('#bTaskGh').onclick=()=>open(it.html_url,'_blank','noopener');
  $('#mTask').classList.add('show');
};
window.saveTask=async function(){if(OPS.busy||!OPS.task)return;const it=S.issues.find(i=>i.number===OPS.task.num);if(!it)return;OPS.busy=true;$('#bTaskSave').disabled=true;
  try{const fresh=await gh('/issues/'+it.number);if(fresh.state!=='open'||(fresh.labels||[]).some(l=>l.name==='status:running'))throw new Error('방금 상태가 바뀌었습니다. 닫고 다시 열어 주세요');
    const m=meta(fresh);m.deps=OPS.task.deps;m.needs_approval=segVal('tkAp')==='1';const who=$('#tkWho').value;const tech=(S.team.agents[who]||{}).team==='TECH';
    let labels=(fresh.labels||[]).map(l=>l.name).filter(n=>!n.startsWith('agent:'));if(tech)labels=labels.filter(n=>!n.startsWith('biz:'));labels.push('agent:'+who);
    if(labels.includes('status:blocked')&&!m.deps.length)labels=labels.filter(n=>n!=='status:blocked').concat('status:queued');
    const up=await gh('/issues/'+it.number,{method:'PATCH',body:{body:metaSet(fresh.body,m),labels}});Object.assign(it,up);
    $('#mTask').classList.remove('show');toast(`T-${String(it.number).padStart(3,'0')} 변경 · 다음 실행부터 적용`);if(typeof render==='function')render();else setTimeout(sync,500);
  }catch(e){$('#eTask').textContent='저장 실패: '+String(e.message).slice(0,70);}
  finally{OPS.busy=false;$('#bTaskSave').disabled=false;}
};
