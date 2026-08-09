// js/ui.js

const DEFAULT_COVER = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23b0b0b0"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
const PLAY_ICON_PATH = 'M8 5v14l11-7z';
const PAUSE_ICON_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

const UI = {
    currentSettingsSongId: null,
    isDraggingProgress: false,

    async init() {
        // Thêm thẻ background-blur động vào DOM vì trong index.html chưa có
        const appContainer = document.getElementById('app');
        const bgBlur = document.createElement('div');
        bgBlur.className = 'background-blur';
        bgBlur.id = 'bg-blur';
        appContainer.prepend(bgBlur);

        this.bindElements();
        this.bindEvents();
        this.setupPlayerHooks();
        
        await this.loadSongs();
    },

    bindElements() {
        // Main Screen
        this.searchInput = document.getElementById('search-input');
        this.uploadBtn = document.getElementById('upload-btn');
        this.fileInput = document.getElementById('file-input');
        this.songList = document.getElementById('song-list');
        this.emptyState = document.getElementById('empty-state');
        
        // Mini Player
        this.miniPlayer = document.getElementById('mini-player');
        this.miniPlayerInfo = document.getElementById('mini-player-info');
        this.miniCover = document.getElementById('mini-cover');
        this.miniTitle = document.getElementById('mini-title');
        this.miniArtist = document.getElementById('mini-artist');
        this.miniPlayBtn = document.getElementById('mini-play');
        this.miniPlayIcon = document.getElementById('mini-play-icon').querySelector('path');
        this.miniPrevBtn = document.getElementById('mini-prev');
        this.miniNextBtn = document.getElementById('mini-next');

        // Full Player
        this.playerScreen = document.getElementById('player-screen');
        this.playerClose = document.getElementById('player-close');
        this.playerSettings = document.getElementById('player-settings');
        this.playerCover = document.getElementById('player-cover');
        this.playerTitle = document.getElementById('player-title');
        this.playerArtist = document.getElementById('player-artist');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationEl = document.getElementById('duration');
        this.progressBar = document.getElementById('progress-bar');
        this.playBtn = document.getElementById('play-btn');
        this.playIcon = document.getElementById('play-icon').querySelector('path');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.volumeIcon = document.getElementById('volume-icon');
        this.volumeBar = document.getElementById('volume-bar');
        this.equalizer = document.getElementById('equalizer');

        // Settings
        this.settingsScreen = document.getElementById('settings-screen');
        this.settingsBack = document.getElementById('settings-back');
        this.settingsCover = document.getElementById('settings-cover');
        this.changeCoverBtn = document.getElementById('change-cover-btn');
        this.coverInput = document.getElementById('cover-input');
        this.settingsTitle = document.getElementById('settings-title');
        this.changeTitleBtn = document.getElementById('change-title-btn');
        this.deleteSongBtn = document.getElementById('delete-song-btn');

        // Dialog
        this.confirmDialog = document.getElementById('confirm-dialog');
        this.confirmYes = document.getElementById('confirm-yes');
        this.confirmNo = document.getElementById('confirm-no');
        
        this.bgBlur = document.getElementById('bg-blur');
    },

    bindEvents() {
        // Tìm kiếm
        this.searchInput.addEventListener('input', (e) => this.filterSongs(e.target.value));

        // Tải lên
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files.length) return;
            
            for (let file of files) {
                const songData = await MetadataParser.parseFile(file);
                await db.addSong(songData);
            }
            this.fileInput.value = ''; // Reset
            await this.loadSongs();
        });

        // Điều hướng Mini Player
        this.miniPlayerInfo.addEventListener('click', () => this.openPlayer());
        this.miniPlayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioPlayer.togglePlay();
        });
        this.miniPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioPlayer.prev();
        });
        this.miniNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioPlayer.next();
        });

        // Điều hướng Full Player
        this.playerClose.addEventListener('click', () => this.closePlayer());
        this.playerSettings.addEventListener('click', () => this.openSettings());
        this.playBtn.addEventListener('click', () => AudioPlayer.togglePlay());
        this.prevBtn.addEventListener('click', () => AudioPlayer.prev());
        this.nextBtn.addEventListener('click', () => AudioPlayer.next());

        // Thanh tiến trình (Progress Bar)
        this.progressBar.addEventListener('input', () => {
            this.isDraggingProgress = true;
            this.currentTimeEl.textContent = this.formatTime(this.progressBar.value);
        });
        this.progressBar.addEventListener('change', () => {
            AudioPlayer.seek(Number(this.progressBar.value));
            this.isDraggingProgress = false;
        });

        // Thanh âm lượng
        this.volumeBar.addEventListener('input', (e) => {
            AudioPlayer.setVolume(e.target.value / 100);
            this.updateVolumeIcon(e.target.value / 100);
        });
        this.volumeIcon.addEventListener('click', () => {
            const newVol = AudioPlayer.toggleMute();
            this.volumeBar.value = newVol * 100;
            this.updateVolumeIcon(newVol);
        });

        // Điều hướng Cài đặt
        this.settingsBack.addEventListener('click', () => this.closeSettings());
        
        // Đổi ảnh bìa trong cài đặt
        this.changeCoverBtn.addEventListener('click', () => this.coverInput.click());
        this.coverInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const newCover = event.target.result;
                    this.settingsCover.src = newCover;
                    await db.updateSong(this.currentSettingsSongId, { cover: newCover });
                    await this.loadSongs();
                    // Nếu đang phát bài này thì cập nhật hình
                    const currentSong = AudioPlayer.getCurrentSong();
                    if (currentSong && currentSong.id === this.currentSettingsSongId) {
                        this.updatePlayerUI({ ...currentSong, cover: newCover });
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Đổi tên trong cài đặt
        this.changeTitleBtn.addEventListener('click', async () => {
            const newTitle = this.settingsTitle.value.trim();
            if (newTitle) {
                await db.updateSong(this.currentSettingsSongId, { title: newTitle });
                await this.loadSongs();
                const currentSong = AudioPlayer.getCurrentSong();
                if (currentSong && currentSong.id === this.currentSettingsSongId) {
                    this.updatePlayerUI({ ...currentSong, title: newTitle });
                }
                alert("Đã cập nhật tên bài hát!");
            }
        });

        // Xoá bài hát
        this.deleteSongBtn.addEventListener('click', () => {
            this.showDialog("Bạn có chắc chắn muốn xoá bài hát này?", async () => {
                await db.deleteSong(this.currentSettingsSongId);
                
                // Nếu đang phát bài vừa xoá
                const currentSong = AudioPlayer.getCurrentSong();
                if (currentSong && currentSong.id === this.currentSettingsSongId) {
                    AudioPlayer.pause();
                    this.miniPlayer.classList.remove('visible');
                    this.closePlayer();
                    this.closeSettings();
                    this.resetBackground();
                } else {
                    this.closeSettings();
                }
                await this.loadSongs();
            });
        });

        // Đóng dropdown menu khi click ra ngoài
        document.addEventListener('click', () => {
            document.querySelectorAll('.song-dropdown').forEach(d => d.remove());
        });
    },

    setupPlayerHooks() {
        AudioPlayer.onTimeUpdate = (currentTime, duration) => {
            if (!this.isDraggingProgress) {
                this.progressBar.max = duration;
                this.progressBar.value = currentTime;
                this.currentTimeEl.textContent = this.formatTime(currentTime);
                this.durationEl.textContent = this.formatTime(duration);
            }
        };

        AudioPlayer.onPlayStateChange = (isPlaying) => {
            const path = isPlaying ? PAUSE_ICON_PATH : PLAY_ICON_PATH;
            this.playIcon.setAttribute('d', path);
            this.miniPlayIcon.setAttribute('d', path);
            
            if (isPlaying) {
                this.equalizer.classList.add('playing');
            } else {
                this.equalizer.classList.remove('playing');
            }
        };

        AudioPlayer.onSongChange = (song, index) => {
            this.updatePlayerUI(song);
            this.highlightCurrentSong(song.id);
            if (!this.miniPlayer.classList.contains('visible')) {
                this.miniPlayer.classList.add('visible');
            }
        };
    },

    async loadSongs() {
        const songs = await db.getAllSongs();
        AudioPlayer.setPlaylist(songs);
        this.renderSongList(songs);
    },

    renderSongList(songs) {
        // Giữ lại phần tử empty-state
        this.songList.innerHTML = '';
        this.songList.appendChild(this.emptyState);

        if (songs.length === 0) {
            this.emptyState.style.display = 'block';
            return;
        }
        
        this.emptyState.style.display = 'none';

        songs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.dataset.id = song.id;
            
            const currentPlaying = AudioPlayer.getCurrentSong();
            if (currentPlaying && currentPlaying.id === song.id) {
                item.classList.add('active');
            }

            const coverSrc = song.cover || DEFAULT_COVER;
            const timeStr = this.formatTime(song.duration);

            item.innerHTML = `
                <img src="${coverSrc}" class="song-cover" alt="Cover">
                <div class="song-info">
                    <div class="song-title">${this.escapeHTML(song.title)}</div>
                    <div class="song-duration">${this.escapeHTML(song.artist)} • ${timeStr}</div>
                </div>
                <button class="song-menu">
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
                </button>
            `;

            // Bấm vào bài hát -> Play
            item.addEventListener('click', () => {
                AudioPlayer.playSong(index);
                this.openPlayer();
            });

            // Bấm vào nút 3 gạch -> Mở Popover (Dropdown)
            const menuBtn = item.querySelector('.song-menu');
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click lan ra song-item
                this.showSongDropdown(e, song, index);
            });

            this.songList.appendChild(item);
        });
    },

    showSongDropdown(event, song, index) {
        // Đóng tất cả dropdown đang mở
        document.querySelectorAll('.song-dropdown').forEach(d => d.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'song-dropdown';
        // Inline styles CSS nhỏ lẻ để hiển thị đẹp không phá vỡ style.css[span_2](start_span)[span_2](end_span)
        dropdown.style.cssText = `
            position: absolute; right: 20px; margin-top: 40px; background: rgba(26, 26, 46, 0.95);
            backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); 
            border-radius: 12px; padding: 12px; z-index: 50; width: max-content; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
        `;

        dropdown.innerHTML = `
            <div style="font-size: 13px; color: #b0b0b0; margin-bottom: 4px;">Định dạng: ${song.format}</div>
            <div style="font-size: 13px; color: #b0b0b0; margin-bottom: 4px;">Dung lượng: ${song.formattedSize}</div>
            <div style="font-size: 13px; color: #b0b0b0; margin-bottom: 12px;">Thời lượng: ${this.formatTime(song.duration)}</div>
            <button class="delete-btn" style="padding: 8px 16px; width: 100%; font-size: 14px;">Xoá bài hát</button>
        `;

        const delBtn = dropdown.querySelector('.delete-btn');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDialog(`Xoá "${song.title}"?`, async () => {
                await db.deleteSong(song.id);
                // Cập nhật lại UI sau khi xoá
                const currentPlaying = AudioPlayer.getCurrentSong();
                if (currentPlaying && currentPlaying.id === song.id) {
                    AudioPlayer.pause();
                    this.miniPlayer.classList.remove('visible');
                    this.resetBackground();
                }
                await this.loadSongs();
            });
            dropdown.remove();
        });

        event.target.closest('.song-menu').appendChild(dropdown);
    },

    updatePlayerUI(song) {
        const coverSrc = song.cover || DEFAULT_COVER;
        
        // Cập nhật Mini Player
        this.miniCover.src = coverSrc;
        this.miniTitle.textContent = song.title;
        this.miniArtist.textContent = song.artist;

        // Cập nhật Full Player
        this.playerCover.src = coverSrc;
        this.playerTitle.textContent = song.title;
        this.playerArtist.textContent = song.artist;

        // Cập nhật Background
        this.updateBackground(coverSrc);
    },

    updateBackground(coverSrc) {
        // Áp dụng ảnh làm nền và hiệu ứng blur như yêu cầu PWA 
        this.bgBlur.style.backgroundImage = `url(${coverSrc})`;
    },

    resetBackground() {
        this.bgBlur.style.backgroundImage = 'none';
    },

    highlightCurrentSong(songId) {
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === songId) {
                item.classList.add('active');
            }
        });
    },

    openPlayer() {
        this.playerScreen.classList.add('active');
    },

    closePlayer() {
        this.playerScreen.classList.remove('active');
    },

    openSettings() {
        const currentSong = AudioPlayer.getCurrentSong();
        if (!currentSong) return;

        this.currentSettingsSongId = currentSong.id;
        this.settingsCover.src = currentSong.cover || DEFAULT_COVER;
        this.settingsTitle.value = currentSong.title;
        
        this.settingsScreen.classList.add('active');
    },

    closeSettings() {
        this.settingsScreen.classList.remove('active');
        this.currentSettingsSongId = null;
    },

    showDialog(message, onConfirm) {
        this.confirmMessage.textContent = message;
        this.confirmDialog.classList.remove('hidden');

        // Gỡ bỏ event cũ để tránh bị nhân đôi trigger
        const newYes = this.confirmYes.cloneNode(true);
        const newNo = this.confirmNo.cloneNode(true);
        this.confirmYes.replaceWith(newYes);
        this.confirmNo.replaceWith(newNo);
        this.confirmYes = newYes;
        this.confirmNo = newNo;

        this.confirmYes.addEventListener('click', () => {
            onConfirm();
            this.confirmDialog.classList.add('hidden');
        });

        this.confirmNo.addEventListener('click', () => {
            this.confirmDialog.classList.add('hidden');
        });
    },

    updateVolumeIcon(vol) {
        let svg = '';
        if (vol === 0) {
            svg = '<path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
        } else if (vol < 0.5) {
            svg = '<path fill="currentColor" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
        } else {
            svg = '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
        }
        this.volumeIcon.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24">${svg}</svg>`;
    },

    filterSongs(keyword) {
        // Loại bỏ dấu tiếng Việt và đưa về chữ thường
        const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const kw = removeAccents(keyword);
        
        const items = this.songList.querySelectorAll('.song-item');
        items.forEach(item => {
            const titleEl = item.querySelector('.song-title');
            if (!titleEl) return;
            const title = removeAccents(titleEl.textContent);
            if (title.includes(kw)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    }
};
