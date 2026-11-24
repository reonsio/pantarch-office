'use strict';
/* CHAT: 대표님 ↔ 직원 메신저. 'chat' 이슈 하나에 댓글로 주고받는다. 기본은 팀 토론, 직원을 고르면 그 직원이 답한다. */
const CH={num:null,msgs:[],to:'',pending:0,seen:new Set(),timer:null,first:true,lastCount:null,unread:0,hearts:new Set(),unheart:new Set(),open:new Set(),att:[],busy:0};

function chatIssue(){return S.issues.find(i=>i.state==='open'&&has(i,'chat'));}
function chatAgent(body){const m=/<!-- chat:(\w+) -->/.exec(body||'');return m?m[1]:null;}
function chatVisible(){const p=$('#chatPanel');return p&&(!document.documentElement.classList.contains('m')||p.classList.contains('mon'));}

function chatTo(){const box=$('#chatTo');if(!box||!S.team)return;
  const btn=(id,n,c)=>`<button type="button" data-to="${id}" class="${id===CH.to?'on':''}" style="--c:${c}" title="${id==='team'?'TOM이 필요한 직원을 골라 묻고 정리':esc((S.team.agents[id]||{}).title||'')}">${esc(n)}</button>`;
  const sec=(S.team.roles||{}).secretary;if(!CH.to)CH.to=sec||'team';
  const order=Object.keys((S.team&&S.team.teams)||{});const groups={};agents().filter(a=>a.id!==sec).forEach(a=>{(groups[a.team]=groups[a.team]||[]).push(a);});
  const row=(label,c,items)=>`<div class="cg"><i class="tl">${esc(label)}</i>${items.join('')}</div>`;
  box.innerHTML=row('DESK','#D9A441',[...(sec?[btn(sec,(S.team.agents[sec]||{}).name||'비서','#E6C07A')]:[]),btn('team','팀','#D9A441')])+order.filter(k=>groups[k]).map(k=>row(k,TC[k]||'#8E7861',groups[k].map(a=>btn(a.id,a.name,TC[k]||'#8E7861')))).join('');
  box.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{CH.to=b.dataset.to;chatTo();chatHead();$('#chatIn').focus();});
}
function chatHead(){const a=S.team&&S.team.agents[CH.to];const sec=(S.team.roles||{}).secretary;
  $('#chatWho').textContent=CH.to==='team'?'TOM이 사람을 골라 묻고 정리':CH.to===sec?'편하게 말하면 알아서 미션으로':a?`${a.name} · ${a.title}`:'';
  $('#chatIn').placeholder=CH.to==='team'?'팀에게':CH.to===sec?'하고 싶은 걸 편하게':a?`${a.name}에게`:'';}

async function chatLoad(){
  const it=chatIssue();if(!it){CH.num=null;chatRender();return;}
  CH.num=it.number;
  try{const n=it.comments||0,last=Math.max(1,Math.ceil(n/100));
    let cs=await gh(`/issues/${it.number}/comments?per_page=100&page=${last}`)||[];
    if(last>1&&cs.length<60){const prev=await gh(`/issues/${it.number}/comments?per_page=100&page=${last-1}`)||[];cs=prev.concat(cs);}
    const owner=(S.team&&S.team.owner)||'reonsio';
    const msgs=cs.map(c=>{const mine=c.user.login===owner&&!/<!-- chat:/.test(c.body);const aid=mine?null:chatAgent(c.body);
      let t=(c.body||'').replace(/<!--[\s\S]*?-->/g,'').trim();if(aid)t=t.replace(/^\*\*[A-Z]+\*\*:\s*/,'').replace(/^[A-Z]{2,6}\s*[:：]\s*/,'');
      return {id:c.id,mine,aid,t,at:c.created_at,heart:!!(c.reactions&&c.reactions.heart)||CH.hearts.has(c.id)};}).filter(m=>m.mine||m.aid);
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
  l.innerHTML=CH.msgs.slice(-60).map(m=>{const a=A[m.aid]||{};const col=teamCol(m.aid);
    const to=m.mine&&(refLabel(m.t)?'레퍼런스':((/^@(\S+)/.exec(m.t)||[])[1]||(((S.team.agents||{})[(S.team.roles||{}).secretary]||{}).name)||'TOM'));
    const ap=m.mine?attOf(m.t):[];const tx=ap.length?m.t.split(/\n첨부\(/)[0]:m.t;
    return m.mine?`<div class="cm me">${to?`<span class="who" style="color:#A08A72">→ ${esc(to==='팀'?'팀 토론':to)}</span>`:''}<div class="row"><span class="bub">${mdChat(tx)}${ap.length?`<span class="ath">${ap.map(p=>/\.(pdf|pptx|docx|zip|html?|js|mjs|ts|css|json|txt|md|csv|svg|xml)$/i.test(p)?`<span class="dcf">${esc(p.split('/').pop().replace(/^u[a-z]{6}-|^\d{8}-\d{4}-/,''))}</span>`:/\.(mp4|mov|m4v|webm)$/i.test(p)?'<span>▶ 영상</span>':`<img data-path="${esc(p)}" alt="">`).join('')}</span>`:''}</span><em>${hhmm(m.at)}</em></div></div>`
      :`<div class="cm" style="--c:${col}"><span class="who" style="color:${col}">${esc(a.name||m.aid)}<i>${esc(teamName(m.aid))}</i></span><div class="row"><span class="bub${m.t.length>420?' lng':''}${CH.open.has(m.id)?' open':''}" data-cid="${m.id}" title="두 번 눌러 ❤">${m.t.length>420?`<span class="bc">${mdChat(m.t)}</span><button type="button" class="more">${CH.open.has(m.id)?'접기':'더 보기'}</button>`:mdChat(m.t)}${m.heart&&!CH.unheart.has(m.id)?'<b class="hrt">❤</b>':''}</span><em>${hhmm(m.at)}</em></div></div>`;}).join('')
    +(CH.pending?`<div class="cm sys">${/^@팀/.test((CH.msgs.filter(m=>m.mine).pop()||{}).t||'')?'의논 중…':'답변 준비 중…'}</div>`:'');
  if(typeof lazy==='function')lazy(l);
  if(stick||CH.pending)l.scrollTop=l.scrollHeight;
  const nb=$('#mtabC');if(nb){if(chatVisible())CH.unread=0;nb.textContent=CH.unread?String(CH.unread):'';}
}
function refLabel(t){const m=/^(?:@\S+\s+)?레퍼런스\s+(?:#(\S+)\s*)?(?:!(\S+)\s*)?([\s\S]*)$/.exec(t);if(!m)return null;
  const sc=m[1]==='_common'?'회사 공통':((S.bus||[]).find(b=>b.id===m[1])||{}).name||'회사 공통';const files=(m[3].match(/workspace\/\S+/g)||[]).length;
  return `레퍼런스 · ${sc} · ${m[2]||'말투'}\n${m[3].replace(/workspace\/\S+/g,'').trim()}${files?`${m[3].replace(/workspace\/\S+/g,'').trim()?'\n':''}자료 ${files}개`:''}`.trim();}
function mdChat(t){const r=refLabel(t);if(r)t=r;
  t=t.replace(/`([^`]+)`/g,'$1').replace(/workspace\/\S+?\/([^\/\s]+\.(mp4|mov|jpe?g|png))/gi,'$1')
    .replace(/\[\[\d+\]\]\([^)]*\)/g,'').replace(/^\s*출처\s*[:：]?\s*$[\s\S]*$/m,'');   /* 검색 직원이 붙이는 [[1]](url) 중복·출처 목록 정리 */
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch{return '링크';}};
  const inl=x=>esc(x).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,(m,a,u)=>`<a href="${u}" target="_blank" rel="noopener">${a}</a>`)
    .replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g,(m,p,u)=>`${p}<a href="${u}" target="_blank" rel="noopener">${host(u)}</a>`)
    .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/M-(\d{3})/g,'<b>M-$1</b>');
  const lines=t.replace(/^@\S+\s*/,'').split('\n');let out='',tb=null;
  const flush=()=>{if(tb){const h=tb[0]||[];/* 폰에서 읽히게 표는 줄마다 카드로: 첫 칸이 제목, 나머지는 '머리: 값' */
      out+=`<div class="ctb">${tb.slice(1).map(r=>`<div class="cr"><b>${inl(r[0]||'')}</b>${r.slice(1).map((c,j)=>c&&c!=='-'?`<div><i>${inl(h[j+1]||'')}</i>${inl(c)}</div>`:'').join('')}</div>`).join('')}</div>`;tb=null;}};
  for(const l of lines){const m=/^\s*\|(.+)\|\s*$/.exec(l);
    if(m){if(/^\s*[-:| ]+$/.test(m[1]))continue;(tb=tb||[]).push(m[1].split('|').map(c=>c.trim()));continue;}
    flush();if(!l.trim())continue;out+=(out&&!out.endsWith('</div>')?'<br>':'')+inl(l.replace(/^#+\s*/,''));}
  flush();return out;}

async function chatSend(){
  const inp=$('#chatIn');let t=inp.value.trim();
  if(CH.busy){toast('첨부 올리는 중입니다. 끝나면 보내세요');return;}
  const att=CH.att.filter(a=>a.path).map(a=>a.path);
  if(!t&&!att.length)return;
  if(att.length)t=(t||'첨부한 자료 봐 줘')+'\n첨부(대표님이 고른 자료, 순서대로):\n'+att.join('\n');
  if(!TOKEN){toast('접근키를 먼저 넣어 주세요');return;}
  const a=S.team.agents[CH.to];const sec=(S.team.roles||{}).secretary;const body=(CH.to==='team'?'@팀 ':CH.to===sec||(!sec&&CH.to==='tom')?'':'@'+a.name+' ')+t;
  inp.value='';$('#chatGo').disabled=true;
  try{
    if(!CH.num){const it=await gh('/issues',{method:'POST',body:{title:'대표님 채팅',body:'대표님과 직원의 채팅방입니다. 닫지 마세요.',labels:['chat']}});CH.num=it.number;S.issues.unshift(it);}
    const c=await gh(`/issues/${CH.num}/comments`,{method:'POST',body:{body}});
    CH.msgs.push({id:c.id,mine:true,t:body,at:c.created_at});CH.seen.add(c.id);CH.pending=1;CH.att=[];attRender();chatRender();
    clearTimeout(CH.timer);CH.timer=setTimeout(chatLoad,8000);
  }catch(e){inp.value=t;toast('보내기 실패: '+(e.status===403?'접근키 Issues 권한':e.message.slice(0,40)));}
  finally{$('#chatGo').disabled=false;}
}
$('#chatF').onsubmit=e=>{e.preventDefault();chatSend();};
window.chatSync=function(){if(!S.team)return;if(!$('#chatTo').children.length){chatTo();chatHead();}
  const it=chatIssue();if(it&&(CH.first||it.comments!==CH.lastCount)){CH.lastCount=it.comments;chatLoad();}else chatRender();};

/* 직원 답을 두 번 누르면 ❤ (다시 두 번 누르면 취소). ❤는 그 직원의 '좋은 답' 기준으로 쌓인다. */
async function chatHeart(id){const m=CH.msgs.find(x=>x.id===id);if(!m||m.mine)return;
  const on=m.heart&&!CH.unheart.has(id);
  try{
    if(!on){CH.unheart.delete(id);CH.hearts.add(id);m.heart=true;chatRender();
      await gh(`/issues/comments/${id}/reactions`,{method:'POST',body:{content:'heart'}});toast(`${(S.team.agents[m.aid]||{}).name||''}에게 ❤ · 좋은 답으로 기억합니다`);}
    else{CH.unheart.add(id);CH.hearts.delete(id);chatRender();
      const rs=await gh(`/issues/comments/${id}/reactions?content=heart`)||[];
      for(const r of rs)await gh(`/issues/comments/${id}/reactions/${r.id}`,{method:'DELETE'});m.heart=false;}
  }catch(e){toast('❤ 실패: '+(e.status===403?'접근키 Issues 권한':e.message.slice(0,40)));}
}
(function(){const l=$('#chatLog');if(!l)return;let lastT=0,lastId=null;
  l.addEventListener('dblclick',e=>{const b=e.target.closest('.bub[data-cid]');if(b){e.preventDefault();chatHeart(+b.dataset.cid);}});
  l.addEventListener('touchend',e=>{const b=e.target.closest('.bub[data-cid]');if(!b)return;const now=Date.now(),id=+b.dataset.cid;
    if(id===lastId&&now-lastT<320){e.preventDefault();lastT=0;lastId=null;chatHeart(id);}else{lastT=now;lastId=id;}},{passive:false});})();

/* 첨부: 대표님이 고른 사진·영상을 라이브러리에 올리고(같은 파일이면 기존 것 사용) 메시지에 경로를 붙인다 */
function attOf(t){const m=/\n첨부\([^)]*\):\n([\s\S]*)$/.exec(t||'');return m?(m[1].match(/workspace\/\S+/g)||[]):[];}
function attRender(){const box=$('#chatAtt');if(!box)return;box.classList.toggle('on',CH.att.length>0);
  box.innerHTML=CH.att.map((a,k)=>`<span class="at${a.path?'':' up'}">${a.url?`<img src="${a.url}" alt="">`:a.doc?`<i class="dc">${esc(a.name.split('.').pop().toUpperCase())}</i>`:a.vid?'▶ 영상':''}${a.path?'':'<i class="upl">올리는 중</i>'}<em>${k+1}</em>${a.path?`<b data-rm="${k}">×</b>`:''}</span>`).join('');
  box.querySelectorAll('[data-rm]').forEach(x=>x.onclick=()=>{CH.att.splice(+x.dataset.rm,1);attRender();});if(typeof lazy==='function')lazy(box);}
async function attAdd(files){if(!TOKEN){toast('접근키를 먼저 넣어 주세요');return;}
  const b={media:'workspace/',name:'채팅'};/* 채팅 첨부는 어느 사업 라이브러리에도 넣지 않고 workspace/_inbox 에 둔다(라이브러리에 이미 있는 자료면 그걸 씀) */
  if(!PF.tree){try{await loadTree();}catch{}}
  const ym=new Date().toISOString().slice(0,7);
  for(const f of files){if(CH.att.length>=10){toast('한 번에 10개까지');break;}
    const doc=/\.(pdf|pptx|docx|zip|html?|js|mjs|ts|css|json|txt|md|csv|svg|xml)$/i.test(f.name);const a={name:f.name,path:'',doc,vid:!doc&&!/^image/.test(f.type),url:/^image/.test(f.type)?URL.createObjectURL(f):''};CH.att.push(a);attRender();CH.busy++;
    try{
      if(!a.vid&&f.size>40*1048576)throw new Error('너무 큼');
      if((a.vid||a.doc)&&f.size>40*1048576)throw new Error(a.doc?'40MB 넘는 문서는 PDF로 줄여 주세요':'40MB 넘는 영상은 라이브러리에서 올려 주세요');
      const shot=await exifDate(f);const when=shot||('u'+Math.random().toString(36).replace(/[^a-z]/g,'').slice(0,6));
      const base=f.name.replace(/\.[^.]+$/,'').replace(/[^\w가-힣\-]+/g,'-').slice(0,40)||'file';
      const blob=a.vid||a.doc?f:((!shot&&!/jpe?g/i.test(f.type)&&f.size<25*1048576)?f:await shrink(f));
      const ext=a.vid||a.doc||blob===f?(f.name.split('.').pop()||'jpg').toLowerCase():'jpg';
      let sha='',sha0='';try{sha0=await blobSha(f);sha=blob===f?sha0:await blobSha(blob);}catch{}
      const tw=(sha0&&twinOf(b,sha0))||(sha&&twinOf(b,sha));
      if(tw)a.path=tw.path;
      else{const p=`workspace/_inbox/${ym}/${when}-${base}.${ext}`;await putFile(p,blob,`채팅 첨부: ${f.name}`);a.path=p;(PF.tree||[]).push({path:p,type:'blob',sha});}
    }catch(e){CH.att.splice(CH.att.indexOf(a),1);toast(`${f.name} 첨부 실패: ${e.status===403?'접근키 Contents 권한':String(e.message).slice(0,40)}`);}
    finally{CH.busy--;attRender();}}
}
$('#chatClip').onclick=()=>$('#chatFile').click();
$('#chatFile').onchange=e=>{const fs=[...e.target.files];e.target.value='';attAdd(fs);};

$('#chatLog').addEventListener('click',e=>{const b=e.target.closest('.bub .more');if(!b)return;const u=b.parentElement;const id=+u.dataset.cid;u.classList.toggle('open');if(u.classList.contains('open'))CH.open.add(id);else CH.open.delete(id);b.textContent=u.classList.contains('open')?'접기':'더 보기';});
