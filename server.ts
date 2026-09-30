import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Mongoose Schema for ERP State Persistence
// Matches the singleton cloud sync pattern (like restaurantstates in cafeteria project)
const erpStateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, default: 'singleton' },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'erpstates' }
);

const ErpState = mongoose.model('ErpState', erpStateSchema);

let isConnected = false;

// Connect to MongoDB
const connectDB = async () => {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set in .env file. Running in offline/memory mode.');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas successfully! Database:', mongoose.connection.name);
  } catch (error) {
    isConnected = false;
    console.error('❌ MongoDB Atlas connection error:', error);
  }
};

connectDB();

// API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: isConnected ? 'connected' : 'disconnected',
    databaseName: isConnected ? mongoose.connection.name : null,
  });
});

// Get ERP state from MongoDB
app.get('/api/state', async (_req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is not connected. Check MONGODB_URI in .env.',
    });
  }

  try {
    const doc = await ErpState.findOne({ id: 'singleton' });
    if (!doc) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: doc.data, updatedAt: doc.updatedAt });
  } catch (error: any) {
    console.error('Error fetching state:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save or Update ERP state in MongoDB
app.post('/api/state', async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is not connected. Data remains safely in localStorage.',
    });
  }

  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Data payload is required.' });
    }

    const updated = await ErpState.findOneAndUpdate(
      { id: 'singleton' },
      { data, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, updatedAt: updated.updatedAt });
  } catch (error: any) {
    console.error('Error saving state:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset state
app.post('/api/state/reset', async (_req, res) => {
  if (!isConnected) {
    return res.status(503).json({ success: false, message: 'MongoDB not connected.' });
  }
  try {
    await ErpState.deleteOne({ id: 'singleton' });
    res.json({ success: true, message: 'Cloud database state cleared.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve frontend in production or if dist exists
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Not Found');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ERP Server running at http://localhost:${PORT}`);
});
