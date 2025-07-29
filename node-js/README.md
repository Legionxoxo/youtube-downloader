# YouTube Video Downloader

A simple and clean web application for downloading YouTube videos. Built with Node.js, Express, and vanilla HTML/CSS/JavaScript.

## Features

- **Simple Interface**: Clean and intuitive web interface
- **Video Preview**: Preview video details before downloading
- **Video Information**: Shows video title, duration, and thumbnail
- **Direct Download**: Downloads videos as MP4 files
- **URL Validation**: Validates YouTube URLs before processing
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Clear error messages for invalid URLs or failed downloads
- **Loading States**: Visual feedback during processing

## How to Start

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)
- yt-dlp (YouTube downloader)
- FFmpeg (video processing)

### Installation & Setup

1. **Install yt-dlp:**
   
   **On Windows:**
   ```bash
   # Using pip
   pip install yt-dlp
   
   # Or download from GitHub releases
   # Download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases
   ```
   
   **On macOS:**
   ```bash
   # Using Homebrew
   brew install yt-dlp
   
   # Or using pip
   pip install yt-dlp
   ```
   
   **On Linux:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install yt-dlp
   
   # Or using pip
   pip install yt-dlp
   ```

2. **Install FFmpeg:**
   
   **On Windows:**
   ```bash
   # Using chocolatey
   choco install ffmpeg
   
   # Or download from https://ffmpeg.org/download.html
   ```
   
   **On macOS:**
   ```bash
   # Using Homebrew
   brew install ffmpeg
   ```
   
   **On Linux:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ffmpeg
   
   # CentOS/RHEL
   sudo yum install ffmpeg
   ```

3. **Setup YouTube Authentication (Optional but Recommended):**
   
   For accessing age-restricted or private videos, you'll need YouTube cookies:
   
   **Method 1: Browser Extension**
   - Install "Get cookies.txt LOCALLY" extension for Chrome/Firefox
   - Visit YouTube and login to your account
   - Click the extension and export cookies for youtube.com
   - Save as `youtube_cookies.txt` in the project root
   
   **Method 2: Manual Export**
   - Login to YouTube in your browser
   - Open Developer Tools (F12)
   - Go to Application/Storage tab → Cookies → https://www.youtube.com
   - Copy all cookies to a text file in Netscape format
   - Save as `youtube_cookies.txt` in project root
   
   **File Location:**
   ```
   your-project/
   ├── youtube_cookies.txt  ← Place your cookies file here
   ├── server.js
   └── ...
   ```
   
   **Alternative Cookie Path:**
   Set environment variable: `YOUTUBE_COOKIES_PATH=/path/to/your/cookies.txt`

4. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open your browser:**
   Navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart:
```
npm run dev
```

## Usage

1. Open the application in your web browser
2. Paste a YouTube video URL into the input field
3. Click "Preview" to see video details
4. Click "Download Video" to save the video to your device

## Project Structure

```
├── server.js          # Express server
├── package.json       # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML page
│   ├── style.css      # Styling
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

## Technologies Used

- **Backend**: Node.js, Express.js, youtube-dl-exec
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: CSS Grid/Flexbox, Responsive Design
- **Video Processing**: yt-dlp + FFmpeg

## Notes

- Only supports YouTube video URLs
- Downloads in MP4 format with highest available quality
- Requires active internet connection
- Video download speed depends on video size and internet connection
- For age-restricted videos, YouTube cookies are required
- FFmpeg is needed for video/audio merging and format conversion

## Troubleshooting

**Authentication Errors:**
- Export fresh YouTube cookies if getting 403 errors
- Ensure cookies file is in Netscape format
- Check file path: `youtube_cookies.txt` in project root

**Missing Dependencies:**
- Verify yt-dlp installation: `yt-dlp --version`
- Verify FFmpeg installation: `ffmpeg -version`
- Both should be available in system PATH