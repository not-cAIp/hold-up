/* Hold Up — static web app on Supabase.
   Visitors can browse right away; the first swipe, post or survey answer signs them in as a guest. */

const CURRENCIES=["USD","EUR","GBP","CAD","AUD","HKD","TWD","CNY","JPY","SGD","KRW"];
const PRESETS={
  approve:["You deserve it","You'll use it every day","That price is good","It replaces something broken"],
  deny:["You have one already","Wait 48 hours first","The sale isn't real","Put it in savings"]
};
const SURVEY=[
  {k:"use",q:"How likely are you to use Hold Up?",o:["1","2","3","4","5"],hint:"1 = never, 5 = every week"},
  {k:"regret",q:"How often do you regret something you bought?",o:["Rarely","Sometimes","Often","All the time"]},
  {k:"who",q:"Who would you want voting on your cart?",o:["Close friends","Strangers","Both"]},
  {k:"feature",q:"Which part would you use most?",o:["Swipe voting","Friend circles","Money kept","Story cards","Shop links"]},
  {k:"pay",q:"Would you pay for extra features?",o:["No, free only","$1–2 a month","$3–5 a month","More than $5"]},
  {k:"note",q:"Anything you'd change or add?",text:true}
];

const cfg=window.HOLDUP_CONFIG||{};
const configured=/^https:\/\/.+\.supabase\.co/.test(cfg.supabaseUrl||"")&&(cfg.supabaseAnonKey||"").length>20;
const sb=configured&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}}):null;

const S={me:null,user:null,profile:null,ready:false,loadError:false,
  posts:[],votes:new Map(),counts:new Map(),likes:[],circles:new Map(),members:new Map(),blocks:new Set(),
  survey:null,surveyAns:{},drafts:{},tab:"square",feedMode:"swipe",activeGroup:null,muted:[],scope:"public",photo:null,
  exampleDone:false,detailId:null};
try{S.muted=JSON.parse(localStorage.getItem("hu-muted")||"[]")}catch(e){}
try{const t=localStorage.getItem("hu-tab");if(t)S.tab=t}catch(e){}
try{if(localStorage.getItem("hu-mode")==="list")S.feedMode="list"}catch(e){}

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const noDec=c=>c==="JPY"||c==="TWD"||c==="KRW";
const money=(n,c)=>{try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:noDec(c)?0:2}).format(n)}catch(e){return c+" "+n}};
const ago=t=>{const s=(Date.now()-t)/1000;if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+"m";if(s<86400)return Math.floor(s/3600)+"h";return Math.floor(s/86400)+"d"};
const initial=n=>(n||"?").trim().charAt(0).toUpperCase()||"?";
const uuid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(16)+Math.random().toString(16).slice(2);
function cleanLink(u){try{const x=new URL(String(u||"").trim());return x.protocol==="https:"||x.protocol==="http:"?x.href.slice(0,500):""}catch(e){return""}}
function linkHTML(p){const u=cleanLink(p.link);if(!u)return"";let h="";try{h=new URL(u).hostname.replace(/^www\./,"")}catch(e){}
  return`<a class="shop-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">View on ${esc(h)} ↗</a>`}
const photoSrc=p=>p&&p.photoUrl?p.photoUrl:null;
let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2400)}

/* ---------- example (only when the database has no posts at all) ---------- */
const EXAMPLE={id:"example",example:true,item:"Third pair of white sneakers",price:129,currency:"USD",
  reason:"They're on sale and mine are getting scuffed.",alt:"Two pairs of white sneakers, one barely worn",createdAt:Date.now()-3*3600e3,status:"open",scope:"public",
  exVotes:[{voter:"ex1",name:"Maya",v:"deny",why:"You have one barely worn. Clean the scuffed ones first.",hearts:12},
    {voter:"ex2",name:"Jules",v:"deny",why:"Wait 48 hours first",hearts:4},
    {voter:"ex3",name:"Priya",v:"approve",why:"If you wear them every day, it's worth it.",hearts:2}]};

/* ---------- data ---------- */
function normPost(r){
  return{id:r.id,author:r.author,item:r.item,price:Number(r.price),currency:r.currency,reason:r.reason,alt:r.alt||"",link:r.link||"",
    photoPath:r.photo_path||null,photoUrl:r.photo_path?sb.storage.from("photos").getPublicUrl(r.photo_path).data.publicUrl:null,
    scope:r.circle_id||"public",status:r.status,createdAt:Date.parse(r.created_at),
    authorName:r.author_profile?.display_name||"Someone",sample:!!r.author_profile?.is_sample};
}
let loading=null;
async function loadAll(){
  if(!sb)return;
  if(loading)return loading;
  loading=(async()=>{
    try{
      const [posts,votes,likes,counts]=await Promise.all([
        sb.from("posts").select("*, author_profile:profiles!posts_author_fkey(display_name,is_sample)").order("created_at",{ascending:false}).limit(300),
        sb.from("votes").select("post_id,voter,verdict,comment,created_at, voter_profile:profiles!votes_voter_fkey(display_name,is_sample)").limit(5000),
        sb.from("likes").select("post_id,voter,liker").limit(10000),
        sb.rpc("vote_counts")]);
      if(posts.error)throw posts.error;
      S.posts=posts.data.map(normPost);
      S.votes=new Map();
      for(const v of votes.data||[]){const a=S.votes.get(v.post_id)||[];a.push({voter:v.voter,v:v.verdict,why:v.comment||"",at:Date.parse(v.created_at),name:v.voter_profile?.display_name});S.votes.set(v.post_id,a)}
      for(const a of S.votes.values())a.sort((x,y)=>x.at-y.at);
      S.likes=likes.data||[];
      S.counts=new Map((counts.data||[]).map(r=>[r.post_id,Number(r.n)]));
      if(S.me){
        const [cm,cs,bl,sv,pr]=await Promise.all([
          sb.from("circle_members").select("circle_id,user_id"),
          sb.from("circles").select("id,name,code"),
          sb.from("blocks").select("blocked"),
          sb.from("survey_responses").select("answers").eq("user_id",S.me).maybeSingle(),
          sb.from("profiles").select("id,display_name").eq("id",S.me).maybeSingle()]);
        S.circles=new Map((cs.data||[]).map(c=>[c.id,c]));
        S.members=new Map();for(const m of cm.data||[])S.members.set(m.circle_id,(S.members.get(m.circle_id)||0)+1);
        S.blocks=new Set((bl.data||[]).map(b=>b.blocked));
        S.survey=sv.data?sv.data.answers:null;
        S.profile=pr.data||S.profile;
      }
      S.loadError=false;
    }catch(e){S.loadError=true;console.error(e)}
    S.ready=true;loading=null;render();
  })();
  return loading;
}
async function ensureUser(){
  if(S.me)return true;
  if(!sb){toast("This copy isn't connected to a database yet.");return false}
  const {data,error}=await sb.auth.signInAnonymously();
  if(error||!data.user){toast(error&&/anonymous/i.test(error.message)?"Guest sign-in is turned off. Enable it in Supabase.":"Couldn't start a guest session. Try again.");return false}
  await onSignedIn(data.user);
  return true;
}
async function onSignedIn(user){
  S.user=user;S.me=user.id;
  const {data}=await sb.from("profiles").select("id,display_name").eq("id",S.me).maybeSingle();
  if(!data){
    const name="Guest "+Math.floor(1000+Math.random()*9000);
    const ins=await sb.from("profiles").insert({id:S.me,display_name:name}).select().maybeSingle();
    S.profile=ins.data||{id:S.me,display_name:name};
  }else S.profile=data;
}

/* ---------- helpers on loaded data ---------- */
function visiblePosts(){return S.posts.filter(p=>!S.blocks.has(p.author))}
function getPost(id){return id==="example"?EXAMPLE:S.posts.find(x=>x.id===id)}
function votesFor(p){return p.example?p.exVotes:(S.votes.get(p.id)||[])}
function myVote(p){return S.me?votesFor(p).find(v=>v.voter===S.me):null}
function heartsFor(p,v){
  if(p.example)return{n:v.hearts,mine:false};
  let n=0,mine=false;for(const l of S.likes){if(l.post_id===p.id&&l.voter===v.voter){n++;if(l.liker===S.me)mine=true}}return{n,mine};
}
function nameOf(p){if(p.example)return"Example post";if(p.author===S.me)return"You";return p.authorName||"Someone"}
function voterName(v){if(v.voter===S.me)return"You";return v.name||"Someone"}
function myGroups(){return[...S.circles.keys()]}
function verdictOf(p,vs){
  if(p.status==="skipped")return{cls:"kept",txt:"Skipped it",story:"I skipped it"};
  if(p.status==="bought")return{cls:"wait",txt:"Bought it",story:"I bought it"};
  if(!vs.length)return null;
  const a=vs.filter(v=>v.v==="approve").length,d=vs.length-a;
  if(a>d)return{cls:"ok",txt:"Get it",story:"Verdict: get it"};
  if(d>a)return{cls:"no",txt:"Skip it",story:"Verdict: skip it"};
  return{cls:"wait",txt:"It's a tie",story:"It's a tie"};
}
function myPosts(){return S.me?S.posts.filter(p=>p.author===S.me):[]}
function savedTotals(){const saved={};myPosts().filter(p=>p.status==="skipped").forEach(p=>saved[p.currency]=(saved[p.currency]||0)+p.price);return saved}
function muteFilter(p){const t=(p.item+" "+p.reason).toLowerCase();return !S.muted.some(k=>t.includes(k))}

/* ---------- rendering ---------- */
function photoHTML(p){const src=photoSrc(p);return src?`<img class="photo" src="${esc(src)}" alt="${esc(p.item)}" loading="lazy" data-ph="1">`:""}
function cardHTML(p){
  const ex=!!p.example;
  const mine=!ex&&p.author===S.me;
  const mv=ex?null:myVote(p);
  const reveal=ex||mine||!!mv;
  const vs=votesFor(p);
  const verdict=reveal||p.status!=="open"?verdictOf(p,vs):null;
  const author=nameOf(p);
  const scopeLabel=p.scope==="public"?"":(S.circles.get(p.scope)?.name||"Circle");
  const n=ex?vs.length:(S.counts.get(p.id)||0);
  let h=`<article class="req" data-id="${esc(p.id)}">
    <div class="req-top"><span class="avatar">${esc(initial(author))}</span><span class="who">${esc(author)}</span>
      <span>${ex?"":"· "+ago(p.createdAt)}${scopeLabel?" · "+esc(scopeLabel):""}</span>${p.sample?`<span class="tag-s">Sample</span>`:""}
      ${verdict?`<span class="pill ${verdict.cls}">${verdict.txt}</span>`:ex?`<span class="pill ex">Example</span>`:""}</div>
    ${photoHTML(p)}
    <div class="title-row"><h3>${esc(p.item)}</h3><span class="price">${esc(money(p.price,p.currency))}</span></div>
    <p class="why">${esc(p.reason)}</p>
    ${p.alt?`<p class="have">Already has: ${esc(p.alt)}</p>`:""}
    ${linkHTML(p)}`;
  h+=`<div class="vote">`;
  if(!reveal&&p.status==="open"){
    const dr=S.drafts[p.id]||{};
    h+=`<div class="choice">
        <button type="button" class="ok" data-act="pick" data-v="approve" aria-pressed="${dr.v==="approve"}">Get it</button>
        <button type="button" class="no" data-act="pick" data-v="deny" aria-pressed="${dr.v==="deny"}">Skip it</button></div>`;
    if(dr.v){
      h+=`<div class="presets">${PRESETS[dr.v].map(t=>`<button type="button" class="preset" data-act="preset" data-t="${esc(t)}" aria-pressed="${dr.why===t}">${esc(t)}</button>`).join("")}</div>
        <textarea id="why-${esc(p.id)}" data-act="why" maxlength="300" placeholder="Add a comment (optional)">${esc(dr.why||"")}</textarea>
        <div class="cast-row"><span class="hint">${n} ${n===1?"vote":"votes"} so far</span>
          <button type="button" class="btn small" data-act="cast">Send vote</button></div>`;
    }else h+=`<span class="hint">${n} ${n===1?"vote":"votes"} so far. You'll see them after you vote.</span>`;
  }else{
    const a=vs.filter(v=>v.v==="approve").length,d=vs.length-a;
    if(vs.length){
      h+=`<div class="tally-row"><span class="a">${a} get it</span><span class="d">${d} skip it</span></div>
        <div class="tally"><div class="a" style="width:${a/vs.length*100}%"></div><div class="d" style="width:${d/vs.length*100}%"></div></div>
        <ul class="opinions">${vs.map(v=>{const f=heartsFor(p,v);const self=v.voter===S.me;const nm=ex?v.name:voterName(v);
          return`<li><span class="avatar ${v.v==="approve"?"ok":"no"}">${esc(initial(nm))}</span>
          <div class="body"><div class="name">${esc(nm)} <span class="hint">· ${v.v==="approve"?"get it":"skip it"}</span></div>${esc(v.why||"")}</div>
          ${v.why?`<button type="button" class="heart" data-act="like" data-voter="${esc(v.voter)}" aria-pressed="${f.mine}" ${ex||self?"disabled":""} aria-label="Like this comment">♥ ${f.n}</button>`:""}</li>`}).join("")}</ul>`;
    }else h+=`<span class="hint">No votes yet. Give it a day before you decide.</span>`;
    if(mine&&p.status==="open")h+=`<div class="owner-actions">
      <button type="button" class="btn small" data-act="status" data-s="skipped">I skipped it</button>
      <button type="button" class="btn small ghost" data-act="status" data-s="bought">I bought it</button>
      <button type="button" class="btn small ghost" data-act="delete">Delete</button></div>`;
    h+=`<div class="card-foot"><button type="button" class="linkish" data-act="story">Share as story card</button></div>`;
  }
  if(!ex&&!mine&&!p.sample)h+=`<div class="owner-actions" style="justify-content:flex-end"><button type="button" class="linkish" style="color:var(--muted)" data-act="report">Report</button><button type="button" class="linkish" style="color:var(--muted)" data-act="block">Hide this person</button></div>`;
  return h+`</div></article>`;
}

const PASTELS=[["#FFD6E5","#FFEBDD"],["#E7DEFF","#FFD9EC"],["#D7F3E7","#FFF2C7"],["#FFE0CF","#FFD2E1"],["#DCEBFF","#F3DDFF"]];
function hash(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return h}
function pastel(id){const [a,b]=PASTELS[hash(id)%PASTELS.length];return`linear-gradient(160deg,${a},${b})`}
function deckQueue(){
  const pub=visiblePosts().filter(p=>p.scope==="public").filter(muteFilter);
  let q=pub.filter(p=>p.status==="open"&&p.author!==S.me&&!myVote(p));
  if(!pub.length&&!S.exampleDone)q=[EXAMPLE];
  return{pub,q};
}
function swipeCardHTML(p,top){
  const src=photoSrc(p);const author=nameOf(p);
  return`<div class="scard ${top?"top":"under"} ${src?"":"nophoto"}" data-id="${esc(p.id)}" ${src?"":`style="background:${pastel(p.id)}"`} ${top?`role="group" aria-label="${esc(p.item)}, ${esc(money(p.price,p.currency))}"`:'aria-hidden="true"'}>
    ${src?`<img src="${esc(src)}" alt="" data-ph="1" draggable="false">`:`<div class="bigp">${esc(money(p.price,p.currency))}</div>`}
    ${top?`<div class="stamp yes">GET IT</div><div class="stamp no">SKIP</div>`:""}
    <div class="scrim">
      <div class="who-row"><span class="avatar">${esc(initial(author))}</span><span>${esc(author)}${p.example?"":" · "+ago(p.createdAt)}${p.sample?" · Sample post":""}</span></div>
      <h3>${esc(p.item)}</h3>
      <span class="sp">${esc(money(p.price,p.currency))}</span>
      <p class="sr">${esc(p.reason)}</p>
      ${p.alt?`<p class="sh">Already has: ${esc(p.alt)}</p>`:""}
    </div></div>`;
}
function modeToggle(){
  return`<div class="seg" role="group" aria-label="Feed view"><button type="button" data-act="mode" data-m="swipe" aria-pressed="${S.feedMode==="swipe"}">Swipe</button><button type="button" data-act="mode" data-m="list" aria-pressed="${S.feedMode==="list"}">Results</button></div>`;
}
function surveyLink(){return !S.survey?` <button type="button" class="linkish" data-act="survey">Quick survey</button>`:""}
function renderSquare(){
  const {pub,q}=deckQueue();
  if(S.feedMode==="swipe"){
    let h=`<div class="feed-bar">${modeToggle()}<span class="hint">${q.length&&!q[0].example?q.length+" to vote on":""}${surveyLink()}</span></div>`;
    if(!q.length)return h+`<div class="deck"><div class="deck-empty"><b>You're all caught up</b><span>New posts show up here. See how your votes landed in Results.</span>
      <button type="button" class="btn small" data-act="mode" data-m="list">See results</button>${!S.survey?`<button type="button" class="btn small ghost" data-act="survey">Take the 1-minute survey</button>`:""}</div></div>`;
    h+=`<div class="deck" id="deck">${q.slice(0,2).reverse().map((p,i,arr)=>swipeCardHTML(p,i===arr.length-1)).join("")}</div>
      <div class="actions"><button type="button" class="act no" data-act="swipe" data-dir="-1"><span class="ring">✕</span>Skip it</button>
      <button type="button" class="act yes" data-act="swipe" data-dir="1"><span class="ring">♥</span>Get it</button></div>`;
    return h;
  }
  let h=`<div class="feed-bar">${modeToggle()}<span class="hint">${pub.length} ${pub.length===1?"post":"posts"}</span></div>`;
  if(!pub.length)return h+pinsHTML([EXAMPLE])+`<p class="empty">Nothing posted yet. Tap <b>+ Post</b> to post the first one.</p>`;
  return h+pinsHTML(pub);
}
const ratios=["4/5","1/1","3/4","4/5","5/6"];
function pinHTML(p){
  const vs=votesFor(p);const ex=!!p.example;const mine=!ex&&p.author===S.me;
  const reveal=ex||mine||!!myVote(p);
  const v=reveal||p.status!=="open"?verdictOf(p,vs):null;
  const src=photoSrc(p);
  const a=vs.filter(x=>x.v==="approve").length;
  const n=ex?vs.length:(S.counts.get(p.id)||0);
  return`<button type="button" class="pin" data-act="open" data-id="${esc(p.id)}" aria-label="${esc(p.item)}, ${esc(money(p.price,p.currency))}">
    <div class="pin-img">${src?`<img src="${esc(src)}" alt="" loading="lazy" data-ph="1">`:`<div class="pin-ph" style="aspect-ratio:${ratios[hash(p.id)%ratios.length]};background:${pastel(p.id)}">${esc(money(p.price,p.currency))}</div>`}
      ${v?`<span class="pill ${v.cls}">${v.txt}</span>`:ex?`<span class="pill ex">Example</span>`:p.sample?`<span class="pill ex">Sample</span>`:""}</div>
    <div class="pin-meta"><b>${esc(p.item)}</b>
      <div class="row2"><span class="pp">${esc(money(p.price,p.currency))}</span><span>${reveal?n+" "+(n===1?"vote":"votes"):"Tap to vote"}</span></div>
      ${reveal&&vs.length?`<div class="mini"><div class="a" style="width:${a/vs.length*100}%"></div><div class="d" style="width:${(vs.length-a)/vs.length*100}%"></div></div>`:""}</div></button>`;
}
function pinsHTML(list){return`<div class="pins">${list.map(pinHTML).join("")}</div>`}
function renderGroups(){
  const gs=myGroups();
  if(S.activeGroup&&!gs.includes(S.activeGroup))S.activeGroup=null;
  if(!S.activeGroup&&gs.length)S.activeGroup=gs[0];
  let h=`<div class="section-head">Your circles</div>`;
  if(gs.length){
    h+=`<div class="chips">${gs.map(g=>`<button type="button" class="chip" data-act="g-pick" data-g="${esc(g)}" aria-pressed="${g===S.activeGroup}">${esc(S.circles.get(g).name)}</button>`).join("")}</div>`;
    const c=S.circles.get(S.activeGroup),members=S.members.get(S.activeGroup)||1;
    h+=`<div class="panel" style="margin-top:12px"><div class="hint">${members} ${members===1?"member":"members"} · share this code with the group chat</div>
      <div class="owner-actions"><span class="code">${esc(c.code)}</span>
      <button type="button" class="btn small" data-act="copy" data-text="${esc(c.code)}">Copy code</button>
      <button type="button" class="btn small ghost" data-act="g-leave">Leave</button></div></div>`;
    const posts=visiblePosts().filter(p=>p.scope===S.activeGroup);
    h+=posts.length?pinsHTML(posts):`<p class="empty">No posts in this circle yet.</p>`;
  }else h+=`<p class="empty" style="padding-top:0">Make a circle for your roommates or group chat, then share the code so only they can vote.</p>`;
  h+=`<div class="section-head">${gs.length?"Add another circle":"Start a circle"}</div><div class="panel">
    <div class="row"><input type="text" id="g-name" maxlength="40" placeholder="Circle name, like Roomies"><button type="button" class="btn" data-act="g-create">Create</button></div>
    <div class="row"><input type="text" id="g-code" maxlength="12" placeholder="Got a code? Paste it here" autocapitalize="characters"><button type="button" class="btn ghost" data-act="g-join">Join</button></div></div>`;
  return h;
}
function accountPanel(){
  if(!S.me)return`<div class="panel" style="margin-top:16px"><b>You're browsing</b><span class="hint">Swipe, post or take the survey and we'll make you a guest account automatically. No email needed.</span>
    <div class="row"><input type="email" id="acct-email" placeholder="Already have an account? Your email" autocomplete="email"><button type="button" class="btn ghost" data-act="email-login">Email me a link</button></div></div>`;
  const anon=!!S.user?.is_anonymous;
  return`<div class="panel" style="margin-top:16px">
    <div class="row"><input type="text" id="acct-name" maxlength="30" value="${esc(S.profile?.display_name||"")}" aria-label="Your display name"><button type="button" class="btn ghost" data-act="save-name">Save name</button></div>
    ${anon?`<span class="hint">You're a guest on this device. Add your email to keep your posts if you switch phones.</span>
    <div class="row"><input type="email" id="acct-email" placeholder="you@email.com" autocomplete="email"><button type="button" class="btn ghost" data-act="add-email">Add email</button></div>`:`<span class="hint">Signed in as ${esc(S.user?.email||"")}</span>`}
    <div class="owner-actions"><button type="button" class="linkish" data-act="sign-out" style="color:var(--muted)">Sign out</button><button type="button" class="linkish" data-act="delete-account" style="color:var(--no)">Delete my account</button></div></div>`;
}
function surveyPanel(){
  return`<div class="panel" style="margin-top:16px;background:var(--pink-soft);border-color:var(--pink-soft)">
    <div><b>${S.survey?"Thanks for your feedback":"Help shape Hold Up"}</b><div class="hint">${S.survey?"You can update your answers any time.":"Six quick questions, about a minute."}</div></div>
    <div><button type="button" class="btn small" data-act="survey">${S.survey?"Edit my answers":"Take the survey"}</button></div></div>`;
}
function renderMine(){
  const posts=myPosts();
  const saved=savedTotals();const cs=Object.keys(saved);
  const savedTxt=cs.length?cs.map(c=>money(saved[c],c)).join(" + "):money(0,"USD");
  const lattes=cs.length===1&&cs[0]==="USD"?Math.floor(saved.USD/6.5):null;
  const skipped=posts.filter(p=>p.status==="skipped").length;
  const votesGiven=S.me?[...S.votes.values()].reduce((n,a)=>n+a.filter(v=>v.voter===S.me).length,0):0;
  let h=surveyPanel()+`<div class="section-head">Money kept by skipping</div>
    <div class="hero-stat"><div class="big">${esc(savedTxt)}</div>
      <div class="sub">${lattes?`That's ${lattes} iced lattes you still have.`:skipped?"Still in your account where it belongs.":"Skip something and it shows up here."}</div></div>
    <div class="stats"><div class="stat"><b>${posts.length}</b><span>posted</span></div>
      <div class="stat"><b>${skipped}</b><span>skipped</span></div>
      <div class="stat"><b>${votesGiven}</b><span>votes given</span></div></div>
    <div class="section-head">Your posts</div>`;
  h+=posts.length?pinsHTML(posts):`<p class="empty">You haven't posted anything yet.</p>`;
  h+=`<div class="section-head">Hide posts that mention</div>
    <div class="panel"><div class="row"><input type="text" id="mute-in" maxlength="30" placeholder="skincare, crypto, Labubu"><button type="button" class="btn ghost" data-act="mute">Hide</button></div>
      <div class="chips">${S.muted.length?S.muted.map(k=>`<button type="button" class="chip" data-act="unmute" data-k="${esc(k)}">${esc(k)}<span class="x">×</span></button>`).join(""):'<span class="hint">Nothing hidden.</span>'}</div></div>
    <div class="section-head">Account</div>${accountPanel()}`;
  return h;
}
let drag=null,flying=false,pendingRender=false;
function render(){
  if(drag||flying){pendingRender=true;return}
  pendingRender=false;
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===S.tab));
  const active=document.activeElement;const focusId=active&&active.id;const sel=focusId&&active.selectionStart;
  $("#view").innerHTML=S.tab==="square"?renderSquare():S.tab==="groups"?renderGroups():renderMine();
  if(S.detailId){const p=getPost(S.detailId);if(p)$("#detail").innerHTML=cardHTML(p);else closeDetail()}
  if(focusId){const el=document.getElementById(focusId);if(el&&el!==document.body){el.focus();try{el.setSelectionRange(sel,sel)}catch(e){}}}
  $("#fab").hidden=!sb;
  const b=$("#banner");
  if(!configured){b.hidden=false;b.textContent="Setup needed: add your Supabase URL and anon key to config.js. You're seeing a preview."}
  else if(!S.ready){b.hidden=false;b.textContent="Loading the feed…"}
  else if(S.loadError){b.hidden=false;b.textContent="Couldn't load the feed. Check your connection and refresh."}
  else b.hidden=true;
}
document.addEventListener("error",e=>{const im=e.target;if(im.tagName==="IMG"&&im.dataset.ph){const d=document.createElement("div");d.className=im.classList.contains("s-photo")?"s-photo photo-ph":"photo-ph";d.textContent="Photo unavailable";im.replaceWith(d)}},true);

/* ---------- detail + story ---------- */
function openDetail(id){const p=getPost(id);if(!p)return;S.detailId=id;$("#detail").innerHTML=cardHTML(p);$("#detail-back").hidden=false;$("#detail-close").focus()}
function closeDetail(){S.detailId=null;$("#detail-back").hidden=true}
$("#detail-close").addEventListener("click",closeDetail);
$("#detail-back").addEventListener("click",e=>{if(e.target.id==="detail-back")closeDetail()});
function openStory(id){
  const p=getPost(id);if(!p)return;
  const vs=votesFor(p);const a=vs.filter(v=>v.v==="approve").length,d=vs.length-a;
  const v=verdictOf(p,vs);
  let top=null,best=-1;for(const x of vs){if(!x.why)continue;const n=heartsFor(p,x).n;if(n>best){best=n;top=x}}
  const src=photoSrc(p);
  $("#story").innerHTML=`<div><div class="s-brand">hold up<span>.</span></div><div class="s-q">${!p.example&&p.author===S.me?"I asked":esc(p.example?"Someone":nameOf(p))+" asked"}: should I buy this?</div></div>
    <div class="s-card">${src?`<img class="s-photo" src="${esc(src)}" alt="" data-ph="1">`:""}
      <div class="s-top"><p class="s-item">${esc(p.item)}</p><span class="s-price">${esc(money(p.price,p.currency))}</span></div>
      ${vs.length?`<div class="s-bar"><div class="a" style="width:${a/vs.length*100}%"></div><div class="d" style="width:${d/vs.length*100}%"></div></div>
      <div class="s-split"><span style="color:#1E9A70">${a} get it</span><span style="color:#DB5A44">${d} skip it</span></div>`:""}
      ${top?`<div class="s-quote">“${esc(top.why)}”<small>${esc(p.example?top.name:voterName(top))}</small></div>`:""}</div>
    <div class="s-verdict">${esc(v?v.story:"Votes still coming in")}</div>
    <div class="s-foot">${esc(location.host||"Ask before you buy")}</div>`;
  $("#story-back").hidden=false;$("#story-close").focus();
}
$("#story-close").addEventListener("click",()=>$("#story-back").hidden=true);
$("#story-back").addEventListener("click",e=>{if(e.target.id==="story-back")$("#story-back").hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("#story-back").hidden=true;$("#sheet").hidden=true;$("#survey-back").hidden=true;closeDetail()}});

/* ---------- writes ---------- */
function fail(e,msg){console.error(e);toast(msg||"Something went wrong. Try again.");loadAll()}
async function castVote(id,v,why){
  if(!await ensureUser())return false;
  const p=getPost(id);if(!p||p.author===S.me)return false;
  const list=(S.votes.get(id)||[]).filter(x=>x.voter!==S.me);list.push({voter:S.me,v,why,at:Date.now(),name:S.profile?.display_name});S.votes.set(id,list);
  S.counts.set(id,(S.counts.get(id)||0)+1);render();
  const {error}=await sb.from("votes").upsert({post_id:id,voter:S.me,verdict:v,comment:why||""});
  if(error){fail(error,"Your vote didn't save. Try again.");return false}
  loadAll();return true;
}

/* ---------- events ---------- */
document.querySelector(".tabs").addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;S.tab=t.dataset.tab;try{localStorage.setItem("hu-tab",S.tab)}catch(e){}hideCbar();render();window.scrollTo({top:0})});
function onCardInput(e){
  const ta=e.target.closest("[data-act=why]");if(!ta)return;
  const id=ta.closest(".req").dataset.id;S.drafts[id]={...(S.drafts[id]||{}),why:ta.value};
  ta.closest(".vote").querySelectorAll(".preset").forEach(b=>b.setAttribute("aria-pressed",b.dataset.t===ta.value));
}
async function onCardClick(e){
  const b=e.target.closest("[data-act]");if(!b||b.tagName==="TEXTAREA")return;
  const card=b.closest(".req,.pin");const id=card&&card.dataset.id;const act=b.dataset.act;
  if(act==="open"){openDetail(id);return}
  if(act==="survey"){if(await ensureUser())openSurvey();return}
  if(act==="pick"){if(id==="example"){toast("That's an example. Swipe a real post to vote.");return}
    const prev=S.drafts[id]||{};S.drafts[id]={v:b.dataset.v,why:prev.v===b.dataset.v?prev.why:""};render();return}
  if(act==="preset"){S.drafts[id]={...(S.drafts[id]||{}),why:b.dataset.t};render();return}
  if(act==="cast"){const d=S.drafts[id];if(!d||!d.v)return;delete S.drafts[id];if(await castVote(id,d.v,(d.why||"").trim().slice(0,300)))toast("Vote sent");return}
  if(act==="mode"){S.feedMode=b.dataset.m;try{localStorage.setItem("hu-mode",S.feedMode)}catch(e){}hideCbar();render();return}
  if(act==="swipe"){const top=$("#deck .scard.top");if(top&&!flying)fly(top,+b.dataset.dir);return}
  if(act==="like"){if(!await ensureUser())return;const p=getPost(id);const v=votesFor(p).find(x=>x.voter===b.dataset.voter);if(!v)return;
    const mine=heartsFor(p,v).mine;
    if(mine){S.likes=S.likes.filter(l=>!(l.post_id===id&&l.voter===v.voter&&l.liker===S.me));render();
      const {error}=await sb.from("likes").delete().match({post_id:id,voter:v.voter,liker:S.me});if(error)fail(error)}
    else{S.likes.push({post_id:id,voter:v.voter,liker:S.me});render();
      const {error}=await sb.from("likes").insert({post_id:id,voter:v.voter,liker:S.me});if(error)fail(error)}
    return}
  if(act==="story"){openStory(id);return}
  if(act==="status"){const p=getPost(id);if(!p)return;p.status=b.dataset.s;render();
    const {error}=await sb.from("posts").update({status:b.dataset.s}).eq("id",id);if(error){fail(error);return}
    if(b.dataset.s==="skipped"){toast("Proud of you. Added to money kept.");openStory(id)}else toast("Logged. Enjoy it.");return}
  if(act==="delete"){if(!b.dataset.confirm){b.dataset.confirm=1;b.textContent="Tap again to delete";return}
    const p=getPost(id);S.posts=S.posts.filter(x=>x.id!==id);closeDetail();render();
    const {error}=await sb.from("posts").delete().eq("id",id);if(error){fail(error,"Couldn't delete it. Try again.");return}
    if(p&&p.photoPath)sb.storage.from("photos").remove([p.photoPath]).catch(()=>{});
    toast("Post deleted");return}
  if(act==="report"){if(!b.dataset.confirm){b.dataset.confirm=1;b.textContent="Tap again to report";return}
    if(!await ensureUser())return;
    const {error}=await sb.from("reports").insert({post_id:id,reporter:S.me,reason:"user report"});
    if(error&&error.code!=="23505"){fail(error);return}
    toast("Reported. Thanks for keeping Hold Up kind.");return}
  if(act==="block"){if(!b.dataset.confirm){b.dataset.confirm=1;b.textContent="Tap again to hide them";return}
    if(!await ensureUser())return;const p=getPost(id);if(!p)return;
    S.blocks.add(p.author);closeDetail();render();
    const {error}=await sb.from("blocks").insert({blocker:S.me,blocked:p.author});if(error&&error.code!=="23505")fail(error);else toast("You won't see their posts anymore.");return}
  if(act==="g-create"){const n=$("#g-name").value.trim();if(!n)return;if(!await ensureUser())return;
    const {data,error}=await sb.rpc("create_circle",{circle_name:n});if(error){fail(error,"Couldn't create the circle. Try again.");return}
    S.activeGroup=data.id;await loadAll();toast("Circle made. Share the code.");return}
  if(act==="g-join"){const c=$("#g-code").value.trim();if(!c)return;if(!await ensureUser())return;
    const {data,error}=await sb.rpc("join_circle",{invite_code:c});if(error){toast(/no circle/.test(error.message)?"That code doesn't match a circle":"Couldn't join. Try again.");return}
    S.activeGroup=data.id;await loadAll();toast("You're in "+data.name);return}
  if(act==="g-pick"){S.activeGroup=b.dataset.g;render();return}
  if(act==="g-leave"){if(!b.dataset.confirm){b.dataset.confirm=1;b.textContent="Tap again to leave";return}
    const g=S.activeGroup;S.circles.delete(g);S.activeGroup=null;render();
    const {error}=await sb.from("circle_members").delete().match({circle_id:g,user_id:S.me});if(error)fail(error);else loadAll();return}
  if(act==="copy"){try{await navigator.clipboard.writeText(b.dataset.text);toast("Code copied")}catch(err){const r=document.createRange();r.selectNodeContents(b.previousElementSibling);getSelection().removeAllRanges();getSelection().addRange(r);toast("Code selected. Copy it from there.")}return}
  if(act==="mute"){const k=$("#mute-in").value.trim().toLowerCase();if(k&&!S.muted.includes(k)){S.muted.push(k);try{localStorage.setItem("hu-muted",JSON.stringify(S.muted))}catch(e){}}render();return}
  if(act==="unmute"){S.muted=S.muted.filter(k=>k!==b.dataset.k);try{localStorage.setItem("hu-muted",JSON.stringify(S.muted))}catch(e){}render();return}
  if(act==="save-name"){const n=$("#acct-name").value.trim().slice(0,30);if(!n)return;
    const {error}=await sb.from("profiles").update({display_name:n}).eq("id",S.me);if(error){fail(error);return}S.profile={...S.profile,display_name:n};toast("Name saved");loadAll();return}
  if(act==="add-email"){const em=$("#acct-email").value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){toast("Enter a valid email");return}
    const {error}=await sb.auth.updateUser({email:em});if(error){toast(error.message||"Couldn't add that email");return}toast("Check your inbox to confirm your email.");return}
  if(act==="email-login"){const em=$("#acct-email").value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){toast("Enter a valid email");return}
    const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:false}});
    if(error){toast("We couldn't find an account with that email.");return}toast("Check your inbox for a sign-in link.");return}
  if(act==="sign-out"){if(S.user?.is_anonymous&&!b.dataset.confirm){b.dataset.confirm=1;b.textContent="Guest posts will be lost. Tap again";return}
    await sb.auth.signOut();location.reload();return}
  if(act==="delete-account"){if(!b.dataset.confirm){b.dataset.confirm=1;b.textContent="This deletes everything. Tap again";return}
    for(const p of myPosts())if(p.photoPath)await sb.storage.from("photos").remove([p.photoPath]).catch(()=>{});
    const {error}=await sb.rpc("delete_my_account");if(error){fail(error,"Couldn't delete your account. Try again.");return}
    await sb.auth.signOut();location.reload();return}
}
for(const el of [$("#view"),$("#detail")]){el.addEventListener("input",onCardInput);el.addEventListener("click",onCardClick)}

/* ---------- swipe gesture ---------- */
function paintDrag(el,dx,dy){
  el.style.transform=`translate(${dx}px,${dy*.2}px) rotate(${dx/16}deg)`;
  const y=el.querySelector(".stamp.yes"),n=el.querySelector(".stamp.no");
  if(y)y.style.opacity=Math.max(0,Math.min(1,dx/90));if(n)n.style.opacity=Math.max(0,Math.min(1,-dx/90));
}
function fly(el,dir){
  flying=true;
  const y=el.querySelector(dir>0?".stamp.yes":".stamp.no");if(y)y.style.opacity=1;
  el.style.transition="transform .28s ease-out";
  el.style.transform=`translate(${dir*Math.max(innerWidth,500)*1.1}px,40px) rotate(${dir*22}deg)`;
  setTimeout(()=>commitSwipe(el.dataset.id,dir),240);
}
async function commitSwipe(id,dir){
  flying=false;
  if(id==="example"){S.exampleDone=true;render();toast("That was an example. Tap + Post to add yours.");return}
  if(await castVote(id,dir>0?"approve":"deny",""))showCbar(id);else render();
}
$("#view").addEventListener("pointerdown",e=>{
  const el=e.target.closest(".scard.top");if(!el||flying||e.button>0)return;
  drag={el,x0:e.clientX,y0:e.clientY,dx:0,dy:0,t:performance.now()};
  el.style.transition="none";try{el.setPointerCapture(e.pointerId)}catch(err){}
});
$("#view").addEventListener("pointermove",e=>{if(!drag)return;drag.dx=e.clientX-drag.x0;drag.dy=e.clientY-drag.y0;paintDrag(drag.el,drag.dx,drag.dy)});
function endDrag(){
  if(!drag)return;const {el,dx,t}=drag;drag=null;
  const fast=Math.abs(dx)>45&&Math.abs(dx)/(performance.now()-t)>.6;
  if(Math.abs(dx)>100||fast){fly(el,dx>0?1:-1);return}
  el.style.transition="transform .25s cubic-bezier(.3,1.4,.5,1)";paintDrag(el,0,0);
  if(pendingRender)setTimeout(render,260);
}
$("#view").addEventListener("pointerup",endDrag);
$("#view").addEventListener("pointercancel",endDrag);
document.addEventListener("keydown",e=>{
  if(S.tab!=="square"||S.feedMode!=="swipe"||!$("#sheet").hidden||!$("#story-back").hidden||!$("#survey-back").hidden||!$("#detail-back").hidden)return;
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){const top=$("#deck .scard.top");if(top&&!flying){e.preventDefault();fly(top,e.key==="ArrowRight"?1:-1)}}
});

/* ---------- comment bar ---------- */
let cbarId=null;
function showCbar(id){
  const p=getPost(id);const v=p&&myVote(p);if(!v)return;
  cbarId=id;
  $("#cbar-msg").innerHTML=`You said <b style="color:var(--${v.v==="approve"?"yes":"no"})">${v.v==="approve"?"Get it":"Skip it"}</b> to ${esc(p.item)}`;
  $("#cbar-presets").innerHTML=PRESETS[v.v].map(t=>`<button type="button" class="preset" data-t="${esc(t)}">${esc(t)}</button>`).join("");
  $("#cbar-text").value="";$("#cbar").hidden=false;
}
function hideCbar(){$("#cbar").hidden=true;cbarId=null}
$("#cbar-presets").addEventListener("click",e=>{const b=e.target.closest(".preset");if(!b)return;$("#cbar-text").value=b.dataset.t;sendComment()});
async function sendComment(){
  const id=cbarId;const t=$("#cbar-text").value.trim().slice(0,300);hideCbar();
  if(!id||!t)return;
  const v=myVote(getPost(id));if(v)v.why=t;render();
  const {error}=await sb.from("votes").update({comment:t}).match({post_id:id,voter:S.me});
  if(error)fail(error,"Your comment didn't save.");else{toast("Comment added");loadAll()}
}
$("#cbar-send").addEventListener("click",sendComment);
$("#cbar-text").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();sendComment()}});
$("#cbar-close").addEventListener("click",hideCbar);
$("#cbar-undo").addEventListener("click",async()=>{
  const id=cbarId;hideCbar();if(!id)return;
  S.votes.set(id,(S.votes.get(id)||[]).filter(v=>v.voter!==S.me));S.counts.set(id,Math.max(0,(S.counts.get(id)||1)-1));render();
  const {error}=await sb.from("votes").delete().match({post_id:id,voter:S.me});if(error)fail(error);else{toast("Vote undone");loadAll()}
});

/* ---------- survey ---------- */
function openSurvey(){
  const a=S.surveyAns={...(S.survey||{})};
  $("#survey-qs").innerHTML=SURVEY.map(q=>`<div class="q"><div class="qt">${esc(q.q)}${q.text?' <span class="opt">(optional)</span>':""}</div>${q.hint?`<span class="hint">${esc(q.hint)}</span>`:""}
    ${q.text?`<textarea id="sv-${q.k}" maxlength="400" placeholder="Type anything">${esc(a[q.k]||"")}</textarea>`:`<div class="seg" data-q="${q.k}">${q.o.map(o=>`<button type="button" data-o="${esc(o)}" aria-pressed="${a[q.k]===o}">${esc(o)}</button>`).join("")}</div>`}</div>`).join("");
  $("#survey-back").hidden=false;
}
$("#survey-qs").addEventListener("click",e=>{const b=e.target.closest(".seg button");if(!b)return;const k=b.parentElement.dataset.q;S.surveyAns[k]=b.dataset.o;
  b.parentElement.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b))});
$("#survey-cancel").addEventListener("click",()=>$("#survey-back").hidden=true);
$("#survey-back").addEventListener("click",e=>{if(e.target.id==="survey-back")$("#survey-back").hidden=true});
$("#survey-form").addEventListener("submit",async e=>{
  e.preventDefault();const a=S.surveyAns||{};
  if(SURVEY.some(q=>!q.text&&!a[q.k])){toast("Answer the first five questions first");return}
  if(!await ensureUser())return;
  const answers={};for(const q of SURVEY)if(!q.text)answers[q.k]=a[q.k];
  answers.note=($("#sv-note")?.value||"").trim().slice(0,400);
  const btn=$("#survey-submit");btn.disabled=true;
  const {error}=await sb.from("survey_responses").upsert({user_id:S.me,answers,updated_at:new Date().toISOString()});
  btn.disabled=false;
  if(error){fail(error,"Couldn't save your answers. Try again.");return}
  S.survey=answers;$("#survey-back").hidden=true;render();toast("Thanks! Your answers were saved.");
});

/* ---------- photo picker ---------- */
let previewURL=null;
function setPhoto(file){
  if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}
  S.photo=file||null;
  const pk=$("#picker");pk.querySelector("img")?.remove();
  if(file){previewURL=URL.createObjectURL(file);const im=document.createElement("img");im.src=previewURL;im.alt="";pk.appendChild(im)}
  $("#photo-actions").hidden=!file;
}
$("#f-photo").addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  if(!/^image\//.test(f.type)){toast("Pick an image file");e.target.value="";return}
  setPhoto(f);
});
$("#photo-remove").addEventListener("click",()=>{$("#f-photo").value="";setPhoto(null)});
async function shrink(file){
  try{
    const bmp=await createImageBitmap(file);
    const k=Math.min(1,1280/Math.max(bmp.width,bmp.height));
    const c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const out=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));
    if(out&&out.size)return out;
  }catch(e){}
  return /^image\/(png|jpeg|webp|gif)$/.test(file.type)?file:null;
}

/* ---------- new post sheet ---------- */
$("#f-cur").innerHTML=CURRENCIES.map(c=>`<option>${c}</option>`).join("");
try{const c=localStorage.getItem("hu-cur");if(c)$("#f-cur").value=c}catch(e){}
function renderScope(){
  const opts=[["public","Everyone"],...myGroups().map(g=>[g,S.circles.get(g).name])];
  if(!opts.find(o=>o[0]===S.scope))S.scope="public";
  $("#f-scope").innerHTML=opts.map(([v,l])=>`<button type="button" data-v="${esc(v)}" aria-pressed="${v===S.scope}">${esc(l)}</button>`).join("")+
    (opts.length===1?`<span class="hint" style="align-self:center">Make a circle to keep it private</span>`:"");
}
$("#f-scope").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;S.scope=b.dataset.v;renderScope()});
function openSheet(){
  S.scope=S.tab==="groups"&&S.activeGroup?S.activeGroup:"public";renderScope();
  $("#photo-field").hidden=!sb;
  $("#sheet").hidden=false;setTimeout(()=>$("#f-item").focus(),50);
}
$("#fab").addEventListener("click",openSheet);
$("#f-cancel").addEventListener("click",()=>$("#sheet").hidden=true);
$("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet")$("#sheet").hidden=true});
let posting=false;
$("#req-form").addEventListener("submit",async e=>{
  e.preventDefault();if(posting)return;
  const price=parseFloat($("#f-price").value);if(!(price>=0))return;
  const row={item:$("#f-item").value.trim().slice(0,80),price,currency:$("#f-cur").value,reason:$("#f-reason").value.trim().slice(0,400),
    alt:$("#f-alt").value.trim().slice(0,300),link:cleanLink($("#f-link").value),circle_id:S.scope==="public"?null:S.scope};
  if(!row.item||!row.reason)return;
  const btn=$("#f-submit");posting=true;btn.disabled=true;btn.textContent="Posting…";
  const done=()=>{posting=false;btn.disabled=false;btn.textContent="Post it"};
  if(!await ensureUser()){done();return}
  row.author=S.me;
  if(S.photo){
    btn.textContent="Uploading photo…";
    const blob=await shrink(S.photo);
    if(!blob){done();toast("That photo type won't work. Try a JPG or PNG.");return}
    const path=`${S.me}/${uuid()}.jpg`;
    const up=await sb.storage.from("photos").upload(path,blob,{contentType:blob.type||"image/jpeg",upsert:false});
    if(up.error){done();toast(/size|large/i.test(up.error.message)?"That photo is too big. Try a smaller one.":"Photo didn't upload. Try again or remove it.");return}
    row.photo_path=path;
  }
  const {error}=await sb.from("posts").insert(row);
  done();
  if(error){fail(error,"Couldn't post that. Try again.");return}
  try{localStorage.setItem("hu-cur",row.currency)}catch(e){}
  e.target.reset();$("#f-cur").value=row.currency;setPhoto(null);$("#sheet").hidden=true;
  S.tab=row.circle_id?"groups":"square";if(row.circle_id)S.activeGroup=row.circle_id;
  if(!row.circle_id)S.feedMode="list";
  await loadAll();window.scrollTo({top:0});toast("Posted. Now step away from the cart.");
});

/* ---------- boot ---------- */
render();
(async()=>{
  if(!sb){S.ready=true;render();return}
  const {data}=await sb.auth.getSession();
  if(data.session?.user)await onSignedIn(data.session.user);
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==="SIGNED_IN"&&session?.user&&session.user.id!==S.me){onSignedIn(session.user).then(loadAll)}
    if(ev==="USER_UPDATED"&&session?.user)S.user=session.user;
  });
  await loadAll();
  setInterval(()=>{if(document.visibilityState==="visible"&&!drag&&!flying)loadAll()},20000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadAll()});
})();
