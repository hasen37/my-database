/* Hussein TV | عالم الدراما 2026
   المبرمج: حسين جميل
   التعديل: دعم روابط elahmad والروابط الخارجية للقنوات بشكل كامل
*/

let globalDatabase = [];
const BASE_URL = "https://drama-2026-default-rtdb.firebaseio.com/series.json";
const CHANNELS_URL = "https://drama-2026-default-rtdb.firebaseio.com/channels.json";

let hlsInstance = null;
let currentHeroIndex = 0;
let heroInterval = null;
let searchTimeout;

// 1. تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    try {
        const res = await fetch(BASE_URL);
        const rawData = await res.json();
        
        let data = [];
        if (rawData) {
            data = Object.keys(rawData).map(key => ({
                id: key, 
                ...rawData[key]
            }));
        }

        globalDatabase = data.map(item => ({
            ...item,
            category: item.category || "رمضان 2026",
            name: item.name || "بدون اسم",
            img: item.img || "https://via.placeholder.com/300x450?text=No+Image",
            eps: item.eps || []
        }));

        // تشغيل الرئيسية فور التحميل
        showHome();
        
        if (globalDatabase.length > 0) {
            updateHero(globalDatabase[0]);
            startHeroSlider();
        }
        hideSplashScreen();
    } catch (e) { 
        console.error("فشل في جلب البيانات:", e); 
        hideSplashScreen();
    }
}

// 2. دالة الصفحة الرئيسية (تجمع القنوات والمسلسلات)
async function showHome() {
    hideAllScreens();
    const homeScreen = document.getElementById('screen-home');
    homeScreen.classList.add('active');
    updateNavActive('nav-home');

    homeScreen.innerHTML = `
        <div id="hero-display" class="hero-banner">
            <div class="hero-info">
                <h1 id="hero-title">جاري التحميل...</h1>
                <button id="hero-play-btn" class="play-now-btn">مشاهدة الآن</button>
            </div>
        </div>
        <div id="rows-container"></div>
    `;

    if (globalDatabase.length > 0) updateHero(globalDatabase[currentHeroIndex]);

    // جلب القنوات أولاً
    await renderChannelsInHome();
    
    // ثم عرض المسلسلات
    if (globalDatabase.length > 0) {
        renderHomeRows(globalDatabase);
    }
}

// 3. جلب القنوات كـ "صف" في الرئيسية
async function renderChannelsInHome() {
    try {
        const res = await fetch(CHANNELS_URL);
        const channelsData = await res.json();
        
        if (channelsData) {
            const container = document.getElementById('rows-container');
            let html = `
                <div class="row">
                    <div class="row-header">
                        <h3 class="row-title">البث المباشر</h3>
                        <div class="view-all-btn" onclick="showChannelsScreen()">عرض الكل <i class="fas fa-chevron-left"></i></div>
                    </div>
                    <div class="row-cards" style="display: flex; overflow-x: auto; gap: 12px; padding: 15px;">
            `;
            
            Object.keys(channelsData).forEach(key => {
                const ch = channelsData[key];
                html += `
                    <div class="card" onclick="goToLive('${ch.link}', '${ch.name}')" style="min-width: 100px; text-align:center; cursor:pointer; background:#111; padding:10px;">
                        <img src="${ch.img || 'https://via.placeholder.com/100'}" style="width:100%; height:80px; object-fit:contain; border-radius:10px;">
                        <p style="font-size:11px; margin-top:8px; color:#fff;">${ch.name}</p>
                    </div>
                `;
            });
            
            html += `</div></div>`;
            container.innerHTML = html; 
        }
    } catch (e) { console.error("خطأ في القنوات"); }
}

// 4. عرض صفوف المسلسلات في الرئيسية
function renderHomeRows(data) {
    const container = document.getElementById('rows-container');
    const categories = [...new Set(data.map(i => i.category))];
    
    categories.forEach(cat => {
        const items = data.filter(i => i.category === cat);
        container.innerHTML += `
            <div class="row">
                <div class="row-header">
                    <h3 class="row-title">${cat}</h3>
                    <div class="view-all-btn" onclick="showSeriesList()">عرض الكل <i class="fas fa-chevron-left"></i></div>
                </div>
                <div class="row-cards" style="display: flex; overflow-x: auto; gap: 12px; padding: 15px;">
                    ${items.map(i => {
                        // حساب عدد الحلقات
                        const epCount = i.eps ? i.eps.length : 0;
                        return `
                        <div class="card" onclick="openSeries('${i.id}')" style="min-width: 120px; cursor:pointer;">
                            ${epCount > 0 ? `<div class="ep-count-badge">${epCount} حلقة</div>` : ''}
                            <img src="${i.img}" style="width:100%; aspect-ratio:2/3; border-radius:12px; object-fit:cover;">
                            <div class="card-info">
                                <p class="card-title">${i.name}</p>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
    });
}

// 5. شاشة القنوات المستقلة
async function loadChannels() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    hideAllScreens();
    
    const screen = document.getElementById('screen-channels') || document.getElementById('screen-home');
    screen.classList.add('active');
    updateNavActive('nav-channels');
    
    screen.innerHTML = '<h3 class="row-title" style="margin:20px;">كل القنوات</h3><div id="channels-grid" class="grid-layout" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:15px;"></div>';
    
    const grid = document.getElementById('channels-grid');
    try {
        const res = await fetch(CHANNELS_URL);
        const data = await res.json();
        if (data) {
            grid.innerHTML = Object.keys(data).map(key => `
                <div class="channel-card" onclick="goToLive('${data[key].link}', '${data[key].name}')" style="background:#1a1a1a; padding:10px; border-radius:8px; text-align:center; cursor:pointer;">
                    <img src="${data[key].img || ''}" style="width:50px; height:50px; object-fit:contain;">
                    <p style="font-size:12px; margin-top:5px;">${data[key].name}</p>
                </div>
            `).join('');
        }
    } catch (e) { grid.innerHTML = "خطأ في التحميل"; }
}

// دالة التوجيه لصفحة live.html (التعديل لدعم روابط الأحمد والروابط المباشرة)
function goToLive(url, name) {
    if (url && url !== "undefined") {
        // نرسل الرابط كما هو لصفحة live.html وهي ستحدد نوع المشغل
        window.open(url, '_blank');

        window.location.href = `live.html?link=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
        
    } else {
        alert("رابط القناة غير متوفر حالياً!");
    }
}

// 6. نظام المسلسلات والحلقات
function openSeries(id) {
    const s = globalDatabase.find(x => x.id == id);
    if (!s) return;

    hideAllScreens();
    const epScreen = document.getElementById('screen-episodes');
    epScreen.classList.add('active');
    
    // تأكد من أن البوستر والاسم يظهران بوضوح
    document.getElementById('series-poster-img').src = s.img;
    document.getElementById('current-series-name').innerText = s.name;
    
    const epGrid = document.getElementById('episodes-grid');
    if(epGrid) {
        if (s.eps && s.eps.length > 0) {
            epGrid.innerHTML = s.eps.map((ep, index) => {
                const linksData = encodeURIComponent(JSON.stringify(ep.link));
                return `<button class="ep-link" id="ep-${index}" onclick="setupServers('${linksData}', ${index})">الحلقة ${index + 1}</button>`;
            }).join('');
        } else {
            epGrid.innerHTML = "<p style='color:gray; padding:20px; grid-column: 1/-1; text-align:center;'>قريباً...</p>";
        }
    }
    // إخفاء منطقة السيرفرات والمشغل عند فتح مسلسل جديد حتى يتم اختيار حلقة
    if(document.getElementById('servers-section')) document.getElementById('servers-section').style.display = 'none';
    if(document.getElementById('video-container')) document.getElementById('video-container').style.display = 'none';
    
    window.scrollTo(0,0);
}


function setupServers(linksData, epIndex) {
    const links = JSON.parse(decodeURIComponent(linksData));
    const sSection = document.getElementById('servers-section');
    const sList = document.getElementById('servers-list');
    
    document.querySelectorAll('.ep-link').forEach(b => b.classList.remove('active'));
    document.getElementById(`ep-${epIndex}`)?.classList.add('active');

    if(sSection) sSection.style.display = 'block';
    if(sList) {
        sList.innerHTML = links.map((url, idx) => `
            <button class="server-btn" onclick="playVideo('${url}', this)">سيرفر ${idx + 1}</button>
        `).join('');
        playVideo(links[0], sList.firstElementChild);
    }
}

function playVideo(url, btn) {
    const wrapper = document.getElementById('player-wrapper');
    const vContainer = document.getElementById('video-container');
    vContainer.style.display = 'block';
    
    wrapper.innerHTML = ""; // تنظيف المشغل القديم

    // إذا كان الرابط m3u8 (أغلب القنوات)
    if (url.includes('.m3u8')) {
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.style.width = "100%";
        wrapper.appendChild(video);

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
        }
    } 
    // إذا كان الرابط عبارة عن صفحة ويب (Embed) مثل روابط الأحمد
    else {
        const ifrm = document.createElement("iframe");
        ifrm.src = url;
        ifrm.style.width = "100%";
        ifrm.style.height = "100%";
        ifrm.setAttribute("allowfullscreen", "true");
        ifrm.frameBorder = "0";
        wrapper.appendChild(ifrm);
    }
}


// 7. البحث والوظائف المساعدة
function showSeriesList() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    
    hideAllScreens();
    const seriesScreen = document.getElementById('screen-series-list');
    if (seriesScreen) {
        seriesScreen.classList.add('active');
        updateNavActive('nav-series');
        const grid = document.getElementById('series-grid-main');
        if (grid) {
            grid.innerHTML = globalDatabase.map(i => `
                <div class="card" onclick="openSeries('${i.id}')">
                    <img src="${i.img}" loading="lazy">
                    <p>${i.name}</p>
                </div>`).join('');
        }
    }
}

function updateHero(item) {
    const heroDisplay = document.getElementById('hero-display');
    if (heroDisplay) heroDisplay.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), #050505), url('${item.img}')`;
    const title = document.getElementById('hero-title');
    if(title) title.innerText = item.name;
    const playBtn = document.getElementById('hero-play-btn');
    if(playBtn) playBtn.onclick = () => openSeries(item.id);
}

function startHeroSlider() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        if (globalDatabase.length > 0) {
            currentHeroIndex = (currentHeroIndex + 1) % Math.min(globalDatabase.length, 5);
            updateHero(globalDatabase[currentHeroIndex]);
        }
    }, 6000);
}

function hideAllScreens() { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function toggleSearch() { 
    const bar = document.getElementById('search-bar-container');
    bar.style.display = bar.style.display === 'flex' ? 'none' : 'flex';
}
function closePlayer() { 
    if(document.getElementById('video-container')) document.getElementById('video-container').style.display = 'none';
    document.getElementById('player-wrapper').innerHTML = "";
    if (hlsInstance) hlsInstance.destroy();
}
function updateNavActive(id) { 
    document.querySelectorAll('.nav-tab').forEach(i => i.classList.remove('active')); 
    document.getElementById(id)?.classList.add('active'); 
}

async function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results-grid');
    const homeContent = document.getElementById('screen-home');

    if (query === "") {
        if(resultsContainer) resultsContainer.style.display = 'none';
        if(homeContent) homeContent.style.display = 'block';
        return;
    }

    if(homeContent) homeContent.style.display = 'none';
    if(resultsContainer) {
        resultsContainer.style.display = 'grid';
        resultsContainer.innerHTML = '<p style="text-align:center; grid-column:1/-1;">جاري البحث...</p>';
    }

    try {
        const res = await fetch(CHANNELS_URL);
        const channelsData = await res.json() || {};
        const channelsArray = Object.keys(channelsData).map(key => ({
            id: key,
            ...channelsData[key],
            type: 'channel'
        }));

        const filteredSeries = globalDatabase.filter(s => s.name.toLowerCase().includes(query));
        const filteredChannels = channelsArray.filter(c => c.name.toLowerCase().includes(query));

        const allResults = [...filteredSeries, ...filteredChannels];

        if (allResults.length === 0) {
            resultsContainer.innerHTML = `<p style="text-align:center; grid-column:1/-1; padding:20px;">لا توجد نتائج لـ "${query}"</p>`;
        } else {
            resultsContainer.innerHTML = allResults.map(item => `
                <div class="card" onclick="${item.type === 'channel' ? `goToLive('${item.link}', '${item.name}')` : `openSeries('${item.id}')`}" style="cursor:pointer;">
                    <img src="${item.img || item.logo}" style="width:100%; aspect-ratio:2/3; object-fit:cover; border-radius:8px;">
                    <div class="card-info">
                        <span class="card-title">${item.name}</span>
                        <span class="rating-tag">${item.type === 'channel' ? 'بث مباشر' : 'مسلسل'}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        resultsContainer.innerHTML = "حدث خطأ أثناء البحث";
    }
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-grid');
    const homeContent = document.getElementById('screen-home');

    searchInput.value = ""; 
    resultsContainer.style.display = 'none'; 
    homeContent.style.display = 'block'; 
    
    const bar = document.getElementById('search-bar-container');
    if(bar) bar.style.display = 'none';
}

function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0'; 
        setTimeout(() => {
            splash.style.display = 'none'; 
        }, 800); 
    }
}
// مثال بسيط لكيفية بناء الكارت داخل الجافاسكريبت ليطابق الـ CSS الجديد
function createCard(item) {
    return `
        <div class="card" onclick="openDetails('${item.id}')">
            <div class="ep-badge-oscar">
                <i class="fas fa-play" style="font-size: 8px;"></i>
                ${item.episode_count || '30'}
            </div>
            <img src="${item.poster}" alt="${item.title}">
            <div class="card-info">
                <h3 class="card-title">${item.title}</h3>
            </div>
        </div>
    `;
}
