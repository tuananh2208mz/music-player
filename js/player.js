// js/player.js

const AudioPlayer = {
    audio: new Audio(),
    playlist: [],
    currentIndex: -1,
    currentBlobUrl: null,
    previousVolume: 0.7, // Mặc định âm lượng 70%

    // Hooks / Callbacks để UI lắng nghe sự thay đổi
    onTimeUpdate: null,
    onSongChange: null,
    onPlayStateChange: null,
    
    init() {
        this.audio.volume = this.previousVolume;

        // Lắng nghe tiến trình phát
        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                // Đảm bảo không truyền NaN nếu audio chưa load xong duration
                const duration = isNaN(this.audio.duration) ? 0 : this.audio.duration;
                this.onTimeUpdate(this.audio.currentTime, duration);
            }
        });

        // Bắt sự kiện thay đổi trạng thái
        this.audio.addEventListener('play', () => {
            if (this.onPlayStateChange) this.onPlayStateChange(true);
        });

        this.audio.addEventListener('pause', () => {
            if (this.onPlayStateChange) this.onPlayStateChange(false);
        });

        // Tự động chuyển bài khi bài hát kết thúc
        this.audio.addEventListener('ended', () => {
            this.next();
        });
    },

    // Cập nhật danh sách nhạc hiện tại từ DB
    setPlaylist(songs) {
        this.playlist = songs;
    },

    // Chuẩn bị file để phát
    async loadSong(index) {
        if (index < 0 || index >= this.playlist.length) return false;
        
        this.currentIndex = index;
        const song = this.playlist[this.currentIndex];

        // Quan trọng: Giải phóng bộ nhớ của Blob URL cũ để tránh rò rỉ RAM (Memory Leak)
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
        }

        // Tạo đường dẫn ảo (Blob URL) từ File gốc trong IndexedDB
        this.currentBlobUrl = URL.createObjectURL(song.file);
        this.audio.src = this.currentBlobUrl;
        
        this.audio.load();
        
        // Báo cho giao diện biết đã chuyển bài
        if (this.onSongChange) {
            this.onSongChange(song, this.currentIndex);
        }
        return true;
    },

    // Xử lý logic nhấn phát nhạc (từ danh sách hoặc nút next/prev)
    async playSong(index) {
        // Nếu nhấn lại đúng bài đang phát
        if (index === this.currentIndex) {
            this.togglePlay();
            return;
        }
        
        const loaded = await this.loadSong(index);
        if (loaded) {
            this.play();
        }
    },

    play() {
        if (this.audio.src) {
            // Play() trả về Promise, bắt lỗi để tránh văng console trên trình duyệt chặn autoplay
            this.audio.play().catch(e => console.warn("Lỗi phát nhạc (có thể do trình duyệt chặn autoplay):", e));
        }
    },

    pause() {
        this.audio.pause();
    },

    togglePlay() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    },

    next() {
        if (this.playlist.length === 0) return;
        let nextIndex = this.currentIndex + 1;
        // Logic xoay vòng: Bài cuối -> Bài đầu
        if (nextIndex >= this.playlist.length) {
            nextIndex = 0;
        }
        this.playSong(nextIndex);
    },

    prev() {
        if (this.playlist.length === 0) return;
        let prevIndex = this.currentIndex - 1;
        // Logic xoay vòng: Bài đầu -> Bài cuối
        if (prevIndex < 0) {
            prevIndex = this.playlist.length - 1;
        }
        this.playSong(prevIndex);
    },

    seek(time) {
        if (this.audio.src && !isNaN(time)) {
            this.audio.currentTime = time;
        }
    },

    setVolume(value) {
        // value nằm trong khoảng 0.0 -> 1.0
        let vol = Math.max(0, Math.min(1, value));
        this.audio.volume = vol;
        if (vol > 0) {
            // Lưu lại mức âm lượng (nếu lớn hơn 0) để khôi phục khi bỏ Mute
            this.previousVolume = vol; 
        }
    },

    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            return 0; 
        } else {
            // Khôi phục âm lượng trước đó, nếu trước đó lỗi thì set mặc định 70%
            this.audio.volume = this.previousVolume > 0 ? this.previousVolume : 0.7;
            return this.audio.volume;
        }
    },

    getCurrentSong() {
        if (this.currentIndex >= 0 && this.currentIndex < this.playlist.length) {
            return this.playlist[this.currentIndex];
        }
        return null;
    }
};
