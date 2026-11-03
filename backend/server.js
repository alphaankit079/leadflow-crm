const cron = require('node-cron');
const Lead = require('./models/Lead');

// Har roz subah 9:00 baje background check chalega
cron.schedule('0 9 * * *', async () => {
  try {
    const staleLeads = await Lead.find({
      stage: { $in: ['NEW', 'CONTACTED'] },
      updatedAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 din se inactive
    });
    console.log(`[Cron Job] Found ${staleLeads.length} stagnant leads needing follow-up reminder.`);
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Main API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

// Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'LeadFlow CRM Backend is Running!' });
});

// Connect MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });