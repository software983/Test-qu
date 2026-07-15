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
let audioCtx, gainNode, audioSource;

function initAudioBoost() {
    try {
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
let currentEdition     = null;
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
let lastSaveTime       = 0;

const preloadAudioObj = new Audio();
let preloadedSurahId  = null;

// ── حالة شاشة القراءة والمزامنة (تم التعديل لاستخدام الصور) ──

let readingJuzNum      = null;
let readingViewOpen    = false;
let currentAyahIndex   = -1;
const juzDataCache     = {};
const ayatCoordinatesCache = {}; // تخزين مؤقت لإحداثيات الآيات

// ── معالجة الأسماء ──

function getTrackName(sData) {
    if (!sData) return "";
    let name = sData.name;
    
    if (currentLang === 'en' && partsMap[name]) {
        return partsMap[name];
    } else if (name.includes('الجزء') || name.includes('مقطع') || name.includes('Part')) {
        return name;
    }
    
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
    
    const langBtn = document.getElementById('lang-label');
    if (langBtn) langBtn.textContent = translations[currentLang].langLabel;
    
    const mainTitle = document.getElementById('main-title');
    if (mainTitle) mainTitle.innerHTML = translations[currentLang].mainTitle;
    
    const subtitle = document.getElementById('header-subtitle');
    if (subtitle) subtitle.textContent = translations[currentLang].subtitle;
    
    const dropdownLabel = document.getElementById('dropdown-label');
    if (dropdownLabel) dropdownLabel.textContent = translations[currentLang].editionPrefix;
    
    safeLocalSet('lang', currentLang);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    safeLocalSet('theme', currentTheme);
}

// ── جلب إحداثيات الآيات من الملفات المحلية ──

async function fetchAyatCoordinates(juzId) {
    const cacheKey = `ayat_coordinates_${juzId}`;
    if (ayatCoordinatesCache[juzId]) {
        return ayatCoordinatesCache[juzId];
    }
    
    try {
        const fileName = `ayat_number/${String(juzId).padStart(3, '0')}.json`;
        const res = await fetch(fileName);
        if (!res.ok) throw new Error(`تعذر تحميل ملف الإحداثيات: ${fileName}`);
        const data = await res.json();
        ayatCoordinatesCache[juzId] = data;
        return data;
    } catch (e) {
        console.warn(`تعذر تحميل إحداثيات الآيات للجزء ${juzId}:`, e);
        return [];
    }
}

// ── جلب ملف توقيتات الجزء ──

async function fetchJuzTimings(juzId) {
    const fileName = `susi_time/${String(juzId).padStart(3, '0')}_timings.json`;
    const res = await fetch(fileName);
    if (!res.ok) throw new Error(`تعذر تحميل ملف التوقيتات: ${fileName}`);
    return await res.json();
}

// ── تحميل بيانات جزء معيّن (توقيتات + إحداثيات) ──

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

        if (!timings || !timings.length) {
            throw new Error('ملف التوقيتات فارغ أو غير موجود لهذا الجزء');
        }

        const segments = timings.map((t, i) => {
            return {
                start: t.start,
                end: t.end,
                text: t.text || ''
            };
        });

        const data = { segments, coordinates };
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

// ── رسم صورة المصحف مع طبقة تظليل تفاعلية ──

function renderReadingView(juzId, data) {
    const container = document.getElementById('ayat-container');
    if (!container) return;

    // مسح المحتوى السابق
    container.innerHTML = '';

    // إنشاء wrapper للصورة والتظليل
    const wrapper = document.createElement('div');
    wrapper.className = 'mushaf-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '100%';

    // تحميل صورة المصحف
    const pageNum = String(juzId).padStart(3, '0');
    const img = document.createElement('img');
    img.src = `susi_quran/${pageNum}.webp`;
    img.alt = `صفحة المصحف ${juzId}`;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.className = 'mushaf-image';
    
    img.onerror = () => {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:40px 10px;">
            ${currentLang === 'ar' ? 'تعذر تحميل صورة المصحف' : 'Failed to load mushaf image'}
        </p>`;
    };

    wrapper.appendChild(img);

    // إنشاء طبقة التظليل
    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'highlight-layer';
    highlightLayer.style.position = 'absolute';
    highlightLayer.style.top = '0';
    highlightLayer.style.left = '0';
    highlightLayer.style.width = '100%';
    highlightLayer.style.height = '100%';
    highlightLayer.style.pointerEvents = 'none';
    highlightLayer.id = 'highlight-layer';

    wrapper.appendChild(highlightLayer);
    container.appendChild(wrapper);
}

// ── تحديث التظليل على الصورة ──

function updateHighlight(currentTime, forceImmediate = false) {
    if (readingJuzNum === null || playingSurahId !== readingJuzNum) return;
    const data = juzDataCache[readingJuzNum];
    if (!data || !data.segments.length) return;

    const idx = findSegmentIndex(data.segments, currentTime);
    if (idx === currentAyahIndex) return;

    // البحث عن الإحداثيات المطابقة لهذا المقطع
    const coordinates = data.coordinates.filter(coord => {
        return coord.surah_number !== undefined && coord.ayah_number !== undefined;
    });

    // الحصول على صفحات الآية الحالية
    const currentPageCoords = coordinates.filter(c => c.page_number !== undefined);
    
    // مسح التظليل السابق
    const highlightLayer = document.getElementById('highlight-layer');
    if (highlightLayer) {
        highlightLayer.innerHTML = '';
    }

    // رسم مربعات التظليل للآية الحالية
    if (highlightLayer && currentPageCoords.length > 0) {
        // نحتاج لحساب نسبة الصورة المعروضة
        const mushafImg = document.querySelector('.mushaf-image');
        if (mushafImg) {
            const displayWidth = mushafImg.offsetWidth;
            const displayHeight = mushafImg.offsetHeight;
            const originalWidth = 900; // عرض الصورة الأصلي
            const originalHeight = 1428; // ارتفاع الصورة الأصلي
            
            const scaleX = displayWidth / originalWidth;
            const scaleY = displayHeight / originalHeight;

            // رسم مربع تظليل لكل جزء من الآية
            currentPageCoords.forEach(coord => {
                const box = document.createElement('div');
                box.className = 'ayah-highlight-box';
                box.style.position = 'absolute';
                box.style.left = `${(coord.min_x * scaleX)}px`;
                box.style.top = `${(coord.min_y * scaleY)}px`;
                box.style.width = `${((coord.max_x - coord.min_x) * scaleX)}px`;
                box.style.height = `${((coord.max_y - coord.min_y) * scaleY)}px`;
                box.style.backgroundColor = 'rgba(184, 147, 62, 0.25)';
                box.style.border = '2px solid rgba(184, 147, 62, 0.6)';
                box.style.borderRadius = '4px';
                box.style.boxShadow = '0 0 8px rgba(184, 147, 62, 0.3) inset';
                box.style.pointerEvents = 'none';
                box.style.transition = 'all 0.3s ease';
                
                highlightLayer.appendChild(box);
            });
        }
    }

    currentAyahIndex = idx;
}

// ── بحث ثنائي عن مقطع الآية المطابق للحظة زمنية معينة ──

function findSegmentIndex(segments, t) {
    let lo = 0, hi = segments.length - 1, ans = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (segments[mid].start <= t) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return ans;
}

// ── تحميل/تبديل شاشة القراءة على جزء معيّن ──

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

// ── فتح شاشة القراءة ──

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
        
        setTimeout(() => {
            if (readingViewOpen && readingJuzNum === juzId) {
                updateHighlight(audioInstance.currentTime, true);
            }
        }, 100);
    }
}

// ── إغلاق شاشة القراءة ──

function closeReadingView(fromHistory = false) {
    readingViewOpen = false;
    document.getElementById('reading-view')?.classList.remove('show');

    if (!fromHistory && history.state && history.state.readingView) {
        history.back();
    }
}

// ── تحديث التظليل عند تغيير الوقت ──

function updateReadingSurahTitle(idx) {
    // في نسخة الصور، قد لا نحتاج لتحديث اسم السورة
    // لكن يمكن إضافة معلومات أخرى إذا لزم الأمر
}

// ── الضغط على أي آية ──

function seekToAyah(idx) {
    if (readingJuzNum === null) return;
    const data = juzDataCache[readingJuzNum];
    if (!data || !data.segments[idx]) return;

    const startTime = data.segments[idx].start;
    const sameTrack = (playingSurahId === readingJuzNum && playingEditionId === currentEdition && audioInstance.src);

    if (sameTrack) {
        audioInstance.currentTime = startTime;
        if (audioInstance.paused) {
            audioInstance.play().catch(e => console.warn('Play error:', e));
        }
    } else {
        const sData = activeSurahsData.find(s => s.id === readingJuzNum);
        if (sData) playSurah(sData.id, sData.url, startTime);
    }

    currentAyahIndex = -1;
    updateHighlight(startTime, true);
}

// ── دوال التشغيل الأساسية (تبقى كما هي) ──

function playSurah(id, url, startTime = 0) {
    playingSurahId = id;
    playingEditionId = currentEdition;
    audioInstance.src = url;
    audioInstance.currentTime = startTime;
    audioInstance.play().catch(e => console.warn('Play error:', e));
    initAudioBoost();
}

function togglePlayPause() {
    if (audioInstance.paused) {
        audioInstance.play().catch(e => console.warn('Play error:', e));
    } else {
        audioInstance.pause();
    }
}

function playNext() {
    const currentIdx = activeSurahsData.findIndex(s => s.id === playingSurahId);
    if (currentIdx >= 0 && currentIdx < activeSurahsData.length - 1) {
        const nextSurah = activeSurahsData[currentIdx + 1];
        playSurah(nextSurah.id, nextSurah.url);
    }
}

function playPrevious() {
    const currentIdx = activeSurahsData.findIndex(s => s.id === playingSurahId);
    if (currentIdx > 0) {
        const prevSurah = activeSurahsData[currentIdx - 1];
        playSurah(prevSurah.id, prevSurah.url);
    }
}

// ── معالجة أحداث المشغل الصوتي ──

audioInstance.addEventListener('timeupdate', () => {
    if (readingViewOpen) {
        updateHighlight(audioInstance.currentTime);
    }
});

audioInstance.addEventListener('play', () => {
    const btn = document.getElementById('player-play-btn');
    if (btn) btn.innerHTML = icons.pause;
});

audioInstance.addEventListener('pause', () => {
    const btn = document.getElementById('player-play-btn');
    if (btn) btn.innerHTML = icons.play;
});

// ── تهيئة التطبيق ──

async function initApp() {
    const savedTheme = safeLocalGet('theme') || 'light';
    const savedLang = safeLocalGet('lang') || 'ar';
    
    currentTheme = savedTheme;
    currentLang = savedLang;
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    
    // تحميل بيانات الرواية الافتراضية
    await selectEdition(10); // حفص عن عاصم
}

async function selectEdition(editionId) {
    currentEdition = editionId;
    const config = editionsConfig[editionId];
    if (!config) return;
    
    try {
        const res = await fetch(config.file);
        const data = await res.json();
        activeSurahsData = data;
        renderSurahList();
    } catch (e) {
        console.error('Error loading edition:', e);
        showToast(translations[currentLang].fileNotFound);
    }
}

function renderSurahList() {
    const container = document.getElementById('main-surah-list');
    if (!container) return;
    
    container.innerHTML = '';
    activeSurahsData.forEach(surah => {
        const item = document.createElement('div');
        item.className = 'surah-item';
        item.onclick = () => {
            playSurah(surah.id, surah.url);
            showReadingView(surah.id);
        };
        item.innerHTML = `
            <div class="surah-item-name">${getTrackName(surah)}</div>
            <div class="surah-item-meta">${surah.name}</div>
        `;
        container.appendChild(item);
    });
}

// تهيئة التطبيق عند التحميل
document.addEventListener('DOMContentLoaded', initApp);
