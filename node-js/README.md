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

### Installation & Setup

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Start the server:**
   ```
   npm start
   ```

3. **Open your browser:**
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

- **Backend**: Node.js, Express.js, ytdl-core
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: CSS Grid/Flexbox, Responsive Design
- **Video Processing**: ytdl-core library

## Notes

- Only supports YouTube video URLs
- Downloads in MP4 format with highest available quality
- Requires active internet connection
- Video download speed depends on video size and internet connection