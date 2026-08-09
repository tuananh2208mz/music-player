// sw.js

const CACHE_NAME = 'local-music-player-v1';

// Danh sách các file cần lưu cache để chạy offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/db.js',
    './js/player.js',
    './js/ui.js',
    './js/metadata.js',
    './manifest.json',
    // Cache luôn các thư viện CDN để đảm bảo chạy offline hoàn toàn
    'https://cdn.jsdelivr.net/npm/jschardet@3.0.0/dist/jschardet.min.js',
    'https://cdn.jsdelivr.net/npm/iconv-lite@0.6.3/lib/browser.js',
    'https://cdn.jsdelivr.net/npm/jsmediatags@3.9.5/dist/jsmediatags.min.js'
];

// Sự kiện Install: Mở cache và lưu trữ tài nguyên tĩnh
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Đang lưu trữ tài nguyên tĩnh (Caching offline assets)');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // Ép buộc Service Worker mới kích hoạt ngay lập tức
    self.skipWaiting();
});

// Sự kiện Activate: Dọn dẹp các bộ nhớ cache cũ nếu có phiên bản mới
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Đang xoá bộ nhớ cache cũ:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Sự kiện Fetch: Chặn các request mạng và trả về tài nguyên từ bộ nhớ cache nếu có
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Nếu file đã có trong cache thì trả về ngay (offline)
            // Nếu chưa có, thực hiện request tải xuống từ mạng (online)
            return response || fetch(event.request);
        }).catch(() => {
            // Nếu người dùng offline và request bị lỗi, có thể trả về một trang fallback ở đây
            console.warn('Network request failed and no cache matched:', event.request.url);
        })
    );
});
