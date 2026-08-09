// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Khởi tạo Database (IndexedDB) đầu tiên
        await db.init();
        
        // 2. Khởi tạo Player (Web Audio)
        AudioPlayer.init();
        
        // 3. Khởi tạo Giao diện UI (Gắn sự kiện, render danh sách nhạc)
        await UI.init();
        
        // 4. Đăng ký Service Worker cho tính năng PWA (Hoạt động offline)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // Đăng ký file sw.js nằm ở thư mục gốc
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('Service Worker đăng ký thành công với scope:', registration.scope);
                    })
                    .catch(err => {
                        console.error('Đăng ký Service Worker thất bại:', err);
                    });
            });
        }
    } catch (error) {
        console.error("Lỗi khởi tạo ứng dụng:", error);
        alert("Không thể khởi tạo ứng dụng. Vui lòng kiểm tra console logs.");
    }
});
