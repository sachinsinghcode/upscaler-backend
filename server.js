require('dotenv').config(); // Loads the variables from .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CONNECT TO COSMOS DB ---
const MONGO_URI = process.env.COSMOS_MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Successfully connected to Cosmos DB (MongoDB)'))
  .catch(err => console.error('❌ Error connecting to Cosmos DB:', err));

// --- 2. DEFINE DATABASE SCHEMA ---
const articleSchema = new mongoose.Schema({
    date: { type: String, required: true },
    headline: { type: String, required: true },
    gist: { type: String, required: true },
    fullText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Article = mongoose.model('Article', articleSchema);

// --- 3. API ROUTES ---

// Admin Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') { // You can change this
        res.json({ success: true, token: 'fake-jwt-admin-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// GET: Fetch Articles from Cosmos DB
app.get('/api/articles', async (req, res) => {
    try {
        const { date } = req.query;
        
        // If a date is provided, filter by it. Otherwise, fetch all.
        const query = date ? { date } : {};
        
        // FIX: Fetch from DB WITHOUT .sort() to prevent Cosmos DB Indexing errors
        let articles = await Article.find(query);

        // FIX: Sort the articles in JavaScript instead (Newest first)
        articles.sort((a, b) => b.createdAt - a.createdAt);

        // Format data to match exactly what the React frontend expects
        const formattedArticles = articles.map(a => ({
            id: a._id.toString(), 
            date: a.date,
            headline: a.headline,
            gist: a.gist,
            fullText: a.fullText
        }));

        res.json(formattedArticles);
    } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST: Add a new Article to Cosmos DB
app.post('/api/articles', async (req, res) => {
    try {
        const { date, headline, gist, fullText } = req.body;
        
        // Create new document
        const newArticle = new Article({ date, headline, gist, fullText });
        
        // Save to Cosmos DB
        await newArticle.save();

        res.status(201).json({ 
            message: 'Article saved successfully', 
            article: {
                id: newArticle._id.toString(),
                date: newArticle.date,
                headline: newArticle.headline,
                gist: newArticle.gist,
                fullText: newArticle.fullText
            } 
        });
    } catch (error) {
        console.error("Error saving article:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

 process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));