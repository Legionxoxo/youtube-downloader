/** @type {HTMLInputElement | null} */
const urlInput = /** @type {HTMLInputElement | null} */ (document.getElementById('urlInput'));
/** @type {HTMLButtonElement | null} */
const previewBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('previewBtn'));
/** @type {HTMLButtonElement | null} */
const downloadBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('downloadBtn'));
/** @type {HTMLFormElement | null} */
const downloadForm = /** @type {HTMLFormElement | null} */ (document.getElementById('downloadForm'));
/** @type {HTMLElement | null} */
const videoInfo = document.getElementById('videoInfo');
/** @type {HTMLElement | null} */
const loading = document.getElementById('loading');
/** @type {HTMLElement | null} */
const error = document.getElementById('error');

/** @type {HTMLImageElement | null} */
const thumbnail = /** @type {HTMLImageElement | null} */ (document.getElementById('thumbnail'));
/** @type {HTMLElement | null} */
const videoTitle = document.getElementById('videoTitle');
/** @type {HTMLElement | null} */
const videoDuration = document.getElementById('videoDuration');
/** @type {HTMLElement | null} */
const videoQuality = document.getElementById('videoQuality');
/** @type {HTMLSelectElement | null} */
const qualitySelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('qualitySelect'));
/** @type {HTMLElement | null} */
const downloadText = document.getElementById('downloadText');
/** @type {NodeListOf<HTMLButtonElement>} */
const tabBtns = document.querySelectorAll('.tab-btn');

/** @type {any} */
let currentVideoInfo = null;
/** @type {string} */
let currentFormat = 'video';
/** @type {boolean} */
let isDownloading = false;
/** @type {AbortController | null} */
let downloadController = null;

/**
 * @param {HTMLElement} element
 */
function showElement(element) {
    element.classList.remove('hidden');
}

/**
 * @param {HTMLElement} element
 */
function hideElement(element) {
    element.classList.add('hidden');
}

/**
 * @param {string} message
 */
function showError(message) {
    if (error) {
        error.textContent = message;
        showElement(error);
    }
    if (loading) hideElement(loading);
}

function hideError() {
    if (error) hideElement(error);
}

function showProgressBar() {
    const progressContainer = document.getElementById('progressContainer');
    /** @type {HTMLElement | null} */
    const progressBar = document.getElementById('progressBar');
    /** @type {HTMLElement | null} */
    const progressText = document.getElementById('progressText');
    
    if (progressContainer) {
        showElement(progressContainer);
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = 'Starting download...';
    }
    if (loading) hideElement(loading);
}

function hideProgressBar() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
        hideElement(progressContainer);
    }
}

/**
 * @param {number} percentage
 * @param {string|null} [customText]
 */
function updateProgress(percentage, customText = null) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (!progressBar || !progressText) return;
    
    if (percentage >= 0) {
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = customText || `Downloading... ${percentage}%`;
    } else {
        // Indeterminate progress
        progressBar.style.width = '100%';
        progressBar.classList.add('indeterminate');
        progressText.textContent = customText || 'Downloading...';
    }
}

/**
 * @param {number} seconds
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * @param {string} url
 */
async function getVideoInfo(url) {
    try {
        if (loading) showElement(loading);
        hideError();
        if (videoInfo) hideElement(videoInfo);
        
        const response = await fetch(`/info?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get video info');
        }
        
        currentVideoInfo = data;
        
        if (thumbnail) thumbnail.src = data.thumbnail;
        if (videoTitle) videoTitle.textContent = data.title;
        if (videoDuration) videoDuration.textContent = `Duration: ${formatDuration(parseInt(data.duration))}`;
        
        // Update quality options with actual available formats
        updateQualityOptions(data.formats);
        
        if (qualitySelect) {
            const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
            const displayQuality = (/** @type {HTMLOptionElement} */ (selectedOption)).dataset.quality || selectedOption.value;
            const formatType = currentFormat === 'audio' ? 'MP3' : 'MP4';
            if (videoQuality) videoQuality.textContent = `Selected: ${displayQuality} (${formatType})`;
        }
        
        if (loading) hideElement(loading);
        if (videoInfo) showElement(videoInfo);
        updateDownloadButton();
        
    } catch (err) {
        showError((/** @type {Error} */ (err)).message || 'Failed to load video info');
        if (downloadBtn) downloadBtn.disabled = true;
        currentVideoInfo = null;
    }
}

/**
 * @param {string} url
 */
async function downloadVideo(url) {
    try {
        isDownloading = true;
        downloadController = new AbortController();
        updateDownloadButton();
        showProgressBar();
        hideError();
        
        if (!qualitySelect) throw new Error('Quality selector not found');
        const quality = qualitySelect.value;
        const format = currentFormat === 'audio' ? 'mp3' : 'mp4';
        
        // Start streaming download with abort signal
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, quality, format }),
            signal: downloadController.signal
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Download failed');
        }
        
        // Stream the response with progress tracking
        if (!response.body) throw new Error('No response body available');
        const reader = response.body.getReader();
        const contentLength = response.headers.get('Content-Length');
        const chunks = [];
        let receivedLength = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Check if download was cancelled
            if (downloadController.signal.aborted) {
                reader.cancel();
                throw new Error('Download cancelled');
            }
            
            chunks.push(value);
            receivedLength += value.length;
            
            // Update progress if content length is known
            if (contentLength) {
                const progress = (receivedLength / parseInt(contentLength)) * 100;
                updateProgress(Math.round(progress));
            } else {
                // Show indeterminate progress
                updateProgress(-1, /** @type {string} */ (`Downloaded ${formatBytes(receivedLength)}`));
            }
        }
        
        // Combine chunks into blob
        const blob = new Blob(chunks);
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const extension = currentFormat === 'audio' ? 'mp3' : 'mp4';
        const downloadElement = document.createElement('a');
        downloadElement.href = downloadUrl;
        downloadElement.download = `${currentVideoInfo?.title || 'video'}.${extension}`;
        document.body.appendChild(downloadElement);
        downloadElement.click();
        document.body.removeChild(downloadElement);
        
        window.URL.revokeObjectURL(downloadUrl);
        hideProgressBar();
        
    } catch (err) {
        const error = /** @type {Error} */ (err);
        if (error.name === 'AbortError' || error.message === 'Download cancelled') {
            showError('Download cancelled');
        } else {
            showError(error.message || 'Download failed');
        }
        hideProgressBar();
    } finally {
        isDownloading = false;
        downloadController = null;
        updateDownloadButton();
    }
}

function cancelDownload() {
    if (downloadController) {
        downloadController.abort();
    }
}

/**
 * @param {number} bytes
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * @param {string} url
 */
function isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
}

function updateDownloadButton() {
    const formatType = currentFormat === 'audio' ? 'Audio' : 'Video';
    
    if (isDownloading) {
        if (downloadText) downloadText.textContent = 'Cancel Download';
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.onclick = cancelDownload;
            downloadBtn.style.background = '#dc3545';
        }
    } else {
        if (downloadText) downloadText.textContent = `Download ${formatType}`;
        const url = urlInput ? urlInput.value.trim() : '';
        if (downloadBtn) {
            downloadBtn.disabled = !isValidYouTubeUrl(url);
            downloadBtn.onclick = null;
            downloadBtn.style.background = '';
        }
    }
}

/**
 * @param {any} formats
 */
function updateQualityOptions(formats) {
    if (!qualitySelect) return;
    const currentQuality = qualitySelect.value;
    qualitySelect.innerHTML = '<option value="best">Best Quality</option>';
    
    if (currentFormat === 'video' && formats.video && formats.video.length > 0) {
        formats.video.forEach((/** @type {any} */ format) => {
            const option = document.createElement('option');
            // Use format ID for precise quality selection
            option.value = `formatId:${format.formatId}`;
            option.textContent = format.displayName || `${format.quality} (${format.size})`;
            option.dataset.quality = format.quality; // Store quality for display
            qualitySelect.appendChild(option);
        });
    } else if (currentFormat === 'audio' && formats.audio && formats.audio.length > 0) {
        formats.audio.forEach((/** @type {any} */ format) => {
            const option = document.createElement('option');
            option.value = `formatId:${format.formatId}`;
            option.textContent = format.displayName || `${format.quality} (${format.size})`;
            option.dataset.quality = format.quality;
            qualitySelect.appendChild(option);
        });
    }
    
    // Try to restore previous selection by quality name
    if (currentQuality && currentQuality !== 'best') {
        const matchingOption = Array.from(qualitySelect.options).find((/** @type {HTMLOptionElement} */ opt) => 
            opt.dataset.quality === currentQuality || opt.value === currentQuality
        );
        if (matchingOption) {
            qualitySelect.value = matchingOption.value;
        }
    }
}

if (urlInput) {
    urlInput.addEventListener('input', () => {
        const url = urlInput ? urlInput.value.trim() : '';
        const isValid = isValidYouTubeUrl(url);
        if (previewBtn) previewBtn.disabled = !isValid;
        if (videoInfo) hideElement(videoInfo);
        hideError();
        currentVideoInfo = null;
        updateDownloadButton();
    });
}

if (previewBtn) {
    previewBtn.addEventListener('click', () => {
        const url = urlInput ? urlInput.value.trim() : '';
        if (isValidYouTubeUrl(url)) {
            getVideoInfo(url);
        } else {
            showError('Please enter a valid YouTube URL');
        }
    });
}

tabBtns.forEach((/** @type {HTMLButtonElement} */ btn) => {
    btn.addEventListener('click', () => {
        if (isDownloading) return; // Prevent changes during download
        
        tabBtns.forEach((/** @type {HTMLButtonElement} */ b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.dataset.format || 'video';
        updateDownloadButton();
        
        if (currentVideoInfo && currentVideoInfo.formats && qualitySelect) {
            updateQualityOptions(currentVideoInfo.formats);
            const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
            const displayQuality = (/** @type {HTMLOptionElement} */ (selectedOption)).dataset.quality || selectedOption.value;
            const formatType = currentFormat === 'audio' ? 'MP3' : 'MP4';
            if (videoQuality) videoQuality.textContent = `Selected: ${displayQuality} (${formatType})`;
        }
    });
});

if (qualitySelect) {
    qualitySelect.addEventListener('change', () => {
        if (isDownloading) return; // Prevent changes during download
        
        if (currentVideoInfo && qualitySelect) {
            const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
            const displayQuality = (/** @type {HTMLOptionElement} */ (selectedOption)).dataset.quality || selectedOption.value;
            const formatType = currentFormat === 'audio' ? 'MP3' : 'MP4';
            if (videoQuality) videoQuality.textContent = `Selected: ${displayQuality} (${formatType})`;
        }
    });
}

if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
        const url = urlInput ? urlInput.value.trim() : '';
        
        if (!isValidYouTubeUrl(url)) {
            showError('Please enter a valid YouTube URL');
            return;
        }
        
        await downloadVideo(url);
    });
}

// Initialize
updateDownloadButton();