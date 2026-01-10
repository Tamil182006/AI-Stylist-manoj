const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect('mongodb://127.0.0.1:27017/ai-stylist', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected to ai-stylist'))
    .catch(err => console.log(err));

// Routes
const analyzeRoute = require('./routes/analyze');
app.use('/api', analyzeRoute);

// Add this with your other route imports (near the top)
const virtualTryonRoute = require('./routes/virtualTryon');
const authRoute = require('./routes/auth');
const dashboardRoute = require('./routes/dashboard');
const outfitRoute = require('./routes/outfits');
const profileRoute = require('./routes/profile');
const chatRoute = require('./routes/chat');

// Add this with your other route registrations
app.use('/api', virtualTryonRoute);
app.use('/api', authRoute);
app.use('/api', dashboardRoute);
app.use('/api', outfitRoute);
app.use('/api/profile', profileRoute);
app.use('/api/chat', chatRoute);

// Basic Route
app.get('/', (req, res) => {
    res.send('AI Stylist Backend Running');
});

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
