# YouTube Download Flow Documentation

## Architecture Overview
The application uses a client-server architecture with an Express.js backend and vanilla JavaScript frontend. It leverages the `youtube-dl-exec` library for YouTube video processing.

## Core Files and Functions

### Backend Components

**server.js** - Main Express server
- `app.post("/download", ...)` - Handles download requests, validates URLs, processes video info, and streams downloaded content
- `app.get("/info", ...)` - Retrieves video metadata without downloading

**services/youtube.js** - YouTube processing service (YouTubeService class)
- `getVideoInfo(url)` - Extracts video metadata and available formats using youtube-dl-exec
- `extractFormats(formats)` - Processes raw format data into organized video/audio options
- `downloadVideo(url, formatSelection, format)` - Streams video/audio download with format selection
- `isValidYouTubeUrl(url)` - Validates YouTube URL format
- `getBestFormatsPerQuality(videoFormats)` - Selects optimal format for each quality level
- `getCodecPriority(vcodec)` - Prioritizes video codecs (H.264 > VP9 > AV1)
- `formatFileSize(bytes)` - Converts bytes to human-readable format

### Frontend Components  

**public/script.js** - Client-side interface logic
- `getVideoInfo(url)` - Fetches video metadata from backend /info endpoint
- `downloadVideo(url)` - Initiates download via /download endpoint and handles file save
- `updateQualityOptions(formats)` - Populates quality dropdown with available formats
- `isValidYouTubeUrl(url)` - Client-side URL validation
- Event handlers for URL input, preview button, format tabs, and download button

**public/index.html** - User interface with input field, preview area, format tabs, and download controls

## Download Flow Concept

1. **URL Input & Validation**: User enters YouTube URL → Client validates format → Preview button enabled
2. **Video Info Retrieval**: Preview clicked → Client calls `/info` → Server uses YouTubeService.getVideoInfo() → youtube-dl-exec extracts metadata → Formats processed and returned
3. **Format Selection**: User selects video/audio tab and quality → Client updates UI with available options
4. **Download Process**: Download clicked → Client calls `/download` with URL and format → Server uses YouTubeService.downloadVideo() → youtube-dl-exec streams content → Server pipes stream to response → Client saves as file

## Key Dependencies
- **youtube-dl-exec**: Core YouTube processing engine
- **Express.js**: Web server framework  
- **CORS**: Cross-origin request handling