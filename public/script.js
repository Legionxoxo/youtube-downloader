const urlInput = document.getElementById('urlInput');
const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadForm = document.getElementById('downloadForm');
const videoInfo = document.getElementById('videoInfo');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoDuration = document.getElementById('videoDuration');
const videoQuality = document.getElementById('videoQuality');
const qualitySelect = document.getElementById('qualitySelect');
const downloadText = document.getElementById('downloadText');
const tabBtns = document.querySelectorAll('.tab-btn');

let currentVideoInfo = null;
let currentFormat = 'video';
let isDownloading = false;

function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

function showError(message) {
    error.textContent = message;
    showElement(error);
    hideElement(loading);
}

function hideError() {
    hideElement(error);
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function getVideoInfo(url) {
    try {
        showElement(loading);
        hideError();
        hideElement(videoInfo);
        
        const response = await fetch(`/info?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get video info');
        }
        
        currentVideoInfo = data;
        
        thumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        videoDuration.textContent = `Duration: ${formatDuration(parseInt(data.duration))}`;
        
        // Update quality options with actual available formats
        updateQualityOptions(data.formats);
        
        const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
        const displayQuality = selectedOption.dataset.quality || selectedOption.value;
        const formatType = currentFormat === 'audio' ? 'MP3' : 'MP4';
        videoQuality.textContent = `Selected: ${displayQuality} (${formatType})`;
        
        hideElement(loading);
        showElement(videoInfo);
        updateDownloadButton();
        
    } catch (err) {
        showError(err.message);
        downloadBtn.disabled = true;
        currentVideoInfo = null;
    }
}

async function downloadVideo(url) {
    try {
        isDownloading = true;
        updateDownloadButton();
        showElement(loading);
        hideError();
        
        const quality = qualitySelect.value;
        const format = currentFormat === 'audio' ? 'mp3' : 'mp4';
        
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, quality, format })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Download failed');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const extension = currentFormat === 'audio' ? 'mp3' : 'mp4';
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${currentVideoInfo?.title || 'video'}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(downloadUrl);
        hideElement(loading);
        
    } catch (err) {
        showError(err.message);
        hideElement(loading);
    } finally {
        isDownloading = false;
        updateDownloadButton();
    }
}

function isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
}

function updateDownloadButton() {
    const formatType = currentFormat === 'audio' ? 'Audio' : 'Video';
    
    if (isDownloading) {
        downloadText.textContent = 'Downloading...';
        downloadBtn.disabled = true;
    } else {
        downloadText.textContent = `Download ${formatType}`;
        const url = urlInput.value.trim();
        downloadBtn.disabled = !isValidYouTubeUrl(url);
    }
}

function updateQualityOptions(formats) {
    const currentQuality = qualitySelect.value;
    qualitySelect.innerHTML = '<option value="best">Best Quality</option>';
    
    if (currentFormat === 'video' && formats.video && formats.video.length > 0) {
        formats.video.forEach(format => {
            const option = document.createElement('option');
            // Use format ID for precise quality selection
            option.value = `formatId:${format.formatId}`;
            option.textContent = format.displayName || `${format.quality} (${format.size})`;
            option.dataset.quality = format.quality; // Store quality for display
            qualitySelect.appendChild(option);
        });
    } else if (currentFormat === 'audio' && formats.audio && formats.audio.length > 0) {
        formats.audio.forEach(format => {
            const option = document.createElement('option');
            option.value = `formatId:${format.formatId}`;
            option.textContent = format.displayName || `${format.quality} (${format.size})`;
            option.dataset.quality = format.quality;
            qualitySelect.appendChild(option);
        });
    }
    
    // Try to restore previous selection by quality name
    if (currentQuality && currentQuality !== 'best') {
        const matchingOption = Array.from(qualitySelect.options).find(opt => 
            opt.dataset.quality === currentQuality || opt.value === currentQuality
        );
        if (matchingOption) {
            qualitySelect.value = matchingOption.value;
        }
    }
}

urlInput.addEventListener('input', () => {
    const url = urlInput.value.trim();
    const isValid = isValidYouTubeUrl(url);
    previewBtn.disabled = !isValid;
    hideElement(videoInfo);
    hideError();
    currentVideoInfo = null;
    updateDownloadButton();
});

previewBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (isValidYouTubeUrl(url)) {
        getVideoInfo(url);
    } else {
        showError('Please enter a valid YouTube URL');
    }
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (isDownloading) return; // Prevent changes during download
        
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.dataset.format;
        updateDownloadButton();
        
        if (currentVideoInfo && currentVideoInfo.formats) {
            updateQualityOptions(currentVideoInfo.formats);
            const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
            const displayQuality = selectedOption.dataset.quality || selectedOption.value;
            const formatType = currentFormat === 'audio' ? 'MP3' : 'MP4';
            videoQuality.textContent = `Selected: ${displayQuality} (${formatType})`;
        }
    });
});

qualitySelect.addEventListener('change', () => {
    if (isDownloading) return; // Prevent changes during download
    
    if (currentVideoInfo) {
        const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
        const displayQuality = selectedOption.dataset.quality || selectedOption.value;
        const formatType = currentFormat === 'audio' ? 'MP3' : 'MP4';
        videoQuality.textContent = `Selected: ${displayQuality} (${formatType})`;
    }
});

downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    if (!isValidYouTubeUrl(url)) {
        showError('Please enter a valid YouTube URL');
        return;
    }
    
    await downloadVideo(url);
});

// Initialize
updateDownloadButton();