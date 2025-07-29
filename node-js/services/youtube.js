const youtubeDl = require('youtube-dl-exec');

class YouTubeService {
    static async getVideoInfo(url) {
        const startCpu = process.cpuUsage();
        const startMemory = process.memoryUsage();
        
        console.time('⏱️ Video Info Fetch');
        const info = await youtubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
        });
        console.timeEnd('⏱️ Video Info Fetch');
        
        const endCpu = process.cpuUsage(startCpu);
        const endMemory = process.memoryUsage();
        console.log(`🖥️ Info Fetch CPU: User ${Math.round(endCpu.user / 1000)}ms, System ${Math.round(endCpu.system / 1000)}ms`);
        console.log(`📊 Info Fetch Memory: +${Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024)}MB heap`);

        console.log('=== RAW YOUTUBE DATA ===');
        console.log('Title:', info.title);
        console.log('Duration:', info.duration);
        console.log('Formats count:', info.formats ? info.formats.length : 0);
        
        if (info.formats && info.formats.length > 0) {
            console.log('=== SAMPLE FORMATS ===');
            info.formats.slice(0, 10).forEach((format, index) => {
                console.log(`Format ${index + 1}:`, {
                    format_id: format.format_id,
                    ext: format.ext,
                    height: format.height,
                    width: format.width,
                    vcodec: format.vcodec,
                    acodec: format.acodec,
                    filesize: format.filesize,
                    fps: format.fps,
                    format_note: format.format_note
                });
            });
            
            console.log('=== VIDEO FORMATS ONLY ===');
            const videoFormats = info.formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.height);
            videoFormats.forEach(format => {
                console.log(`${format.height}p (${format.format_id}):`, {
                    ext: format.ext,
                    filesize: format.filesize,
                    fps: format.fps,
                    vcodec: format.vcodec,
                    acodec: format.acodec
                });
            });
        }

        const formats = this.extractFormats(info.formats || []);
        console.log('=== PROCESSED FORMATS ===');
        console.log('Video formats:', formats.video);
        console.log('Audio formats:', formats.audio);
        
        return {
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            formats: formats
        };
    }

    static extractFormats(formats) {
        const videoFormats = [];
        const audioFormats = [];

        formats.forEach(format => {
            // Video formats (has video codec and height)
            if (format.vcodec && format.vcodec !== 'none' && format.height) {
                // Skip formats without filesize (unless they have audio too)
                const hasAudio = format.acodec && format.acodec !== 'none';
                if (!format.filesize && !hasAudio) {
                    return; // Skip video-only formats without filesize
                }
                
                const quality = `${format.height}p`;
                const size = format.filesize ? this.formatFileSize(format.filesize) : 'Unknown';
                const fps = format.fps ? ` ${Math.round(format.fps)}fps` : '';
                const codec = this.getCodecPriority(format.vcodec);
                
                videoFormats.push({
                    quality: quality,
                    format: format.ext || 'mp4',
                    size: size,
                    formatId: format.format_id,
                    height: format.height,
                    hasAudio: hasAudio,
                    codecPriority: codec.priority,
                    codecName: codec.name,
                    filesize: format.filesize || 0,
                    displayName: `${quality}${fps} ${hasAudio ? '(with audio)' : ''} (${size})`
                });
            }
            
            // Audio only formats (good filesize and recognized codec)
            if (format.acodec && format.acodec !== 'none' && (!format.vcodec || format.vcodec === 'none') && format.filesize) {
                const codecName = format.acodec.includes('mp4a') ? 'AAC' : 
                                format.acodec.includes('opus') ? 'Opus' : 'Unknown';
                
                audioFormats.push({
                    quality: 'Audio Only',
                    format: format.ext || 'mp3',
                    size: format.filesize ? this.formatFileSize(format.filesize) : 'Unknown',
                    formatId: format.format_id,
                    codecName: codecName,
                    filesize: format.filesize,
                    displayName: `${codecName} Audio (${format.ext}) - ${this.formatFileSize(format.filesize)}`
                });
            }
        });

        // Get best format for each quality
        const bestVideoFormats = this.getBestFormatsPerQuality(videoFormats);
        
        // Sort audio by quality (AAC preferred, then by filesize)
        audioFormats.sort((a, b) => {
            if (a.codecName === 'AAC' && b.codecName !== 'AAC') return -1;
            if (b.codecName === 'AAC' && a.codecName !== 'AAC') return 1;
            return b.filesize - a.filesize;
        });

        return {
            video: bestVideoFormats,
            audio: audioFormats.slice(0, 3) // Top 3 audio options
        };
    }

    static getCodecPriority(vcodec) {
        if (vcodec.includes('avc1')) return { priority: 1, name: 'H.264' }; // Best compatibility
        if (vcodec.includes('vp9')) return { priority: 2, name: 'VP9' };
        if (vcodec.includes('av01')) return { priority: 3, name: 'AV1' };
        return { priority: 4, name: 'Other' };
    }

    static getBestFormatsPerQuality(videoFormats) {
        const qualityMap = new Map();
        
        videoFormats.forEach(format => {
            const existing = qualityMap.get(format.height);
            
            if (!existing) {
                qualityMap.set(format.height, format);
            } else {
                // Prefer formats with audio
                if (format.hasAudio && !existing.hasAudio) {
                    qualityMap.set(format.height, format);
                } else if (format.hasAudio === existing.hasAudio) {
                    // If both have same audio status, prefer better codec
                    if (format.codecPriority < existing.codecPriority) {
                        qualityMap.set(format.height, format);
                    } else if (format.codecPriority === existing.codecPriority && format.filesize > existing.filesize) {
                        // Same codec, prefer larger filesize (better quality)
                        qualityMap.set(format.height, format);
                    }
                }
            }
        });
        
        // Convert to array and sort by height (highest first)
        return Array.from(qualityMap.values()).sort((a, b) => b.height - a.height);
    }


    static formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    static async downloadVideo(url, formatSelection = 'best', format = 'mp4') {
        let downloadFormat;
        let contentType;
        let fileExtension;
        let options;

        if (format === 'mp3') {
            downloadFormat = 'bestaudio';
            contentType = 'audio/mpeg';
            fileExtension = 'mp3';
            options = {
                output: '-',
                format: downloadFormat,
                noWarnings: true,
                noCallHome: true,
                noCheckCertificate: true,
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0, // Best quality
            };
        } else {
            // Use format ID if provided, otherwise fall back to quality-based selection
            if (formatSelection === 'best') {
                downloadFormat = 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best';
            } else if (formatSelection.includes('formatId:')) {
                // For format IDs, use them with audio merging
                const formatId = formatSelection.replace('formatId:', '');
                
                // Check if it's a video-only format ID and needs audio merging
                const needsAudioMerge = !formatId.includes('18'); // Format 18 has built-in audio
                
                if (needsAudioMerge) {
                    downloadFormat = `${formatId}+bestaudio[ext=m4a]/bestaudio`;
                } else {
                    downloadFormat = formatId; // Format 18 is complete
                }
            } else {
                // Fall back to height-based selection with audio merging
                const height = formatSelection.replace('p', '');
                downloadFormat = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}]`;
            }
            
            contentType = 'video/mp4';
            fileExtension = 'mp4';
            options = {
                output: '-',
                format: downloadFormat,
                noWarnings: true,
                noCallHome: true,
                noCheckCertificate: true,
                mergeOutputFormat: 'mp4',
                embedSubs: false,
                writeInfoJson: false,
            };
        }

        console.log(`Downloading with format: ${downloadFormat}`);
        
        // Track merge time for video formats that need merging
        const needsMerging = downloadFormat.includes('+') || (format === 'mp3' && options.extractAudio);
        if (needsMerging) {
            console.time('🔄 Video/Audio Merge');
        }
        
        // Log initial memory and CPU usage
        const initialMemory = process.memoryUsage();
        const initialCpuUsage = process.cpuUsage();
        console.log(`📊 Initial Memory: RSS ${Math.round(initialMemory.rss / 1024 / 1024)}MB, Heap ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
        console.log(`🖥️ Initial CPU: User ${Math.round(initialCpuUsage.user / 1000)}ms, System ${Math.round(initialCpuUsage.system / 1000)}ms`);
        
        console.time('⬇️ Download Process');
        const stream = youtubeDl.exec(url, options);
        
        // Track when merging completes (if applicable)
        if (needsMerging) {
            stream.on('close', () => {
                console.timeEnd('🔄 Video/Audio Merge');
                const mergeMemory = process.memoryUsage();
                const mergeCpuUsage = process.cpuUsage(initialCpuUsage);
                console.log(`📊 After Merge: RSS ${Math.round(mergeMemory.rss / 1024 / 1024)}MB, Heap ${Math.round(mergeMemory.heapUsed / 1024 / 1024)}MB`);
                console.log(`🖥️ Merge CPU Usage: User ${Math.round(mergeCpuUsage.user / 1000)}ms, System ${Math.round(mergeCpuUsage.system / 1000)}ms`);
            });
        }
        
        stream.on('close', () => {
            console.timeEnd('⬇️ Download Process');
            const finalMemory = process.memoryUsage();
            const finalCpuUsage = process.cpuUsage(initialCpuUsage);
            
            console.log(`📊 Final Memory: RSS ${Math.round(finalMemory.rss / 1024 / 1024)}MB, Heap ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
            console.log(`📈 Memory Delta: RSS +${Math.round((finalMemory.rss - initialMemory.rss) / 1024 / 1024)}MB, Heap +${Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024)}MB`);
            console.log(`🖥️ Total CPU Usage: User ${Math.round(finalCpuUsage.user / 1000)}ms, System ${Math.round(finalCpuUsage.system / 1000)}ms`);
            console.log(`⚡ CPU Efficiency: ${Math.round((finalCpuUsage.user + finalCpuUsage.system) / 1000)}ms total CPU time`);
        });
        
        return { stream, contentType, fileExtension };
    }

    static isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
        return youtubeRegex.test(url);
    }
}

module.exports = YouTubeService;