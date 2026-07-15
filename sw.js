const CACHE_NAME = 'moshaf-al-omma-v2.5'; // تغيير الرقم عند كل تحديث رئيسي (v2.5: شاشة القراءة والمزامنة)

// الملفات الأساسية
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.png',
    './maasrawi.jpg',
    './susi.json'
];

// 1. تثبيت Service Worker
self.addEventListener('install', event => {
    self.skipWaiting(); // إجبار الـ SW الجديد على التنشيط فوراً
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. تنظيف الكاش القديم
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. استدعاء الملفات (Network First Strategy for JSON/JS/HTML)
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // استثناء الملفات الصوتية
    if (url.endsWith('.mp3') || url.endsWith('.m4a')) {
        return;
    }

    // استراتيجية: حاول الشبكة أولاً للملفات البرمجية لضمان التحديث
    if (url.endsWith('.json') || url.endsWith('.js') || url.includes('index.html') || url === self.location.origin + '/') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // استراتيجية: الكاش أولاً للملفات الثابتة (الصور والخطوط)
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
