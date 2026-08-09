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
        
        // Cập nhật thông tin lên màn hình khóa điện thoại (Media Session)
        this.updateMediaSession(song);
        
        // Báo cho giao diện biết đã chuyển bài
        if (this.onSongChange) {
            this.onSongChange(song, this.currentIndex);
        }
        return true;
    },

    // Cấu hình Media Session để phát nhạc dưới nền
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name || 'Tên bài hát',
                artist: song.artist || 'Nghệ sĩ',
                album: 'Local Music Player',
                artwork: [
                    { src: 'assets/default-cover.svg', sizes: '512x512', type: 'image/svg+xml' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },

    // Xử lý logic nhấn phát nhạc
    async playSong(index) {
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
            this.audio.play().catch(e => console.warn("Lỗi phát nhạc:", e));
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
        if (nextIndex >= this.playlist.length) {
            nextIndex = 0;
        }
        this.playSong(nextIndex);
    },

    prev() {
        if (this.playlist.length === 0) return;
        let prevIndex = this.currentIndex - 1;
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
        let vol = Math.max(0, Math.min(1, value));
        this.audio.volume = vol;
        if (vol > 0) {
            this.previousVolume = vol; 
        }
    },

    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            return 0; 
        } else {
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
      
