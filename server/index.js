import { config } from "dotenv";
config();
import http from "http";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL];

const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const url = new URL(req.url || "", `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/get-blog") {
        try {
            const query = url.searchParams;
            const topic = query.get("topic");

            const config = {
                responseMimeType: "text/plain",
            };
            const model = "gemini-2.0-flash-lite";
            const contents = [
                {
                    role: "user",
                    parts: [
                        {
                            text: `You are a professional blog writer.

                                    Write a detailed and well-formatted blog post of approximately 1000 words based on the following prompt:

                                    “${topic}”

                                    Ensure the blog:
                                    - Has a clear title
                                    - Includes an introduction, main body with multiple subheadings, and a conclusion
                                    - Uses conversational yet informative tone
                                    - Is well-structured for readability with paragraphs, headings, and lists (if needed)
                                    - Avoids repetition and keeps content engaging

                                    Do not mention that this content was AI-generated. Focus on clarity and flow.
                                    `,
                        },
                    ],
                },
            ];

            const response = await ai.models.generateContentStream({
                model,
                config,
                contents,
            });

            // Forward AI stream response to browser
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });

            let fileIndex = 0;
            for await (const chunk of response) {
                try {
                    // console.log(chunk.text);
                    if (chunk.text) {
                        res.write(`data: ${chunk.text}\n\n`);
                    } else {
                        res.end();
                    }
                } catch (error) {
                    console.error("Stream error:", error);
                    // res.writeHead(500);
                    res.end("AI stream error");
                }
            }
            res.end();
        } catch (error) {
            console.log(error);
        }
    } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>Page Not Found</h1>");
    }
});

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
