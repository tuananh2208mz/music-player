// js/db.js

const DB_NAME = 'LocalMusicPlayer_DB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

const db = {
    _db: null,

    // Khởi tạo database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB Error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this._db = event.target.result;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    // Sử dụng 'id' làm khoá chính
                    database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    },

    // Lấy tất cả bài hát (dùng cho list màn hình chính)
    async getAllSongs() {
        return new Promise((resolve, reject) => {
            if (!this._db) return reject("DB not initialized");
            
            const transaction = this._db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Lấy thông tin 1 bài hát cụ thể (dùng khi play nhạc để lấy Audio Blob)
    async getSong(id) {
        return new Promise((resolve, reject) => {
            if (!this._db) return reject("DB not initialized");

            const transaction = this._db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Thêm bài hát mới vào DB
    async addSong(songData) {
        return new Promise((resolve, reject) => {
            if (!this._db) return reject("DB not initialized");

            const transaction = this._db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // songData bao gồm: id, title, artist, duration, size, format, file (Blob), cover (DataURL/Blob)
            const request = store.add(songData);

            request.onsuccess = () => resolve(songData.id);
            request.onerror = () => reject(request.error);
        });
    },

    // Cập nhật thông tin bài hát (Đổi tên, đổi ảnh bìa)
    async updateSong(id, updateData) {
        return new Promise(async (resolve, reject) => {
            if (!this._db) return reject("DB not initialized");

            try {
                // Lấy data cũ trước
                const song = await this.getSong(id);
                if (!song) return reject("Song not found");

                // Ghi đè dữ liệu mới
                const updatedSong = { ...song, ...updateData };

                const transaction = this._db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(updatedSong);

                request.onsuccess = () => resolve(updatedSong);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    },

    // Xoá bài hát
    async deleteSong(id) {
        return new Promise((resolve, reject) => {
            if (!this._db) return reject("DB not initialized");

            const transaction = this._db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
};
