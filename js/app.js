// --- Données initiales ---
const ads = [
  { title: "Dior Sauvage", image: "ad1.jpg", video: "https://www.youtube.com/embed/lbWv8Q99z9M", points: 10, category: "luxe" },
  { title: "Apple Vision Pro", image: "ad2.jpg", video: "https://www.youtube.com/embed/TX9qSaGXFyg", points: 12, category: "tech" },
  { title: "Louis Vuitton FW25", image: "ad3.jpg", video: "https://www.youtube.com/embed/6m3_7jU1o4k", points: 15, category: "mode" },
];

let totalPoints = 0;
let totalTime = 0;
let currentVideo = null;
let countdownInterval;

// --- Elements ---
const adsGrid = document.getElementById("adsGrid");
const videoModal = document.getElementById("videoModal");
const videoFrame = document.getElementById("videoFrame");
const validateBtn = document.getElementById("validateBtn");
const countdownTimer = document.getElementById("countdownTimer");
const closeModal = document.getElementById("closeModal");
const pointsEl = document.getElementById("points");
const totalPointsEl = document.getElementById("totalPoints");
const totalTimeEl = document.getElementById("totalTime");
const historyList = document.getElementById("historyList");
const toasts = document.getElementById("toasts");

// --- Fonctions utilitaires ---
function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  toasts.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function renderAds(filter = "all") {
  adsGrid.innerHTML = "";
  ads.filter(ad => filter === "all" || ad.category === filter).forEach(ad => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${ad.image}" alt="${ad.title}" class="thumb">
      <div class="info">
        <div class="title">${ad.title}</div>
        <div class="meta">
          <span>${ad.points} pts</span>
          <button class="viewBtn">▶️ Voir</button>
        </div>
      </div>
    `;
    card.querySelector(".viewBtn").onclick = () => openVideo(ad);
    adsGrid.appendChild(card);
  });
}

function openVideo(ad) {
  currentVideo = ad;
  videoFrame.src = ad.video + "?autoplay=1";
  document.getElementById("videoTitle").textContent = ad.title;
  videoModal.classList.remove("hidden");
  validateBtn.disabled = true;
  let timeLeft = 15;
  countdownTimer.textContent = timeLeft;
  countdownInterval = setInterval(() => {
    timeLeft--;
    countdownTimer.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      validateBtn.disabled = false;
    }
  }, 1000);
}

closeModal.onclick = () => {
  videoModal.classList.add("hidden");
  videoFrame.src = "";
  clearInterval(countdownInterval);
};

validateBtn.onclick = () => {
  totalPoints += currentVideo.points;
  totalTime += 0.25;
  pointsEl.textContent = totalPoints;
  totalPointsEl.textContent = totalPoints;
  totalTimeEl.textContent = `${totalTime.toFixed(2)} min`;
  showToast(`+${currentVideo.points} pts gagnés`);
  const li = document.createElement("li");
  li.textContent = currentVideo.title;
  historyList.prepend(li);
  videoModal.classList.add("hidden");
  videoFrame.src = "";
};

// --- Filtrage / Recherche ---
document.getElementById("filterSelect").onchange = e => renderAds(e.target.value);
document.getElementById("searchBar").oninput = e => {
  const query = e.target.value.toLowerCase();
  const cards = adsGrid.querySelectorAll(".card");
  cards.forEach(c => {
    const title = c.querySelector(".title").textContent.toLowerCase();
    c.style.display = title.includes(query) ? "flex" : "none";
  });
};

// --- Admin ---
document.getElementById("addAdForm").onsubmit = e => {
  e.preventDefault();
  const title = adTitle.value;
  const image = adImage.value;
  const video = adVideo.value;
  const points = Number(adPoints.value);
  ads.push({ title, image, video, points, category: "autre" });
  showToast(`Pub "${title}" ajoutée.`);
  renderAds();
  e.target.reset();
};

// --- Initialisation ---
renderAds();

