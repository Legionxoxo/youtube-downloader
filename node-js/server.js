const express = require("express");
const cors = require("cors");
const path = require("path");
const YouTubeService = require("./services/youtube");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/download", async (req, res) => {
    try {
        const { url, quality = "best", format = "mp4" } = req.body;

        if (!url || !YouTubeService.isValidYouTubeUrl(url)) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await YouTubeService.getVideoInfo(url);
        const title = info.title.replace(/[^\w\s-]/gi, "");

        const { stream, contentType, fileExtension } =
            await YouTubeService.downloadVideo(url, quality, format);

        res.header(
            "Content-Disposition",
            `attachment; filename="${title}.${fileExtension}"`
        );
        res.header("Content-Type", contentType);
        res.header("Transfer-Encoding", "chunked");

        // Stream directly to response
        stream.stdout.pipe(res);

        stream.on("error", (error) => {
            console.error("Download stream error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to download video" });
            }
        });

        stream.on("close", () => {
            console.log("Download completed");
        });
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: "Failed to download video" });
    }
});

// Add progress tracking endpoint
app.get("/download-progress/:downloadId", (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const downloadId = req.params.downloadId;
    
    // Send initial connection
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Clean up on client disconnect
    req.on('close', () => {
        console.log(`Progress stream closed for ${downloadId}`);
    });
});

app.get("/info", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || !YouTubeService.isValidYouTubeUrl(url)) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await YouTubeService.getVideoInfo(url);
        res.json(info);
    } catch (error) {
        console.error("Info error:", error);
        res.status(500).json({ error: "Failed to get video info" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
