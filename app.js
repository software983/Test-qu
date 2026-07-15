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

// أسماء السور بالعربية (تُستخدم محلياً بدلاً من الاعتماد على واجهة برمجية خارجية لجلب النص)
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

// ── حالة شاشة القراءة والمزامنة ──

let readingJuzNum      = null;   // رقم الجزء المعروض حالياً في شاشة القراءة (يطابق s.id)
let readingViewOpen    = false;  // هل شاشة القراءة مفتوحة على الشاشة حالياً
let currentAyahIndex   = -1;     // فهرس الآية المظللة حالياً (يطابق index في ملف التوقيتات)
let currentReadingPage = null;   // رقم الصفحة المعروضة حالياً بالكامل أمام المستخدم في شاشة القراءة
const juzDataCache     = {};     // تخزين مؤقت لكل جزء: { segments: [...], pages: [...] }
const pageCoordCache   = {};     // تخزين مؤقت لملفات إحداثيات الصفحات (ayat_number/xxx.json)
let susiPagesRemoteMap = null;   // خريطة احتياطية (صفحة → رابط بديل) تُحمّل عند الحاجة فقط من susi_pages.json

// ── التظليل يعتمد الآن على صور المصحف (susi_quran) وإحداثيات الآيات (ayat_number)
//    بدلاً من جلب نص القرآن من أي واجهة برمجية خارجية ──

// أبعاد "اللوحة المرجعية" التي استُخرجت عليها إحداثيات ayat_number (بالبكسل).
// الإحداثيات تُحوَّل إلى نسب مئوية بناءً على هذا العرض، لذا تُطبَّق بشكل صحيح على أي حجم عرض فعلي للصورة.
// إن لاحظت انزياحاً بسيطاً في التظليل عن النص، عدّل هذين الرقمين فقط.
const COORD_CANVAS_WIDTH  = 733;
const COORD_CANVAS_HEIGHT = 1160;

// أول صفحة (من إجمالي 604 صفحة بالمصحف المعياري) يبدأ عندها كل جزء من الأجزاء الثلاثين
const JUZ_START_PAGE = [
    null, 1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
    201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
    402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];
const TOTAL_MUSHAF_PAGES = 604;

// إرجاع بادئة اسم ملفات الرواية الحالية (مثال: "susi" من "susi.json") لبناء مسارات الصور والتوقيتات الخاصة بها
function getRiwayaPrefix(editionNum) {
    const cfg = editionsConfig[editionNum];
    if (!cfg || !cfg.file) return null;
    return cfg.file.replace(/\.json$/i, '');
}

// مسار صورة صفحة معيّنة لرواية معيّنة: {prefix}_quran/{page}.webp
function getPageImagePath(editionNum, pageNum) {
    const prefix = getRiwayaPrefix(editionNum);
    if (!prefix) return null;
    return `${prefix}_quran/${String(pageNum).padStart(3, '0')}.webp`;
}

// مسار ملف توقيتات جزء معيّن لرواية معيّنة: {prefix}_time/{juz}_timings.json
function getTimingsPath(editionNum, juzId) {
    const prefix = getRiwayaPrefix(editionNum);
    if (!prefix) return null;
    return `${prefix}_time/${String(juzId).padStart(3, '0')}_timings.json`;
}

// نطاق الصفحات (من - إلى) التي يغطيها جزء معيّن، بالاعتماد على جدول بدايات الأجزاء الثابت
function getJuzPageRange(juzId) {
    const start = JUZ_START_PAGE[juzId];
    if (!start) return null;
    const end = (juzId < 30) ? (JUZ_START_PAGE[juzId + 1] - 1) : TOTAL_MUSHAF_PAGES;
    return [start, end];
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
    
    const mainTitleEl = document.getElementById('main-title');
    if (mainTitleEl) mainTitleEl.innerHTML = translations[currentLang].mainTitle;
    
    const resumeYes = document.getElementById('resume-btn-yes');
    if (resumeYes) resumeYes.textContent = translations[currentLang].resumeBtn;
    
    const resumeNo = document.getElementById('resume-btn-no');
    if (resumeNo) resumeNo.textContent = translations[currentLang].cancelBtn;
    
    const resumeTextEl = document.getElementById('resume-text');
    if (resumeTextEl && !window.resumeData) {
        resumeTextEl.textContent = translations[currentLang].resumeTextDef;
    }

    const installTitle = document.getElementById('install-title');
    if (installTitle) installTitle.textContent = translations[currentLang].installTitle;
    
    const installDesc = document.getElementById('install-desc');
    if (installDesc) installDesc.textContent = translations[currentLang].installDesc;
    
    const dropdownLabel = document.getElementById('dropdown-label');
    if (dropdownLabel) dropdownLabel.textContent = translations[currentLang].editionPrefix;

    const dlModalTitle = document.getElementById('dl-modal-title');
    if (dlModalTitle && (dlModalTitle.textContent.includes('جاري') || dlModalTitle.textContent.includes('Down'))) {
        dlModalTitle.textContent = translations[currentLang].downloading + "...";
    }

    updatePageMeta();
    setPlaybackMode(playbackMode);
    updateDropdownUI();
    updateFocusHeader();

    if (activeSurahsData.length > 0) renderSurahsList();

    if (playingSurahId) {
        const sData = activeSurahsData.find(s => s.id === playingSurahId);
        if (sData) {
            document.getElementById('player-track-title').textContent = getTrackName(sData);
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

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = currentTheme === 'dark' ? 'dark-theme' : '';
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.innerHTML = currentTheme === 'dark' ? icons.moon : icons.sun;
        themeBtn.setAttribute('aria-label', currentTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن');
    }
}

// ── وضع الاستماع الهادئ (Focus Mode) مع History API ──

function toggleFocusMode(forceState = null, fromHistory = false) {
    let newState;
    if (typeof forceState === 'boolean') {
        newState = forceState;
    } else {
        newState = !isFocusMode;
    }

    if (isFocusMode === newState) return;
    
    isFocusMode = newState;
    const focusBtn = document.getElementById('focus-toggle-btn');
    document.body.classList.toggle('focus-mode-active', isFocusMode);

    if (isFocusMode) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        focusBtn?.classList.add('active-feature');
        focusBtn?.setAttribute('aria-pressed', 'true');
        
        if (!fromHistory) {
            history.pushState({ focusMode: true }, '');
        }
    } else {
        focusBtn?.classList.remove('active-feature');
        focusBtn?.setAttribute('aria-pressed', 'false');
        
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
    if (readingViewOpen) {
        closeReadingView(true);
    }
});

function updateFocusHeader() {
    const subtitleEl = document.getElementById('header-subtitle');
    if (!subtitleEl) return;
    
    if (isFocusMode) {
        const config = editionsConfig[currentEdition];
        subtitleEl.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
    } else {
        subtitleEl.textContent = translations[currentLang].subtitle;
    }
}

// ── القائمة المنسدلة للروايات ──

function toggleDropdown() {
    isDropdownOpen = !isDropdownOpen;
    const list = document.getElementById('edition-list');
    const header = document.querySelector('.dropdown-header');
    if (list) list.classList.toggle('show', isDropdownOpen);
    if (header) header.classList.toggle('open', isDropdownOpen);
}

document.addEventListener('click', (e) => {
    if (isDropdownOpen && !e.target.closest('#edition-dropdown')) {
        toggleDropdown();
    }
});

function renderDropdownOptions() {
    const list = document.getElementById('edition-list');
    if (!list) return;

    list.innerHTML = Object.keys(editionsConfig).map(key => {
        const config = editionsConfig[key];
        const name = currentLang === 'ar' ? config.nameAr : config.nameEn;
        return `
            <div class="dropdown-item ${currentEdition == key ? 'active' : ''}" 
                 onclick="selectEdition(${key}, event)"
                 role="option">
                <span>${name}</span>
            </div>
        `;
    }).join('');
}

function updateDropdownUI() {
    const config = editionsConfig[currentEdition];
    const nameEl = document.getElementById('selected-edition-name');
    
    if (nameEl) {
        if (config) {
            nameEl.textContent = currentLang === 'ar' ? config.nameAr : config.nameEn;
        } else {
            nameEl.textContent = currentLang === 'ar' ? "اختر الرواية" : "Choose Edition";
        }
    }
    renderDropdownOptions();
    syncUIWithAudioState();
}

async function selectEdition(num, event) {
    if (event) event.stopPropagation();
    if (isDropdownOpen) toggleDropdown();
    if (currentEdition == num) return;

    currentEdition = num;
    safeLocalSet('maasrawi_edition', num);
    updateDropdownUI();
    await loadEditionData(num);
    updateFocusHeader();

    if (playingSurahId && playingEditionId === currentEdition) {
        const sData = activeSurahsData.find(sur => sur.id === playingSurahId);
        if (sData && !audioInstance.src) {
            audioInstance.src = sData.url;
            const player = document.getElementById('global-player');
            if (player) player.style.display = 'block';
            const trackTitle = document.getElementById('player-track-title');
            if (trackTitle) trackTitle.textContent = getTrackName(sData);
            syncUIWithAudioState();
        }
    }
}

// ── تحميل وتنسيق بيانات الطبعة ──

async function loadEditionData(editionNum) {
    const config = editionsConfig[editionNum];
    if (!config) return;

    activeSurahsData = [];
    renderSurahsList();

    const cacheKey = `cache_${config.file}`;
    const cached = safeLocalGet(cacheKey);
    
    if (cached) {
        processAndSetData(cached);
    }

    try {
        const res = await fetch(config.file);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        processAndSetData(data);
        safeLocalSet(cacheKey, data);
    } catch (e) {
        console.error("تعذّر تحميل بيانات الرواية:", e);
        if (!cached) {
            showToast(translations[currentLang].fileNotFound);
        }
    }
}

function processAndSetData(rawData) {
    activeSurahsData = rawData.map((item, index) => ({
        id: item.id !== undefined ? item.id : (index + 1),
        name: item.title || item.name || `مقطع ${index + 1}`,
        url: item.url
    }));
    renderSurahsList();
}

// ── رسم قائمة السور/الأجزاء ──

function renderSurahsList() {
    const container = document.getElementById('main-surah-list');
    if (!container) return;

    if (!currentEdition) {
        container.innerHTML = `
            <div class="choose-edition-msg" style="text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: 20px; margin: 20px 0; border: 2px dashed var(--primary-gold); animation: fadeIn 0.8s ease-out;">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-gold)" stroke-width="2" style="width: 50px; height: 50px; margin-bottom: 15px; animation: bounceUp 2s infinite;">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                <p style="font-size: 1.2rem; font-weight: 700; color: var(--primary-gold); margin-bottom: 5px; font-family: 'Cairo', sans-serif;">
                    ${currentLang === 'ar' ? 'يرجى اختيار الرواية من القائمة أعلاه للبدء' : 'Please choose an edition from the menu above to start'}
                </p>
                <p style="font-size: 0.9rem; color: var(--text-muted); opacity: 0.8;">
                    ${currentLang === 'ar' ? 'استمتع بتلاوات الشيخ المعصراوي بالقراءات العشر' : 'Enjoy Sheikh Al-Ma\'asrawi\'s recitations in the ten readings'}
                </p>
                <style>
                    @keyframes bounceUp {
                        0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                        40% {transform: translateY(-10px);}
                        60% {transform: translateY(-5px);}
                    }
                    @keyframes fadeIn {
                        from {opacity: 0; transform: translateY(10px);}
                        to {opacity: 1; transform: translateY(0);}
                    }
                </style>
            </div>
        `;
        return;
    }

    container.innerHTML = activeSurahsData.map(s => {
        const displayName = getTrackName(s);
        const actionsDir = currentLang === 'ar' ? 'row' : 'row-reverse';
        
        return `
            <div class="surah-row" data-id="${s.id}">
                <div class="surah-info" onclick="openReadingJuz(${s.id}, '${s.url}')" role="button" tabindex="0" style="cursor:pointer;">
                    <span class="surah-number">${String(s.id).padStart(3, '0')}</span>
                    <span class="surah-name">${displayName}</span>
                </div>
                <div class="surah-actions" style="flex-direction:${actionsDir}">
                    <button class="surah-action-btn play-cell"
                            onclick="openReadingJuz(${s.id}, '${s.url}')"
                            aria-label="تشغيل ${displayName}">
                        ${icons.play}
                    </button>
                    <button class="surah-action-btn"
                            onclick="startDownload(${s.id}, '${s.url}')"
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

// ── مزامنة واجهة المشغل مع حالة الصوت ──

function syncUIWithAudioState() {
    const isPlaying = !audioInstance.paused;
    const statusIcon = isBuffering ? icons.loading : (isPlaying ? icons.pause : icons.play);
    
    const playBtn = document.getElementById('player-play-btn');
    if (playBtn) {
        playBtn.innerHTML = statusIcon;
        playBtn.setAttribute('aria-label', isPlaying ? 'إيقاف مؤقت' : 'تشغيل');
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

function playSurah(id, url, startTime = 0) {
    initAudioBoost();

    // إذا كان المقطع نفسه يعمل بالفعل، سنقوم بالتبديل بين التشغيل والإيقاف
    if (playingSurahId === id && playingEditionId === currentEdition) {
        togglePlayPause();
        return;
    }

    // تفعيل وضع الاستماع الهادئ فقط عند بدء تشغيل مقطع جديد
    if (!isFocusMode) {
        toggleFocusMode(true);
    }

    playingSurahId   = id;
    playingEditionId = currentEdition;
    isBuffering      = true;

    // إذا كانت شاشة القراءة مرتبطة بجزء آخر، حدّثها لتتابع الجزء الجديد تلقائياً
    // (يحدث هذا عند التالي/السابق أو الانتقال التلقائي بعد انتهاء المقطع)
    if (readingJuzNum !== null && readingJuzNum !== id) {
        switchReadingJuz(id, startTime || 0);
    } else {
        currentAyahIndex = -1;
    }

    audioInstance.pause();
    audioInstance.src  = url;
    audioInstance.loop = (playbackMode === 'loop');
    audioInstance.load();

    // القفز للدقيقة المحفوظة بمجرد أن تصبح بيانات الصوت جاهزة
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

    // الحفظ المبدئي
    safeLocalSet('lastPlayedQuran', {
        edition: playingEditionId,
        surah: playingSurahId,
        time: startTime || 0,
        ayahIndex: currentAyahIndex
    });
    lastSaveTime = startTime || 0;

    const sData = activeSurahsData.find(s => s.id === id);
    const sName = getTrackName(sData);

    const player = document.getElementById('global-player');
    if (player) player.style.display = 'block';
    
    const trackTitle = document.getElementById('player-track-title');
    if (trackTitle) trackTitle.textContent = sName;

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

// ── التحكم الأساسي ──

function togglePlayPause() {
    initAudioBoost();

    if (audioInstance.paused && audioInstance.src) {
        // تفعيل وضع الاستماع الهادئ فقط عند الضغط على تشغيل (إذا لم يكن مفعلاً)
        if (!isFocusMode) {
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
        // عند الإيقاف المؤقت، نكتفي بإيقاف الصوت دون تغيير وضع الاستماع الهادئ
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

// ── أحداث المشغل ──

audioInstance.addEventListener('waiting', () => { isBuffering = true;  syncUIWithAudioState(); });
audioInstance.addEventListener('playing', () => { isBuffering = false; syncUIWithAudioState(); });
audioInstance.addEventListener('play',    () => { isBuffering = true;  syncUIWithAudioState(); });

// حفظ الوقت الدقيق عند الإيقاف المؤقت
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

    // ملاحظة هامة: شريط التحميل يتطلب تفعيل CORS من طرف الخادم (r2.dev).
    // إذا لم يكن مفعلًا، سيتم التحميل مباشرة عبر المتصفح.
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
            a.download = `${sName}.mp4`; // تغيير الصيغة لـ m4a أو mp4 حسب الملف
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
// شاشة القراءة والمزامنة (نص القرآن + التوقيتات)
// ================================================

// اسم السورة بالعربية أو الإنجليزية بحسب اللغة الحالية، اعتماداً على رقم السورة فقط (بدون أي جلب نص)
function surahDisplayName(surahNumber) {
    if (!surahNumber) return '';
    return currentLang === 'ar'
        ? (surahNamesAr[surahNumber] || '')
        : (surahNamesEn[surahNumber] || '');
}

// جلب/تخزين ملف إحداثيات صفحة معيّنة من مجلد ayat_number (ملف واحد مشترك بين كل الروايات)
async function fetchPageCoords(pageNum) {
    if (pageCoordCache[pageNum]) return pageCoordCache[pageNum];
    const fileName = `ayat_number/${String(pageNum).padStart(3, '0')}.json`;
    try {
        const res = await fetch(fileName);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        pageCoordCache[pageNum] = data;
        return data;
    } catch (e) {
        console.warn(`تعذر تحميل إحداثيات الصفحة ${pageNum}:`, e);
        pageCoordCache[pageNum] = null;
        return null;
    }
}

// تجميع إحداثيات صفحة واحدة إلى مجموعات "آيات" (كل آية قد تمتد على أكثر من سطر)، محافظين على ترتيب القراءة كما هو في الملف
function groupPageAyahs(entries) {
    const groups = [];
    let current = null;
    entries.forEach(e => {
        if (!current || current.surahNumber !== e.surah_number || current.ayahNumber !== e.ayah_number) {
            current = { surahNumber: e.surah_number, ayahNumber: e.ayah_number, rects: [] };
            groups.push(current);
        }
        current.rects.push({
            leftPct:   (e.min_x / COORD_CANVAS_WIDTH) * 100,
            topPct:    (e.min_y / COORD_CANVAS_HEIGHT) * 100,
            widthPct:  ((e.max_x - e.min_x) / COORD_CANVAS_WIDTH) * 100,
            heightPct: ((e.max_y - e.min_y) / COORD_CANVAS_HEIGHT) * 100
        });
    });
    return groups;
}

// جلب رابط بديل لصورة صفحة من susi_pages.json (يُستخدم فقط إذا لم تكن الصورة المحلية متوفرة بعد)
async function getRemotePageFallback(pageNum) {
    if (susiPagesRemoteMap === null) {
        try {
            const res = await fetch('susi_pages.json');
            const list = res.ok ? await res.json() : [];
            susiPagesRemoteMap = {};
            (list || []).forEach(p => { susiPagesRemoteMap[p.id] = p.url; });
        } catch (e) {
            susiPagesRemoteMap = {};
        }
    }
    return susiPagesRemoteMap[pageNum] || null;
}

// عند فشل تحميل صورة صفحة محلياً: نجرب الرابط البديل إن وُجد، وإلا نعرض رسالة "غير متوفرة"
async function handlePageImageError(imgEl, pageNum) {
    if (imgEl.dataset.fallbackTried === '1') {
        const wrap = imgEl.closest('.quran-page-wrap');
        if (wrap) {
            wrap.classList.add('unavailable');
            wrap.innerHTML = `<div class="page-missing">${currentLang === 'ar' ? `صفحة ${pageNum} غير متوفرة بعد` : `Page ${pageNum} not available yet`}</div>`;
        }
        return;
    }
    imgEl.dataset.fallbackTried = '1';
    const fallbackUrl = await getRemotePageFallback(pageNum);
    if (fallbackUrl) {
        imgEl.src = fallbackUrl;
    } else {
        const wrap = imgEl.closest('.quran-page-wrap');
        if (wrap) {
            wrap.classList.add('unavailable');
            wrap.innerHTML = `<div class="page-missing">${currentLang === 'ar' ? `صفحة ${pageNum} غير متوفرة بعد` : `Page ${pageNum} not available yet`}</div>`;
        }
    }
}

// جلب ملف توقيتات الجزء الخاص بالرواية الحالية (susi_time أو مكافئه لكل رواية) دون أي تعديل على محتواه
async function fetchJuzTimings(juzId) {
    const fileName = getTimingsPath(currentEdition, juzId);
    if (!fileName) throw new Error('تعذر تحديد مسار ملف التوقيتات للرواية الحالية');
    const res = await fetch(fileName);
    if (!res.ok) throw new Error(`تعذر تحميل ملف التوقيتات: ${fileName}`);
    return await res.json();
}

// تحميل بيانات جزء معيّن: توقيتات الصوت + صور الصفحات + إحداثيات الآيات، وربطها معاً حسب ترتيب القراءة
async function loadJuzReadingData(juzId) {
    if (juzDataCache[juzId]) return juzDataCache[juzId];

    const loadingEl   = document.getElementById('reading-loading');
    const containerEl = document.getElementById('ayat-container');
    if (loadingEl)   loadingEl.classList.add('show');
    if (containerEl) containerEl.innerHTML = '';

    try {
        const range = getJuzPageRange(juzId);
        if (!range) throw new Error(`تعذر تحديد نطاق صفحات الجزء ${juzId}`);
        const [startPage, endPage] = range;

        const timings = await fetchJuzTimings(juzId);
        if (!timings || !timings.length) {
            throw new Error('ملف التوقيتات فارغ أو غير موجود لهذا الجزء');
        }

        // تحميل إحداثيات كل صفحات الجزء بالتوازي
        const pageNumbers = [];
        for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);
        const coordsList = await Promise.all(pageNumbers.map(p => fetchPageCoords(p)));

        // بناء تسلسل الآيات المرتب لكامل الجزء (صفحة بعد صفحة) + بيانات الصفحات للعرض
        const ayahSequence = []; // { surahNumber, ayahNumber, page }
        const pages = [];        // { pageNumber, imgSrc, unavailable, boxes: [{idx,...}] }

        pageNumbers.forEach((pageNum, pIdx) => {
            const coords = coordsList[pIdx];
            if (!coords || !coords.length) {
                pages.push({ pageNumber: pageNum, imgSrc: null, unavailable: true, boxes: [] });
                return;
            }
            const groups = groupPageAyahs(coords);
            const boxes = [];
            groups.forEach(g => {
                const seqIdx = ayahSequence.length;
                ayahSequence.push({ surahNumber: g.surahNumber, ayahNumber: g.ayahNumber, page: pageNum });
                g.rects.forEach(r => boxes.push({ idx: seqIdx, ...r }));
            });
            pages.push({
                pageNumber: pageNum,
                imgSrc: getPageImagePath(currentEdition, pageNum),
                unavailable: false,
                boxes
            });
        });

        if (ayahSequence.length && ayahSequence.length !== timings.length) {
            // تسجيل عدم التطابق فقط دون كسر التجربة — يتم الاعتماد على أقصر مصفوفة متاحة لكل موضع
            console.warn(`عدم تطابق بين عدد آيات الجزء ${juzId} (${ayahSequence.length}) وعدد مقاطع التوقيت (${timings.length}).`);
        }

        const segments = timings.map((t, i) => {
            const a = ayahSequence[i] || null;
            return {
                start: t.start,
                end: t.end,
                surahNumber: a ? a.surahNumber : null,
                ayahNumber: a ? a.ayahNumber : null,
                page: a ? a.page : null
            };
        });

        const data = { segments, pages };
        juzDataCache[juzId] = data;
        return data;
    } catch (e) {
        console.error(e);
        showToast(currentLang === 'ar' ? 'تعذر تحميل بيانات هذا الجزء' : 'Failed to load this juz data');
        return { segments: [], pages: [] };
    } finally {
        if (loadingEl) loadingEl.classList.remove('show');
    }
}

// رسم صفحات المصحف (صور) لجزء معيّن، مع طبقة شفافة فوق كل صفحة تحتوي مربعات تظليل الآيات
function renderReadingView(juzId, data) {
    const container = document.getElementById('ayat-container');
    if (!container) return;

    if (!data.pages || !data.pages.length) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:40px 10px;">
            ${currentLang === 'ar' ? 'تعذر عرض صفحات هذا الجزء' : 'Unable to display pages for this juz'}
        </p>`;
        return;
    }

    let html = '';
    data.pages.forEach(pg => {
        if (pg.unavailable) {
            html += `<div class="quran-page-wrap unavailable" data-page="${pg.pageNumber}">
                <div class="page-missing">${currentLang === 'ar' ? `صفحة ${pg.pageNumber} غير متوفرة بعد` : `Page ${pg.pageNumber} not available yet`}</div>
            </div>`;
            return;
        }

        html += `<div class="quran-page-wrap" data-page="${pg.pageNumber}">
            <img class="quran-page-img" src="${pg.imgSrc}" alt="${currentLang === 'ar' ? 'صفحة' : 'Page'} ${pg.pageNumber}" loading="lazy" onerror="handlePageImageError(this, ${pg.pageNumber})">
            <div class="ayah-overlay">`;

        pg.boxes.forEach(b => {
            html += `<div class="ayah-box" data-idx="${b.idx}" style="left:${b.leftPct}%;top:${b.topPct}%;width:${b.widthPct}%;height:${b.heightPct}%;" onclick="seekToAyah(${b.idx})"></div>`;
        });

        html += `</div><div class="page-number-label">${pg.pageNumber}</div></div>`;
    });

    container.innerHTML = html;
    currentAyahIndex = -1;   // إعادة ضبط ليُعاد احتسابها عند أول تحديث للتظليل
    currentReadingPage = null; // إعادة ضبط الصفحة المعروضة؛ ستُحدَّد الصفحة الصحيحة عند أول تحديث للتظليل

    // إظهار أول صفحة متاحة مبدئياً كحالة افتراضية ريثما يحدد updateHighlight الصفحة الصحيحة بحسب موضع الصوت
    const firstWrap = container.querySelector('.quran-page-wrap');
    if (firstWrap) {
        firstWrap.classList.add('active-page');
        currentReadingPage = parseInt(firstWrap.dataset.page, 10);
    }
}

// إظهار صفحة واحدة بأكملها أمام المستخدم وإخفاء باقي الصفحات، بحيث لا تنتقل الصفحة
// إلا بعد أن ينتهي القارئ من آخر آية في الصفحة الحالية (يُستدعى من updateHighlight)
function setActiveReadingPage(pageNumber) {
    if (!pageNumber || pageNumber === currentReadingPage) return;
    const container = document.getElementById('ayat-container');
    if (!container) return;

    container.querySelectorAll('.quran-page-wrap.active-page').forEach(el => el.classList.remove('active-page'));
    const nextWrap = container.querySelector(`.quran-page-wrap[data-page="${pageNumber}"]`);
    if (nextWrap) {
        nextWrap.classList.add('active-page');
        currentReadingPage = pageNumber;
    }
}

// بحث ثنائي عن مقطع الآية المطابق للحظة زمنية معينة — لضمان دقة وسلاسة التظليل
function findSegmentIndex(segments, t) {
    let lo = 0, hi = segments.length - 1, ans = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (segments[mid].start <= t) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return ans;
}

// تحديث تظليل الآية الحالية (قد تمتد على أكثر من مربع/سطر) + الانتقال لصفحتها إن تغيّرت
function updateHighlight(currentTime, forceImmediate = false) {
    if (readingJuzNum === null || playingSurahId !== readingJuzNum) return;
    const data = juzDataCache[readingJuzNum];
    if (!data || !data.segments.length) return;

    const idx = findSegmentIndex(data.segments, currentTime);
    if (idx === currentAyahIndex) return;

    // الانتقال إلى صفحة هذه الآية (تظهر الصفحة بأكملها؛ لا تنتقل الصفحة إلا بعد انتهاء آخر آية في الصفحة الحالية)
    const seg = data.segments[idx];
    if (seg && seg.page) setActiveReadingPage(seg.page);

    // نزيل أي تظليل سابق لضمان بقاء آية واحدة فقط مظللة
    document.querySelectorAll('.ayah-box.active-ayah').forEach(el => el.classList.remove('active-ayah'));

    const newBoxes = document.querySelectorAll(`.ayah-box[data-idx="${idx}"]`);
    if (newBoxes.length) {
        newBoxes.forEach(el => el.classList.add('active-ayah'));
    }

    currentAyahIndex = idx;
}

// تحميل/تبديل شاشة القراءة على جزء معيّن (تحمّل ملف توقيتات هذا الجزء فقط)
async function switchReadingJuz(id, initialTime = null) {
    readingJuzNum = id;
    currentAyahIndex = -1;

    const data = await loadJuzReadingData(id);
    renderReadingView(id, data);
    updateHighlight(initialTime !== null ? initialTime : audioInstance.currentTime, true);
}

// فتح شاشة القراءة لجزء معيّن (يحمّل بياناته إن لم تكن محمّلة مسبقاً)
function showReadingView(juzId, initialTime = null) {
    const wasOpen = readingViewOpen;
    readingViewOpen = true;
    document.getElementById('reading-view')?.classList.add('show');

    // نسجّل حالة جديدة في تاريخ المتصفح عند فتح شاشة القراءة فعلياً (وليس عند مجرد تبديل الجزء وهي مفتوحة أصلاً)،
    // حتى يعمل زر الرجوع في الهاتف (والإيماءة) على إغلاقها بدلاً من الخروج من التطبيق
    if (!wasOpen) {
        history.pushState({ readingView: true }, '');
    }

    if (readingJuzNum !== juzId || !juzDataCache[juzId]) {
        switchReadingJuz(juzId, initialTime);
    } else {
        // عند إعادة فتح الشاشة، نقوم بإعادة تعيين الفهرس لضمان تشغيل التمرير التلقائي فوراً
        currentAyahIndex = -1;
        updateHighlight(initialTime !== null ? initialTime : audioInstance.currentTime, true);
        
        // محاولة إضافية لضمان التمرير بعد اكتمال رندر الصفحة
        setTimeout(() => {
            if (readingViewOpen && readingJuzNum === juzId) {
                updateHighlight(audioInstance.currentTime, true);
            }
        }, 100);
    }
}

// إغلاق شاشة القراءة. تُغلق عبر زر/إيماءة الرجوع في الهاتف أو المتصفح (لا يوجد شريط علوي داخل الشاشة نفسها)
// (fromHistory = true تعني أن الإغلاق جاء من حدث popstate بالفعل)
function closeReadingView(fromHistory = false) {
    readingViewOpen = false;
    document.getElementById('reading-view')?.classList.remove('show');

    if (!fromHistory && history.state && history.state.readingView) {
        history.back();
    }
}

// الضغط على أي آية: تشغيل الصوت مباشرة من توقيت بدايتها
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

// فتح شاشة القراءة المزامنة عند الضغط على جزء من القائمة (وتشغيله إن لم يكن قيد التشغيل)
function openReadingJuz(id, url) {
    const alreadyPlayingThis = (playingSurahId === id && playingEditionId === currentEdition);
    if (!alreadyPlayingThis) {
        playSurah(id, url);
    }
    showReadingView(id);
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
        document.getElementById('install-banner')?.classList.add('show');
    }, 2500);
});

document.getElementById('install-action-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    document.getElementById('install-banner')?.classList.remove('show');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner')?.classList.remove('show');
    showToast(translations[currentLang].installed);
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            // التحقق من وجود تحديثات كلما فتح المستخدم التطبيق
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // إظهار توست للمستخدم يخبره بوجود تحديث
                        showToast(currentLang === 'ar' ? "تم تحميل تحديث جديد، جاري التنشيط..." : "New update loaded, activating...");
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }
                });
            });
        }).catch(err => console.error('SW registration failed:', err));
    });
}

// ── التهيئة الأولى ──

(async () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.innerHTML = currentTheme === 'dark' ? icons.moon : icons.sun;

    setPlaybackMode('autonext');

    // تم تعطيل استعادة الرواية من الذاكرة ليكون الاختيار يدوياً دائماً عند فتح التطبيق
    /*
    const savedEdition = safeLocalGet('maasrawi_edition');
    if (savedEdition && editionsConfig[savedEdition]) {
        currentEdition = savedEdition;
    }
    */
    
    updateDropdownUI();
    if (currentEdition) {
        await loadEditionData(currentEdition);
        updateFocusHeader();
    } else {
        renderSurahsList(); // ستعرض قائمة فارغة أو رسالة
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
            // إرفاق الوقت المحفوظ إلى بيانات الاستئناف
            window.resumeData = { 
                id: sData.id, 
                url: sData.url, 
                edition: savedState.edition,
                time: savedState.time || 0,
                ayahIndex: typeof savedState.ayahIndex === 'number' ? savedState.ayahIndex : -1
            };
            
            setTimeout(closeResumeBanner, 15000);
        }
    }
})();