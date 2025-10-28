// --- Stockage local ---
const readAds = () => JSON.parse(localStorage.getItem('pubflix_ads') || '[]');
const saveAds = ads => localStorage.setItem('pubflix_ads', JSON.stringify(ads));
const readUser = () => JSON.parse(localStorage.getItem('pubflix_user') || '{"name":null,"points":0,"seen":[]}');
const saveUser = u => localStorage.setItem('pubflix_user', JSON.stringify(u));

// --- Données d'exemple ---
if (!localStorage.getItem('pubflix_ads')) {
  saveAds([
    {id:1,title:'Adidas – Running',thumb:'https://i.imgur.com/3ZQ3Z1R.jpg',link:'https://www.youtube.com/embed/ysz5S6PUM-U',dur:20,gain:5},
    {id:2,title:'Tesla – Model 3',thumb:'https://i.imgur.com/4AIqQpJ.jpg',link:'https://www.youtube.com/embed/tgbNymZ7vqY',dur:25,gain:8}
  ]);
}

// --- Affichage du catalogue ---
if (document.getElementById('catalogue')) {
  const ads = readAds();
  const grid = document.getElementById('catalogue');
  const user = readUser();

  // login
  if (!user.name) {
    const pseudo = prompt("Entrez votre pseudo :");
    user.name = pseudo || "Invité";
    saveUser(user);
  }
  document.getElementById('userName').innerText = user.name;
  document.getElementById('userPoints').innerText = user.points + " pts";

  ads.forEach(ad => {
    const card = document.createElement('div');
    card.className = 'ad';
    card.innerHTML = `<img src="${ad.thumb}"><div class='ad-info'><strong>${ad.title}</strong><br>${ad.gain} pts</div>`;
    card.onclick = () => openAd(ad);
    grid.appendChild(card);
  });

  // lecteur
  const overlay = document.getElementById('playerOverlay');
  const frame = document.getElementById('adFrame');
  const timerLabel = document.getElementById('timer');
  const finishBtn = document.getElementById('finishBtn');
  const closeBtn = document.getElementById('closeBtn');
  let countdown;

  window.openAd = ad => {
    overlay.classList.remove('hidden');
    document.getElementById('adTitle').innerText = ad.title;
    frame.src = ad.link;
    let time = ad.dur;
    timerLabel.textContent = `${time}s`;
    finishBtn.disabled = true;
    countdown = setInterval(() => {
      time--;
      timerLabel.textContent = `${time}s`;
      if (time <= 0) {
        clearInterval(countdown);
        finishBtn.disabled = false;
        timerLabel.textContent = "Vous pouvez valider";
      }
    }, 1000);

    finishBtn.onclick = () => {
      clearInterval(countdown);
      overlay.classList.add('hidden');
      frame.src = "";
      user.points += ad.gain;
      user.seen.push(ad.title);
      saveUser(user);
      alert(`+${ad.gain} points gagnés !`);
      location.reload();
    };
    closeBtn.onclick = () => {
      clearInterval(countdown);
      overlay.classList.add('hidden');
      frame.src = "";
    };
  };
}

// --- Tableau de bord ---
if (document.getElementById('pointsTotal')) {
  const u = readUser();
  document.getElementById('pointsTotal').innerText = u.points + " pts";
  const ul = document.getElementById('adsSeen');
  u.seen.forEach(a => {
    const li = document.createElement('li');
    li.textContent = a;
    ul.appendChild(li);
  });
}

// --- Admin ---
if (document.getElementById('addAdBtn')) {
  const list = document.getElementById('adsList');
  const ads = readAds();
  const render = () => {
    list.innerHTML = '';
    ads.forEach(a => {
      const div = document.createElement('div');
      div.className = 'ad';
      div.innerHTML = `<img src="${a.thumb}"><div class='ad-info'>${a.title}<br>${a.gain} pts</div>`;
      list.appendChild(div);
    });
  };
  render();

  document.getElementById('addAdBtn').onclick = () => {
    const title = adTitleInput.value;
    const thumb = adThumbInput.value;
    const link = adLinkInput.value;
    const dur = +adDurationInput.value;
    const gain = +adGainInput.value;
    ads.push({id:Date.now(),title,thumb,link,dur,gain});
    saveAds(ads);
    alert('Publicité ajoutée !');
    render();
  };
}
