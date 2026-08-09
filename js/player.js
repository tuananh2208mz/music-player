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

        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
        }

        this.currentBlobUrl = URL.createObjectURL(song.file);
        this.audio.src = this.currentBlobUrl;
        
        this.audio.load();
        
        // ===== THÊM DÒNG NÀY VÀO ĐÂY =====
        this.updateMediaSession(song);

        // Báo cho giao diện biết đã chuyển bài[span_2](start_span)[span_2](end_span)
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
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name || 'Tên bài hát', // Hoặc song.title tùy vào cấu trúc dữ liệu bài hát của bạn
                artist: song.artist || 'Nghệ sĩ',
                album: 'Local Music Player',
                artwork: [
                    { src: 'assets/default-cover.svg', sizes: '512x512', type: 'image/svg+xml' }
                ]
            });

            // Liên kết các nút điều khiển màn hình khóa với các hàm có sẵn trong AudioPlayer
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },
};
// Cấu hình Media Session để phát nhạc dưới nền và hiển thị trên màn hình khóa
function updateMediaSession(song) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title || 'Tên bài hát',
            artist: song.artist || 'Nghệ sĩ',
            album: 'Local Music Player',
            artwork: [
                { src: song.cover || 'assets/default-cover.svg', sizes: '512x512', type: 'image/svg+xml' }
            ]
        });

        // Liên kết nút bấm màn hình khóa với hàm có sẵn trong app của bạn
        navigator.mediaSession.setActionHandler('play', function() {
            // Gọi hàm play của bạn ở đây (ví dụ: playAudio())
        });

        navigator.mediaSession.setActionHandler('pause', function() {
            // Gọi hàm pause của bạn ở đây (ví dụ: pauseAudio())
        });

        navigator.mediaSession.setActionHandler('previoustrack', function() {
            // Gọi hàm chuyển bài trước của bạn ở đây (ví dụ: prevSong())
        });

        navigator.mediaSession.setActionHandler('nexttrack', function() {
            // Gọi hàm chuyển bài tiếp theo của bạn ở đây (ví dụ: nextSong())
        });
    }
}
