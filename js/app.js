/* Pubflix - app.js
   Single JS file used by index.html, dashboard.html and admin.html.
   - clean, modular functions
   - localStorage persistence for demo
   - simple admin flow, sample ads, player timer, validations
*/

/* ======= Storage helpers ======= */
const STORAGE_KEYS = { ADS: 'pf_ads_v1', USER: 'pf_user_v1', LOGS: 'pf_logs_v1' };

function readAds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADS)) || []; }
  catch(e){ return []; }
}
function saveAds(list) { localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(list)); }

function readUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || { name: null, points: 0, seen: [] }; }
  catch(e){ return { name: null, points: 0, seen: [] }; }
}
function saveUser(u){ localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u)); }

function pushLog(entry){
  const l = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
  l.unshift({ time: new Date().toISOString(), ...entry });
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(l));
}

/* ======= Bootstrap sample data (only once) ======= */
(function bootstrap(){
  if(!localStorage.getItem(STORAGE_KEYS.ADS)){
    const samples = [
      { id: 1, title: "Adidas — Run Fast", thumb: "https://i.imgur.com/3ZQ3Z1R.jpg", link: "https://www.youtube.com/embed/ysz5S6PUM-U", dur: 22, gain: 6, active: true },
      { id: 2, title: "Tesla — Model Demo", thumb: "https://i.imgur.com/4AIqQpJ.jpg", link: "https://www.youtube.com/embed/tgbNymZ7vqY", dur: 28, gain: 9, active: true },
      { id: 3, title: "Eco Drink — Nouveau goût", thumb: "https://i.imgur.com/7b7QF1x.jpg", link: "https://www.youtube.com/embed/aqz-KE-bpKQ", dur: 18, gain: 4, active: true }
    ];
    saveAds(samples);
  }
})();

/* ======= UI utilities ======= */
function toast(message, ms=3500){
  const toasts = document.getElementById('toasts');
  if(!toasts) return;
  const el = document.createElement('div'); el.className='toast'; el.textContent = message;
  toasts.appendChild(el);
  setTimeout(()=>{ el.style.opacity = 0; setTimeout(()=>el.remove(),300); }, ms);
}

function formatTime(s){
  const mm = Math.floor(s/60).toString().padStart(2,'0');
  const ss = (s%60).toString().padStart(2,'0');
  return `${mm}:${ss}`;
}

/* ======= Common rendering functions ======= */
function renderUserSummaries(){
  const u = readUser();
  const name = u.name || 'Invité';
  const points = u.points || 0;
  document.querySelectorAll('#userNameDisplay, #userName').forEach(el=>{ if(el) el.textContent = name; });
  document.querySelectorAll('#userPointsDisplay, #userPoints').forEach(el=>{ if(el) el.textContent = points + ' pts'; });
  document.querySelectorAll('#userSummary, #userSummaryDash, #userSummaryAdmin').forEach(el=>{ if(el) {
    el.innerHTML = `<span>${name}</span> <span class="points">${points} pts</span>`;
  }});
}

/* ======= Index page: catalog rendering & player ======= */
(function indexController(){
  if(!document.getElementById('catalogGrid') && !document.getElementById('catalogue')) return;

  // elements
  const grid = document.getElementById('catalogGrid') || document.getElementById('catalogue');
  const playerModal = document.getElementById('playerModal') || document.getElementById('playerModal');
  const playerTitle = document.getElementById('playerTitle');
  const playerMeta = document.getElementById('playerMeta');
  const playerContainer = document.getElementById('playerContainer') || document.getElementById('playerContainer');
  const btnClose = document.getElementById('btnClosePlayer');
  const btnValidate = document.getElementById('btnValidate');
  const timerEl = document.getElementById('playerTimer') || document.getElementById('playerTimer');
  const loginModal = document.getElementById('loginModal');
  const btnOpenLogin = document.getElementById('btnOpenLogin') || document.getElementById('btnCTA');
  const btnCTA = document.getElementById('btnCTA');

  // small helper: open login modal
  function openLogin(){
    if(!loginModal) {
      const name = prompt('Ton pseudo pour la démo :') || 'Invité';
      const u = readUser(); u.name = name; saveUser(u); renderUserSummaries();
      toast('Bienvenue, ' + name);
      return;
    }
    loginModal.classList.remove('hidden');
  }

  // attach login buttons
  if(btnOpenLogin) btnOpenLogin.addEventListener('click', openLogin);
  if(btnCTA) btnCTA.addEventListener('click', openLogin);

  // login modal actions
  if(document.getElementById('btnLoginConfirm')){
    document.getElementById('btnLoginConfirm').addEventListener('click', ()=>{
      const name = document.getElementById('loginName').value.trim() || 'Invité';
      const u = readUser(); u.name = name; saveUser(u);
      loginModal.classList.add('hidden');
      renderUserSummaries();
      toast('Connecté : ' + name, 2500);
    });
    document.getElementById('btnLoginCancel').addEventListener('click', ()=> loginModal.classList.add('hidden'));
  }

  // render grid
  function renderGrid(filter=''){
    const ads = readAds().filter(a => a.active && a.title.toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = '';
    ads.forEach(ad => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <img class="thumb" src="${ad.thumb}" alt="${ad.title}">
        <div class="info">
          <div class="title">${ad.title}</div>
          <div class="meta"><div>${ad.dur}s • ${ad.gain} pts</div><div><button class="btn primary viewBtn" data-id="${ad.id}">Regarder</button></div></div>
        </div>`;
      grid.appendChild(card);
    });

    // add listeners
    grid.querySelectorAll('.viewBtn').forEach(btn=>{
      btn.addEventListener('click', e => openPlayer(Number(btn.dataset.id)));
    });
  }

  // search input
  const search = document.getElementById('searchInput');
  if(search){
    search.addEventListener('input', ()=> renderGrid(search.value));
  }

  // open player logic
  let currentAd = null;
  let timer = null;
  function openPlayer(id){
    const ad = readAds().find(x=>x.id===id);
    if(!ad) return;
    currentAd = ad;
    // set UI
    playerTitle.textContent = ad.title;
    if(playerMeta) playerMeta.textContent = `${ad.dur}s • ${ad.gain} pts`;
    // inject iframe safely
    const container = document.getElementById('playerContainer') || document.getElementById('playerFrame') || document.getElementById('playerContainer');
    // Clear previous
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = ad.link + '?rel=0&modestbranding=1&playsinline=1';
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.style.minHeight = '420px';
    container.appendChild(iframe);

    // show modal
    const modal = document.getElementById('playerModal') || document.getElementById('playerModal');
    if(modal) modal.classList.remove('hidden');

    // start countdown
    let remaining = ad.dur;
    timerEl.textContent = formatTime(remaining);
    btnValidate.disabled = true;
    clearInterval(timer);
    timer = setInterval(()=>{
      remaining--;
      timerEl.textContent = formatTime(remaining);
      if(remaining <= 0){
        clearInterval(timer);
        btnValidate.disabled = false;
        timerEl.textContent = "Vous pouvez valider";
      }
    },1000);

    pushLog({event:'view_start', ad: ad.title, adId: ad.id});
  }

  // close player
  if(btnClose) btnClose.addEventListener('click', ()=> {
    const modal = document.getElementById('playerModal') || document.getElementById('playerModal');
    if(modal) modal.classList.add('hidden');
    const container = document.getElementById('playerContainer');
    if(container) container.innerHTML = '';
    clearInterval(timer);
  });

  // validate (credit user)
  if(btnValidate){
    btnValidate.addEventListener('click', ()=>{
      if(!currentAd) return;
      const u = readUser();
      u.points = (u.points||0) + (currentAd.gain||0);
      u.seen = u.seen || [];
      u.seen.push({ id: currentAd.id, title: currentAd.title, time: new Date().toISOString(), gain: currentAd.gain });
      saveUser(u);
      pushLog({event:'view_complete', ad: currentAd.title, gain: currentAd.gain});
      toast(`+${currentAd.gain} pts — ajouté à votre compte`);
      renderUserSummaries();
      // close modal
      const modal = document.getElementById('playerModal') || document.getElementById('playerModal');
      if(modal) modal.classList.add('hidden');
      const container = document.getElementById('playerContainer');
      if(container) container.innerHTML = '';
    });
  }

  // init render
  renderGrid();
  renderUserSummaries();

})();
 
/* ======= Dashboard page controller ======= */
(function dashboardController(){
  if(!document.getElementById('statPoints') && !document.getElementById('historyTable')) return;
  const user = readUser();
  document.getElementById('statPoints').textContent = (user.points||0);
  const views = (user.seen||[]);
  document.getElementById('statViews').textContent = views.length;
  const list = document.getElementById('listSeen');
  const tbody = document.querySelector('#historyTable tbody');
  if(list){
    list.innerHTML = '';
    views.slice().reverse().forEach(v => {
      const li = document.createElement('li'); li.textContent = `${v.title} — +${v.gain} pts — ${new Date(v.time).toLocaleString()}`; list.appendChild(li);
    });
  }
  if(tbody){
    tbody.innerHTML = '';
    views.slice().reverse().forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${new Date(v.time).toLocaleString()}</td><td>${v.title}</td><td>${v.duration || '-'}</td><td>+${v.gain}</td><td>Oui</td>`;
      tbody.appendChild(tr);
    });
  }
  renderUserSummaries();
})();

/* ======= Admin page controller ======= */
(function adminController(){
  if(!document.getElementById('formAddAd')) return;
  const form = document.getElementById('formAddAd');
  const catalog = document.getElementById('adminCatalog');

  function renderAdminCatalog(){
    const ads = readAds();
    catalog.innerHTML = '';
    ads.forEach(a=>{
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<img class="thumb" src="${a.thumb}"><div class="info"><div class="title">${a.title}</div><div class="meta">${a.dur}s • ${a.gain} pts • <button class="btn ghost small edit" data-id="${a.id}">Modifier</button> <button class="btn ghost small remove" data-id="${a.id}">Suppr</button></div></div>`;
      catalog.appendChild(card);
    });
    // listeners
    catalog.querySelectorAll('.remove').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = Number(btn.dataset.id);
        const remaining = readAds().filter(x=>x.id!==id);
        saveAds(remaining);
        renderAdminCatalog();
        toast('Publicité supprimée');
      });
    });
    catalog.querySelectorAll('.edit').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = Number(btn.dataset.id);
        const ad = readAds().find(x=>x.id===id);
        if(!ad) return;
        // simple prompt edit (light)
        const t = prompt('Titre', ad.title);
        if(t!==null){ ad.title = t; saveAds(readAds().map(x=> x.id===id ? ad : x)); renderAdminCatalog(); toast('Modifié'); }
      });
    });
  }

  // add sample loader
  document.getElementById('btnLoadSamples').addEventListener('click', ()=>{
    localStorage.removeItem(STORAGE_KEYS.ADS);
    location.reload();
  });

  document.getElementById('btnReset').addEventListener('click', ()=>{
    if(confirm('Reset demo ? Cela supprimera données locales.')) {
      localStorage.removeItem(STORAGE_KEYS.ADS);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.LOGS);
      location.reload();
    }
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const title = document.getElementById('adminTitle').value.trim();
    const thumb = document.getElementById('adminThumb').value.trim() || 'https://i.imgur.com/3ZQ3Z1R.jpg';
    const link = document.getElementById('adminLink').value.trim();
    const dur = Number(document.getElementById('adminDur').value) || 30;
    const gain = Number(document.getElementById('adminGain').value) || 5;
    if(!title || !link){ alert('Titre et lien requis'); return; }
    const ads = readAds();
    const id = Math.max(0,...ads.map(a=>a.id)) + 1;
    ads.push({ id, title, thumb, link, dur, gain, active: true });
    saveAds(ads);
    form.reset();
    renderAdminCatalog();
    toast('Nouvelle publicité ajoutée');
  });

  renderAdminCatalog();
  renderUserSummaries();
})();
