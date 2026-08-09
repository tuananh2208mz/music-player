// js/player.js

const AudioPlayer = {
    audio: new Audio(),
    playlist: [],
    currentIndex: -1,
    currentBlobUrl: null,
    previousVolume: 0.7,
    
    // Quản lý chế độ lặp: 'all' (Tuần hoàn danh sách), 'one' (Lặp 1 bài)
    repeatMode: 'all', 

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

        // Bắt sự kiện phát
        this.audio.addEventListener('play', () => {
            if (this.onPlayStateChange) this.onPlayStateChange(true);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = "playing";
            }
        });

        // Bắt sự kiện tạm dừng
        this.audio.addEventListener('pause', () => {
            if (this.onPlayStateChange) this.onPlayStateChange(false);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = "paused";
            }
        });

        // Xử lý khi bài hát kết thúc dựa theo chế độ lặp
        this.audio.addEventListener('ended', () => {
            if (this.repeatMode === 'one') {
                // Phát lại từ đầu nếu ở chế độ lặp 1 bài
                this.audio.currentTime = 0;
                this.play();
            } else {
                // Chuyển sang bài tiếp theo (Tuần hoàn danh sách)
                this.next();
            }
        });
    },

    // Thay đổi chế độ lặp
    setRepeatMode(mode) {
        if (['all', 'one'].includes(mode)) {
            this.repeatMode = mode;
        }
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
        
        this.updateMediaSession(song);
        
        if (this.onSongChange) {
            this.onSongChange(song, this.currentIndex);
        }
        return true;
    },

    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name || song.title || 'Tên bài hát',
                artist: song.artist || 'Nghệ sĩ',
                album: 'Local Music Player',
                artwork: [
                    { src: song.cover || 'assets/default-cover.svg', sizes: '512x512', type: 'image/svg+xml' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },

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
            nextIndex = 0; // Quay về bài đầu tiên
        }
        this.playSong(nextIndex);
    },

    prev() {
        if (this.playlist.length === 0) return;
        let prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.playlist.length - 1; // Về bài cuối cùng
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
                     
