/* ================================================
   EGY QURAN — app.js (SPA / Material Navigation)
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

// يعيد أول قيمة من القائمة ليست null أو undefined (بديل متوافق لسلسلة عوامل ??)
function firstDefined(...values) {
    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null && values[i] !== undefined) return values[i];
    }
    return undefined;
}

function safeLocalGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
}

function safeLocalSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* صامت */ }
}

// ── نظام التنقل بين الصفحات (SPA Navigation) ──
// opts.fromEditionPick: صحيح فقط عند الدخول لصفحة السور نتيجة اختيار رواية من الصفحة الرئيسية مباشرة.
// في أي حالة أخرى (كالضغط على تبويب "السور" من الشريط السفلي)، ولو كان المستخدم يتصفّح رواية غير التي
// يقرأ فيها القارئ حالياً، تُعرض له تلقائياً رواية القراءة الجارية بمحتوياتها.
function switchTab(tabId, opts = {}) {
    if (tabId === 'surahs' && !opts.fromEditionPick && playingEditionId !== null && playingEditionId !== currentEdition) {
        selectEditionAndGo(playingEditionId);
        return;
    }

    // 1. إيقاف "وضع الاستماع الهادئ" إن كان يعمل، لضمان عدم اختفاء أي عناصر
    if (isFocusMode) {
        toggleFocusMode(false);
    }

    // 2. إخفاء كل الصفحات وإزالة التنشيط من أزرار الشريط السفلي
    document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    // 3. تنشيط الصفحة المطلوبة
    document.getElementById('page-' + tabId).classList.add('active-page');
    const tabBtn = document.getElementById('tab-' + tabId);
    if (tabBtn) tabBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 4. تفعيل وتحديث المصحف إذا كانت الصفحة هي المصحف
    readingViewOpen = (tabId === 'mushaf');

    if (tabId === 'mushaf') {
        const emptyMsg = document.querySelector('.empty-mushaf-msg');
        const viewEl = document.getElementById('mushaf-page-view');
        
        if (currentAyahIndex === -1 && !readingJuzNum) {
            if (viewEl) viewEl.classList.remove('show');
            if (emptyMsg) emptyMsg.style.display = 'flex';
        } else {
            if (emptyMsg) emptyMsg.style.display = 'none';
            // إعادة رسم صفحة المصحف فور الدخول لهذه الصفحة، حتى لو كانت التلاوة قد بدأت من خارجها
            // (مثلاً بالضغط على أيقونة التشغيل بجانب السورة) ولم تُرسم الصفحة بعد لأن العرض لم يكن مفتوحاً وقتها
            if (readingJuzNum !== null) {
                const data = juzDataCache[readingCacheKey()];
                if (data && data.segments.length) {
                    const idx = currentAyahIndex >= 0 ? currentAyahIndex : 0;
                    updateMushafHighlight(data.segments[idx]);
                }
            }
        }
    }
}

// ── التعامل مع بانر الاستئناف والتثبيت ──
function closeResumeBanner() {
    const banner = document.getElementById('resume-banner');
    if (banner) banner.classList.remove('show');
}

async function resumePlayback() {
    closeResumeBanner();
    if (window.resumeData) {
        if (window.resumeData.edition && window.resumeData.edition !== currentEdition) {
            await selectEditionAndGo(window.resumeData.edition);
        }
        playSurah(window.resumeData.id, window.resumeData.url, window.resumeData.time, false);
        openReadingJuz(window.resumeData.id, window.resumeData.url);
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

const surahNamesAr = [
    "", "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام",
    "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم",
    "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج",
    "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت",
    "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص",
    "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية",
    "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم",
    "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك",
    "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر",
    "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير",
    "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية",
    "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق",
    "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر",
    "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

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
        mainTitle: "الشيخ <strong>أحمد عيسى المعصراوي</strong>",
        subtitle: "القراءات القرآنية المتواترة",
        surahPrefix: "سورة",
        downloading: "جاري تحميل",
        downloadComplete: "تم التحميل بنجاح!",
        resumeBtn: "متابعة الاستماع",
        cancelBtn: "إلغاء",
        resumeTextDef: "هل تود إكمال الاستماع؟",
        installTitle: "تثبيت تطبيق مصحف الأمة",
        installDesc: "تجربة استماع أسرع وتعمل بدون إنترنت",
        focusOn: "تم تفعيل وضع الاستماع الهادئ",
        focusOff: "تم إيقاف وضع الاستماع الهادئ",
        installed: "تم تثبيت التطبيق بنجاح!",
        networkError: "خطأ في الاتصال، يرجى التحقق من الإنترنت",
        reconnected: "تمت استعادة الاتصال، جاري التشغيل...",
        disconnected: "انقطع الاتصال بالإنترنت",
        fileNotFound: "عذراً، ملف الرواية غير متوفر حالياً",
        mushafBackToReciter: "↺ العودة لموضع القارئ",
        mushafPageNotFound: "هذه الصفحة غير متوفرة",
        repeatAyah: "تكرار الآية",
        copyAyah: "نسخ الآية",
        repeatOn: "تم تفعيل تكرار الآية",
        repeatOff: "تم إيقاف تكرار الآية",
        ayahCopied: "تم نسخ الآية",
        ayahCopyFailed: "تعذر نسخ الآية، حاول مرة أخرى",
        navHome: "الرئيسية",
        navSurahs: "السور",
        navMushaf: "المصحف",
        navSettings: "الإعدادات",
        emptyMushaf: "اختر سورة للبدء في القراءة والمتابعة",
        settingsTitle: "الإعدادات",
        themeTextDark: "المظهر الداكن",
        themeTextLight: "المظهر الفاتح",
        langText: "English",
        contactText: "تواصل معنا",
        chooseEditionFirst: "اختر رواية أولاً",
        chooseEditionSection: "اختر الرواية:",
        pageLabel: "صفحة"
    },
    en: {
        mainTitle: "Sheikh <strong>Ahmed Eisa Al-Ma'asrawi</strong>",
        subtitle: "Authentic Quranic Narrations",
        surahPrefix: "Surah",
        downloading: "Downloading",
        downloadComplete: "Download Complete!",
        resumeBtn: "Resume Listening",
        cancelBtn: "Cancel",
        resumeTextDef: "Resume listening?",
        installTitle: "Install Mus'haf Al-Ummah",
        installDesc: "Faster experience with offline support",
        focusOn: "Focus Mode Enabled",
        focusOff: "Focus Mode Disabled",
        installed: "App installed successfully!",
        networkError: "Network error, please check connection",
        reconnected: "Connection restored, playing...",
        disconnected: "Internet connection lost",
        fileNotFound: "Sorry, the edition file is not available.",
        mushafBackToReciter: "↺ Back to reciter",
        mushafPageNotFound: "This page is not available",
        repeatAyah: "Repeat Ayah",
        copyAyah: "Copy Ayah",
        repeatOn: "Ayah repeat enabled",
        repeatOff: "Ayah repeat disabled",
        ayahCopied: "Ayah copied",
        ayahCopyFailed: "Couldn't copy the ayah, try again",
        navHome: "Home",
        navSurahs: "Surahs",
        navMushaf: "Mushaf",
        navSettings: "Settings",
        emptyMushaf: "Select a Surah to start reading",
        settingsTitle: "Settings",
        themeTextDark: "Dark Theme",
        themeTextLight: "Light Theme",
        langText: "العربية",
        contactText: "Contact Us",
        chooseEditionFirst: "Choose an Edition First",
        chooseEditionSection: "Choose an Edition:",
        pageLabel: "Page"
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
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    mushaf:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5c-1.6-1.2-3.8-1.8-6.2-1.8-.5 0-.8.4-.8.8v11.7c0 .5.4.9.9.9 2.2 0 4.3.6 5.8 1.7.2.1.5.1.7 0 1.5-1.1 3.6-1.7 5.8-1.7.5 0 .9-.4.9-.9V5.5c0-.4-.3-.8-.8-.8-2.4 0-4.6.6-6.2 1.8-.2.1-.3.2-.3.4v12.6"/></svg>'
};

// ── المشغل الصوتي ──
const audioInstance = new Audio();
audioInstance.crossOrigin = "anonymous";
let audioCtx, gainNode, audioSource;

function initAudioBoost() {
    try {
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
let activeDownloads    = {};

let isDragging         = false;
let currentSeekPct     = 0;
let lastSaveTime       = 0;

const preloadAudioObj = new Audio();
let preloadedSurahId  = null;

// ── حالة شاشة القراءة والمزامنة ──
const SUSI_EDITION_ID   = 6;

let readingJuzNum       = null;
let readingEditionNum   = null;
let readingViewOpen     = false;
let currentAyahIndex    = -1;
const juzDataCache      = {};

function getReadingMode(editionNum) {
    return editionNum === SUSI_EDITION_ID ? 'juz' : 'surah';
}

function getTimeFolder(editionNum) {
    const config = editionsConfig[editionNum];
    if (!config || !config.file) return null;
    return config.file.replace(/\.json$/i, '_time/');
}

function readingCacheKey(editionNum = readingEditionNum, id = readingJuzNum) {
    if (editionNum === null || id === null) return null;
    return `${editionNum}_${id}`;
}

const HAFS_SVG_PATH   = 'hafs/svg/';
const HAFS_JSON_PATH  = 'hafs/json/';
const HAFS_MAX_PAGE   = 604; 

const mushafPageJsonCache = {};      
const mushafPageSvgCache  = {};      
const mushafMissingPages  = new Set(); 
const mushafAyahPageCache = {};      
let   mushafCurrentPage   = null;    
let   mushafFollowAudio   = true;    
let   mushafNavUIBuilt    = false;   
let   mushafUpdateToken   = 0;       

let mushafPageRatio = 1.58; 
function noteMushafPageRatio(svgText) {
    if (!svgText) return;
    let w, h;
    const vb = svgText.match(/viewBox=["']\s*[\-\d.]+\s+[\-\d.]+\s+([\d.]+)\s+([\d.]+)/);
    if (vb) { w = parseFloat(vb[1]); h = parseFloat(vb[2]); }
    if (!w || !h) {
        const wh = svgText.match(/<svg[^>]*\swidth=["']([\d.]+)[^"']*["'][^>]*\sheight=["']([\d.]+)[^"']*["']/);
        if (wh) { w = parseFloat(wh[1]); h = parseFloat(wh[2]); }
    }
    if (!w || !h) return;
    const ratio = h / w;
    if (ratio > mushafPageRatio + 0.01) {
        mushafPageRatio = ratio;
        const track = document.getElementById('mushaf-page-track');
        if (track) track.style.aspectRatio = `1 / ${mushafPageRatio}`;
        if (typeof sizeMushafPageTrack === 'function') sizeMushafPageTrack();
    }
}

function pad3(n) { return String(n).padStart(3, '0'); }

async function fetchMushafPageJson(pageNum) {
    if (pageNum < 1 || pageNum > HAFS_MAX_PAGE) return null;
    if (mushafPageJsonCache[pageNum]) return mushafPageJsonCache[pageNum];
    if (mushafMissingPages.has(pageNum)) return null;
    try {
        const res = await fetch(`${HAFS_JSON_PATH}${pad3(pageNum)}.json`);
        if (!res.ok) throw new Error('404');
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) throw new Error('empty');
        mushafPageJsonCache[pageNum] = data;
        data.forEach(a => { mushafAyahPageCache[`${a.surahNumber}_${a.ayahNumber}`] = pageNum; });
        return data;
    } catch (e) {
        mushafMissingPages.add(pageNum);
        return null;
    }
}

async function fetchMushafPageSvg(pageNum) {
    if (mushafPageSvgCache[pageNum]) return mushafPageSvgCache[pageNum];
    try {
        const res = await fetch(`${HAFS_SVG_PATH}${pad3(pageNum)}.svg`);
        if (!res.ok) throw new Error('404');
        const text = await res.text();
        mushafPageSvgCache[pageNum] = text;
        noteMushafPageRatio(text);
        return text;
    } catch (e) {
        return null;
    }
}

function ayahIsWithinPage(pageData, surahNumber, ayahNumber) {
    if (!pageData || !pageData.length) return false;
    return pageData.some(a => Number(a.surahNumber) === Number(surahNumber) && Number(a.ayahNumber) === Number(ayahNumber));
}

const SURAH_START_PAGE = [
    1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 
    322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 
    477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 
    551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 
    586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 
    600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604
];

const JUZ_START_PAGE = [
    1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 
    402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

const JUZ_NAMES_AR = [
    'الجزء الأول', 'الجزء الثاني', 'الجزء الثالث', 'الجزء الرابع', 'الجزء الخامس',
    'الجزء السادس', 'الجزء السابع', 'الجزء الثامن', 'الجزء التاسع', 'الجزء العاشر',
    'الجزء الحادي عشر', 'الجزء الثاني عشر', 'الجزء الثالث عشر', 'الجزء الرابع عشر', 'الجزء الخامس عشر',
    'الجزء السادس عشر', 'الجزء السابع عشر', 'الجزء الثامن عشر', 'الجزء التاسع عشر', 'الجزء العشرون',
    'الجزء الحادي والعشرون', 'الجزء الثاني والعشرون', 'الجزء الثالث والعشرون', 'الجزء الرابع والعشرون', 'الجزء الخامس والعشرون',
    'الجزء السادس والعشرون', 'الجزء السابع والعشرون', 'الجزء الثامن والعشرون', 'الجزء التاسع والعشرون', 'الجزء الثلاثون'
];

// يرجع اسم الجزء المطابق لرقم صفحة معيّنة في المصحف، بلغة الواجهة الحالية (عربي/إنجليزي)
function getJuzNameForPage(pageNumber) {
    let juzIndex = 0;
    for (let i = 0; i < JUZ_START_PAGE.length; i++) {
        if (JUZ_START_PAGE[i] <= pageNumber) juzIndex = i;
        else break;
    }
    const nameAr = JUZ_NAMES_AR[juzIndex] || '';
    if (currentLang === 'en') return partsMap[nameAr] || nameAr;
    return nameAr;
}

async function findMushafPage(surahNumber, ayahNumber) {
    const key = `${surahNumber}_${ayahNumber}`;
    if (mushafAyahPageCache[key] !== undefined) return mushafAyahPageCache[key];

    const fastCandidates = [mushafCurrentPage, mushafCurrentPage ? mushafCurrentPage + 1 : null].filter(Boolean);
    const fastResults = await Promise.all(fastCandidates.map(fetchMushafPageJson));
    for (let i = 0; i < fastCandidates.length; i++) {
        const data = fastResults[i];
        if (data && ayahIsWithinPage(data, surahNumber, ayahNumber)) return fastCandidates[i];
    }

    const mode = getReadingMode(readingEditionNum);
    let estimate = 1;
    if (mode === 'juz' && readingJuzNum && JUZ_START_PAGE[readingJuzNum - 1]) {
        estimate = JUZ_START_PAGE[readingJuzNum - 1];
    } else if (surahNumber && SURAH_START_PAGE[surahNumber - 1]) {
        estimate = SURAH_START_PAGE[surahNumber - 1];
    }

    for (let radius = 0; radius <= 40; radius++) {
        for (const mid of (radius === 0 ? [estimate] : [estimate + radius, estimate - radius])) {
            if (mid < 1 || mid > HAFS_MAX_PAGE) continue;
            const data = await fetchMushafPageJson(mid);
            if (data && ayahIsWithinPage(data, surahNumber, ayahNumber)) return mid;
        }
    }
    return null;
}

function hideMushafView() {
    const pageViewEl = document.getElementById('mushaf-page-view');
    if (pageViewEl) pageViewEl.classList.remove('show');
    const ayatContainerEl = document.getElementById('ayat-container');
    if (ayatContainerEl) ayatContainerEl.classList.remove('mushaf-hidden');
}

async function injectMushafHitLayer(wrap, pageNum) {
    const svgEl = wrap.querySelector('svg');
    if (!svgEl) return;
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width  = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.display = 'block';

    let jsonUsed = false;
    
    if (pageNum) {
        const pageData = await fetchMushafPageJson(pageNum);
        if (pageData && Array.isArray(pageData) && pageData.length > 0) {
            jsonUsed = true;
            
            svgEl.querySelectorAll('.ayahPolygon, .mushaf-ayah-hit').forEach(el => el.remove());

            const xmlns = "http://www.w3.org/2000/svg";
            pageData.forEach(ayah => {
                if (ayah.polygon) {
                    const shapeStr = ayah.polygon.trim();
                    const isPath = /^[a-zA-Z]/.test(shapeStr);
                    const shapeEl = document.createElementNS(xmlns, isPath ? 'path' : 'polygon');
                    
                    shapeEl.setAttribute('class', 'mushaf-ayah-hit ayahPolygon');
                    shapeEl.setAttribute('data-surah', ayah.surahNumber);
                    shapeEl.setAttribute('data-ayah', ayah.ayahNumber);
                    
                    if (isPath) {
                        shapeEl.setAttribute('d', shapeStr);
                    } else {
                        shapeEl.setAttribute('points', shapeStr);
                    }
                    
                    svgEl.appendChild(shapeEl);
                }
            });
        }
    }

    if (!jsonUsed) {
        const items = svgEl.querySelectorAll('.ayahPolygon');
        items.forEach(el => {
            el.classList.add('mushaf-ayah-hit');
            el.dataset.surah = el.getAttribute('surah');
            el.dataset.ayah  = el.getAttribute('ayah');
        });
    }

    if (!wrap.dataset.clickBound) {
        wrap.addEventListener('click', onMushafHitClick);
        bindAyahLongPress(wrap);
        wrap.dataset.clickBound = '1';
    }
}

function getJuzForAyah(surah, ayah) {
    let juz = 1;
    for (let i = 0; i < JUZ_START.length; i++) {
        const jStart = JUZ_START[i];
        if (surah > jStart.surah || (surah === jStart.surah && ayah >= jStart.ayah)) {
            juz = i + 1;
        } else {
            break;
        }
    }
    return juz;
}

async function onMushafHitClick(e) {
    if (suppressNextAyahClick) { suppressNextAyahClick = false; return; }
    const target = e.target.closest('.mushaf-ayah-hit');
    if (!target) return;
    
    const surah = parseInt(target.dataset.surah, 10);
    const ayah  = parseInt(target.dataset.ayah, 10);

    const mode = getReadingMode(readingEditionNum);
    const targetContextId = (mode === 'juz') ? getJuzForAyah(surah, ayah) : surah;

    if (targetContextId === readingJuzNum) {
        const data = juzDataCache[readingCacheKey()];
        if (!data) return;
        const idx = data.segments.findIndex(s => s.surahNumber === surah && s.numberInSurah === ayah);
        if (idx >= 0) seekToAyah(idx);
    } 
    else {
        const sData = (editionDataCache[readingEditionNum] || activeSurahsData).find(s => s.id === targetContextId);
        if (!sData) return; 

        mushafFollowAudio = true;
        updateMushafFollowBtnUI();

        const newData = await loadReadingData(targetContextId, readingEditionNum);
        const idx = newData.segments.findIndex(s => s.surahNumber === surah && s.numberInSurah === ayah);
        
        let startTime = 0;
        if (idx >= 0 && newData.segments[idx].start !== null) {
            startTime = newData.segments[idx].start;
        }

        playSurah(targetContextId, sData.url, startTime, false, readingEditionNum);
    }
}

function highlightMushafAyah(wrap, surahNumber, ayahNumber) {
    const svgEl = wrap.querySelector('svg');
    if (!svgEl) return;
    svgEl.querySelectorAll('.mushaf-ayah-hit.active-mushaf-ayah').forEach(el => el.classList.remove('active-mushaf-ayah'));
    const target = svgEl.querySelector(`.mushaf-ayah-hit[data-surah="${surahNumber}"][data-ayah="${ayahNumber}"]`);
    if (target) {
        target.classList.add('active-mushaf-ayah');
    }
    syncRepeatPulseClass(wrap);
}

// ── الضغط المطوّل على آية: شريط إجراءات (تكرار / نسخ) ──
const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE = 12;

let longPressTimer = null;
let longPressStart = null;
let longPressTarget = null;
let suppressNextAyahClick = false;
let activeAyahMenuIndex = null;
let activeAyahMenuTarget = null;
let repeatingAyahIndex = null;

function clearLongPressTimer() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    longPressStart = null;
    longPressTarget = null;
}

function bindAyahLongPress(wrap) {
    const point = (e) => e.touches ? e.touches[0] : e;

    const onDown = (e) => {
        const target = e.target.closest('.mushaf-ayah-hit');
        if (!target) return;
        const p = point(e);
        longPressStart = { x: p.clientX, y: p.clientY };
        longPressTarget = target;
        longPressTimer = setTimeout(() => {
            if (!longPressTarget) return;
            suppressNextAyahClick = true;
            openAyahActionsMenu(longPressTarget, longPressStart.x, longPressStart.y);
            clearLongPressTimer();
        }, LONG_PRESS_MS);
    };
    const onMove = (e) => {
        if (!longPressStart) return;
        const p = point(e);
        const dx = Math.abs(p.clientX - longPressStart.x);
        const dy = Math.abs(p.clientY - longPressStart.y);
        if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) clearLongPressTimer();
    };
    const onUp = () => clearLongPressTimer();

    wrap.addEventListener('touchstart', onDown, { passive: true });
    wrap.addEventListener('touchmove', onMove, { passive: true });
    wrap.addEventListener('touchend', onUp, { passive: true });
    wrap.addEventListener('touchcancel', onUp, { passive: true });

    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseup', onUp);
    wrap.addEventListener('mouseleave', onUp);
}

function openAyahActionsMenu(target, clientX, clientY) {
    const surah = parseInt(target.dataset.surah, 10);
    const ayah  = parseInt(target.dataset.ayah, 10);
    const data  = juzDataCache[readingCacheKey()];
    if (!data) return;
    const idx = data.segments.findIndex(s => s.surahNumber === surah && s.numberInSurah === ayah);
    if (idx < 0) return;

    const menu = document.getElementById('ayah-actions-menu');
    if (!menu) return;

    if (activeAyahMenuTarget) activeAyahMenuTarget.classList.remove('mushaf-ayah-pressed');
    activeAyahMenuIndex = idx;
    activeAyahMenuTarget = target;
    target.classList.add('mushaf-ayah-pressed');
    updateAyahActionsUI();

    menu.classList.add('show');
    menu.style.left = '-9999px';
    menu.style.top = '-9999px';

    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        let left = clientX - rect.width / 2;
        let top = clientY - rect.height - 16;
        let arrowBelow = false;
        if (top < 8) { top = clientY + 16; arrowBelow = true; }
        left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - rect.height - 8));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.classList.toggle('arrow-below', arrowBelow);
        menu.style.setProperty('--arrow-offset', `${clientX - left}px`);
    });

    if (navigator.vibrate) { try { navigator.vibrate(12); } catch { /* صامت */ } }
}

function closeAyahActionsMenu() {
    const menu = document.getElementById('ayah-actions-menu');
    if (menu) menu.classList.remove('show');
    if (activeAyahMenuTarget) activeAyahMenuTarget.classList.remove('mushaf-ayah-pressed');
    activeAyahMenuTarget = null;
    activeAyahMenuIndex = null;
}

function updateAyahActionsUI() {
    const repeatBtn = document.getElementById('ayah-action-repeat');
    if (!repeatBtn) return;
    const isActive = activeAyahMenuIndex !== null && repeatingAyahIndex === activeAyahMenuIndex;
    repeatBtn.classList.toggle('active', isActive);
}

function syncRepeatPulseClass(wrap) {
    const svgEl = wrap ? wrap.querySelector('svg') : null;
    if (!svgEl) return;
    svgEl.querySelectorAll('.mushaf-ayah-hit.repeating-ayah').forEach(el => el.classList.remove('repeating-ayah'));
    if (repeatingAyahIndex === null) return;
    const data = juzDataCache[readingCacheKey()];
    const seg = data ? data.segments[repeatingAyahIndex] : null;
    if (!seg || seg.surahNumber === null) return;
    const target = svgEl.querySelector(`.mushaf-ayah-hit[data-surah="${seg.surahNumber}"][data-ayah="${seg.numberInSurah}"]`);
    if (target) target.classList.add('repeating-ayah');
}

function stopAyahRepeat() {
    if (repeatingAyahIndex === null) return;
    repeatingAyahIndex = null;
    syncRepeatPulseClass(document.getElementById('mushaf-page-wrap'));
    updateAyahActionsUI();
}

function toggleRepeatAyah(idx) {
    const data = juzDataCache[readingCacheKey()];
    const seg  = data ? data.segments[idx] : null;
    if (!seg || seg.start === null) return;

    if (repeatingAyahIndex === idx) {
        stopAyahRepeat();
        showToast(translations[currentLang].repeatOff);
        return;
    }

    repeatingAyahIndex = idx;
    const sameTrack  = (playingSurahId === readingJuzNum && playingEditionId === readingEditionNum && audioInstance.src);
    const withinAyah = sameTrack && audioInstance.currentTime >= seg.start &&
        (seg.end === null || seg.end === undefined || audioInstance.currentTime < seg.end);
    if (!withinAyah) seekToAyah(idx);

    syncRepeatPulseClass(document.getElementById('mushaf-page-wrap'));
    updateAyahActionsUI();
    showToast(translations[currentLang].repeatOn);
}

function checkAyahRepeat() {
    if (repeatingAyahIndex === null) return;
    if (readingJuzNum === null || playingSurahId !== readingJuzNum || playingEditionId !== readingEditionNum) return;
    const data = juzDataCache[readingCacheKey()];
    const seg  = data ? data.segments[repeatingAyahIndex] : null;
    if (!seg || seg.start === null) return;
    const nextSeg = data.segments[repeatingAyahIndex + 1];
    const endTime = (seg.end !== null && seg.end !== undefined) ? seg.end : (nextSeg ? nextSeg.start : null);
    if (endTime !== null && audioInstance.currentTime >= endTime - 0.05) {
        audioInstance.currentTime = seg.start;
        if (audioInstance.paused) audioInstance.play().catch(() => {});
    }
}

async function fetchAyahTextForCopy(surahNumber, ayahNumber) {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/quran-uthmani`);
    if (!res.ok) throw new Error('network');
    const json = await res.json();
    const text = json && json.data ? json.data.text : undefined;
    const surahNameAr = json && json.data && json.data.surah ? json.data.surah.name : undefined;
    if (!text) throw new Error('empty');
    const numberInSurah = (json && json.data && json.data.numberInSurah !== null && json.data.numberInSurah !== undefined)
        ? json.data.numberInSurah
        : ayahNumber;
    return { text, surahNameAr, numberInSurah };
}

async function copyAyahAtIndex(idx) {
    const data = juzDataCache[readingCacheKey()];
    const seg  = data ? data.segments[idx] : null;
    if (!seg || seg.surahNumber === null) return;

    try {
        const { text, surahNameAr, numberInSurah } = await fetchAyahTextForCopy(seg.surahNumber, seg.numberInSurah);
        const refLabel = currentLang === 'ar'
            ? `${surahNameAr || surahNamesEn[seg.surahNumber]} (${numberInSurah})`
            : `${surahNamesEn[seg.surahNumber]} (${numberInSurah})`;
        await navigator.clipboard.writeText(`${text}\n${refLabel}`);
        showToast(translations[currentLang].ayahCopied);
    } catch {
        showToast(translations[currentLang].ayahCopyFailed);
    }
}

const ayahActionRepeatBtn = document.getElementById('ayah-action-repeat');
if (ayahActionRepeatBtn) ayahActionRepeatBtn.addEventListener('click', () => {
    if (activeAyahMenuIndex === null) return;
    toggleRepeatAyah(activeAyahMenuIndex);
    closeAyahActionsMenu();
});

const ayahActionCopyBtn = document.getElementById('ayah-action-copy');
if (ayahActionCopyBtn) ayahActionCopyBtn.addEventListener('click', () => {
    if (activeAyahMenuIndex === null) return;
    copyAyahAtIndex(activeAyahMenuIndex);
    closeAyahActionsMenu();
});

document.addEventListener('click', (e) => {
    const menu = document.getElementById('ayah-actions-menu');
    if (!menu || !menu.classList.contains('show')) return;
    if (menu.contains(e.target) || e.target.closest('.mushaf-ayah-hit')) return;
    closeAyahActionsMenu();
});
const ayatScrollEl = document.getElementById('ayat-scroll');
if (ayatScrollEl) ayatScrollEl.addEventListener('scroll', closeAyahActionsMenu, { passive: true });
window.addEventListener('resize', closeAyahActionsMenu);

// ── ضبط أبعاد صفحة المصحف بدقة عبر JS بدل الاعتماد على aspect-ratio/max-height في CSS ──
// (بعض المتصفحات وأدوات المعاينة تتعامل مع نسبة العرض إلى الارتفاع داخل flex بشكل مختلف،
//  فنحسب الأبعاد الفعلية بالبكسل هنا لضمان ظهور الصفحة بنفس الشكل في كل مكان)
function sizeMushafPageTrack() {
    const view = document.getElementById('mushaf-page-view');
    const track = document.getElementById('mushaf-page-track');
    if (!view || !track) return;
    const availW = view.clientWidth;
    const availH = view.clientHeight;
    if (!availW || !availH) return;
    const WIDEN_FACTOR = 1.06; // عرض أكبر قليلاً من العرض المطابق تمامًا لنسبة الصفحة، بنفس الارتفاع
    let w = availW;
    let h = w * mushafPageRatio;
    if (h > availH) {
        h = availH;
        w = h / mushafPageRatio;
    }
    w = Math.min(availW, w * WIDEN_FACTOR);
    track.style.width = Math.floor(w) + 'px';
    track.style.height = Math.floor(h) + 'px';
}
if (typeof ResizeObserver !== 'undefined') {
    const mushafViewElForSizing = document.getElementById('mushaf-page-view');
    if (mushafViewElForSizing) new ResizeObserver(sizeMushafPageTrack).observe(mushafViewElForSizing);
} else {
    sizeMushafPageTrack();
}
window.addEventListener('resize', sizeMushafPageTrack);
window.addEventListener('orientationchange', () => setTimeout(sizeMushafPageTrack, 80));


// ── تصفح حر لصفحات المصحف أثناء الاستماع ──
async function renderMushafPageManual(pageNum) {
    if (pageNum < 1 || pageNum > HAFS_MAX_PAGE) return false;
    const wrap = document.getElementById('mushaf-page-wrap');
    if (!wrap) return false;
    const svgText = await fetchMushafPageSvg(pageNum);
    if (!svgText) {
        showToast(translations[currentLang].mushafPageNotFound);
        return false;
    }
    wrap.classList.add('page-turning');
    await new Promise(resolve => setTimeout(resolve, 130));
    wrap.innerHTML = svgText;
    mushafCurrentPage = pageNum;
    await injectMushafHitLayer(wrap, pageNum);
    updateMushafPageMeta(pageNum);
    requestAnimationFrame(() => wrap.classList.remove('page-turning'));
    return true;
}

function updateMushafFollowBtnUI() {
    const btn = document.getElementById('mushaf-follow-btn');
    if (!btn) return;
    btn.classList.toggle('hide', mushafFollowAudio);
    btn.textContent = translations[currentLang].mushafBackToReciter;
}

async function goToMushafPage(delta) {
    if (mushafCurrentPage === null) return;
    ++mushafUpdateToken;
    closeAyahActionsMenu();
    const ok = await renderMushafPageManual(mushafCurrentPage + delta);
    if (!ok) return;
    mushafFollowAudio = false;
    updateMushafFollowBtnUI();
}

function resumeMushafFollow() {
    mushafFollowAudio = true;
    updateMushafFollowBtnUI();
    const data = juzDataCache[readingCacheKey()];
    if (data && data.segments[currentAyahIndex]) {
        updateMushafHighlight(data.segments[currentAyahIndex]);
    }
}

// ── تقليب صفحة المصحف بالسحب ──
let mushafDrag = null;

function mushafDragApply() {
    if (!mushafDrag) return;
    const { wrap, incomingEl, dx, dir, width } = mushafDrag;
    wrap.style.transform = `translateX(${dx}px)`;
    if (incomingEl) {
        incomingEl.style.transform = `translateX(${dx - dir * width}px)`;
    }
}

function mushafDragEnsureIncoming(dir) {
    if (!mushafDrag || mushafDrag.dir === dir) return;
    const track = document.getElementById('mushaf-page-track');
    if (!track) return;
    if (mushafDrag.incomingEl) {
        mushafDrag.incomingEl.remove();
        mushafDrag.incomingEl = null;
    }
    mushafDrag.dir = dir;
    mushafDrag.neighborPage = mushafCurrentPage + dir;
    mushafDrag.neighborSvg = null;
    if (mushafDrag.neighborPage < 1 || mushafDrag.neighborPage > HAFS_MAX_PAGE) return; 

    const el = document.createElement('div');
    el.className = 'mushaf-page-wrap mushaf-page-incoming mushaf-dragging';
    track.appendChild(el);
    mushafDrag.incomingEl = el;

    const myPage = mushafDrag.neighborPage;
    fetchMushafPageSvg(myPage).then(svg => {
        if (!mushafDrag || mushafDrag.incomingEl !== el) return; 
        mushafDrag.neighborSvg = svg;
        if (svg) {
            el.innerHTML = svg;
            const svgEl = el.querySelector('svg');
            if (svgEl) {
                svgEl.removeAttribute('width');
                svgEl.removeAttribute('height');
                svgEl.style.width = '100%';
                svgEl.style.height = 'auto';
                svgEl.style.display = 'block';
            }
        }
    });
}

function mushafDragOnStart(clientX) {
    const track = document.getElementById('mushaf-page-track');
    const wrap = document.getElementById('mushaf-page-wrap');
    if (!track || !wrap || mushafCurrentPage === null) return;
    closeAyahActionsMenu();
    wrap.classList.remove('mushaf-snap');
    wrap.classList.add('mushaf-dragging');
    mushafDrag = {
        startX: clientX,
        startTime: Date.now(),
        dx: 0,
        dir: 0,
        wrap,
        incomingEl: null,
        neighborPage: null,
        neighborSvg: null,
        width: track.clientWidth || 1,
        horizontal: null,
        startY: null,
    };
}

function mushafDragOnMove(clientX, clientY) {
    if (!mushafDrag) return false;
    const rawDx = clientX - mushafDrag.startX;

    if (mushafDrag.horizontal === null) {
        if (mushafDrag.startY === null) mushafDrag.startY = clientY;
        const dy = clientY - mushafDrag.startY;
        if (Math.abs(rawDx) < 6 && Math.abs(dy) < 6) return false;
        mushafDrag.horizontal = Math.abs(rawDx) > Math.abs(dy);
        if (!mushafDrag.horizontal) return false; 
    }
    if (!mushafDrag.horizontal) return false;

    let dx = rawDx;
    const dir = dx < 0 ? -1 : 1;
    mushafDragEnsureIncoming(dir);

    if (!mushafDrag.incomingEl) dx *= 0.35;

    mushafDrag.dx = dx;
    mushafDragApply();
    return true;
}

function mushafDragOnEnd() {
    if (!mushafDrag) return;
    const drag = mushafDrag;
    const { wrap, incomingEl, dx, dir, width } = drag;
    const elapsed = Math.max(1, Date.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed; 
    const threshold = Math.min(width * 0.22, 90);
    const isQuickFlick = Math.abs(dx) > 24 && velocity > 0.45;
    const shouldCommit = !!incomingEl && (Math.abs(dx) > threshold || isQuickFlick);

    wrap.classList.remove('mushaf-dragging');
    wrap.classList.add('mushaf-snap');
    if (incomingEl) {
        incomingEl.classList.remove('mushaf-dragging');
        incomingEl.classList.add('mushaf-snap');
    }

    if (shouldCommit) {
        wrap.style.transform = `translateX(${dir * width}px)`;
        incomingEl.style.transform = 'translateX(0px)';
        const finish = async () => {
            wrap.classList.remove('mushaf-snap');
            wrap.style.transform = '';
            if (drag.neighborSvg) {
                wrap.innerHTML = drag.neighborSvg;
                mushafCurrentPage = drag.neighborPage;
                await injectMushafHitLayer(wrap, drag.neighborPage);
                updateMushafPageMeta(drag.neighborPage);
            }
            incomingEl.remove();
            mushafFollowAudio = false;
            updateMushafFollowBtnUI();
            if (mushafDrag === drag) mushafDrag = null;
        };
        
        if (drag.neighborSvg) {
            wrap.addEventListener('transitionend', finish, { once: true });
        } else {
            fetchMushafPageSvg(drag.neighborPage).then(svg => {
                drag.neighborSvg = svg;
                finish();
            });
        }
    } else {
        wrap.style.transform = '';
        if (incomingEl) incomingEl.style.transform = `translateX(${-dir * width}px)`;
        const cancel = () => {
            wrap.classList.remove('mushaf-snap');
            if (incomingEl) incomingEl.remove();
            if (mushafDrag === drag) mushafDrag = null;
        };
        wrap.addEventListener('transitionend', cancel, { once: true });
    }
}

function bindMushafDrag(view) {
    view.addEventListener('touchstart', (e) => {
        mushafDragOnStart(e.touches[0].clientX);
        if (mushafDrag) mushafDrag.startY = e.touches[0].clientY;
    }, { passive: true });

    view.addEventListener('touchmove', (e) => {
        if (!mushafDrag) return;
        const moved = mushafDragOnMove(e.touches[0].clientX, e.touches[0].clientY);
        if (moved && e.cancelable) e.preventDefault(); 
    }, { passive: false });

    view.addEventListener('touchend', () => {
        mushafDragOnEnd();
    }, { passive: true });

    view.addEventListener('touchcancel', () => {
        mushafDragOnEnd();
    }, { passive: true });
}

// يحدّث رقم الصفحة واسم الجزء الحاليين في بطاقة العرض السريع (يعمل دائماً أثناء التلاوة، سواء كانت صفحة المصحف مفتوحة أم لا)
function updatePlayerGlancePage(pageNum) {
    if (!pageNum) return;
    const glancePage = document.getElementById('player-glance-page');
    const glanceJuz = document.getElementById('player-glance-juz');
    if (glancePage) glancePage.textContent = `${translations[currentLang].pageLabel} ${pageNum}`;
    if (glanceJuz) glanceJuz.textContent = getJuzNameForPage(pageNum);
}

// يحدّث شريط معلومات الصفحة (اسم السورة، الجزء، رقم الصفحة) الظاهر فوق صورة المصحف مباشرة
function updateMushafPageMeta(pageNum, surahNumberHint) {
    if (!pageNum) return;
    const surahEl = document.getElementById('mushaf-meta-surah');
    const juzEl = document.getElementById('mushaf-meta-juz');
    const pageEl = document.getElementById('mushaf-meta-page');

    let surahNumber = surahNumberHint || null;
    if (!surahNumber) {
        const pageData = mushafPageJsonCache[pageNum];
        surahNumber = (pageData && pageData.length) ? pageData[0].surahNumber : null;
    }

    if (surahEl) {
        surahEl.textContent = surahNumber
            ? (currentLang === 'ar' ? `سورة ${surahNamesAr[surahNumber] || ''}` : (surahNamesEn[surahNumber] || ''))
            : '-';
    }
    if (juzEl) juzEl.textContent = getJuzNameForPage(pageNum);
    if (pageEl) pageEl.textContent = `${translations[currentLang].pageLabel} ${pageNum}`;
}

function buildMushafNavUI() {
    if (mushafNavUIBuilt) return;
    const view = document.getElementById('mushaf-page-view');
    if (!view) return;

    bindMushafDrag(view);
    mushafNavUIBuilt = true;
}

async function updateMushafHighlight(seg) {
    const myToken = ++mushafUpdateToken;
    const view = document.getElementById('mushaf-page-view');
    const wrap = document.getElementById('mushaf-page-wrap');

    if (wrap) {
        wrap.querySelectorAll('.mushaf-ayah-hit.active-mushaf-ayah')
            .forEach(el => el.classList.remove('active-mushaf-ayah'));
    }

    const showFallback = () => {
        if (!readingViewOpen) return;
        const data = juzDataCache[readingCacheKey()];
        renderReadingFallback(data || { segments: [] });
    };

    if (!view || !wrap || !seg || seg.surahNumber === null || seg.numberInSurah === null) {
        hideMushafView();
        showFallback();
        return;
    }

    if (!mushafFollowAudio && mushafCurrentPage !== null) {
        const livePageNum = await findMushafPage(seg.surahNumber, seg.numberInSurah);
        if (myToken !== mushafUpdateToken) return;
        if (livePageNum !== mushafCurrentPage) {
            view.classList.add('show');
            const ayatContainerEl1 = document.getElementById('ayat-container');
            if (ayatContainerEl1) ayatContainerEl1.classList.add('mushaf-hidden');
            buildMushafNavUI();
            updateMushafFollowBtnUI();
            return;
        }
        mushafFollowAudio = true;
        updateMushafFollowBtnUI();
    }

    const pageNum = await findMushafPage(seg.surahNumber, seg.numberInSurah);
    if (myToken !== mushafUpdateToken) return;
    if (!pageNum) {
        hideMushafView();
        showFallback();
        return;
    }

    updatePlayerGlancePage(pageNum);
    updateMushafPageMeta(pageNum, seg.surahNumber);

    if (!readingViewOpen) return;

    if (mushafCurrentPage !== pageNum) {
        const svgText = await fetchMushafPageSvg(pageNum);
        if (myToken !== mushafUpdateToken) return;
        if (!svgText || !readingViewOpen) {
            hideMushafView();
            showFallback();
            return;
        }
        wrap.innerHTML = svgText;
        mushafCurrentPage = pageNum;
        await injectMushafHitLayer(wrap, pageNum);
    }

    highlightMushafAyah(wrap, seg.surahNumber, seg.numberInSurah);
    view.classList.add('show');
    const ayatContainerEl2 = document.getElementById('ayat-container');
    if (ayatContainerEl2) ayatContainerEl2.classList.add('mushaf-hidden');
    buildMushafNavUI();
    updateMushafFollowBtnUI();
}

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

    const t = translations[currentLang];
    
    const mainTitleEl = document.getElementById('main-title');
    if (mainTitleEl) mainTitleEl.innerHTML = t.mainTitle;
    
    const resumeYes = document.getElementById('resume-btn-yes');
    if (resumeYes) resumeYes.textContent = t.resumeBtn;
    const resumeNo = document.getElementById('resume-btn-no');
    if (resumeNo) resumeNo.textContent = t.cancelBtn;
    const resumeTextEl = document.getElementById('resume-text');
    if (resumeTextEl && !window.resumeData) resumeTextEl.textContent = t.resumeTextDef;

    const installTitle = document.getElementById('install-title');
    if (installTitle) installTitle.textContent = t.installTitle;
    const installDesc = document.getElementById('install-desc');
    if (installDesc) installDesc.textContent = t.installDesc;

    const dlModalTitle = document.getElementById('dl-modal-title');
    if (dlModalTitle && (dlModalTitle.textContent.includes('جاري') || dlModalTitle.textContent.includes('Down'))) {
        dlModalTitle.textContent = t.downloading + "...";
    }

    const repeatLabel = document.getElementById('ayah-action-repeat-label');
    if (repeatLabel) repeatLabel.textContent = t.repeatAyah;
    const copyLabel = document.getElementById('ayah-action-copy-label');
    if (copyLabel) copyLabel.textContent = t.copyAyah;

    // تحديث نصوص الواجهة والصفحات
    const navHomeText = document.getElementById('nav-home-text');
    if(navHomeText) navHomeText.textContent = t.navHome;
    
    const navSurahsText = document.getElementById('nav-surahs-text');
    if(navSurahsText) navSurahsText.textContent = t.navSurahs;
    
    const navMushafText = document.getElementById('nav-mushaf-text');
    if(navMushafText) navMushafText.textContent = t.navMushaf;
    
    const navSettingsText = document.getElementById('nav-settings-text');
    if(navSettingsText) navSettingsText.textContent = t.navSettings;
    
    const settingsTitle = document.getElementById('settings-title');
    if(settingsTitle) settingsTitle.textContent = t.settingsTitle;
    
    const langText = document.getElementById('setting-lang-text');
    if(langText) langText.textContent = t.langText;
    
    const contactText = document.getElementById('setting-contact-text');
    if(contactText) contactText.textContent = t.contactText;

    const themeText = document.getElementById('setting-theme-text');
    if (themeText) {
        themeText.textContent = currentTheme === 'dark' ? t.themeTextLight : t.themeTextDark;
    }
    
    const mushafPlaceholder = document.getElementById('mushaf-placeholder');
    if (mushafPlaceholder) mushafPlaceholder.textContent = t.emptyMushaf;

    const editionsSectionTitle = document.getElementById('section-title-editions');
    if (editionsSectionTitle) editionsSectionTitle.textContent = t.chooseEditionSection;

    if (mushafCurrentPage !== null) updatePlayerGlancePage(mushafCurrentPage);

    updatePageMeta();
    setPlaybackMode(playbackMode);
    updateFocusHeader();
    updateMushafFollowBtnUI();
    renderEditionsGrid();
    
    if (currentEdition) {
        const config = editionsConfig[currentEdition];
        const titleEl = document.getElementById('selected-edition-title');
        if (titleEl) titleEl.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
    } else {
        const titleEl = document.getElementById('selected-edition-title');
        if (titleEl) titleEl.textContent = t.chooseEditionFirst;
    }
    
    if (activeSurahsData.length > 0) renderSurahsList();

    if (playingSurahId) {
        const sData = (editionDataCache[playingEditionId] || activeSurahsData).find(s => s.id === playingSurahId);
        if (sData) {
            const sName = getTrackName(sData);
            const trackTitle = document.getElementById('player-track-title');
            if(trackTitle) trackTitle.textContent = sName;
            const glanceSurah = document.getElementById('player-glance-surah');
            if (glanceSurah) glanceSurah.textContent = sName;
        }
        const glanceEdition = document.getElementById('player-glance-edition');
        if (glanceEdition) {
            const editionCfg = editionsConfig[playingEditionId];
            glanceEdition.textContent = editionCfg ? (currentLang === 'ar' ? editionCfg.nameAr : editionCfg.nameEn) : '';
        }
    }
}

function updatePageMeta() {
    const metaDesc = document.querySelector('meta[name="description"]');
    document.title = currentLang === 'ar' 
        ? "Egy Quran - الشيخ أحمد عيسى المعصراوي" 
        : "Egy Quran - Sheikh Ahmed Eisa Al-Ma'asrawi";
        
    if (metaDesc) {
        metaDesc.setAttribute("content", currentLang === 'ar'
            ? "استمع إلى القرآن الكريم بالروايات المتواترة بصوت الشيخ أحمد عيسى المعصراوي."
            : "Listen to the Holy Quran in various authentic narrations by Sheikh Ahmed Eisa Al-Ma'asrawi."
        );
    }
}

function updateThemeColorMeta() {
    const meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', currentTheme === 'dark' ? '#071b16' : '#0b2e25');
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = currentTheme === 'dark' ? 'dark-theme' : '';
    updateThemeColorMeta();
    
    const themeText = document.getElementById('setting-theme-text');
    if (themeText) {
        themeText.textContent = currentTheme === 'dark' ? translations[currentLang].themeTextLight : translations[currentLang].themeTextDark;
    }
}

// ── وضع الاستماع الهادئ (Focus Mode) ──
function toggleFocusMode(forceState = null, fromHistory = false) {
    let newState;
    if (typeof forceState === 'boolean') {
        newState = forceState;
    } else {
        newState = !isFocusMode;
    }

    if (isFocusMode === newState) return;
    
    isFocusMode = newState;
    document.body.classList.toggle('focus-mode-active', isFocusMode);

    if (isFocusMode) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (!fromHistory) history.pushState({ focusMode: true }, '');
    } else {
        if (!fromHistory && history.state && history.state.focusMode) {
            history.back();
        }
    }

    updateFocusHeader();
}

window.addEventListener('popstate', (e) => {
    if (isFocusMode) {
        toggleFocusMode(false, true);
    }
});

function updateFocusHeader() {
    const subtitleEl = document.getElementById('header-subtitle');
    if (!subtitleEl) return;
    
    if (isFocusMode && currentEdition) {
        const config = editionsConfig[currentEdition];
        subtitleEl.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
    } else {
        subtitleEl.textContent = translations[currentLang].subtitle;
    }
}

// ── عرض واختيار الروايات (الصفحة الرئيسية) ──
function getEditionCardLabel(nameAr) {
    // إزالة التشكيل فقط، مع إبقاء الاسم كاملاً لينكسر تلقائيًا على سطرين
    return nameAr.replace(/[\u064B-\u0652\u0670\u0640]/g, '').trim();
}

// ترتيب عرض الروايات في الصفحة الرئيسية: حفص/شعبة، ثم ورش/قالون، ثم السوسي/الدوري، ثم باقي الروايات بترتيبها الأصلي
const editionsDisplayOrder = [10, 9, 2, 1, 6, 5, 3, 4, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function renderEditionsGrid() {
    const grid = document.getElementById('editions-grid');
    if (!grid) return;

    grid.innerHTML = editionsDisplayOrder.map(key => {
        const config = editionsConfig[key];
        const name = currentLang === 'ar' ? getEditionCardLabel(config.nameAr) : config.nameEn;
        return `
            <div class="edition-card" onclick="selectEditionAndGo(${key})">
                <div class="edition-card-inner">
                    <div class="edition-card-name">${name}</div>
                    <div class="edition-card-icon">
                        <svg viewBox="0 0 32 32">
                            <rect x="9" y="5" width="17" height="22" rx="2" fill="#e9cf8c"/>
                            <rect x="6" y="4" width="18" height="24" rx="2.5" fill="#123c30" stroke="#c9a24a" stroke-width="1.2"/>
                            <rect x="8.4" y="6.4" width="13.2" height="19.2" rx="1.5" fill="none" stroke="#c9a24a" stroke-width="0.6" opacity="0.85"/>
                            <ellipse cx="15" cy="16" rx="4.2" ry="3" fill="none" stroke="#c9a24a" stroke-width="0.8"/>
                            <line x1="15" y1="13.3" x2="15" y2="18.7" stroke="#c9a24a" stroke-width="0.6"/>
                            <circle cx="10" cy="8.2" r="0.6" fill="#c9a24a"/>
                            <circle cx="20" cy="8.2" r="0.6" fill="#c9a24a"/>
                            <circle cx="10" cy="23.8" r="0.6" fill="#c9a24a"/>
                            <circle cx="20" cy="23.8" r="0.6" fill="#c9a24a"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function selectEditionAndGo(num) {
    if (currentEdition == num) {
        switchTab('surahs', { fromEditionPick: true });
        return;
    }

    currentEdition = num;
    safeLocalSet('maasrawi_edition', num);
    
    const config = editionsConfig[num];
    const titleEl = document.getElementById('selected-edition-title');
    if (titleEl) {
        titleEl.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
    }
    
    await loadEditionData(num);
    updateFocusHeader();
    
    switchTab('surahs', { fromEditionPick: true });
}

// ── تحميل وتنسيق بيانات الطبعة ──
// كل رواية تُخزَّن في هذه الذاكرة برقمها، بمعزل عن الرواية التي يتصفّحها المستخدم حالياً،
// حتى تبقى بيانات كل رواية (لأجل التشغيل التالي/السابق مثلاً) صحيحة دائماً
// حتى لو تنقّل المستخدم بين الروايات دون أن يشغّل شيئاً
const editionDataCache = {};

async function loadEditionData(editionNum) {
    const config = editionsConfig[editionNum];
    if (!config) return;

    // إن كانت بيانات هذه الرواية محمّلة مسبقاً في هذه الجلسة، اعرضها فوراً دون انتظار
    if (editionDataCache[editionNum]) {
        activeSurahsData = editionDataCache[editionNum];
    } else {
        activeSurahsData = [];
    }
    renderSurahsList();

    const cacheKey = `cache_${config.file}`;
    const cached = safeLocalGet(cacheKey);

    if (cached && !editionDataCache[editionNum]) {
        processAndSetData(cached, editionNum);
    }

    try {
        const res = await fetch(config.file);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        processAndSetData(data, editionNum);
        safeLocalSet(cacheKey, data);
    } catch (e) {
        console.error("تعذّر تحميل بيانات الرواية:", e);
        if (!cached) {
            showToast(translations[currentLang].fileNotFound);
        }
    }
}

function processAndSetData(rawData, editionNum) {
    const list = rawData.map((item, index) => ({
        id: item.id !== undefined ? item.id : (index + 1),
        name: item.title || item.name || `مقطع ${index + 1}`,
        url: item.url
    }));

    editionDataCache[editionNum] = list;

    // اعرض هذه البيانات فقط إن كانت لا تزال هي الرواية التي يتصفّحها المستخدم فعلاً في هذه اللحظة،
    // تفادياً لتحديث قائمة السور المعروضة برواية أخرى إن كان المستخدم قد انتقل بسرعة لرواية غيرها
    // قبل اكتمال هذا التحميل
    if (editionNum === currentEdition) {
        activeSurahsData = list;
        renderSurahsList();
    }
}

// ── رسم قائمة السور/الأجزاء ──
function renderSurahsList() {
    const container = document.getElementById('main-surah-list');
    if (!container) return;

    container.innerHTML = activeSurahsData.map(s => {
        const displayName = getTrackName(s);
        const actionsDir = currentLang === 'ar' ? 'row' : 'row-reverse';
        
        return `
            <div class="surah-row" data-id="${s.id}">
                <div class="surah-info">
                    <span class="surah-number">${String(s.id).padStart(3, '0')}</span>
                    <span class="surah-name">${displayName}</span>
                </div>
                <div class="surah-actions" style="flex-direction:${actionsDir}">
                    <button class="surah-action-btn play-cell"
                            onclick="event.stopPropagation(); playRowAudio(${s.id}, '${s.url}')"
                            aria-label="تشغيل ${displayName}">
                        ${icons.play}
                    </button>
                    <button class="surah-action-btn mushaf-cell"
                            onclick="event.stopPropagation(); openReadingJuz(${s.id}, '${s.url}')"
                            aria-label="فتح المصحف"
                            title="فتح المصحف">
                        ${icons.mushaf}
                    </button>
                    <button class="surah-action-btn"
                            onclick="event.stopPropagation(); startDownload(${s.id}, '${s.url}')"
                            aria-label="تحميل ${displayName}">
                        ${icons.download}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    syncUIWithAudioState();
}

// ── قائمة وضع التشغيل ──
function togglePlaybackMenu(event) {
    if (event) event.stopPropagation();
    playbackMenuOpen = !playbackMenuOpen;
    const menu = document.getElementById('playback-menu');
    const btn  = document.getElementById('btn-playback-mode');
    if (menu) menu.classList.toggle('show', playbackMenuOpen);
    if (btn) btn.setAttribute('aria-expanded', playbackMenuOpen ? 'true' : 'false');
}

document.addEventListener('click', (e) => {
    if (playbackMenuOpen && !e.target.closest('#playback-wrapper')) {
        togglePlaybackMenu();
    }
});

function setPlaybackMode(mode, event) {
    if (event) event.stopPropagation();
    playbackMode = mode;
    audioInstance.loop = (mode === 'loop');

    const btn      = document.getElementById('btn-playback-mode');
    const textSpan = document.getElementById('playback-text');
    const iconSvg  = document.getElementById('playback-icon');

    const modeMap = {
        autonext: {
            active: true, textAr: 'تلقائي', textEn: 'Auto',
            icon: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
        },
        loop: {
            active: true, textAr: 'تكرار', textEn: 'Loop',
            icon: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'
        },
        off: {
            active: false, textAr: 'إيقاف', textEn: 'Off',
            icon: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'
        }
    };

    const cfg = modeMap[mode] || modeMap.off;
    if (btn) btn.classList.toggle('active-feature', cfg.active);
    if (textSpan) textSpan.textContent = currentLang === 'ar' ? cfg.textAr : cfg.textEn;
    if (iconSvg) iconSvg.innerHTML = cfg.icon;

    renderPlaybackMenu();
    if (playbackMenuOpen) togglePlaybackMenu();
}

function renderPlaybackMenu() {
    const menu = document.getElementById('playback-menu');
    if (!menu) return;
    const items = [
        { id: 'autonext', textAr: 'تشغيل تلقائي', textEn: 'Auto-Next' },
        { id: 'loop',     textAr: 'تكرار المقطع',  textEn: 'Loop Track' },
        { id: 'off',      textAr: 'إيقاف',          textEn: 'Off' }
    ];
    menu.innerHTML = items.map(item => `
        <div class="playback-menu-item ${playbackMode === item.id ? 'active' : ''}"
             role="menuitem"
             onclick="setPlaybackMode('${item.id}', event)">
            ${currentLang === 'ar' ? item.textAr : item.textEn}
        </div>
    `).join('');
}

// ── التبديل بين حالات المشغل: دائرة عائمة صغيرة ← بطاقة عرض سريع ← المشغل الكامل ──
let hasLoadedTrack   = false; // هل تم تحميل أي مقطع صوتي حتى الآن (لإظهار المشغل/الدائرة من الأساس)
let playerExpanded   = false; // true = المشغل الكامل (بشريط التقدم والأزرار) مفتوح
let playerGlanceOpen = false; // true = بطاقة العرض السريع (صورة + سورة + صفحة فقط) مفتوحة

// الضغط على الدائرة العائمة: يفتح/يغلق بطاقة العرض السريع فقط (بدون شريط تقدم أو أزرار)
function togglePlayerGlance() {
    if (!hasLoadedTrack) return;
    playerGlanceOpen = !playerGlanceOpen;
    updatePlayerVisibility();
}

// الضغط على بطاقة العرض السريع: يفتح المشغل الكامل بشريط التقدم وكل الأزرار
function openFullPlayer() {
    if (!hasLoadedTrack) return;
    playerGlanceOpen = false;
    playerExpanded = true;
    updatePlayerVisibility();
}

// زر التصغير داخل المشغل الكامل: يعود مباشرة إلى الدائرة العائمة الصغيرة
function collapsePlayer() {
    playerExpanded = false;
    playerGlanceOpen = false;
    updatePlayerVisibility();
}

function updatePlayerVisibility() {
    const player = document.getElementById('global-player');
    const fab = document.getElementById('player-fab');
    const glance = document.getElementById('player-glance-card');
    if (!player || !fab || !glance) return;

    if (!hasLoadedTrack) {
        player.style.display = 'none';
        fab.style.display = 'none';
        glance.classList.remove('show');
        return;
    }

    player.style.display = 'block';
    player.classList.toggle('player-collapsed', !playerExpanded);
    fab.style.display = playerExpanded ? 'none' : 'flex';
    glance.classList.toggle('show', !playerExpanded && playerGlanceOpen);
}

// ── أنيميشن بصري للدائرة العائمة (نبضة موجات بسيطة، غير مرتبطة بتحليل صوت فعلي) ──
const playerFabCanvas = document.getElementById('player-fab-canvas');
const playerFabCtx = playerFabCanvas ? playerFabCanvas.getContext('2d') : null;
let playerFabRAF = null;
let playerFabPhase = 0;

function drawPlayerFabFrame() {
    playerFabRAF = requestAnimationFrame(drawPlayerFabFrame);
    if (!playerFabCtx) return;
    const fab = document.getElementById('player-fab');
    if (!fab || fab.style.display === 'none') return;

    playerFabPhase += 0.12;
    const w = playerFabCanvas.width, h = playerFabCanvas.height;
    playerFabCtx.clearRect(0, 0, w, h);
    playerFabCtx.fillStyle = '#ffffff';

    const barCount = 5, barWidth = 3, gap = 3;
    const totalWidth = barCount * barWidth + (barCount - 1) * gap;
    let x = (w - totalWidth) / 2;
    const maxBarHeight = h * 0.55, minBarHeight = h * 0.1;

    for (let i = 0; i < barCount; i++) {
        const level = (Math.sin(playerFabPhase + i * 1.1) + 1) / 2;
        const barH = Math.max(minBarHeight, level * maxBarHeight);
        const y = (h - barH) / 2;
        playerFabCtx.beginPath();
        if (playerFabCtx.roundRect) playerFabCtx.roundRect(x, y, barWidth, barH, barWidth / 2);
        else playerFabCtx.rect(x, y, barWidth, barH);
        playerFabCtx.fill();
        x += barWidth + gap;
    }
}

function startPlayerFabVisualizer() {
    if (!playerFabRAF) drawPlayerFabFrame();
}

function stopPlayerFabVisualizer() {
    if (playerFabRAF) { cancelAnimationFrame(playerFabRAF); playerFabRAF = null; }
    drawPlayerFabStatic();
}

// عند الإيقاف المؤقت: نرسم أيقونة تشغيل ثابتة بدل ترك الدائرة العائمة فارغة
function drawPlayerFabStatic() {
    if (!playerFabCtx || !playerFabCanvas) return;
    const w = playerFabCanvas.width, h = playerFabCanvas.height;
    playerFabCtx.clearRect(0, 0, w, h);
    playerFabCtx.fillStyle = '#ffffff';

    const size = h * 0.34;
    const cx = w / 2 + size * 0.14;
    const cy = h / 2;
    playerFabCtx.beginPath();
    playerFabCtx.moveTo(cx - size / 2, cy - size * 0.62);
    playerFabCtx.lineTo(cx - size / 2, cy + size * 0.62);
    playerFabCtx.lineTo(cx + size * 0.62, cy);
    playerFabCtx.closePath();
    playerFabCtx.fill();
}

// ── مزامنة واجهة المشغل مع حالة الصوت ──
function syncUIWithAudioState() {
    const isPlaying = !audioInstance.paused;
    const statusIcon = isBuffering ? icons.loading : (isPlaying ? icons.pause : icons.play);
    
    const playBtn = document.getElementById('player-play-btn');
    if (playBtn) {
        playBtn.innerHTML = statusIcon;
        playBtn.setAttribute('aria-label', isPlaying ? 'إيقاف مؤقت' : 'تشغيل');
    }

    const glancePlayBtn = document.getElementById('player-glance-play-btn');
    if (glancePlayBtn) {
        glancePlayBtn.innerHTML = statusIcon;
        glancePlayBtn.setAttribute('aria-label', isPlaying ? 'إيقاف مؤقت' : 'تشغيل');
    }

    const headerEq = document.getElementById('header-equalizer');
    if (headerEq) {
        headerEq.classList.toggle('playing', isPlaying && !isBuffering && currentEdition == playingEditionId);
    }

    document.querySelectorAll('.surah-row').forEach(row => {
        const sId = parseInt(row.getAttribute('data-id'), 10);
        const playBtnCell = row.querySelector('.play-cell');
        
        const isActive = (sId === playingSurahId && currentEdition === playingEditionId);
        
        row.classList.toggle('active-row', isActive);
        if (playBtnCell) {
            playBtnCell.innerHTML = isActive
                ? (isBuffering ? icons.loading : (isPlaying ? icons.pause : icons.play))
                : icons.play;
        }
    });
}

// ── تشغيل المقطع وتلقي وقت البداية ──
// editionNum: رقم الرواية التي ينتمي إليها هذا المقطع (تُستخدم الرواية المتصفَّحة حالياً كافتراضي
// عند التشغيل من قائمة السور، لكن يجب تمريرها صراحةً عند المتابعة للسورة التالية/السابقة
// حتى لا تختلط رواية القراءة الجارية بالرواية التي يتصفّحها المستخدم في تلك اللحظة)
function playSurah(id, url, startTime = 0, activateFocus = true, editionNum = currentEdition) {
    initAudioBoost();

    if (playingSurahId === id && playingEditionId === editionNum) {
        togglePlayPause(activateFocus);
        return;
    }

    if (activateFocus && !isFocusMode) {
        toggleFocusMode(true);
    }

    playingSurahId   = id;
    playingEditionId = editionNum;
    isBuffering      = true;

    if (readingJuzNum !== id || readingEditionNum !== editionNum) {
        switchReadingJuz(id, editionNum, startTime || 0);
    } else {
        currentAyahIndex = -1;
    }

    audioInstance.pause();
    audioInstance.src  = url;
    audioInstance.loop = (playbackMode === 'loop');
    audioInstance.load();

    if (startTime > 0) {
        const onLoadedMeta = () => {
            audioInstance.currentTime = startTime;
            audioInstance.removeEventListener('loadedmetadata', onLoadedMeta);
        };
        audioInstance.addEventListener('loadedmetadata', onLoadedMeta);
    }

    audioInstance.play().catch(e => {
        console.warn("Play error:", e);
        isBuffering = false;
        syncUIWithAudioState();
    });

    safeLocalSet('lastPlayedQuran', {
        edition: playingEditionId,
        surah: playingSurahId,
        time: startTime || 0,
        ayahIndex: currentAyahIndex
    });
    lastSaveTime = startTime || 0;

    const sData = (editionDataCache[editionNum] || activeSurahsData).find(s => s.id === id);
    const sName = getTrackName(sData);

    hasLoadedTrack = true;
    updatePlayerVisibility();

    const trackTitle = document.getElementById('player-track-title');
    if (trackTitle) trackTitle.textContent = sName;

    const glanceSurah = document.getElementById('player-glance-surah');
    if (glanceSurah) glanceSurah.textContent = sName;

    const glanceEdition = document.getElementById('player-glance-edition');
    if (glanceEdition) {
        const editionCfg = editionsConfig[editionNum];
        glanceEdition.textContent = editionCfg ? (currentLang === 'ar' ? editionCfg.nameAr : editionCfg.nameEn) : '';
    }

    syncUIWithAudioState();

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title:   sName,
            artist:  currentLang === 'ar' ? 'الشيخ أحمد عيسى المعصراوي' : 'Sheikh Ahmed Eisa Al-Ma\'asrawi',
            album:   currentLang === 'ar' ? editionsConfig[currentEdition].nameAr : editionsConfig[currentEdition].nameEn,
            artwork: [{ src: 'maasrawi.jpg', sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('play',          () => togglePlayPause());
        navigator.mediaSession.setActionHandler('pause',         () => togglePlayPause());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack',     () => playNext());
        navigator.mediaSession.setActionHandler('seekto',        (d) => { audioInstance.currentTime = d.seekTime; });
    }
}

function playRowAudio(id, url) {
    playSurah(id, url, 0, false);
}

// ── التحكم الأساسي ──
function togglePlayPause(activateFocus = true) {
    initAudioBoost();

    if (audioInstance.paused && audioInstance.src) {
        if (activateFocus && !isFocusMode) {
            toggleFocusMode(true);
        }
        
        isBuffering = true;
        syncUIWithAudioState();
        audioInstance.play().catch(e => {
            console.warn("Play error:", e);
            isBuffering = false;
            syncUIWithAudioState();
        });
    } else {
        audioInstance.pause();
    }
}

function playNext() {
    const list = editionDataCache[playingEditionId] || activeSurahsData;
    const idx = list.findIndex(s => s.id === playingSurahId);
    if (idx !== -1 && idx < list.length - 1) {
        const next = list[idx + 1];
        playSurah(next.id, next.url, 0, false, playingEditionId);
    }
}

function playPrevious() {
    const list = editionDataCache[playingEditionId] || activeSurahsData;
    const idx = list.findIndex(s => s.id === playingSurahId);
    if (idx > 0) {
        const prev = list[idx - 1];
        playSurah(prev.id, prev.url, 0, false, playingEditionId);
    }
}

// ── أحداث المشغل ──
audioInstance.addEventListener('waiting', () => { isBuffering = true;  syncUIWithAudioState(); });
audioInstance.addEventListener('playing', () => { isBuffering = false; syncUIWithAudioState(); });
audioInstance.addEventListener('play',    () => { isBuffering = true;  syncUIWithAudioState(); startPlayerFabVisualizer(); });
audioInstance.addEventListener('pause',   () => { stopPlayerFabVisualizer(); });
audioInstance.addEventListener('ended',   () => { stopPlayerFabVisualizer(); });

audioInstance.addEventListener('pause',   () => { 
    isBuffering = false; 
    syncUIWithAudioState(); 
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

    checkAyahRepeat();
    updateHighlight(audioInstance.currentTime);

    if (audioInstance.duration && !isDragging) {
        const pct = (audioInstance.currentTime / audioInstance.duration) * 100;
        if (fill)  fill.style.width = pct + '%';
        if (curr)  curr.textContent = formatTime(audioInstance.currentTime);
        if (total) total.textContent = formatTime(audioInstance.duration);

        if (progressContainer) progressContainer.setAttribute('aria-valuenow', Math.round(pct));

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

        if (playbackMode === 'autonext' && (audioInstance.duration - audioInstance.currentTime) < 15) {
            const nextList = editionDataCache[playingEditionId] || activeSurahsData;
            const idx = nextList.findIndex(s => s.id === playingSurahId);
            if (idx !== -1 && idx < nextList.length - 1) {
                const nextSurah = nextList[idx + 1];
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
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
        } else if (e.changedTouches && e.changedTouches[0]) {
            clientX = e.changedTouches[0].clientX;
        } else {
            clientX = 0;
        }
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
// شاشة القراءة والمزامنة (المصحف)
// ================================================
const SURAH_AYAH_COUNTS = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
    54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
    14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
    29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,
    11,8,3,9,5,4,7,3,6,3,5,4,5,6
];

const JUZ_START = [
    {surah:1,ayah:1},   {surah:2,ayah:142}, {surah:2,ayah:253}, {surah:3,ayah:93},
    {surah:4,ayah:24},  {surah:4,ayah:148}, {surah:5,ayah:82},  {surah:6,ayah:111},
    {surah:7,ayah:88},  {surah:8,ayah:41},  {surah:9,ayah:93},  {surah:11,ayah:6},
    {surah:12,ayah:53}, {surah:15,ayah:1},  {surah:17,ayah:1},  {surah:18,ayah:75},
    {surah:21,ayah:1},  {surah:23,ayah:1},  {surah:25,ayah:21}, {surah:27,ayah:56},
    {surah:29,ayah:46}, {surah:33,ayah:31}, {surah:36,ayah:28}, {surah:39,ayah:32},
    {surah:41,ayah:47}, {surah:46,ayah:1},  {surah:51,ayah:31}, {surah:58,ayah:1},
    {surah:67,ayah:1},  {surah:78,ayah:1}
];

function buildAyahRange(startSurah, startAyah, endSurah, endAyah) {
    const list = [];
    let s = startSurah, a = startAyah;
    while (s <= 114) {
        if (endSurah !== null && s === endSurah && a === endAyah) break;
        list.push({ surah: s, ayah: a });
        a++;
        if (a > SURAH_AYAH_COUNTS[s - 1]) { s++; a = 1; }
    }
    return list;
}

function getSurahAyahList(surahNum) {
    const count = SURAH_AYAH_COUNTS[surahNum - 1] || 0;
    const list = [];
    for (let a = 1; a <= count; a++) list.push({ surah: surahNum, ayah: a });
    return list;
}

function getJuzAyahList(juzNum) {
    const start = JUZ_START[juzNum - 1];
    if (!start) return [];
    const next = JUZ_START[juzNum] || null;
    return next
        ? buildAyahRange(start.surah, start.ayah, next.surah, next.ayah)
        : buildAyahRange(start.surah, start.ayah, null, null);
}

async function fetchReadingTimings(id, editionNum) {
    const folder = getTimeFolder(editionNum);
    if (!folder) return null;
    const fileName = `${folder}${pad3(id)}.json`;
    try {
        const res = await fetch(fileName);
        if (!res.ok) return null;
        const data = await res.json();
        return (Array.isArray(data) && data.length) ? data : null;
    } catch (e) {
        return null;
    }
}

async function loadReadingData(id, editionNum) {
    const cacheKey = readingCacheKey(editionNum, id);
    if (juzDataCache[cacheKey]) return juzDataCache[cacheKey];

    const mode     = getReadingMode(editionNum);
    const ayahList = mode === 'juz' ? getJuzAyahList(id) : getSurahAyahList(id);
    const timings  = await fetchReadingTimings(id, editionNum);

    let segments;
    let hasTiming = false;

    if (timings && timings.length) {
        hasTiming = true;
        segments = timings.map((t, i) => {
            const ref = ayahList[i] || null;
            return {
                start: t.start,
                end: t.end,
                surahNumber: Number(firstDefined(t.surahNumber, t.surah, ref ? ref.surah : null)),
                numberInSurah: Number(firstDefined(t.numberInSurah, t.ayahNumber, t.id, ref ? ref.ayah : null))
            };
        });
    } else {
        segments = ayahList.map(ref => ({
            start: null, end: null, surahNumber: ref.surah, numberInSurah: ref.ayah
        }));
    }

    const data = { segments, hasTiming };
    juzDataCache[cacheKey] = data;
    return data;
}

function renderReadingFallback(data) {
    const container = document.getElementById('ayat-container');
    if (!container) return;
    const msg = data.segments.length
        ? (currentLang === 'ar' ? 'صفحة المصحف لهذا الموضع لم تُرفع بعد' : 'This mushaf page has not been uploaded yet')
        : (currentLang === 'ar' ? 'تعذر تحميل بيانات هذا الموضع' : 'Unable to load this section');
    
    container.innerHTML = `<div class="empty-mushaf-msg"><p>${msg}</p></div>`;
    currentAyahIndex = -1;
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

function updateHighlight(currentTime, forceImmediate = false) {
    if (readingJuzNum === null || playingSurahId !== readingJuzNum || playingEditionId !== readingEditionNum) return;
    const data = juzDataCache[readingCacheKey()];
    if (!data || !data.segments.length) return;

    if (!data.hasTiming) {
        if (forceImmediate && currentAyahIndex !== 0) {
            currentAyahIndex = 0;
            updateMushafHighlight(data.segments[0]);
        }
        return;
    }

    const idx = findSegmentIndex(data.segments, currentTime);
    if (idx === currentAyahIndex) return;

    currentAyahIndex = idx;
    updateMushafHighlight(data.segments[idx]);
}

async function switchReadingJuz(id, editionNum, initialTime = null) {
    readingJuzNum = id;
    readingEditionNum = editionNum;
    currentAyahIndex = -1;
    mushafCurrentPage = null;
    mushafFollowAudio = true;
    stopAyahRepeat();
    closeAyahActionsMenu();
    hideMushafView();

    const container = document.getElementById('ayat-container');
    if (container) container.innerHTML = '';

    await loadReadingData(id, editionNum);
    updateHighlight(initialTime !== null ? initialTime : audioInstance.currentTime, true);
}

function seekToAyah(idx) {
    if (readingJuzNum === null) return;
    const data = juzDataCache[readingCacheKey()];
    if (!data || !data.segments[idx]) return;

    if (!mushafFollowAudio) {
        mushafFollowAudio = true;
        updateMushafFollowBtnUI();
    }

    if (repeatingAyahIndex !== null && repeatingAyahIndex !== idx) {
        stopAyahRepeat();
    }

    const seg = data.segments[idx];

    if (seg.start === null) {
        currentAyahIndex = idx;
        updateMushafHighlight(seg);
        const sameTrack = (playingSurahId === readingJuzNum && playingEditionId === readingEditionNum && audioInstance.src);
        if (!sameTrack) {
            const sData = (editionDataCache[readingEditionNum] || activeSurahsData).find(s => s.id === readingJuzNum);
            if (sData) playSurah(sData.id, sData.url, 0, false, readingEditionNum);
        }
        return;
    }

    const startTime = seg.start;
    const sameTrack = (playingSurahId === readingJuzNum && playingEditionId === readingEditionNum && audioInstance.src);

    if (sameTrack) {
        audioInstance.currentTime = startTime;
        if (audioInstance.paused) {
            audioInstance.play().catch(e => console.warn('Play error:', e));
        }
    } else {
        const sData = (editionDataCache[readingEditionNum] || activeSurahsData).find(s => s.id === readingJuzNum);
        if (sData) playSurah(sData.id, sData.url, startTime, false, readingEditionNum);
    }

    currentAyahIndex = -1;
    updateHighlight(startTime, true);
}

// ── دالة فتح المصحف ──
function openReadingJuz(id, url) {
    const editionNum = currentEdition;
    
    // تشغيل الصوت (مع تمرير false لمنع تفعيل وضع الاستماع الهادئ)
    if (!(playingSurahId === id && playingEditionId === editionNum)) {
        playSurah(id, url, 0, false); 
    }
    
    // إخفاء رسالة "المصحف فارغ"
    const emptyMsg = document.querySelector('.empty-mushaf-msg');
    if (emptyMsg) emptyMsg.style.display = 'none';

    // تهيئة شاشة المصحف
    if (readingJuzNum !== id || readingEditionNum !== editionNum) {
        switchReadingJuz(id, editionNum, audioInstance.currentTime);
    } else {
        updateHighlight(audioInstance.currentTime, true);
    }
    
    // نقل المستخدم فوراً إلى تاب المصحف
    switchTab('mushaf');
}

// ── أحداث الشبكة ──
window.addEventListener('online', () => {
    if (isBuffering && playingSurahId && !audioInstance.paused) {
        audioInstance.load();
        audioInstance.play().catch(console.warn);
        showToast(translations[currentLang].reconnected);
    }
});

window.addEventListener('offline', () => {
    if (!audioInstance.paused || isBuffering) {
        isBuffering = true;
        syncUIWithAudioState();
        showToast(translations[currentLang].disconnected);
    }
});

// ── تثبيت التطبيق (PWA) ──
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
        const bannerEl = document.getElementById('install-banner');
        if (bannerEl) bannerEl.classList.add('show');
    }, 2500);
});

const installActionBtn = document.getElementById('install-action-btn');
if (installActionBtn) installActionBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const bannerEl = document.getElementById('install-banner');
    if (bannerEl) bannerEl.classList.remove('show');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
    const bannerEl = document.getElementById('install-banner');
    if (bannerEl) bannerEl.classList.remove('show');
    showToast(translations[currentLang].installed);
});

// ── التهيئة الأولى ──
(async () => {
    updateThemeColorMeta();
    const themeText = document.getElementById('setting-theme-text');
    if (themeText) {
        themeText.textContent = currentTheme === 'dark' ? translations[currentLang].themeTextLight : translations[currentLang].themeTextDark;
    }

    setPlaybackMode('autonext');
    renderEditionsGrid();
    
    currentEdition = safeLocalGet('maasrawi_edition') || null;
    
    if (currentEdition) {
        await loadEditionData(currentEdition);
        const config = editionsConfig[currentEdition];
        const titleEl = document.getElementById('selected-edition-title');
        if(titleEl) titleEl.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
    }
})();