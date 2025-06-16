const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Increase payload size limit for multiple base64 files
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

app.post('/chat', async (req, res) => {
    try {
        const { message, history, files } = req.body;
        const chat = model.startChat({ history: history || [] });

        const messageParts = [{ text: message }];

        // If files were uploaded, loop through them and add to message parts
        if (files && Array.isArray(files) && files.length > 0) {
            files.forEach(file => {
                if (file.data) {
                    const base64Data = file.data.split(',')[1];
                    messageParts.push({
                        inlineData: {
                            mimeType: file.mimeType,
                            data: base64Data
                        }
                    });
                }
            });
        }
        
        // Use sendMessageStream for potentially long responses from multimodal input
        const result = await chat.sendMessageStream(messageParts);
        let text = '';
        for await (const chunk of result.stream) {
            text += chunk.text();
        }

        res.json({ response: text });

    } catch (error) {
        console.error("Error in /chat endpoint:", error);
        res.status(500).json({ error: 'Failed to get response from Gemini' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
