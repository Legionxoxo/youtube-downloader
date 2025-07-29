/**
 * @typedef {Object} RawYouTubeFormat
 * @property {string} [format_id] - YouTube format ID
 * @property {string} [ext] - File extension
 * @property {number} [height] - Video height in pixels
 * @property {number} [width] - Video width in pixels
 * @property {string} [vcodec] - Video codec
 * @property {string} [acodec] - Audio codec
 * @property {number} [filesize] - File size in bytes
 * @property {number} [fps] - Frames per second
 * @property {string} [format_note] - Format description
 */

/**
 * @typedef {Object} RawYouTubeInfo
 * @property {string} title - Video title
 * @property {number} duration - Video duration in seconds
 * @property {string} thumbnail - Thumbnail URL
 * @property {RawYouTubeFormat[]} [formats] - Available formats
 */

/**
 * @typedef {Object} VideoFormat
 * @property {string} quality - Video quality (e.g., "720p")
 * @property {string} format - File format (e.g., "mp4")
 * @property {string} size - Formatted file size
 * @property {string} formatId - YouTube format ID
 * @property {number} height - Video height in pixels
 * @property {boolean} hasAudio - Whether format includes audio
 * @property {number} codecPriority - Codec priority for selection
 * @property {string} codecName - Human-readable codec name
 * @property {number} filesize - File size in bytes
 * @property {string} displayName - Display name for UI
 */

/**
 * @typedef {Object} AudioFormat
 * @property {string} quality - Audio quality description
 * @property {string} format - Audio format (e.g., "mp3")
 * @property {string} size - Formatted file size
 * @property {string} formatId - YouTube format ID
 * @property {string} codecName - Audio codec name
 * @property {number} filesize - File size in bytes
 * @property {string} displayName - Display name for UI
 */

/**
 * @typedef {Object} VideoInfo
 * @property {string} title - Video title
 * @property {number} duration - Video duration in seconds
 * @property {string} thumbnail - Thumbnail URL
 * @property {Object} formats - Available formats
 * @property {VideoFormat[]} formats.video - Video formats
 * @property {AudioFormat[]} formats.audio - Audio formats
 */

/**
 * @typedef {Object} DownloadResult
 * @property {import('child_process').ChildProcess} stream - Download stream
 * @property {string} contentType - MIME content type
 * @property {string} fileExtension - File extension
 */

/**
 * @typedef {Object} CookieOptions
 * @property {string} [cookies] - Path to cookie file
 */

const youtubeDl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

class YouTubeService {
    /**
     * Get cookie options for YouTube requests
     * @returns {CookieOptions} Cookie configuration object
     */
    static getCookieOptions() {
        const cookiePath = process.env.YOUTUBE_COOKIES_PATH || path.join(__dirname, '..', 'youtube_cookies.txt');
        
        if (fs.existsSync(cookiePath)) {
            try {
                const cookieContent = fs.readFileSync(cookiePath, 'utf8');
                if (cookieContent.startsWith('# Netscape HTTP Cookie File') || 
                    cookieContent.startsWith('# HTTP Cookie File')) {
                    console.log(`🍪 Using YouTube cookies from: ${cookiePath}`);
                    return { cookies: cookiePath };
                } else {
                    console.warn(`⚠️ Cookie file exists but invalid format: ${cookiePath}`);
                }
            } catch (error) {
                console.error(`❌ Error reading cookie file: ${(/** @type {Error} */ (error)).message}`);
            }
        } else {
            console.log(`ℹ️ No cookie file found at: ${cookiePath}`);
        }
        return {};
    }

    /**
     * Get video information from YouTube URL
     * @param {string} url - YouTube video URL
     * @returns {Promise<VideoInfo>} Video information including formats
     * @throws {Error} When video cannot be accessed or URL is invalid
     */
    static async getVideoInfo(url) {
        const startCpu = process.cpuUsage();
        const startMemory = process.memoryUsage();
        
        console.time('⏱️ Video Info Fetch');
        const cookieOptions = this.getCookieOptions();
        try {
            const info = await youtubeDl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                // noCallHome: true, // Not available in current version
                noCheckCertificates: true,
                ...cookieOptions
            });
            console.timeEnd('⏱️ Video Info Fetch');
            
            return this.processVideoInfo(/** @type {RawYouTubeInfo} */ (info));
        } catch (error) {
            console.timeEnd('⏱️ Video Info Fetch');
            const errorMessage = (/** @type {Error} */ (error)).message || '';
            if (errorMessage.includes('Sign in to confirm your age') || 
                errorMessage.includes('This video is unavailable') ||
                errorMessage.includes('HTTP Error 403')) {
                console.error('🚫 YouTube authentication error. Please check your cookie file.');
                console.log('💡 To fix: Export YouTube cookies to youtube_cookies.txt or set YOUTUBE_COOKIES_PATH');
            }
            throw error;
        }
    }

    /**
     * Process raw YouTube-DL info into structured format
     * @param {RawYouTubeInfo} info - Raw video info from youtube-dl
     * @returns {VideoInfo} Processed video information
     */
    static processVideoInfo(info) {
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

    /**
     * Extract and categorize video/audio formats
     * @param {RawYouTubeFormat[]} formats - Raw format list from youtube-dl
     * @returns {{video: VideoFormat[], audio: AudioFormat[]}} Categorized formats
     */
    static extractFormats(formats) {
        /** @type {VideoFormat[]} */
        const videoFormats = [];
        /** @type {AudioFormat[]} */
        const audioFormats = [];

        formats.forEach((/** @type {RawYouTubeFormat} */ format) => {
            // Video formats (has video codec and height)
            if (format.vcodec && format.vcodec !== 'none' && format.height) {
                // Skip formats without filesize (unless they have audio too)
                const hasAudio = !!(format.acodec && format.acodec !== 'none');
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
                    formatId: format.format_id || 'unknown',
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
                    formatId: format.format_id || 'unknown',
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

    /**
     * Get codec priority for format selection
     * @param {string} vcodec - Video codec identifier
     * @returns {{priority: number, name: string}} Codec priority and name
     */
    static getCodecPriority(vcodec) {
        if (vcodec.includes('avc1')) return { priority: 1, name: 'H.264' }; // Best compatibility
        if (vcodec.includes('vp9')) return { priority: 2, name: 'VP9' };
        if (vcodec.includes('av01')) return { priority: 3, name: 'AV1' };
        return { priority: 4, name: 'Other' };
    }

    /**
     * Get best format for each quality level
     * @param {VideoFormat[]} videoFormats - Available video formats
     * @returns {VideoFormat[]} Best formats per quality, sorted by height
     */
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


    /**
     * Format file size in human-readable format
     * @param {number|null|undefined} bytes - File size in bytes
     * @returns {string} Formatted file size (e.g., "15.2 MB")
     */
    static formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Download video from YouTube URL
     * @param {string} url - YouTube video URL
     * @param {string} [formatSelection='best'] - Format selection (quality, formatId, or 'best')
     * @param {string} [format='mp4'] - Output format ('mp4' or 'mp3')
     * @returns {Promise<DownloadResult>} Download stream and metadata
     * @throws {Error} When download fails or URL is invalid
     */
    static async downloadVideo(url, formatSelection = 'best', format = 'mp4') {
        let downloadFormat;
        let contentType;
        let fileExtension;
        let options;

        const cookieOptions = this.getCookieOptions();

        if (format === 'mp3') {
            downloadFormat = 'bestaudio';
            contentType = 'audio/mpeg';
            fileExtension = 'mp3';
            options = {
                output: '-',
                format: downloadFormat,
                noWarnings: true,
                noCheckCertificates: true,
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0, // Best quality
                ...cookieOptions
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
                noCheckCertificates: true,
                mergeOutputFormat: 'mp4',
                embedSubs: false,
                writeInfoJson: false,
                ...cookieOptions
            };
        }

        console.log(`Downloading with format: ${downloadFormat}`);
        
        // Track merge time for video formats that need merging
        const needsMerging = downloadFormat.includes('+') || (format === 'mp3' && 'extractAudio' in options && options.extractAudio);
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

    /**
     * Validate YouTube URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid YouTube URL
     */
    static isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
        return youtubeRegex.test(url);
    }
}

module.exports = YouTubeService;