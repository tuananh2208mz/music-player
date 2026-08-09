// js/metadata.js

const MetadataParser = {
    /**
     * Lấy thời lượng của file âm thanh (đơn vị: giây)
     * Vì jsmediatags không phải lúc nào cũng có thông tin này, 
     * ta sẽ load file dưới dạng Blob URL vào thẻ Audio ảo để lấy thời lượng.
     */
    async getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            const objectUrl = URL.createObjectURL(file);
            
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
                URL.revokeObjectURL(objectUrl); // Dọn dẹp bộ nhớ
            });
            
            audio.addEventListener('error', () => {
                console.warn(`Không thể lấy thời lượng cho: ${file.name}`);
                resolve(0); // Fallback nếu lỗi
                URL.revokeObjectURL(objectUrl);
            });
            
            audio.src = objectUrl;
        });
    },

    /**
     * Định dạng dung lượng byte sang KB/MB để hiển thị UI
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Hàm chính: Xử lý file đầu vào và trả về Object chứa toàn bộ Metadata
     */
    async parseFile(file) {
        // Lấy thời lượng trước
        const duration = await this.getAudioDuration(file);
        
        return new Promise((resolve) => {
            // 1. Tạo dữ liệu dự phòng (Fallback data)
            const defaultData = {
                id: 'song_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                title: file.name.replace(/\.[^/.]+$/, ""), // Tên file bỏ phần đuôi mở rộng
                artist: "Unknown Artist",
                duration: duration,
                size: file.size,
                formattedSize: this.formatSize(file.size),
                format: file.name.split('.').pop().toUpperCase(), // Lấy đuôi file (MP3, WAV...)
                cover: null, // Null để UI tự động dùng ảnh mặc định (default-cover.svg)
                file: file // Lưu Blob nguyên bản để phát nhạc sau này
            };

            // 2. Dùng jsmediatags đọc ID3 Tags
            if (window.jsmediatags) {
                window.jsmediatags.read(file, {
                    onSuccess: function(tag) {
                        const tags = tag.tags;
                        
                        // Cập nhật tên và nghệ sĩ nếu có
                        if (tags.title) defaultData.title = tags.title;
                        if (tags.artist) defaultData.artist = tags.artist;
                        
                        // Xử lý ảnh bìa (Album Art)
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            let base64String = "";
                            // Chuyển mảng byte sang chuỗi base64
                            for (let i = 0; i < data.length; i++) {
                                base64String += String.fromCharCode(data[i]);
                            }
                            defaultData.cover = `data:${format};base64,${window.btoa(base64String)}`;
                        }
                        
                        resolve(defaultData);
                    },
                    onError: function(error) {
                        console.warn(`Lỗi đọc metadata từ ${file.name}, dùng dữ liệu dự phòng.`, error);
                        // Vẫn resolve để app tiếp tục chạy với data fallback
                        resolve(defaultData);
                    }
                });
            } else {
                console.error("Thư viện jsmediatags chưa được tải!");
                resolve(defaultData);
            }
        });
    }
};
