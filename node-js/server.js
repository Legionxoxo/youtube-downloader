/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').Application} Application
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const YouTubeService = require('./services/youtube');

/** @type {Application} */
const app = express();
/** @type {number} */
const PORT = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Serve the main HTML page
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Handle video download requests
 * @param {Request & {body: {url: string, quality?: string, format?: string}}} req - Express request with download parameters
 * @param {Response} res - Express response object
 */
app.post('/download', async (req, res) => {
	try {
		const { url, quality = 'best', format = 'mp4' } = req.body;

		if (!url || !YouTubeService.isValidYouTubeUrl(url)) {
			return res.status(400).json({ error: 'Invalid YouTube URL' });
		}

		const info = await YouTubeService.getVideoInfo(url);
		const title = info.title.replace(/[^\w\s-]/gi, '');

		const { stream, contentType, fileExtension } = await YouTubeService.downloadVideo(url, quality, format);

		res.header('Content-Disposition', `attachment; filename="${title}.${fileExtension}"`);
		res.header('Content-Type', contentType);
		res.header('Transfer-Encoding', 'chunked');

		// Stream directly to response
		if (stream.stdout) {
			stream.stdout.pipe(res);
		} else {
			throw new Error('No stdout stream available');
		}

		stream.on('error', error => {
			console.error('Download stream error:', error);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Failed to download video' });
			}
		});

		stream.on('close', () => {
			console.log('Download completed');
		});
	} catch (error) {
		console.error('Download error:', error);
		res.status(500).json({ error: 'Failed to download video' });
	}
});

/**
 * Handle download progress tracking via Server-Sent Events
 * @param {Request & {params: {downloadId: string}}} req - Express request with download ID
 * @param {Response} res - Express response object for SSE stream
 */
app.get('/download-progress/:downloadId', (req, res) => {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Cache-Control',
	});

	const downloadId = req.params.downloadId;

	// Send initial connection
	res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

	// Clean up on client disconnect
	req.on('close', () => {
		console.log(`Progress stream closed for ${downloadId}`);
	});
});

/**
 * Get video information without downloading
 * @param {Request & {query: {url: string}}} req - Express request with video URL
 * @param {Response} res - Express response object
 */
app.get('/info', async (req, res) => {
	try {
		const { url } = req.query;
	const urlString = typeof url === 'string' ? url : '';

		if (!urlString || !YouTubeService.isValidYouTubeUrl(urlString)) {
			return res.status(400).json({ error: 'Invalid YouTube URL' });
		}

		const info = await YouTubeService.getVideoInfo(urlString);
		res.json(info);
	} catch (error) {
		console.error('Info error:', error);
		res.status(500).json({ error: 'Failed to get video info' });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
