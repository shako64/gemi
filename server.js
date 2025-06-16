// server.js

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Loads environment variables from a .env file

// Initialize the Express application
const app = express();
const port = process.env.PORT || 3000;

// Check for API Key
if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1); // Exit the process with an error code
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Middleware setup
app.use(express.static('public')); // Serve static files (HTML, CSS, JS) from the 'public' folder
app.use(express.json());           // Enable JSON body parsing for POST requests

// API endpoint for chat functionality
app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        // Basic validation
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const chat = model.startChat({
            history: history || [],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });

    } catch (error) {
        // Log the detailed error to the server console for debugging
        console.error("Error in /chat endpoint:", error);

        // Send a generic error message to the client
        res.status(500).json({ error: 'An error occurred while communicating with the Gemini API.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log("Make sure you have set your GEMINI_API_KEY in the .env file.");
});
