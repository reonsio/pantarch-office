'use strict';
/* CHAT: 대표님 ↔ 직원 메신저. 'chat' 이슈 하나에 댓글로 주고받는다. 기본은 팀 토론, 직원을 고르면 그 직원이 답한다. */
const CH={num:null,msgs:[],to:'team',pending:0,seen:new Set(),timer:null,first:true,lastCount:null,unread:0};

function chatIssue(){return S.issues.find(i=>i.state==='open'&&has(i,'chat'));}
function chatAgent(body){const m=/<!-- chat:(\w+) -->/.exec(body||'');return m?m[1]:null;}
function chatVisible(){const p=$('#chatPanel');return p&&(!document.documentElement.classList.contains('m')||p.classList.contains('mon'));}

function chatTo(){const box=$('#chatTo');if(!box||!S.team)return;
  const opts=[['team','팀']].concat(agents().map(a=>[a.id,a.name]));
  box.innerHTML=opts.map(([id,n])=>`<button type="button" data-to="${id}" class="${id===CH.to?'on':''}" title="${id==='team'?'필요한 직원이 모여 의논하고 TOM이 정리':esc((S.team.agents[id]||{}).title||'')}">${esc(n)}</button>`).join('');
  box.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{CH.to=b.dataset.to;chatTo();chatHead();$('#chatIn').focus();});
}
function chatHead(){const a=S.team&&S.team.agents[CH.to];
  $('#chatWho').textContent=CH.to==='team'?'팀 토론 → TOM 정리':a?`${a.name} · ${a.title}`:'';
  $('#chatIn').placeholder=CH.to==='team'?'팀에게':a?`${a.name}에게`:'';}

async function chatLoad(){
  const it=chatIssue();if(!it){CH.num=null;chatRender();return;}
  CH.num=it.number;
  try{const cs=await gh(`/issues/${it.number}/comments?per_page=100`)||[];
    const owner=(S.team&&S.team.owner)||'reonsio';
    const msgs=cs.map(c=>{const mine=c.user.login===owner&&!/<!-- chat:/.test(c.body);const aid=mine?null:chatAgent(c.body);
      let t=(c.body||'').replace(/<!--[\s\S]*?-->/g,'').trim();if(aid)t=t.replace(/^\*\*[A-Z]+\*\*:\s*/,'');
      return {id:c.id,mine,aid,t,at:c.created_at};}).filter(m=>m.mine||m.aid);
    const fresh=msgs.filter(m=>m.aid&&!CH.seen.has(m.id));
    if(!CH.first)fresh.forEach(m=>{if(typeof trip==='function')trip(m.aid,[{go:['CEO',CEO_SPOT]},{wait:2500}],'대표님께 답변');});
    if(!CH.first&&fresh.length&&!chatVisible())CH.unread+=fresh.length;
    if(fresh.some(m=>/^\[[^\]]+\]/.test(m.t))&&typeof REF!=='undefined'){REF.cache={};REF.stat='';if(VIEW==='refs'&&!($('#rfT')&&$('#rfT').value.trim()))renderRefs();}
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
  l.innerHTML=CH.msgs.slice(-60).map(m=>{const a=A[m.aid]||{};const col=MC[(a.model||'claude').toLowerCase()]||'#D9A441';
    const to=m.mine&&(refLabel(m.t)?'레퍼런스':((/^@(\S+)/.exec(m.t)||[])[1]||'TOM'));
    return m.mine?`<div class="cm me">${to?`<span class="who" style="color:#A08A72">→ ${esc(to==='팀'?'팀 토론':to)}</span>`:''}<div class="row"><span class="bub">${mdChat(m.t)}</span><em>${hhmm(m.at)}</em></div></div>`
      :`<div class="cm"><span class="who" style="color:${col}">${esc(a.name||m.aid)}</span><div class="row"><span class="bub">${mdChat(m.t)}</span><em>${hhmm(m.at)}</em></div></div>`;}).join('')
    +(CH.pending?`<div class="cm sys">${/^@팀/.test((CH.msgs.filter(m=>m.mine).pop()||{}).t||'')?'의논 중…':'답변 준비 중…'}</div>`:'');
  if(stick||CH.pending)l.scrollTop=l.scrollHeight;
  const nb=$('#mtabC');if(nb){if(chatVisible())CH.unread=0;nb.textContent=CH.unread?String(CH.unread):'';}
}
function refLabel(t){const m=/^(?:@\S+\s+)?레퍼런스\s+(?:#(\S+)\s*)?(?:!(\S+)\s*)?([\s\S]*)$/.exec(t);if(!m)return null;
  const sc=m[1]==='_common'?'회사 공통':((S.bus||[]).find(b=>b.id===m[1])||{}).name||'회사 공통';const files=(m[3].match(/workspace\/\S+/g)||[]).length;
  return `레퍼런스 · ${sc} · ${m[2]||'말투'}\n${m[3].replace(/workspace\/\S+/g,'').trim()}${files?`${m[3].replace(/workspace\/\S+/g,'').trim()?'\n':''}자료 ${files}개`:''}`.trim();}
function mdChat(t){const r=refLabel(t);if(r)t=r;return esc(t).replace(/^@\S+\s*/,'').replace(/M-(\d{3})/g,'<b>M-$1</b>').replace(/\n{2,}/g,'\n').replace(/\n/g,'<br>');}

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
$('#chatF').onsubmit=e=>{e.preventDefault();chatSend();};
window.chatSync=function(){if(!S.team)return;if(!$('#chatTo').children.length){chatTo();chatHead();}
  const it=chatIssue();if(it&&(CH.first||it.comments!==CH.lastCount)){CH.lastCount=it.comments;chatLoad();}else chatRender();};
