/**
 * js/app.js
 * Pubflix prototype — client side single-file logic
 * - localStorage persistence
 * - catalog rendering + player + timer + validation
 * - user login (pseudo) stored locally
 * - admin CRUD (localStorage)
 * - dashboard stats & history
 * - toast notifications
 */

/* ======= Storage keys & helpers ======= */
const KEYS = {
  ADS: 'pubflix_ads_v2',
  USER: 'pubflix_user_v2',
  LOGS: 'pubflix_logs_v2'
};

function readJSON(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k)) || fallback; }
  catch(e){ return fallback; }
}
function writeJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

/* Default sample ads (only loaded once) */
(function initSamples(){
  if(!localStorage.getItem(KEYS.ADS)){
    const samples = [
      {id:1, title:"Adidas — Run Fast", thumb:"https://i.imgur.com/3ZQ3Z1R.jpg", link:"https://www.youtube.com/embed/ysz5S6PUM-U", dur:22, gain:6, active:true, created:Date.now()},
      {id:2, title:"Tesla — Model Demo", thumb:"https://i.imgur.com/4AIqQpJ.jpg", link:"https://www.youtube.com/embed/tgbNymZ7vqY", dur:28, gain:9, active:true, created:Date.now()},
      {id:3, title:"Eco Drink — Nouveau goût", thumb:"https://i.imgur.com/7b7QF1x.jpg", link:"https://www.youtube.com/embed/aqz-KE-bpKQ", dur:18, gain:4, active:true, created:Date.now()}
    ];
    writeJSON(KEYS.ADS, samples);
  }
  if(!localStorage.getItem(KEYS.USER)){
    writeJSON(KEYS.USER, { name: null, points: 0, seen: [], totalTime: 0 });
  }
  if(!localStorage.getItem(KEYS.LOGS)){
    writeJSON(KEYS.LOGS, []);
  }
})();

/* ======= Utility functions ======= */
function toast(msg, t=3000){
  const toasts = document.getElementById('toasts'); if(!toasts) return;
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg;
  toasts.appendChild(el);
  setTimeout(()=>{ el.style.opacity=0; setTimeout(()=>el.remove(),250); }, t);
}
function uid(){ return Math.floor(Math.random()*1e9); }
function formatTime(s){ const mm = Math.floor(s/60).toString().padStart(2,'0'); const ss = (s%60).toString().padStart(2,'0'); return `${mm}:${ss}`; }
function pushLog(entry){
  const logs = readJSON(KEYS.LOGS, []); logs.unshift({ ts: new Date().toISOString(), ...entry }); writeJSON(KEYS.LOGS, logs);
}

/* ======= User management ======= */
function getUser(){ return readJSON(KEYS.USER, { name:null, points:0, seen:[], totalTime:0 }); }
function saveUser(u){ writeJSON(KEYS.USER, u); renderUserMini(); }
function ensureLoginFlow(){
  const u = getUser();
  if(!u.name){
    // try quick prompt (for demo)
    const name = prompt("Entrez votre pseudo pour la démo :") || ("User"+Math.floor(Math.random()*1000));
    u.name = name; saveUser(u); toast("Bienvenue, " + name);
  }
  renderUserMini();
}

/* Render user mini (header) */
function renderUserMini(){
  const u = getUser();
  const mini = document.getElementById('userMini');
  const miniName = document.getElementById('miniName');
  const miniPoints = document.getElementById('miniPoints');
  if(u && u.name){
    if(mini) mini.classList.remove('hidden');
    if(miniName) miniName.textContent = u.name;
    if(miniPoints) miniPoints.textContent = (u.points||0) + ' pts';
    document.querySelectorAll('#userNameDisplay, #userName').forEach(el => { if(el) el.textContent = u.name; });
    document.querySelectorAll('#userPointsDisplay, #userPoints, #dashPoints').forEach(el => { if(el) el.textContent = (u.points||0) + ' pts'; });
  } else {
    if(mini) mini.classList.add('hidden');
  }
}

/* ======= Catalog rendering & filtering ======= */
function getAds(){ return readJSON(KEYS.ADS, []); }
function saveAds(arr){ writeJSON(KEYS.ADS, arr); }

function renderCatalog(filterText='', filterType='all'){
  const container = document.getElementById('grid') || document.getElementById('catalogueGrid');
  if(!container) return;
  container.innerHTML = '';
  let ads = getAds().filter(a => a.active);
  if(filterText) ads = ads.filter(a => a.title.toLowerCase().includes(filterText.toLowerCase()));
  if(filterType === 'short') ads = ads.filter(a => a.dur <= 20);
  if(filterType === 'popular') ads = ads.slice().sort((a,b)=>b.gain - a.gain);
  ads.forEach(ad => {
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <img class="thumb" src="${ad.thumb}" alt="${ad.title}" loading="lazy" />
      <div class="info">
        <div class="title">${ad.title}</div>
        <div class="meta"><div>${ad.dur}s • ${ad.gain} pts</div><div><button class="btn primary viewBtn" data-id="${ad.id}">Regarder</button></div></div>
      </div>`;
    container.appendChild(card);
  });
  // attach listeners
  container.querySelectorAll('.viewBtn').forEach(btn=>{
    btn.addEventListener('click', e => {
      openPlayer(Number(btn.dataset.id));
    });
  });
}

/* ======= Player logic (modal, timer, validate) ======= */
let currentAd = null;
let countdown = null;

function openPlayer(adId){
  const ad = getAds().find(a => a.id === adId);
  if(!ad) return;
  currentAd = ad;
  // set texts
  const titleEl = document.getElementById('playerTitle');
  const metaEl = document.getElementById('playerMeta');
  const frameContainer = document.getElementById('playerFrame');
  const modal = document.getElementById('playerModal');
  const validateBtn = document.getElementById('validateBtn');
  const countdownEl = document.getElementById('countdown');

  if(titleEl) titleEl.textContent = ad.title;
  if(metaEl) metaEl.textContent = `${ad.dur}s • ${ad.gain} pts`;
  if(frameContainer){
    frameContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = ad.link + '?rel=0&modestbranding=1';
    iframe.width = '100%';
    iframe.height = '520';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.loading = 'lazy';
    iframe.style.border = '0';
    frameContainer.appendChild(iframe);
  }
  if(modal) modal.classList.remove('hidden');
  if(validateBtn) validateBtn.disabled = true;
  if(countdownEl) countdownEl.textContent = formatTime(ad.dur);

  // start timer
  clearInterval(countdown);
  let remaining = ad.dur;
  countdown = setInterval(()=>{
    remaining--;
    if(countdownEl) countdownEl.textContent = formatTime(Math.max(0, remaining));
    if(remaining <= 0){
      clearInterval(countdown);
      if(validateBtn) validateBtn.disabled = false;
      if(countdownEl) countdownEl.textContent = "Vous pouvez valider";
    }
  }, 1000);

  pushLog({event:'view_start', adId: ad.id, title: ad.title});
}

/* Close player */
function closePlayer(){
  const modal = document.getElementById('playerModal');
  const frameContainer = document.getElementById('playerFrame');
  if(modal) modal.classList.add('hidden');
  if(frameContainer) frameContainer.innerHTML = '';
  clearInterval(countdown);
  currentAd = null;
}

/* Validate completed view & credit user */
function validateView(){
  if(!currentAd) return;
  const u = getUser();
  u.points = (u.points||0) + (currentAd.gain||0);
  u.totalTime = (u.totalTime||0) + (currentAd.dur||0);
  u.seen = u.seen || [];
  u.seen.push({ id: currentAd.id, title: currentAd.title, gain: currentAd.gain, dur: currentAd.dur, ts: new Date().toISOString() });
  saveUser(u);
  pushLog({event:'view_complete', adId: currentAd.id, title: currentAd.title, gain: currentAd.gain});
  toast(`+${currentAd.gain} pts ajoutés à votre compte`);
  renderUserMini();
  closePlayer();
}

/* ======= Dashboard rendering ======= */
function renderDashboard(){
  const u = getUser();
  const pointsEl = document.getElementById('dashPoints') || document.getElementById('dashPoints');
  const viewsEl = document.getElementById('dashViews');
  const timeEl = document.getElementById('dashTime');
  const tbody = document.querySelector('#historyTable tbody');
  if(pointsEl) pointsEl.textContent = u.points || 0;
  if(viewsEl) viewsEl.textContent = (u.seen||[]).length;
  if(timeEl) timeEl.textContent = (u.totalTime || 0) + "s";
  if(tbody){
    tbody.innerHTML = '';
    (u.seen||[]).slice().reverse().forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${new Date(s.ts).toLocaleString()}</td><td>${s.title}</td><td>+${s.gain}</td><td>${s.dur}s</td>`;
      tbody.appendChild(tr);
    });
  }
}

/* ======= Admin controllers ======= */
function renderAdminCatalog(){
  const container = document.getElementById('adminGrid') || document.getElementById('adminGrid');
  if(!container) return;
  container.innerHTML = '';
  getAds().forEach(ad => {
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<img class="thumb" src="${ad.thumb}" alt="${ad.title}" /><div class="info"><div class="title">${ad.title}</div><div class="meta"><div>${ad.dur}s • ${ad.gain} pts</div><div><button class="btn ghost small edit" data-id="${ad.id}">Modifier</button><button class="btn ghost small del" data-id="${ad.id}">Suppr</button></div></div></div>`;
    container.appendChild(card);
  });
  // attach listeners
  container.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = Number(btn.dataset.id);
      const ads = getAds().filter(a=>a.id!==id);
      saveAds(ads);
      renderAdminCatalog();
      toast('Suppression effectuée');
      pushLog({event:'admin_delete', id});
    });
  });
  container.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = Number(btn.dataset.id);
      const ad = getAds().find(a=>a.id===id);
      if(!ad) return;
      // simple edit prompts (for demo)
      const t = prompt('Titre', ad.title);
      if(t!==null) ad.title = t;
      const th = prompt('Miniature URL', ad.thumb);
      if(th!==null) ad.thumb = th;
      const l = prompt('Embed URL', ad.link);
      if(l!==null) ad.link = l;
      saveAds(getAds().map(a=>a.id===id?ad:a));
      renderAdminCatalog();
      toast('Modifications enregistrées');
      pushLog({event:'admin_edit', id});
    });
  });
}

/* ======= Wiring (bindings) ======= */
document.addEventListener('DOMContentLoaded', ()=>{
  renderUserMini();
  // Index page bindings
  if(document.getElementById('grid')){
    renderCatalog();
    // search & filter
    const search = document.getElementById('searchBox');
    const filter = document.getElementById('filterSelect');
    if(search) search.addEventListener('input', ()=> renderCatalog(search.value, filter ? filter.value : 'all'));
    if(filter) filter.addEventListener('change', ()=> renderCatalog(search ? search.value : '', filter.value));
    // login button
    document.getElementById('btnOpenLogin')?.addEventListener('click', ()=> {
      document.getElementById('loginModal')?.classList.remove('hidden');
    });
    document.getElementById('loginConfirm')?.addEventListener('click', ()=> {
      const val = document.getElementById('loginInput')?.value?.trim();
      if(val){ const u = getUser(); u.name = val; saveUser(u); document.getElementById('loginModal')?.classList.add('hidden'); toast('Connecté : ' + val); }
    });
    document.getElementById('loginCancel')?.addEventListener('click', ()=> document.getElementById('loginModal')?.classList.add('hidden'));
    document.getElementById('btnStart')?.addEventListener('click', ()=> { ensureLoginFlow(); window.scrollTo({top:document.getElementById('grid').offsetTop - 80, behavior:'smooth'}); });
  }

  // Player bindings
  document.getElementById('closePlayer')?.addEventListener('click', closePlayer);
  document.getElementById('validateBtn')?.addEventListener('click', validateView);

  // Admin page bindings
  if(document.getElementById('adForm')){
    renderAdminCatalog();
    const form = document.getElementById('adForm');
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const title = document.getElementById('adTitle').value.trim();
      const thumb = document.getElementById('adThumb').value.trim() || 'https://i.imgur.com/3ZQ3Z1R.jpg';
      const link = document.getElementById('adLink').value.trim();
      const dur = Number(document.getElementById('adDur').value) || 30;
      const gain = Number(document.getElementById('adGain').value) || 5;
      if(!title || !link) { alert('Titre et lien obligatoires'); return; }
      const ads = getAds();
      const id = Math.max(0, ...ads.map(a=>a.id)) + 1;
      ads.push({ id, title, thumb, link, dur, gain, active:true, created: Date.now() });
      saveAds(ads);
      form.reset();
      renderAdminCatalog();
      toast('Publicité ajoutée');
      pushLog({event:'admin_add', title});
    });

    document.getElementById('loadSamples')?.addEventListener('click', ()=>{
      localStorage.removeItem(KEYS.ADS);
      location.reload();
    });
    document.getElementById('resetDemo')?.addEventListener('click', ()=>{
      if(confirm('Reset demo : supprimer toutes les données locales ?')){
        localStorage.removeItem(KEYS.ADS);
        localStorage.removeItem(KEYS.USER);
        localStorage.removeItem(KEYS.LOGS);
        location.reload();
      }
    });
  }

  // Dashboard bindings
  if(document.getElementById('historyTable')){
    renderDashboard();
  }

  // Close login on escape
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden')); } });

});
