let globalDatabase = [];
// --- التعديل هنا: ضع رابط Firebase الخاص بك ---
const FIREBASE_URL = "https://drama-2026-default-rtdb.firebaseio.com/series.json";
// ----------------------------------------------

let hlsInstance = null;
let currentHeroIndex = 0;
let heroInterval = null;
let searchTimeout; 

// 1. تحميل البيانات من Firebase
async function loadData() {
    try {
        const res = await fetch(FIREBASE_URL);
        const data = await res.json();
        
        // تحويل الكائن (Object) القادم من Firebase إلى مصفوفة (Array)
        globalDatabase = data ? Object.keys(data).map(key => ({
            ...data[key],
            id: data[key].id || key, // استخدام الـ ID الأصلي أو مفتاح Firebase
            category: data[key].category || "مميز صيف 2026",
            country: data[key].country || "عام",
            year: data[key].year || "2026"
        })) : [];

        renderHome(globalDatabase);
        renderSeriesGrid(globalDatabase);
        
        if (globalDatabase.length > 0) {
            updateHero(globalDatabase[0]);
            startHeroSlider();
        } else {
            // رسالة في حال كانت القاعدة فارغة
            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.innerText = "أضف أول مسلسل من لوحة التحكم الآن!";
        }
    } catch (e) { 
        console.error("خطأ في الاتصال بـ Firebase:", e);
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) heroTitle.innerText = "فشل تحميل البيانات.. تأكد من اتصالك";
    }
}

// 2. نظام البحث المطور (بدون تغيير)
function handleSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const filter = input.value.toLowerCase();

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const filteredData = globalDatabase.filter(item => 
            item.name.toLowerCase().includes(filter)
        );

        requestAnimationFrame(() => {
            renderHome(filteredData);
            renderSeriesGrid(filteredData);
        });
    }, 250); 
}

function toggleSearch() { 
    const bar = document.getElementById('search-bar-container');
    const input = document.getElementById('search-input');
    if (!bar || !input) return;
    const isVisible = bar.style.display === 'flex';
    
    if (!isVisible) {
        bar.style.display = 'flex';
        input.focus();
    } else {
        bar.style.display = 'none';
        input.value = "";
        renderHome(globalDatabase);
        renderSeriesGrid(globalDatabase);
    }
}

// 3. عرض الرئيسية
function renderHome(data) {
    const container = document.getElementById('rows-container');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#555;">لا توجد نتائج بحث...</div>`;
        return;
    }

    container.innerHTML = "";
    const categories = [...new Set(data.map(i => i.category))];
    categories.forEach(cat => {
        const items = data.filter(i => i.category === cat);
        container.innerHTML += `
            <div class="row">
                <div class="row-header"><div class="row-title">${cat}</div></div>
                <div class="row-cards">
                    ${items.map(i => `
                        <div class="card" onclick="openSeries('${i.id}')">
                            <img src="${i.img}" loading="lazy">
                            <div class="card-overlay">${i.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    });
}

// 4. شبكة المسلسلات
function renderSeriesGrid(data) {
    const grid = document.getElementById('series-grid-main');
    if (!grid) return;
    
    if (data.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#555;">لا يوجد نتائج</div>`;
        return;
    }

    grid.innerHTML = data.map(i => `
        <div class="portrait-card" onclick="openSeries('${i.id}')">
            <img src="${i.img}" loading="lazy">
            <div class="portrait-card-title">${i.name}</div>
        </div>
    `).join('');
}

// 5. السلايدر (Hero)
function startHeroSlider() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        if (globalDatabase.length > 0) {
            currentHeroIndex = (currentHeroIndex + 1) % Math.min(globalDatabase.length, 5);
            updateHero(globalDatabase[currentHeroIndex]);
        }
    }, 6000);
}

function updateHero(item) {
    const heroDisplay = document.getElementById('hero-display');
    const heroTitle = document.getElementById('hero-title');
    if (heroDisplay) heroDisplay.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), #050505), url('${item.img}')`;
    if (heroTitle) heroTitle.innerText = item.name;
    const playBtn = document.getElementById('hero-play-btn');
    if (playBtn) playBtn.onclick = () => openSeries(item.id);
}

// 6. فتح صفحة المسلسل والحلقات
function openSeries(id) {
    const s = globalDatabase.find(x => x.id == id);
    if (!s) return;
    hideAllScreens();
    document.getElementById('screen-episodes').classList.add('active');
    document.getElementById('series-poster-img').src = s.img;
    document.getElementById('series-hero-bg').style.backgroundImage = `url('${s.img}')`;
    document.getElementById('current-series-name').innerText = s.name;
    document.getElementById('series-desc').innerText = s.desc || "لا يوجد وصف متوفر حالياً.";

    const epList = document.getElementById('episodes-list');
    if (s.eps && Array.isArray(s.eps)) {
        epList.innerHTML = s.eps.map((ep, index) => {
            const linksData = encodeURIComponent(JSON.stringify(ep.link));
            return `
            <div class="episode-card-new" onclick="setupServers('${linksData}')">
                <div class="ep-thumbnail"><img src="${s.img}" loading="lazy"></div>
                <div class="ep-info">
                    <div class="ep-title-red">الحلقة ${index + 1}: ${ep.title}</div>
                    <div style="font-size:10px; color:#666;">سيرفرات متعددة</div>
                </div>
                <i class="fas fa-play-circle" style="margin-right:auto; color:var(--accent); font-size:22px;"></i>
            </div>`;
        }).join('');
    } else {
        epList.innerHTML = `<p style="padding:20px; color:#666;">لا توجد حلقات متاحة.</p>`;
    }
}

// 7. إعداد السيرفرات والمشغل (بدون تغيير)
function setupServers(linksData) {
    const links = JSON.parse(decodeURIComponent(linksData));
    const serversSection = document.getElementById('servers-section');
    const serversList = document.getElementById('servers-list');
    
    serversSection.style.display = 'block';
    serversList.innerHTML = (Array.isArray(links) ? links : [links]).map((url, idx) => {
        let name = "سيرفر " + (idx + 1);
        if (url.includes('vidtube')) name = "VidTube Fast";
        if (url.includes('vk.com')) name = "VK High Speed";
        return `<div class="server-btn" onclick="playVideo('${url}', this)">
                    <span>${name}</span> <i class="fas fa-play"></i>
                </div>`;
    }).join('');

    playVideo(Array.isArray(links) ? links[0] : links, serversList.firstElementChild);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function playVideo(url, btn) {
    const wrapper = document.getElementById('player-wrapper');
    document.getElementById('video-container').style.display = 'block';
    document.getElementById('close-player-btn').style.display = 'block';
    
    document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');

    wrapper.innerHTML = "";
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

    if (url.includes('vk.com') || url.includes('video_ext') || url.includes('embed')) {
        const ifrm = document.createElement("iframe");
        ifrm.src = url;
        ifrm.setAttribute("allowfullscreen", "true");
        ifrm.setAttribute("allow", "autoplay; encrypted-media");
        wrapper.appendChild(ifrm);
    } else {
        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        wrapper.appendChild(video);

        if (url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                hlsInstance = new Hls();
                hlsInstance.loadSource(url);
                hlsInstance.attachMedia(video);
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            }
        } else {
            video.src = url;
            video.play();
        }
    }
}

// 8. وظائف التنقل العامة
function showHome() { 
    hideAllScreens(); 
    document.getElementById('screen-home').classList.add('active'); 
    updateNavActive('nav-home'); 
    closePlayer(); 
}

function showSeriesList() { 
    hideAllScreens(); 
    document.getElementById('screen-series-list').classList.add('active'); 
    updateNavActive('nav-series'); 
    renderSeriesGrid(globalDatabase); 
}

function hideAllScreens() { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.width = "0"; 
}

function toggleSidebar() { 
    const sb = document.getElementById('sidebar'); 
    if (!sb) return;
    sb.style.width = sb.style.width === "280px" ? "0" : "280px"; 
}

function closePlayer() { 
    document.getElementById('video-container').style.display = 'none'; 
    document.getElementById('servers-section').style.display = 'none'; 
    document.getElementById('close-player-btn').style.display = 'none';
    document.getElementById('player-wrapper').innerHTML = "";
    if (hlsInstance) hlsInstance.destroy();
}

function updateNavActive(id) { 
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active-nav')); 
    const activeItem = document.getElementById(id);
    if(activeItem) activeItem.classList.add('active-nav'); 
}

document.addEventListener('DOMContentLoaded', loadData);
