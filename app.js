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

// أسماء السور بالعربية (بيانات ثابتة محلية لعرض عنوان السورة في شاشة القراءة دون أي اتصال خارجي)
const surahNamesAr = [
    "", "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال",
    "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف",
    "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص",
    "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص",
    "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح",
    "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد",
    "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم",
    "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان",
    "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج",
    "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين",
    "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة",
    "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"
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
const juzDataCache     = {};     // تخزين مؤقت لكل جزء: { segments: [...] }

// مصادر محلية بديلة عن أي API خارجي: صور المصحف (susi_quran) + الإحداثيات (ayat_number) + التوقيتات (susi_time)
const ayahLocationMap  = {};     // "surah:ayah" -> { page, boxes: [{min_x,max_x,min_y,max_y}, ...] }
let   ayahOrderedList  = [];     // ترتيب الآيات كما اكتُشفت بالتتابع من الصفحات المتوفرة، بدءاً من 1:1
let   ayatScanPromise  = null;   // يضمن تنفيذ عملية مسح صفحات الإحداثيات مرة واحدة فقط
const juzSegmentCounts = {};     // juzId -> عدد مقاطع التوقيت في ملفه (لحساب إزاحة كل جزء ضمن ترتيب الآيات)
const pageAyahMap        = {};   // رقم الصفحة -> قائمة الآيات الموجودة فيها [{surah, ayah, key}, ...]
const ayahKeyToGlobalIdx = new Map(); // "surah:ayah" -> فهرسها العام ضمن ayahOrderedList (بحث سريع دون مسح كامل القائمة)

// مسح ملفات الإحداثيات (ayat_number) صفحة صفحة بدءاً من 1 حتى أول صفحة غير موجودة، وبناء خريطة
// "سورة:آية" -> موقعها (رقم الصفحة + مربعات الإحاطة)، بالكامل من ملفات محلية دون أي اتصال خارجي.
// عند إضافة صفحات جديدة لاحقاً (ayat_number + susi_quran) ستُكتشف تلقائياً في المرة القادمة.
function ensureAyatScan() {
    if (!ayatScanPromise) {
        ayatScanPromise = (async () => {
            let n = 1;
            while (true) {
                let data = null;
                try {
                    const res = await fetch(`ayat_number/${String(n).padStart(3, '0')}.json`, { cache: 'no-store' });
                    if (!res.ok) break;
                    data = await res.json();
                } catch (e) { break; }
                if (!Array.isArray(data) || !data.length) break;

                const sorted = [...data].sort((a, b) => (a.line_number - b.line_number) || (a.position - b.position));
                sorted.forEach(entry => {
                    const key = `${entry.surah_number}:${entry.ayah_number}`;
                    if (!ayahLocationMap[key]) {
                        ayahLocationMap[key] = { page: n, boxes: [] };
                        ayahKeyToGlobalIdx.set(key, ayahOrderedList.length);
                        ayahOrderedList.push({ surah: entry.surah_number, ayah: entry.ayah_number, key });
                        if (!pageAyahMap[n]) pageAyahMap[n] = [];
                        pageAyahMap[n].push({ surah: entry.surah_number, ayah: entry.ayah_number, key });
                    }
                    ayahLocationMap[key].boxes.push({
                        min_x: entry.min_x, max_x: entry.max_x, min_y: entry.min_y, max_y: entry.max_y
                    });
                });
                n++;
            }
        })();
    }
    return ayatScanPromise;
}

// حساب إزاحة آيات جزء معيّن ضمن الترتيب العام (مجموع عدد مقاطع كل الأجزاء التي تسبقه)، بالاعتماد فقط
// على ملفات susi_time محلياً — مع توقف مبكر بمجرد التأكد أن هذا الجزء يتجاوز ما هو متوفر حالياً من صفحات
async function computeJuzOffset(juzId) {
    if (juzId <= 1) return 0;
    let sum = 0;
    for (let j = 1; j < juzId; j++) {
        if (sum > ayahOrderedList.length) return sum; // هذا الجزء بالتأكيد خارج نطاق الصفحات المتوفرة حالياً
        if (juzSegmentCounts[j] === undefined) {
            try {
                const t = await fetchJuzTimings(j);
                juzSegmentCounts[j] = t.length;
            } catch (e) {
                juzSegmentCounts[j] = 0;
            }
        }
        sum += juzSegmentCounts[j];
    }
    return sum;
}

// يحدد الجزء الذي تقع ضمنه آية معينة (بفهرسها العام) وموقعها المحلي داخل مقاطع ذلك الجزء — يُستخدم لتشغيل
// أي آية يُضغط عليها فوق أي صفحة، حتى لو كانت تلك الصفحة تنتمي لجزء مختلف عن الجزء المشغَّل حالياً
async function findJuzForAyahGlobalIndex(globalIdx) {
    let sum = 0;
    for (let j = 1; j <= 30; j++) {
        if (juzSegmentCounts[j] === undefined) {
            try {
                const t = await fetchJuzTimings(j);
                juzSegmentCounts[j] = t.length;
            } catch (e) {
                juzSegmentCounts[j] = 0;
            }
        }
        if (globalIdx < sum + juzSegmentCounts[j]) {
            return { juzId: j, localIndex: globalIdx - sum };
        }
        sum += juzSegmentCounts[j];
    }
    return null;
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

    if (radioState.isPlaying) pauseRadio();

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
    if (player) {
        player.style.display = 'block';
        player.classList.remove('radio-mode');
    }
    
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

// جلب ملف توقيتات الجزء (كما هو دون أي تعديل)
async function fetchJuzTimings(juzId) {
    const fileName = `susi_time/${String(juzId).padStart(3, '0')}_timings.json`;
    const res = await fetch(fileName);
    if (!res.ok) throw new Error(`تعذر تحميل ملف التوقيتات: ${fileName}`);
    return await res.json();
}

// تحميل بيانات جزء معيّن: توقيتات (susi_time) مربوطة بموقعها في المصحف (ayat_number + susi_quran)،
// بالكامل من ملفات محلية دون أي اتصال بأي API خارجي لجلب نص القرآن
async function loadJuzReadingData(juzId) {
    if (juzDataCache[juzId]) return juzDataCache[juzId];

    const loadingEl = document.getElementById('reading-loading');
    if (loadingEl) loadingEl.classList.add('show');

    try {
        await ensureAyatScan();
        const timings = await fetchJuzTimings(juzId);
        juzSegmentCounts[juzId] = timings.length;

        if (!timings || !timings.length) {
            throw new Error('ملف التوقيتات فارغ أو غير موجود لهذا الجزء');
        }

        const offset = await computeJuzOffset(juzId);

        const segments = timings.map((t, i) => {
            const globalIdx = offset + i;
            const ayahRef = ayahOrderedList[globalIdx] || null;
            const loc = ayahRef ? ayahLocationMap[ayahRef.key] : null;
            return {
                start: t.start,
                end: t.end,
                surahNumber: ayahRef ? ayahRef.surah : null,
                numberInSurah: ayahRef ? ayahRef.ayah : null,
                page: loc ? loc.page : null,
                boxes: loc ? loc.boxes : null
            };
        });

        const data = { segments };
        juzDataCache[juzId] = data;
        return data;
    } catch (e) {
        console.error(e);
        showToast(currentLang === 'ar' ? 'تعذر تحميل بيانات هذا الجزء' : 'Failed to load this juz data');
        return { segments: [] };
    } finally {
        if (loadingEl) loadingEl.classList.remove('show');
    }
}

// تهيئة شاشة القراءة عند تبديل الجزء: إخفاء الصفحة/الرسالة السابقة ريثما يُحدَّد الموضع الحالي
function renderReadingView(juzId, data) {
    currentAyahIndex = -1;
    currentDisplayedPage = null;
    manualBrowsePage = null;

    const wrap = document.getElementById('mushaf-page-wrap');
    const unavailable = document.getElementById('mushaf-unavailable');
    if (wrap) wrap.style.display = 'none';

    if (!data.segments.length && unavailable) {
        const txt = document.getElementById('mushaf-unavailable-text');
        if (txt) txt.textContent = currentLang === 'ar' ? 'تعذر تحميل بيانات هذا الجزء' : 'Failed to load this juz data';
        unavailable.style.display = 'flex';
    } else if (unavailable) {
        unavailable.style.display = 'none';
    }
}

// عرض صفحة المصحف المطابقة للآية الحالية مع تظليل مربعاتها، أو رسالة "غير متوفرة" إن لم تتوفر صورتها بعد
let currentDisplayedPage = null;
let lastRenderedSeg      = null;
let manualBrowsePage     = null;  // الصفحة المعروضة يدوياً بعد السحب بالإصبع (تتجاوز مزامنة الصوت مؤقتاً)
let totalMushafPages     = 604;   // إجمالي عدد صفحات المصحف (كما في susi_pages.json)، قيمة افتراضية يتم تحديثها إن أمكن

// تحديث العدد الفعلي لصفحات المصحف من susi_pages.json إن كان متوفراً (بدون كسر أي شيء عند فشل الجلب)
(async function loadTotalMushafPages() {
    try {
        const res = await fetch('susi_pages.json', { cache: 'force-cache' });
        if (!res.ok) return;
        const list = await res.json();
        if (Array.isArray(list) && list.length) totalMushafPages = list.length;
    } catch (e) { /* نتجاهل الخطأ ونبقى على القيمة الافتراضية */ }
})();

window.addEventListener('resize', () => {
    if (!readingViewOpen) return;
    if (lastRenderedSeg) showMushafPage(lastRenderedSeg);
    else if (manualBrowsePage) renderAyahBoxesForPage(manualBrowsePage);
});

// رسم مربعات كل آيات صفحة معينة فوق صورتها، بحيث يمكن الضغط على أي آية لتشغيلها فوراً من بدايتها —
// تعمل بشكل مستقل عن الجزء المحمَّل حالياً في شاشة القراءة (تعتمد على خريطة الإحداثيات العامة)،
// لذا تبقى الآيات قابلة للضغط والتشغيل حتى أثناء التصفح اليدوي لصفحات خارج الجزء المُشغَّل حالياً
function renderAyahBoxesForPage(pageNum) {
    const img   = document.getElementById('mushaf-page-img');
    const layer = document.getElementById('mushaf-highlight-layer');
    if (!img || !layer) return;

    ensureAyatScan().then(() => {
        // تفادي عرض مربعات صفحة تجاوزها المستخدم بالفعل أثناء التحميل
        if (currentDisplayedPage !== pageNum) return;

        const draw = () => {
            if (currentDisplayedPage !== pageNum || !img.naturalWidth || !img.naturalHeight) return;
            layer.innerHTML = '';
            const scaleX = img.clientWidth / img.naturalWidth;
            const scaleY = img.clientHeight / img.naturalHeight;

            // الآية النشطة حالياً (إن كانت هذه الصفحة مرتبطة بالجزء المُشغَّل والمُزامَن صوتياً الآن)
            const activeData = readingJuzNum !== null ? juzDataCache[readingJuzNum] : null;
            const activeSeg = (activeData && playingSurahId === readingJuzNum)
                ? activeData.segments[currentAyahIndex] : null;

            (pageAyahMap[pageNum] || []).forEach(a => {
                const loc = ayahLocationMap[a.key];
                if (!loc) return;
                const isActive = !!(activeSeg && activeSeg.page === pageNum &&
                    activeSeg.surahNumber === a.surah && activeSeg.numberInSurah === a.ayah);
                loc.boxes.forEach(b => {
                    const box = document.createElement('div');
                    box.className = 'ayah-highlight-box' + (isActive ? ' active' : '');
                    box.style.left   = `${b.min_x * scaleX}px`;
                    box.style.top    = `${b.min_y * scaleY}px`;
                    box.style.width  = `${(b.max_x - b.min_x) * scaleX}px`;
                    box.style.height = `${(b.max_y - b.min_y) * scaleY}px`;
                    box.onclick = () => playAyahByKey(a.surah, a.ayah);
                    layer.appendChild(box);
                });
            });
        };

        if (img.complete && img.naturalWidth) draw();
        else img.addEventListener('load', draw, { once: true });
    });
}

function showMushafPage(seg) {
    lastRenderedSeg = seg;
    const wrap        = document.getElementById('mushaf-page-wrap');
    const unavailable  = document.getElementById('mushaf-unavailable');
    const img          = document.getElementById('mushaf-page-img');
    const layer        = document.getElementById('mushaf-highlight-layer');
    if (!wrap || !unavailable || !img || !layer) return;

    if (!seg || !seg.page) {
        wrap.style.display = 'none';
        const txt = document.getElementById('mushaf-unavailable-text');
        if (txt) {
            txt.textContent = currentLang === 'ar'
                ? 'صورة هذه الصفحة غير متوفرة بعد — ستظهر تلقائياً عند إضافتها'
                : 'This page image is not available yet — it will appear automatically once added';
        }
        unavailable.style.display = 'flex';
        currentDisplayedPage = null;
        return;
    }

    unavailable.style.display = 'none';
    wrap.style.display = 'block';
    manualBrowsePage = null; // عودة إلى وضع المزامنة مع الصوت بمجرد عرض صفحة مرتبطة بآية حالية

    if (currentDisplayedPage !== seg.page) {
        currentDisplayedPage = seg.page;
        img.onload = () => renderAyahBoxesForPage(seg.page);
        img.onerror = () => showMushafPage(null);
        img.src = `susi_quran/${String(seg.page).padStart(3, '0')}.webp`;
        img.alt = seg.surahNumber ? `${surahNamesAr[seg.surahNumber] || ''} - آية ${seg.numberInSurah}` : '';
    } else {
        renderAyahBoxesForPage(seg.page);
    }
}

// عرض صفحة معينة يدوياً (بعد سحب الإصبع) دون أي ربط مسبق بمقطع صوتي — تصفح حر لكل صفحات المصحف،
// مع بقاء كل آية قابلة للضغط لبدء تشغيلها فوراً (انظر renderAyahBoxesForPage و playAyahByKey)
function showRawPage(pageNum) {
    const wrap        = document.getElementById('mushaf-page-wrap');
    const unavailable = document.getElementById('mushaf-unavailable');
    const img         = document.getElementById('mushaf-page-img');
    const layer       = document.getElementById('mushaf-highlight-layer');
    if (!wrap || !unavailable || !img || !layer) return;
    if (pageNum < 1 || pageNum > totalMushafPages) return;

    manualBrowsePage     = pageNum;
    lastRenderedSeg      = null;

    if (currentDisplayedPage === pageNum) {
        // الصفحة معروضة بالفعل (مثلاً بعد رسوم تقليب الصفحة): فقط تأكد من رسم المربعات
        unavailable.style.display = 'none';
        wrap.style.display = 'block';
        renderAyahBoxesForPage(pageNum);
        return;
    }

    currentDisplayedPage = pageNum;
    layer.innerHTML      = '';

    unavailable.style.display = 'none';
    wrap.style.display = 'block';
    img.onload  = () => renderAyahBoxesForPage(pageNum);
    img.onerror = () => {
        wrap.style.display = 'none';
        const txt = document.getElementById('mushaf-unavailable-text');
        if (txt) {
            txt.textContent = currentLang === 'ar'
                ? 'صورة هذه الصفحة غير متوفرة بعد'
                : 'This page image is not available yet';
        }
        unavailable.style.display = 'flex';
    };
    img.src = `susi_quran/${String(pageNum).padStart(3, '0')}.webp`;
    img.alt = '';
}

// إعداد إيماءة السحب بالإصبع على صورة المصحف للتنقل بين الصفحات يدوياً، بحركة سلسة تتبع الإصبع أثناء
// السحب (تقليب حقيقي مثل صفحات المصحف الورقي) بدلاً من قفزة فورية عند مجرد اللمس — وتدعم كلا الاتجاهين:
// السحب لليمين (شمال إلى يمين) يعرض الصفحة السابقة، والسحب لليسار يعرض الصفحة التالية
(function setupMushafSwipeNavigation() {
    let startX = 0, startY = 0;
    let tracking = false, dragging = false, dragDx = 0;
    let incomingImg = null, incomingPage = null;
    const FLIP_THRESHOLD = 60; // أدنى مسافة سحب (بالبكسل) لإتمام تقليب الصفحة بدل الرجوع لمكانها
    const ANIM_MS = 280;

    const wrapEl = () => document.getElementById('mushaf-page-wrap');

    function cleanupIncoming() {
        if (incomingImg && incomingImg.parentNode) incomingImg.parentNode.removeChild(incomingImg);
        incomingImg = null;
        incomingPage = null;
    }

    // ملاحظة: incomingImg هو ابن لعنصر wrap، لذا فهو يتحرك تلقائياً مع تحويل wrap (translateX(dx))؛
    // لا يحتاج سوى تحويله الخاص الثابت (موضع راحته قبل السحب) وليس dx مضافاً إليه مرة أخرى
    function ensureIncoming(pageNum, dx) {
        const wrap = wrapEl();
        if (!wrap) return null;
        if (incomingPage !== pageNum) {
            cleanupIncoming();
            const width = wrap.clientWidth || 1;
            const img = document.createElement('img');
            img.className = 'mushaf-page-img-incoming';
            img.alt = '';
            img.src = `susi_quran/${String(pageNum).padStart(3, '0')}.webp`;
            img.style.transform = `translateX(${dx < 0 ? width : -width}px)`;
            wrap.insertBefore(img, wrap.firstChild);
            incomingImg = img;
            incomingPage = pageNum;
        }
        return incomingImg;
    }

    function resetWrap(wrap) {
        wrap.classList.remove('dragging');
        wrap.style.transition = '';
        wrap.style.transform = '';
        wrap.style.height = '';
    }

    document.addEventListener('touchstart', (e) => {
        if (!readingViewOpen || e.touches.length !== 1) return;
        const wrap = wrapEl();
        if (!wrap || wrap.style.display === 'none' || !wrap.contains(e.target)) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
        dragging = false;
        dragDx = 0;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!tracking) return;
        const wrap = wrapEl();
        if (!wrap) { tracking = false; return; }

        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (!dragging) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            // سحب رأسي بالأساس: نتركه للتمرير العادي للصفحة ولا نتدخل فيه
            if (Math.abs(dx) <= Math.abs(dy) * 1.2) { tracking = false; return; }
            dragging = true;
            wrap.style.height = `${wrap.getBoundingClientRect().height}px`;
            wrap.classList.add('dragging');
        }

        e.preventDefault();
        const page = manualBrowsePage || currentDisplayedPage || 1;
        // في اتجاه المصحف (RTL): السحب لليسار يكشف الصفحة التالية، والسحب لليمين (شمال إلى يمين) يكشف السابقة
        const targetPage = dx < 0 ? page + 1 : page - 1;

        if (targetPage < 1 || targetPage > totalMushafPages) {
            // لا توجد صفحة في هذا الاتجاه: مقاومة خفيفة بدل تجاهل السحب كلياً (إحساس بحافة المصحف)
            dragDx = dx * 0.25;
            wrap.style.transform = `translateX(${dragDx}px)`;
            cleanupIncoming();
            return;
        }

        dragDx = dx;
        wrap.style.transform = `translateX(${dx}px)`;
        ensureIncoming(targetPage, dx);
    }, { passive: false });

    function finishDrag() {
        const wrap = wrapEl();
        tracking = false;
        if (!dragging || !wrap) { dragging = false; cleanupIncoming(); return; }
        dragging = false;

        const width = wrap.clientWidth || 1;
        const shouldFlip = Math.abs(dragDx) > FLIP_THRESHOLD && incomingPage;

        wrap.style.transition = `transform ${ANIM_MS}ms ease-out`;

        if (shouldFlip) {
            const goingNext = dragDx < 0;
            const finalPage = incomingPage;
            // incomingImg تابع لـ wrap فيتحرك تلقائياً معه أثناء هذا الانتقال دون أي تحويل إضافي عليه
            wrap.style.transform = `translateX(${goingNext ? -width : width}px)`;
            setTimeout(() => {
                resetWrap(wrap);
                cleanupIncoming();
                showRawPage(finalPage);
            }, ANIM_MS);
        } else {
            wrap.style.transform = 'translateX(0px)';
            setTimeout(() => {
                resetWrap(wrap);
                cleanupIncoming();
            }, ANIM_MS);
        }
        dragDx = 0;
    }

    document.addEventListener('touchend', finishDrag, { passive: true });
    document.addEventListener('touchcancel', () => {
        const wrap = wrapEl();
        tracking = false;
        dragging = false;
        dragDx = 0;
        if (wrap) resetWrap(wrap);
        cleanupIncoming();
    }, { passive: true });
})();

function updateReadingSurahTitle(seg) {
    const titleEl = document.getElementById('reading-surah-title');
    if (!titleEl) return;
    if (seg && seg.surahNumber) {
        const name = currentLang === 'ar' ? surahNamesAr[seg.surahNumber] : surahNamesEn[seg.surahNumber];
        titleEl.textContent = name ? `${translations[currentLang].surahPrefix} ${name}` : '';
    } else {
        titleEl.textContent = '';
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

// تحديث صفحة المصحف المعروضة وتظليل الآية الحالية بحسب الوقت الجاري
function updateHighlight(currentTime, forceImmediate = false) {
    if (readingJuzNum === null || playingSurahId !== readingJuzNum) return;
    const data = juzDataCache[readingJuzNum];
    if (!data || !data.segments.length) return;

    const idx = findSegmentIndex(data.segments, currentTime);
    if (idx === currentAyahIndex && !forceImmediate) return;

    currentAyahIndex = idx;
    const seg = data.segments[idx];
    showMushafPage(seg);
    updateReadingSurahTitle(seg);
}

// تحميل/تبديل شاشة القراءة على جزء معيّن (تحمّل ملف توقيتات هذا الجزء فقط)
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

// إغلاق شاشة القراءة. عند الضغط على زر الرجوع في الشريط العلوي نستخدم history.back()
// ليعمل بالتناسق مع زر رجوع الهاتف (fromHistory = true تعني أن الإغلاق جاء من حدث popstate بالفعل)
function closeReadingView(fromHistory = false) {
    readingViewOpen = false;
    document.getElementById('reading-view')?.classList.remove('show');

    if (!fromHistory && history.state && history.state.readingView) {
        history.back();
    }
}

// الضغط على أي آية فوق أي صفحة معروضة: تشغيل الصوت مباشرة من توقيت بدايتها، حتى لو كانت هذه الآية
// تنتمي لجزء مختلف عن الجزء المُشغَّل حالياً (يبدّل الجزء المعروض/المشغَّل تلقائياً عند الحاجة)
async function playAyahByKey(surah, ayah) {
    const key = `${surah}:${ayah}`;
    await ensureAyatScan();
    const globalIdx = ayahKeyToGlobalIdx.get(key);
    if (globalIdx === undefined) return;

    const found = await findJuzForAyahGlobalIndex(globalIdx);
    if (!found) return;
    const { juzId, localIndex } = found;

    const data = await loadJuzReadingData(juzId);
    const seg = data.segments[localIndex];
    if (!seg) return;

    const sameTrack = (playingSurahId === juzId && playingEditionId === currentEdition && audioInstance.src);

    if (sameTrack) {
        if (readingJuzNum !== juzId) {
            await switchReadingJuz(juzId, seg.start);
        }
        audioInstance.currentTime = seg.start;
        if (audioInstance.paused) {
            audioInstance.play().catch(e => console.warn('Play error:', e));
        }
        currentAyahIndex = localIndex;
        updateHighlight(seg.start, true);
    } else {
        // playSurah يتكفّل تلقائياً بمزامنة شاشة القراءة مع الجزء الجديد إن كانت مفتوحة على جزء آخر
        const sData = activeSurahsData.find(s => s.id === juzId);
        if (sData) playSurah(sData.id, sData.url, seg.start);
    }
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

// ================================================
// الإذاعة المباشرة الوهمية (Pseudo Live Radio)
// ================================================
// فكرة العمل: كل الأجهزة تحسب نفس "الموضع الافتراضي" داخل حلقة تشغيل
// لا نهائية بالاعتماد فقط على الوقت الحقيقي Date.now() ومدد الملفات
// الفعلية، بدون أي حفظ لموضع المستخدم. أي مستخدمين يفتحان الإذاعة في
// نفس اللحظة سيسمعان نفس المقطع في نفس الثانية تقريباً.

const radioAudio = new Audio();
radioAudio.preload = 'none';

const radioState = {
    playlist: [],       // [{ title, url, duration }]
    cumulative: [],     // بداية كل ملف بالثواني من أول الحلقة
    totalDuration: 0,   // إجمالي مدة الحلقة بالثواني
    ready: false,       // هل تم قياس كل المدد الفعلية بنجاح
    loading: false,
    currentIndex: -1,
    isPlaying: false,
    resyncTimer: null
};

// قياس مدة ملف صوتي واحد فعلياً (metadata فقط دون تحميل الملف كاملاً)
function probeAudioDuration(url) {
    return new Promise((resolve) => {
        const probe = new Audio();
        probe.preload = 'metadata';
        let settled = false;

        const finish = (dur) => {
            if (settled) return;
            settled = true;
            probe.src = '';
            resolve(dur);
        };

        probe.addEventListener('loadedmetadata', () => {
            finish(isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 0);
        });
        probe.addEventListener('error', () => finish(0));
        // مهلة أمان في حال بطء الشبكة
        setTimeout(() => finish(isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 0), 12000);

        probe.src = url;
    });
}

// تجهيز قائمة تشغيل الإذاعة وحساب مدد الملفات الفعلية مرة واحدة
async function loadRadioPlaylist() {
    if (radioState.ready || radioState.loading) return radioState.ready;
    radioState.loading = true;

    try {
        const res = await fetch('radio.json', { cache: 'no-store' });
        const list = await res.json();

        const withDurations = await Promise.all(
            list.map(async (item) => ({
                title: item.title,
                url: item.url,
                duration: await probeAudioDuration(item.url)
            }))
        );

        // استبعاد أي ملف تعذر قياس مدته لتفادي كسر حساب المواضع
        const valid = withDurations.filter(f => f.duration > 0);

        if (!valid.length) throw new Error('no valid radio files');

        let cum = 0;
        const cumulative = [];
        valid.forEach(f => { cumulative.push(cum); cum += f.duration; });

        radioState.playlist       = valid;
        radioState.cumulative     = cumulative;
        radioState.totalDuration  = cum;
        radioState.ready          = true;
        return true;
    } catch (e) {
        console.warn('Radio playlist load error:', e);
        showToast(translations[currentLang].networkError);
        return false;
    } finally {
        radioState.loading = false;
    }
}

// حساب الموضع الحالي (رقم الملف + الثانية داخله) اعتماداً فقط على الوقت الحقيقي
function computeLivePosition() {
    const totalMs = radioState.totalDuration * 1000;
    if (!totalMs) return { index: 0, offset: 0 };

    const elapsedSec = (Date.now() % totalMs) / 1000;

    let idx = radioState.cumulative.length - 1;
    for (let i = 0; i < radioState.cumulative.length; i++) {
        const start = radioState.cumulative[i];
        const end   = start + radioState.playlist[i].duration;
        if (elapsedSec >= start && elapsedSec < end) { idx = i; break; }
    }

    const offset = elapsedSec - radioState.cumulative[idx];
    return { index: idx, offset: Math.max(0, offset) };
}

function setRadioLoadingUI(isLoading) {
    const btn = document.getElementById('radio-play-btn');
    const icon = document.getElementById('radio-play-icon');
    const globalPlayBtn = document.getElementById('player-play-btn');
    
    if (btn && icon) {
        btn.classList.toggle('loading', isLoading);
        icon.innerHTML = isLoading
            ? '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>'
            : (radioState.isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>');
    }

    if (globalPlayBtn) {
        globalPlayBtn.innerHTML = isLoading ? icons.loading : (radioState.isPlaying ? icons.pause : icons.play);
    }
}

function updateRadioTrackTitle() {
    const el = document.getElementById('radio-track-title');
    const globalTitle = document.getElementById('player-track-title');
    const f = radioState.playlist[radioState.currentIndex];
    const title = f ? f.title : (currentLang === 'ar' ? 'إذاعة الشيخ المعصراوي' : 'Sheikh Al-Maasrawi Radio');
    
    if (el) el.textContent = title;
    if (globalTitle) globalTitle.textContent = title;
}

function setOnAirIndicator(on) {
    document.getElementById('radio-toggle-btn')?.classList.toggle('on-air', on);
    document.getElementById('radio-eq')?.classList.toggle('playing', on);
}

// تشغيل الملف المناسب للحظة الحالية فعلياً على عنصر الصوت
function tuneInToLivePosition() {
    const { index, offset } = computeLivePosition();
    const file = radioState.playlist[index];
    if (!file) return;

    radioState.currentIndex = index;
    updateRadioTrackTitle();

    const onReady = () => {
        radioAudio.currentTime = offset;
        radioAudio.play().catch(e => console.warn('Radio play error:', e));
        radioAudio.removeEventListener('loadedmetadata', onReady);
    };

    radioAudio.pause();
    radioAudio.src = file.url;
    radioAudio.addEventListener('loadedmetadata', onReady);
    radioAudio.load();
}

// عند انتهاء ملف طبيعياً، ننتقل للملف التالي (وللأول عند نهاية الحلقة)،
// مع إعادة الحساب من الوقت الحقيقي لتفادي أي انزياح تراكمي
function handleRadioFileEnded() {
    if (!radioState.isPlaying) return;
    tuneInToLivePosition();
}

// تصحيح دوري لأي انزياح ناتج عن التخزين المؤقت/البطء الشبكي، حتى يبقى
// المستمعون متزامنين مع بعضهم البعض ومع الوقت الحقيقي
function startRadioResync() {
    stopRadioResync();
    radioState.resyncTimer = setInterval(() => {
        if (!radioState.isPlaying || radioAudio.paused) return;
        const { index, offset } = computeLivePosition();
        if (index !== radioState.currentIndex) {
            tuneInToLivePosition();
            return;
        }
        if (Math.abs(radioAudio.currentTime - offset) > 4) {
            radioAudio.currentTime = offset;
        }
    }, 15000);
}

function stopRadioResync() {
    if (radioState.resyncTimer) {
        clearInterval(radioState.resyncTimer);
        radioState.resyncTimer = null;
    }
}

async function startRadio() {
    // إيقاف مشغل السور الرئيسي حتى لا يتداخل الصوتان
    if (!audioInstance.paused) {
        audioInstance.pause();
        playingSurahId = null;
        updateSurahListUI();
    }

    // لا نقوم بإظهار المشغل السفلي هنا بناءً على طلب المستخدم
    // يبقى كل شيء كما هو وتعمل الإذاعة في الخلفية

    setRadioLoadingUI(true);
    const ok = await loadRadioPlaylist();
    if (!ok) { setRadioLoadingUI(false); return; }

    radioState.isPlaying = true;
    tuneInToLivePosition();
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
    if (radioState.isPlaying) {
        pauseRadio();
    } else {
        startRadio();
    }
}

function toggleRadioPlayback() {
    if (radioState.isPlaying) {
        pauseRadio();
    } else {
        startRadio();
    }
}

function openRadioPanel() {
    document.getElementById('radio-modal')?.classList.add('show');
    if (!radioState.isPlaying) startRadio();
}

function closeRadioPanel() {
    document.getElementById('radio-modal')?.classList.remove('show');
    // إغلاق الإذاعة يوقف الصوت تماماً، ولا نحفظ أي موضع؛ في المرة القادمة
    // سيُعاد حساب الموضع الحي من جديد اعتماداً على الوقت الفعلي فقط
    pauseRadio();
}

radioAudio.addEventListener('ended', handleRadioFileEnded);
radioAudio.addEventListener('waiting', () => setRadioLoadingUI(true));
radioAudio.addEventListener('playing', () => setRadioLoadingUI(false));
radioAudio.addEventListener('error', () => {
    if (radioState.isPlaying) showToast(translations[currentLang].networkError);
});

// إيقاف الإذاعة تلقائياً إذا بدأ المستخدم تشغيل سورة من المشغل الرئيسي
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
    if (radioState.isPlaying && audioInstance.paused && audioInstance.src) pauseRadio();
    return _originalTogglePlayPause.apply(this, args);
};

// ── التهيئة الأولى ──

(async () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.innerHTML = currentTheme === 'dark' ? icons.moon : icons.sun;

    // تجهيز مدد ملفات الإذاعة في الخلفية دون تشغيل أي شيء، حتى يكون
    // حساب الموضع الحي جاهزاً فوراً عند فتح الإذاعة لأول مرة
    loadRadioPlaylist();

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