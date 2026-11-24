'use strict';
/* CHAT: 대표님 ↔ 직원 메신저. 'chat' 이슈 하나에 댓글로 주고받는다. 기본은 TOM, @이름으로 부르면 그 직원이 답한다. */
const CH={num:null,msgs:[],open:false,to:'team',pending:0,seen:new Set(),timer:null,first:true};

function chatIssue(){return S.issues.find(i=>i.state==='open'&&has(i,'chat'));}
function chatAgent(body){const m=/<!-- chat:(\w+) -->/.exec(body||'');return m?m[1]:null;}

function chatMount(){
  if($('#chatDock'))return;
  const d=document.createElement('div');d.id='chatDock';
  d.innerHTML=`<button id="chatBar" type="button"><span class="mono">CHAT</span><span id="chatWho" class="mu">TOM</span><i id="chatDot"></i></button>
  <div id="chatBox"><div class="chh"><span class="mono">CHAT</span><select id="chatTo" aria-label="받는 사람"></select><button id="chatX" type="button" aria-label="접기">－</button></div>
  <div id="chatLog"></div>
  <form id="chatF"><input id="chatIn" autocomplete="off" placeholder="TOM에게 · 일을 시키면 미션으로 엽니다"><button class="btn pri" id="chatGo">보내기</button></form></div>`;
  $('#stage').append(d);
  $('#chatBar').onclick=()=>chatToggle(true);
  $('#chatX').onclick=()=>chatToggle(false);
  $('#chatTo').onchange=e=>{CH.to=e.target.value;chatHead();};
  $('#chatF').onsubmit=e=>{e.preventDefault();chatSend();};
}
function chatHead(){if(CH.to==='team'){$('#chatWho').textContent='팀 토론';$('#chatIn').placeholder=document.documentElement.classList.contains('m')?'팀에게':'팀에게 · 정해지면 TOM에게 "이걸로 가"';return;}const a=S.team&&S.team.agents[CH.to];const n=a?a.name:'TOM';$('#chatWho').textContent=n;$('#chatIn').placeholder=document.documentElement.classList.contains('m')?`${n}에게`:(CH.to==='tom'?'TOM에게 · 일을 시키면 미션으로 엽니다':`${n}에게 (${a.title})`);}
function chatToggle(v){CH.open=v;$('#chatDock').classList.toggle('open',v);$('#chatDot').classList.remove('on');if(v){chatOpts();chatLoad();setTimeout(()=>{const l=$('#chatLog');l.scrollTop=l.scrollHeight;},50);}}
function chatOpts(){const sel=$('#chatTo');if(!S.team||sel.options.length)return;
  const tm=S.team.teams||{};const by={};agents().forEach(a=>(by[a.team]=by[a.team]||[]).push(a));
  sel.innerHTML='<option value="team">팀 토론 · 필요한 직원이 모여 의논</option>'+Object.keys(by).map(t=>`<optgroup label="${esc(tm[t]||t)}">${by[t].map(a=>`<option value="${a.id}">${a.name} · ${esc(a.title)}</option>`).join('')}</optgroup>`).join('');
  sel.value=CH.to;}

async function chatLoad(){
  const it=chatIssue();if(!it){CH.num=null;chatRender();return;}
  CH.num=it.number;
  try{const cs=await gh(`/issues/${it.number}/comments?per_page=100`)||[];
    const owner=(S.team&&S.team.owner)||'reonsio';
    const msgs=cs.map(c=>{const mine=c.user.login===owner&&!/<!-- chat:/.test(c.body);const aid=mine?null:chatAgent(c.body);
      let t=(c.body||'').replace(/<!--[\s\S]*?-->/g,'').trim();if(aid)t=t.replace(/^\*\*[A-Z]+\*\*:\s*/,'');
      return {id:c.id,mine,aid,t,at:c.created_at};}).filter(m=>m.mine||m.aid);
    const fresh=msgs.filter(m=>m.aid&&!CH.seen.has(m.id));
    if(!CH.first)fresh.forEach(m=>{if(typeof trip==='function')trip(m.aid,[{go:['CEO',CEO_SPOT]},{wait:2500}],'대표님께 답변');if(!CH.open)$('#chatDot').classList.add('on');});
    msgs.forEach(m=>CH.seen.add(m.id));CH.first=false;
    const lastMine=msgs.filter(m=>m.mine).pop(),lastReply=msgs.filter(m=>m.aid).pop();
    const tomAfter=lastMine&&msgs.some(m=>m.aid==='tom'&&m.id>lastMine.id);
    CH.pending=lastMine&&(!lastReply||lastReply.id<lastMine.id||(/^@팀/.test(lastMine.t)&&!tomAfter))?1:0;
    CH.msgs=msgs;chatRender();
  }catch(e){}
  clearTimeout(CH.timer);if(CH.pending)CH.timer=setTimeout(chatLoad,6000);
}
function chatRender(){
  const l=$('#chatLog');if(!l)return;const stick=l.scrollHeight-l.scrollTop-l.clientHeight<40;
  const A=(S.team&&S.team.agents)||{};
  l.innerHTML=(CH.msgs.length?CH.msgs.slice(-60).map(m=>{const a=A[m.aid]||{};const col=MC[(a.model||'claude').toLowerCase()]||'#D9A441';
    return m.mine?`<div class="cm me"><span>${esc(m.t)}</span><em>${hhmm(m.at)}</em></div>`
      :`<div class="cm"><b style="color:${col}">${esc(a.name||m.aid)}</b><span>${mdChat(m.t)}</span><em>${hhmm(m.at)}</em></div>`;}).join('')
    :'<div class="cm sys">직원에게 바로 말을 거는 곳입니다. 답은 보통 1~2분 걸립니다.</div>')
    +(CH.pending?`<div class="cm sys">${/^@팀/.test((CH.msgs.filter(m=>m.mine).pop()||{}).t||'')?'팀이 의논 중… 끝나면 TOM이 정리합니다':'답변 준비 중…'}</div>`:'');
  if(stick||CH.pending)l.scrollTop=l.scrollHeight;
}
function mdChat(t){return esc(t).replace(/M-(\d{3})/g,'<b>M-$1</b>').replace(/\n{2,}/g,'\n').replace(/\n/g,'<br>');}

async function chatSend(){
  const inp=$('#chatIn');const t=inp.value.trim();if(!t)return;
  if(!TOKEN){toast('접근키를 먼저 넣어 주세요');return;}
  const a=S.team.agents[CH.to];const body=(CH.to==='team'?'@팀 ':CH.to==='tom'?'':'@'+a.name+' ')+t;
  inp.value='';$('#chatGo').disabled=true;
  try{
    if(!CH.num){const it=await gh('/issues',{method:'POST',body:{title:'대표님 채팅',body:'대표님과 직원의 채팅방입니다. 닫지 마세요.',labels:['chat']}});CH.num=it.number;S.issues.unshift(it);}
    const c=await gh(`/issues/${CH.num}/comments`,{method:'POST',body:{body}});
    CH.msgs.push({id:c.id,mine:true,t:body,at:c.created_at});CH.seen.add(c.id);CH.pending=1;chatRender();
    clearTimeout(CH.timer);CH.timer=setTimeout(chatLoad,8000);
  }catch(e){inp.value=t;toast('보내기 실패: '+(e.status===403?'접근키 Issues 권한':e.message.slice(0,40)));}
  finally{$('#chatGo').disabled=false;}
}
window.chatSync=function(){chatMount();if(S.team){chatOpts();chatHead();}
  const it=chatIssue();if(it&&(CH.open||CH.first||it.comments!==CH.lastCount)){CH.lastCount=it.comments;chatLoad();}};
