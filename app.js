/* ================================================
   EGY QURAN — app.js (Sheikh Al-Ma'asrawi Edition - Resume From Exact Time)
   ================================================ */

'use strict';

// ── دوال المساعدة ──

let toastTimeout;

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function safeLocalGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
}

function safeLocalSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* صامت */ }
}

function safeLocalCheck(key) {
    try { return !!localStorage.getItem(key); }
    catch { return false; }
}

// ── التعامل مع بانر الاستئناف والتثبيت ──

function closeResumeBanner() {
    const banner = document.getElementById('resume-banner');
    if (banner) banner.classList.remove('show');
}

// تعديل: دالة المتابعة أصبحت تدعم الوقت وتنتظر تحميل الرواية
async function resumePlayback() {
    closeResumeBanner();
    if (window.resumeData) {
        if (window.resumeData.edition && window.resumeData.edition !== currentEdition) {
            await selectEdition(window.resumeData.edition);
        }
        playSurah(window.resumeData.id, window.resumeData.url, window.resumeData.time);
        showReadingView(window.resumeData.id, window.resumeData.time || 0);
    }
}

function closeInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('show');
}

// ── بيانات السور، الأجزاء، والترجمة ──

const surahNamesEn = [
    "", "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am",
    "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim",
    "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Taha", "Al-Anbiya", "Al-Hajj",
    "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut",
    "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad",
    "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
    "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm",
    "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
    "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk",
    "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir",
    "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir",
    "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah",
    "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duhaa", "Ash-Sharh", "At-Tin", "Al-'Alaq",
    "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takathur", "Al-'Asr",
    "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
    "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

// قاموس لترجمة الأجزاء للإنجليزية
const partsMap = {
    "الجزء الأول": "Part 1", "الجزء الثاني": "Part 2", "الجزء الثالث": "Part 3", "الجزء الرابع": "Part 4", "الجزء الخامس": "Part 5",
    "الجزء السادس": "Part 6", "الجزء السابع": "Part 7", "الجزء الثامن": "Part 8", "الجزء التاسع": "Part 9", "الجزء العاشر": "Part 10",
    "الجزء الحادي عشر": "Part 11", "الجزء الثاني عشر": "Part 12", "الجزء الثالث عشر": "Part 13", "الجزء الرابع عشر": "Part 14", "الجزء الخامس عشر": "Part 15",
    "الجزء السادس عشر": "Part 16", "الجزء السابع عشر": "Part 17", "الجزء الثامن عشر": "Part 18", "الجزء التاسع عشر": "Part 19", "الجزء العشرون": "Part 20",
    "الجزء الحادي والعشرون": "Part 21", "الجزء الثاني والعشرون": "Part 22", "الجزء الثالث والعشرون": "Part 23", "الجزء الرابع والعشرون": "Part 24", "الجزء الخامس والعشرون": "Part 25",
    "الجزء السادس والعشرون": "Part 26", "الجزء السابع والعشرون": "Part 27", "الجزء الثامن والعشرون": "Part 28", "الجزء التاسع والعشرون": "Part 29", "الجزء الثلاثون": "Part 30"
};

const translations = {
    ar: {
        langLabel: "EN",
        mainTitle: "الشيخ <strong>أحمد عيسى المعصراوي</strong>",
        subtitle: "القراءات القرآنية المتواترة",
        surahPrefix: "سورة",
        downloading: "جاري تحميل",
        downloadComplete: "تم التحميل بنجاح!",
        resumeBtn: "متابعة الاستماع",
        cancelBtn: "إلغاء",
        resumeTextDef: "هل تود إكمال الاستماع؟",
        installTitle: "تثبيت تطبيق Egy Quran",
        installDesc: "تجربة استماع أسرع وتعمل بدون إنترنت",
        focusOn: "تم تفعيل وضع الاستماع الهادئ",
        focusOff: "تم إيقاف وضع الاستماع الهادئ",
        installed: "تم تثبيت التطبيق بنجاح!",
        networkError: "خطأ في الاتصال، يرجى التحقق من الإنترنت",
        reconnected: "تمت استعادة الاتصال، جاري التشغيل...",
        disconnected: "انقطع الاتصال بالإنترنت",
        editionPrefix: "الرواية الحالية:",
        fileNotFound: "عذراً، ملف الرواية غير متوفر حالياً"
    },
    en: {
        langLabel: "AR",
        mainTitle: "Sheikh <strong>Ahmed Eisa Al-Ma'asrawi</strong>",
        subtitle: "Authentic Quranic Narrations",
        surahPrefix: "Surah",
        downloading: "Downloading",
        downloadComplete: "Download Complete!",
        resumeBtn: "Resume Listening",
        cancelBtn: "Cancel",
        resumeTextDef: "Resume listening?",
        installTitle: "Install Egy Quran",
        installDesc: "Faster experience with offline support",
        focusOn: "Focus Mode Enabled",
        focusOff: "Focus Mode Disabled",
        installed: "App installed successfully!",
        networkError: "Network error, please check connection",
        reconnected: "Connection restored, playing...",
        disconnected: "Internet connection lost",
        editionPrefix: "Current Edition:",
        fileNotFound: "Sorry, the edition file is not available."
    }
};

let currentLang = 'ar';

const editionsConfig = {
    1: { nameAr: "قَالُونُ عَنْ نَافِعٍ الْمَدَنِيِّ", nameEn: "Qalun A'n Nafi'", file: "qalon.json" },
    2: { nameAr: "وَرْشٌ عَنْ نَافِعٍ الْمَدَنِيِّ", nameEn: "Warsh A'n Nafi'", file: "warsh.json" },
    3: { nameAr: "الْبَزِّيُّ عَنِ ابْنِ كَثِيرٍ الْمَكِّيِّ", nameEn: "Al-Bazzi A'n Ibn Kathir", file: "bazzi.json" },
    4: { nameAr: "قُنْبُلٌ عَنِ ابْنِ كَثِيرٍ الْمَكِّيِّ", nameEn: "Qunbul A'n Ibn Kathir", file: "qunbul.json" },
    5: { nameAr: "الدُّورِيُّ عَنْ أَبِي عَمْرٍو الْبَصْرِيِّ", nameEn: "Al-Duri A'n Abi Amr", file: "duri_abu_amr.json" },
    6: { nameAr: "السُّوسِيُّ عَنْ أَبِي عَمْرٍو الْبَصْرِيِّ", nameEn: "Al-Susi A'n Abi Amr", file: "susi.json" },
    7: { nameAr: "هِشَامٌ عَنِ ابْنِ عَامِرٍ الشَّامِيِّ", nameEn: "Hisham A'n Ibn Amir", file: "hisham.json" },
    8: { nameAr: "ابْنُ ذَكْوَانَ عَنِ ابْنِ عَامِرٍ الشَّامِيِّ", nameEn: "Ibn Dhakwan A'n Ibn Amir", file: "ibn_dhakwan.json" },
    9: { nameAr: "شُعْبَةُ عَنْ عَاصِمٍ الْكُوفِيِّ", nameEn: "Shu'bah A'n Asim", file: "shubah.json" },
    10: { nameAr: "حَفْصٌ عَنْ عَاصِمٍ الْكُوفِيِّ", nameEn: "Hafs A'n Asim", file: "hafs.json" },
    11: { nameAr: "خَلَفٌ عَنْ حَمْزَةَ الْكُوفِيِّ", nameEn: "Khalaf A'n Hamzah", file: "khalaf_an_hamzah.json" },
    12: { nameAr: "خَلَّادٌ عَنْ حَمْزَةَ الْكُوفِيِّ", nameEn: "Khallad A'n Hamzah", file: "khallad.json" },
    13: { nameAr: "أَبُو الْحَارِثِ عَنِ الْكِسَائِيِّ الْكُوفِيِّ", nameEn: "Abu Al-Harith A'n Al-Kisa'i", file: "abu_alharith.json" },
    14: { nameAr: "الدُّورِيُّ عَنِ الْكِسَائِيِّ الْكُوفِيِّ", nameEn: "Al-Duri A'n Al-Kisa'i", file: "duri_alkisai.json" },
    15: { nameAr: "ابْنُ وَرْدَانَ عَنْ أَبِي جَعْفَرٍ الْمَدَنِيِّ", nameEn: "Ibn Wardan A'n Abu Ja'far", file: "ibn_wardan.json" },
    16: { nameAr: "ابْنُ جَمَّازٍ عَنْ أَبِي جَعْفَرٍ الْمَدَنِيِّ", nameEn: "Ibn Jammaz A'n Abu Ja'far", file: "ibn_jammaz.json" },
    17: { nameAr: "رُوَيْسٌ عَنْ يَعْقُوبَ الْحَضْرَمِيِّ", nameEn: "Ruwais A'n Ya'qub", file: "ruwais.json" },
    18: { nameAr: "رَوْحٌ عَنْ يَعْقُوبَ الْحَضْرَمِيِّ", nameEn: "Rawh A'n Ya'qub", file: "rawh.json" },
    19: { nameAr: "إِسْحَاقُ عَنْ خَلَفٍ الْعَاشِرِ", nameEn: "Ishaq A'n Khalaf", file: "ishaq.json" },
    20: { nameAr: "إِدْرِيسُ عَنْ خَلَفٍ الْعَاشِرِ", nameEn: "Idris A'n Khalaf", file: "idris.json" }
};

const icons = {
    play:     '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    loading:  '<svg class="loading-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>',
    sun:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    moon:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
};

// ── المشغل الصوتي ──

const audioInstance = new Audio();
// audioInstance.crossOrigin = "anonymous"; // تم تعطيله للسماح بتشغيل الروابط التي لا تدعم CORS
let audioCtx, gainNode, audioSource;

function initAudioBoost() {
    try {
        // إذا لم يكن هناك crossOrigin، لا يمكننا استخدام Web Audio API (Visualizer/Boost) بسبب قيود الأمان
        // سنكتفي بالتشغيل العادي بدون تضخيم الصوت إذا كان الرابط خارجياً ولا يدعم CORS
        if (!audioInstance.crossOrigin || audioInstance.crossOrigin === "null") {
            return;
        }

        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            audioCtx = new AudioContext();
            audioSource = audioCtx.createMediaElementSource(audioInstance);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 2.8; 
            audioSource.connect(gainNode);
            gainNode.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.warn("AudioContext resume:", e));
        }
    } catch (e) {
        console.warn("Web Audio API:", e);
    }
}

// ── حالة التطبيق ──

let currentTheme       = 'light';
let currentEdition     = null; // لا يوجد رواية محملة افتراضياً
let activeSurahsData   = [];
let playingSurahId     = null;
let playingEditionId   = null;
let isBuffering        = false;
let isFocusMode        = false;
let playbackMode       = 'autonext';
let playbackMenuOpen   = false;
let isDropdownOpen     = false;
let activeDownloads    = {};

let isDragging         = false;
let currentSeekPct     = 0;
let lastSaveTime       = 0; // متغير لحفظ الوقت الأخير

const preloadAudioObj = new Audio();
let preloadedSurahId  = null;

// ── حالة شاشة القراءة والمزامنة (تم التعديل لاستخدام الصور) ──

let readingJuzNum      = null;   // رقم الجزء المعروض حالياً في شاشة القراءة (يطابق s.id)
let readingViewOpen    = false;  // هل شاشة القراءة مفتوحة على الشاشة حالياً
let currentAyahIndex   = -1;     // فهرس الآية المظللة حالياً (يطابق index في ملف التوقيتات)
const juzDataCache     = {};     // تخزين مؤقت لكل جزء: { segments: [...], coordinates: [...] }
const QURAN_TEXT_API    = 'https://api.alquran.cloud/v1/juz/'; // تم تعطيله في الكود الجديد
const QURAN_TEXT_EDITION = 'quran-uthmani';

// ── معالجة الأسماء ──

function getTrackName(sData) {
    if (!sData) return "";
    let name = sData.name;
    
    if (currentLang === 'en' && partsMap[name]) {
        return partsMap[name];
    } else if (name.includes('الجزء') || name.includes('مقطع') || name.includes('Part')) {
        return name;
    }
    
    // إزالة كلمة "سورة" من بداية الاسم إن وجدت
    const cleanName = name.replace(/^\s*سورة\s+/, '').trim();
    const baseName = currentLang === 'ar' ? cleanName : (surahNamesEn[sData.id] || cleanName);
    return baseName;
}

function formatTime(s) {
    if (isNaN(s) || s === Infinity) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
}

// ── تغيير اللغة والمظهر ──

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    const dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = currentLang;
    document.documentElement.style.setProperty('--dir', dir);
    
    document.getElementById('lang-label').textContent = translations[currentLang].langLabel;
    document.getElementById('main-title').innerHTML = translations[currentLang].mainTitle;
    document.getElementById('header-subtitle').textContent = translations[currentLang].subtitle;
    document.getElementById('dropdown-label').textContent = translations[currentLang].editionPrefix;
    
    // تحديث قائمة السور باللغة الجديدة
    renderSurahsList();
    
    // تحديث العناوين في شاشة القراءة إذا كانت مفتوحة
    if (readingViewOpen && readingJuzNum) {
        const sData = activeSurahsData.find(s => s.id === readingJuzNum);
        if (sData) document.getElementById('reading-juz-title').textContent = getTrackName(sData);
        updateHighlight(audioInstance.currentTime);
    }
    
    safeLocalSet('maasrawi_lang', currentLang);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.innerHTML = currentTheme === 'dark' ? icons.moon : icons.sun;
    safeLocalSet('maasrawi_theme', currentTheme);
}

// ── التعامل مع القائمة المنسدلة للروايات ──

function toggleDropdown() {
    isDropdownOpen = !isDropdownOpen;
    const dropdown = document.getElementById('edition-dropdown');
    const header = dropdown.querySelector('.dropdown-header');
    if (isDropdownOpen) {
        dropdown.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
    } else {
        dropdown.classList.remove('open');
        header.setAttribute('aria-expanded', 'false');
    }
}

// إغلاق القائمة عند النقر خارجها
window.addEventListener('click', (e) => {
    if (isDropdownOpen && !document.getElementById('edition-dropdown').contains(e.target)) {
        toggleDropdown();
    }
});

function updateDropdownUI() {
    const list = document.getElementById('edition-list');
    const selectedName = document.getElementById('selected-edition-name');
    if (!list || !selectedName) return;

    list.innerHTML = '';
    Object.keys(editionsConfig).forEach(id => {
        const config = editionsConfig[id];
        const item = document.createElement('div');
        item.className = 'dropdown-item' + (parseInt(id) === currentEdition ? ' selected' : '');
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', parseInt(id) === currentEdition ? 'true' : 'false');
        item.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
        item.onclick = () => {
            selectEdition(parseInt(id));
            toggleDropdown();
        };
        list.appendChild(item);
        if (parseInt(id) === currentEdition) {
            selectedName.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
        }
    });
}

async function selectEdition(id) {
    if (currentEdition === id) return;
    currentEdition = id;
    updateDropdownUI();
    safeLocalSet('maasrawi_edition', id);
    await loadEditionData(id);
    updateFocusHeader();
}

async function loadEditionData(id) {
    const config = editionsConfig[id];
    if (!config) return;
    
    try {
        const res = await fetch(config.file);
        if (!res.ok) throw new Error();
        activeSurahsData = await res.json();
        renderSurahsList();
    } catch (e) {
        showToast(translations[currentLang].fileNotFound);
    }
}

function renderSurahsList() {
    const container = document.getElementById('main-surah-list');
    if (!container) return;

    if (!activeSurahsData.length) {
        container.innerHTML = `<div class="empty-state">${translations[currentLang].fileNotFound}</div>`;
        return;
    }

    container.innerHTML = activeSurahsData.map(s => `
        <div class="surah-card ${playingSurahId === s.id && playingEditionId === currentEdition ? 'active' : ''}" 
             onclick="playSurah(${s.id}, '${s.url}')" id="surah-card-${s.id}">
            <div class="surah-card-info">
                <div class="surah-card-name">${getTrackName(s)}</div>
                <div class="surah-card-meta">${currentLang === 'ar' ? 'الشيخ المعصراوي' : 'Sheikh Al-Maasrawi'}</div>
            </div>
            <div class="surah-card-actions">
                <button class="surah-action-btn read-btn" onclick="event.stopPropagation(); showReadingView(${s.id})" title="قراءة">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h6z"/></svg>
                </button>
                <button class="surah-action-btn download-btn" onclick="event.stopPropagation(); startDownload(${s.id}, '${s.url}')" title="تحميل">
                    ${icons.download}
                </button>
                <div class="surah-play-indicator">
                    ${playingSurahId === s.id && playingEditionId === currentEdition ? icons.pause : icons.play}
                </div>
            </div>
        </div>
    `).join('');
}

function updateFocusHeader() {
    const avatar = document.getElementById('header-avatar-img');
    const eq = document.getElementById('header-equalizer');
    if (audioInstance.paused || playingEditionId !== currentEdition) {
        avatar?.classList.remove('playing');
        eq?.classList.remove('active');
    } else {
        avatar?.classList.add('playing');
        eq?.classList.add('active');
    }
}

// ── التحكم في المشغل ──

function playSurah(id, url, startTime = 0) {
    const isSame = (playingSurahId === id && playingEditionId === currentEdition);
    
    if (isSame) {
        togglePlayPause();
        return;
    }

    playingSurahId = id;
    playingEditionId = currentEdition;
    audioInstance.src = url;
    audioInstance.currentTime = startTime;
    audioInstance.play().catch(e => console.warn("Autoplay blocked or error:", e));
    
    syncUIWithAudioState();
    initAudioBoost();
}

function togglePlayPause() {
    if (!audioInstance.src) return;
    if (audioInstance.paused) {
        audioInstance.play().catch(e => console.warn("Playback error:", e));
    } else {
        audioInstance.pause();
    }
}

function playNext() {
    const idx = activeSurahsData.findIndex(s => s.id === playingSurahId);
    if (idx !== -1 && idx < activeSurahsData.length - 1) {
        const next = activeSurahsData[idx + 1];
        playSurah(next.id, next.url);
    }
}

function playPrevious() {
    const idx = activeSurahsData.findIndex(s => s.id === playingSurahId);
    if (idx > 0) {
        const prev = activeSurahsData[idx - 1];
        playSurah(prev.id, prev.url);
    }
}

function syncUIWithAudioState() {
    const playBtn = document.getElementById('player-play-btn');
    if (playBtn) playBtn.innerHTML = audioInstance.paused ? icons.play : icons.pause;

    // تحديث البطاقات في القائمة
    document.querySelectorAll('.surah-card').forEach(card => {
        const id = parseInt(card.id.replace('surah-card-', ''));
        const isCurrent = (id === playingSurahId && currentEdition === playingEditionId);
        card.classList.toggle('active', isCurrent);
        const indicator = card.querySelector('.surah-play-indicator');
        if (indicator) indicator.innerHTML = (isCurrent && !audioInstance.paused) ? icons.pause : icons.play;
    });

    // تحديث عنوان المشغل
    const titleEl = document.getElementById('player-track-title');
    if (titleEl) {
        const sData = activeSurahsData.find(s => s.id === playingSurahId);
        titleEl.textContent = sData ? getTrackName(sData) : '';
    }

    updateFocusHeader();
}

audioInstance.addEventListener('play', syncUIWithAudioState);
audioInstance.addEventListener('pause', syncUIWithAudioState);
audioInstance.addEventListener('waiting', () => {
    isBuffering = true;
    const playBtn = document.getElementById('player-play-btn');
    if (playBtn) playBtn.innerHTML = icons.loading;
});
audioInstance.addEventListener('playing', () => {
    isBuffering = false;
    syncUIWithAudioState();
});

// حفظ الحالة عند التوقف أو تغيير السورة
audioInstance.addEventListener('pause', () => {
    if (playingSurahId) {
        safeLocalSet('lastPlayedQuran', {
            edition: playingEditionId,
            surah: playingSurahId,
            time: audioInstance.currentTime,
            ayahIndex: currentAyahIndex
        });
    }
});

audioInstance.addEventListener('error', () => {
    isBuffering = !navigator.onLine;
    syncUIWithAudioState();
    showToast(translations[currentLang].networkError);
});

audioInstance.addEventListener('ended', () => {
    if (playbackMode === 'autonext') {
        playNext();
    }
});

// ── تحديث شريط التقدم وحفظ الوقت تلقائياً ──

const progressContainer = document.getElementById('progress-container');

audioInstance.addEventListener('timeupdate', () => {
    const fill  = document.getElementById('progress-bar-fill');
    const curr  = document.getElementById('curr-time');
    const total = document.getElementById('total-time');

    // مزامنة تظليل الآية الحالية مع وقت التلاوة (شاشة القراءة)
    updateHighlight(audioInstance.currentTime);

    if (audioInstance.duration && !isDragging) {
        const pct = (audioInstance.currentTime / audioInstance.duration) * 100;
        if (fill)  fill.style.width = pct + '%';
        if (curr)  curr.textContent = formatTime(audioInstance.currentTime);
        if (total) total.textContent = formatTime(audioInstance.duration);

        if (progressContainer) progressContainer.setAttribute('aria-valuenow', Math.round(pct));

        // حفظ وقت التشغيل في الذاكرة كل 5 ثوانٍ
        if (Math.abs(audioInstance.currentTime - lastSaveTime) > 5) {
            if (playingSurahId) {
                safeLocalSet('lastPlayedQuran', {
                    edition: playingEditionId,
                    surah: playingSurahId,
                    time: audioInstance.currentTime,
                    ayahIndex: currentAyahIndex
                });
            }
            lastSaveTime = audioInstance.currentTime;
        }

        // تحميل مسبق للمقطع التالي
        if (playbackMode === 'autonext' && (audioInstance.duration - audioInstance.currentTime) < 15) {
            const idx = activeSurahsData.findIndex(s => s.id === playingSurahId);
            if (idx !== -1 && idx < activeSurahsData.length - 1) {
                const nextSurah = activeSurahsData[idx + 1];
                if (preloadedSurahId !== nextSurah.id) {
                    preloadAudioObj.src = nextSurah.url;
                    preloadAudioObj.preload = "auto";
                    preloadedSurahId = nextSurah.id;
                }
            }
        }
    }
});

// ── شريط التقدم — سحب وإفلات ──

const seek = (e) => {
    if (!progressContainer) return currentSeekPct;
    const rect = progressContainer.getBoundingClientRect();
    let clientX = 0;

    if (e.type.includes('touch')) {
        clientX = e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    } else {
        clientX = e.clientX;
    }

    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fill = document.getElementById('progress-bar-fill');
    if (fill) fill.style.width = (pct * 100) + '%';
    currentSeekPct = pct;
    return pct;
};

if (progressContainer) {
    progressContainer.addEventListener('mousedown', (e) => { isDragging = true; seek(e); });
    progressContainer.addEventListener('touchstart', (e) => { isDragging = true; seek(e); }, { passive: false });
    progressContainer.addEventListener('click', (e) => {
        if (audioInstance.duration && audioInstance.duration !== Infinity) {
            audioInstance.currentTime = seek(e) * audioInstance.duration;
        }
    });
}

window.addEventListener('mousemove', (e) => { if (isDragging) seek(e); });
window.addEventListener('touchmove', (e) => { if (isDragging) seek(e); }, { passive: false });

window.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        if (audioInstance.duration && audioInstance.duration !== Infinity) {
            audioInstance.currentTime = currentSeekPct * audioInstance.duration;
        }
    }
});

window.addEventListener('touchend', (e) => {
    if (isDragging) {
        isDragging = false;
        if (e.changedTouches) seek(e);
        if (audioInstance.duration && audioInstance.duration !== Infinity) {
            audioInstance.currentTime = currentSeekPct * audioInstance.duration;
        }
    }
});

// ── التحميل ──

const dlModal = document.getElementById('download-modal');
const dlFill  = document.getElementById('dl-progress-fill');
const dlPct   = document.getElementById('dl-modal-pct');
const dlTitle = document.getElementById('dl-modal-title');
const dlTrack = document.querySelector('.dl-progress-track');

async function startDownload(id, url) {
    if (activeDownloads[id]) return;
    activeDownloads[id] = true;

    const sData = activeSurahsData.find(s => s.id === id);
    const sName = getTrackName(sData);

    if (dlModal) dlModal.style.display = 'flex';
    if (dlFill)  dlFill.style.width = '0%';
    if (dlPct)   dlPct.textContent = '0%';
    if (dlTitle) dlTitle.textContent = `${translations[currentLang].downloading} ${sName}...`;
    if (dlTrack) dlTrack.setAttribute('aria-valuenow', '0');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (event) => {
        if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            if (dlFill)  dlFill.style.width = pct + '%';
            if (dlPct)   dlPct.textContent = pct + '%';
            if (dlTrack) dlTrack.setAttribute('aria-valuenow', pct);
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            const blob = xhr.response;
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `${sName}.mp4`; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
            finishDownloadUI(id);
        } else {
            fallbackDownload(id, url, sName);
        }
    };

    xhr.onerror = () => {
        fallbackDownload(id, url, sName);
    };

    xhr.send();
}

function fallbackDownload(id, url, sName) {
    console.warn("XHR Download failed (CORS), using direct link.");
    if (dlModal) dlModal.style.display = 'none';
    delete activeDownloads[id];
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sName}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast(currentLang === 'ar' ? "بدء التحميل المباشر..." : "Starting direct download...");
}

function finishDownloadUI(id) {
    if (dlTitle) dlTitle.textContent = translations[currentLang].downloadComplete;
    if (dlFill)  dlFill.style.width = '100%';
    if (dlPct)   dlPct.textContent = '100%';
    if (dlTrack) dlTrack.setAttribute('aria-valuenow', '100');
    setTimeout(() => {
        if (dlModal) dlModal.style.display = 'none';
        delete activeDownloads[id];
    }, 1600);
}

// ================================================
// شاشة القراءة والمزامنة (تم التعديل لاستخدام الصور)
// ================================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// جلب إحداثيات الآيات من الملفات المحلية
async function fetchAyatCoordinates(juzId) {
    try {
        const fileName = `ayat_number/${String(juzId).padStart(3, '0')}.json`;
        const res = await fetch(fileName);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (e) {
        console.warn(`تعذر تحميل إحداثيات الآيات للجزء ${juzId}`);
        return [];
    }
}

// جلب ملف توقيتات الجزء
async function fetchJuzTimings(juzId) {
    const fileName = `susi_time/${String(juzId).padStart(3, '0')}_timings.json`;
    const res = await fetch(fileName);
    if (!res.ok) throw new Error(`تعذر تحميل ملف التوقيتات: ${fileName}`);
    return await res.json();
}

// تحميل بيانات جزء معيّن (توقيتات + إحداثيات)
async function loadJuzReadingData(juzId) {
    if (juzDataCache[juzId]) return juzDataCache[juzId];

    const loadingEl   = document.getElementById('reading-loading');
    const containerEl = document.getElementById('ayat-container');
    if (loadingEl)   loadingEl.classList.add('show');
    if (containerEl) containerEl.innerHTML = '';

    try {
        const [timings, coordinates] = await Promise.all([
            fetchJuzTimings(juzId),
            fetchAyatCoordinates(juzId)
        ]);

        const data = { segments: timings, coordinates: coordinates };
        juzDataCache[juzId] = data;
        return data;
    } catch (e) {
        console.error(e);
        showToast(currentLang === 'ar' ? 'تعذر تحميل بيانات هذا الجزء' : 'Failed to load this juz data');
        return { segments: [], coordinates: [] };
    } finally {
        if (loadingEl) loadingEl.classList.remove('show');
    }
}

// رسم صورة المصحف
function renderReadingView(juzId, data) {
    const container = document.getElementById('ayat-container');
    if (!container) return;

    container.innerHTML = `
        <div class="mushaf-wrapper" style="position:relative; width:100%; display:inline-block;">
            <img src="susi_quran/${String(juzId).padStart(3, '0')}.webp" 
                 class="mushaf-image" style="width:100%; height:auto; display:block;">
            <div id="highlight-layer" class="highlight-layer" 
                 style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>
        </div>
    `;
    
    currentAyahIndex = -1;
}

// تحديث تظليل الآية الحالية بناءً على الإحداثيات
function updateHighlight(currentTime, forceImmediate = false) {
    if (readingJuzNum === null || playingSurahId !== readingJuzNum) return;
    const data = juzDataCache[readingJuzNum];
    if (!data || !data.segments.length) return;

    const idx = findSegmentIndex(data.segments, currentTime);
    if (idx === currentAyahIndex && !forceImmediate) return;

    const highlightLayer = document.getElementById('highlight-layer');
    if (!highlightLayer) return;

    // مسح التظليل السابق
    highlightLayer.innerHTML = '';

    // البحث عن الإحداثيات المطابقة لهذه الآية
    // ملاحظة: التوقيتات في susi_time والآيات في ayat_number يجب أن تكون متوافقة
    // هنا نفترض أن كل segment في التوقيتات يقابل آية أو جزء من آية في الإحداثيات
    // سنستخدم surah_number و ayah_number من الإحداثيات إذا توفرت في الـ segment
    // أو نعتمد على الترتيب (idx + 1) كتقريب أولي
    
    const targetAyahNum = idx + 1; 
    const coords = data.coordinates.filter(c => c.ayah_number === targetAyahNum || c.position === targetAyahNum);

    if (coords.length > 0) {
        const img = document.querySelector('.mushaf-image');
        if (img && img.complete) {
            const scaleX = img.offsetWidth / 900;
            const scaleY = img.offsetHeight / 1428;

            coords.forEach(c => {
                const box = document.createElement('div');
                box.className = 'ayah-highlight-box active';
                box.style.position = 'absolute';
                box.style.left = (c.min_x * scaleX) + 'px';
                box.style.top = (c.min_y * scaleY) + 'px';
                box.style.width = ((c.max_x - c.min_x) * scaleX) + 'px';
                box.style.height = ((c.max_y - c.min_y) * scaleY) + 'px';
                highlightLayer.appendChild(box);
            });
        }
    }

    currentAyahIndex = idx;
}

function findSegmentIndex(segments, t) {
    let lo = 0, hi = segments.length - 1, ans = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (segments[mid].start <= t) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return ans;
}

async function switchReadingJuz(id, initialTime = null) {
    readingJuzNum = id;
    currentAyahIndex = -1;

    const sData = activeSurahsData.find(s => s.id === id);
    const titleEl = document.getElementById('reading-juz-title');
    if (titleEl && sData) titleEl.textContent = getTrackName(sData);

    const data = await loadJuzReadingData(id);
    renderReadingView(id, data);
    updateHighlight(initialTime !== null ? initialTime : audioInstance.currentTime, true);
}

function showReadingView(juzId, initialTime = null) {
    const wasOpen = readingViewOpen;
    readingViewOpen = true;
    document.getElementById('reading-view')?.classList.add('show');

    if (!wasOpen) {
        history.pushState({ readingView: true }, '');
    }

    if (readingJuzNum !== juzId || !juzDataCache[juzId]) {
        switchReadingJuz(juzId, initialTime);
    } else {
        currentAyahIndex = -1;
        updateHighlight(initialTime !== null ? initialTime : audioInstance.currentTime, true);
    }
}

function closeReadingView(fromHistory = false) {
    readingViewOpen = false;
    document.getElementById('reading-view')?.classList.remove('show');

    if (!fromHistory && history.state && history.state.readingView) {
        history.back();
    }
}

// بقية وظائف الإذاعة كما هي تماماً في ملفك الأصلي...
// (سيتم الحفاظ على كل الكود المتعلق بالإذاعة)

const radioAudio = new Audio();
const radioState = {
    isPlaying: false,
    playlist: [],
    currentFileIdx: -1,
    fileDuration: 0,
    totalCycleDuration: 0
};

async function loadRadioPlaylist() {
    try {
        const res = await fetch('radio.json');
        radioState.playlist = await res.json();
        radioState.totalCycleDuration = radioState.playlist.reduce((acc, f) => acc + (f.duration || 0), 0);
    } catch (e) { console.error("Radio playlist error:", e); }
}

function getLivePosition() {
    if (!radioState.totalCycleDuration) return null;
    const now = Math.floor(Date.now() / 1000);
    const cyclePos = now % radioState.totalCycleDuration;
    
    let elapsed = 0;
    for (let i = 0; i < radioState.playlist.length; i++) {
        const file = radioState.playlist[i];
        if (cyclePos < elapsed + file.duration) {
            return { index: i, seek: cyclePos - elapsed };
        }
        elapsed += file.duration;
    }
    return { index: 0, seek: 0 };
}

function setRadioLoadingUI(isLoading) {
    const btn = document.getElementById('radio-play-btn');
    const icon = document.getElementById('radio-play-icon');
    if (isLoading) {
        if (btn) btn.innerHTML = icons.loading;
    } else {
        if (btn) btn.innerHTML = radioState.isPlaying ? icons.pause : icons.play;
    }
}

function setOnAirIndicator(active) {
    const dot = document.getElementById('radio-live-dot');
    const eq = document.getElementById('radio-eq');
    if (active) {
        dot?.classList.add('active');
        eq?.classList.add('active');
    } else {
        dot?.classList.remove('active');
        eq?.classList.remove('active');
    }
}

let radioResyncTimer;
function startRadioResync() {
    stopRadioResync();
    radioResyncTimer = setInterval(() => {
        const pos = getLivePosition();
        if (pos && (pos.index !== radioState.currentFileIdx || Math.abs(radioAudio.currentTime - pos.seek) > 10)) {
            playRadioFile(pos.index, pos.seek);
        }
    }, 30000);
}

function stopRadioResync() {
    if (radioResyncTimer) clearInterval(radioResyncTimer);
}

function playRadioFile(idx, seekTime = 0) {
    const file = radioState.playlist[idx];
    if (!file) return;
    radioState.currentFileIdx = idx;
    radioAudio.src = file.url;
    radioAudio.currentTime = seekTime;
    radioAudio.play().catch(e => console.warn("Radio autoplay blocked:", e));
    
    const titleEl = document.getElementById('radio-track-title');
    if (titleEl) titleEl.textContent = file.title || 'تلاوة مباركة';
}

function handleRadioFileEnded() {
    const pos = getLivePosition();
    if (pos) playRadioFile(pos.index, pos.seek);
}

function startRadio() {
    if (!radioState.playlist.length) return;
    radioState.isPlaying = true;
    const pos = getLivePosition();
    if (pos) playRadioFile(pos.index, pos.seek);
    startRadioResync();
    setOnAirIndicator(true);
    setRadioLoadingUI(false);
}

function pauseRadio() {
    radioState.isPlaying = false;
    radioAudio.pause();
    stopRadioResync();
    setOnAirIndicator(false);
    setRadioLoadingUI(false);
}

function toggleRadioAction() {
    if (radioState.isPlaying) pauseRadio();
    else startRadio();
}

function toggleRadioPlayback() {
    if (radioState.isPlaying) pauseRadio();
    else startRadio();
}

function openRadioPanel() {
    document.getElementById('radio-modal')?.classList.add('show');
    if (!radioState.isPlaying) startRadio();
}

function closeRadioPanel() {
    document.getElementById('radio-modal')?.classList.remove('show');
    pauseRadio();
}

radioAudio.addEventListener('ended', handleRadioFileEnded);
radioAudio.addEventListener('waiting', () => setRadioLoadingUI(true));
radioAudio.addEventListener('playing', () => setRadioLoadingUI(false));

// إيقاف الإذاعة تلقائياً إذا بدأ المستخدم تشغيل سورة
const _originalPlaySurah = playSurah;
playSurah = function (...args) {
    if (radioState.isPlaying) pauseRadio();
    return _originalPlaySurah.apply(this, args);
};

const _originalTogglePlayPause = togglePlayPause;
togglePlayPause = function (...args) {
    if (radioState.isPlaying) {
        toggleRadioPlayback();
        return;
    }
    return _originalTogglePlayPause.apply(this, args);
};

// ── التهيئة الأولى ──

(async () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.innerHTML = currentTheme === 'dark' ? icons.moon : icons.sun;

    loadRadioPlaylist();
    updateDropdownUI();
    
    if (currentEdition) {
        await loadEditionData(currentEdition);
        updateFocusHeader();
    } else {
        renderSurahsList();
    }

    const savedState = safeLocalGet('lastPlayedQuran');
    if (savedState?.surah) {
        const sData = activeSurahsData.find(s => s.id === savedState.surah);
        if (sData) {
            playingEditionId = savedState.edition;
            const sName = getTrackName(sData);
            const promptText = currentLang === 'ar'
                ? `هل تود إكمال الاستماع إلى ${sName}؟`
                : `Resume listening to ${sName}?`;
                
            const resumeText = document.getElementById('resume-text');
            if (resumeText) resumeText.textContent = promptText;
            
            document.getElementById('resume-banner')?.classList.add('show');
            window.resumeData = { 
                id: sData.id, 
                url: sData.url, 
                edition: savedState.edition,
                time: savedState.time || 0
            };
            
            setTimeout(closeResumeBanner, 15000);
        }
    }
})();
