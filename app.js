require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');

const Agent = require('./Models/Agent');
const User = require('./Models/User');
const Account = require('./Models/Account');
const Lob = require('./Models/Lob');
const Carrier = require('./Models/Carrier');
const Policy = require('./Models/Policy');
const ScheduledMessage = require('./Models/SheduledMessage');
const Message = require('./Models/Message');

const app = express();
app.use(express.json());

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

mongoose.connect(process.env.MONGO_URI , { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB connected'))
  .catch(err=>{ console.error('Mongo connect error', err); process.exit(1); });

function parseFileInWorker(filePath, originalName) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'fileParser.js'), {
      workerData: { filePath, originalName }
    });
    worker.on('message', (m) => {
      console.log('Worker message:', m);
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

//file upload api
//POST http://localhost:3000/upload?file=<file.csv>
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required as "file"' });

    const filePath = req.file.path;
    await parseFileInWorker(filePath, req.file.originalname);

    try { fs.unlinkSync(filePath); } catch (e) {}

    res.json({ success: true, message: 'File processed and data inserted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// 2) Search API to find policy info with username
// GET /policy/search?username=firstname
app.get('/policy/search', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'username query param required' });

  try {
    const users = await User.find({ firstname: new RegExp('^' + username + '$', 'i') });
    if (!users.length) return res.json({ policies: [] });

    const userIds = users.map(u => u._id);
    const policies = await Policy.find({ user: { $in: userIds } })
      .populate('user agent account policy_category_collection_id company_collection_id');

    res.json({ policies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3) Aggregated policy by each user
// GET /policy/aggregate
app.get('/policy/aggregate', async (req, res) => {
  try {
    const agg = await Policy.aggregate([
      {
        $group: {
          _id: '$user',
          policy_count: { $sum: 1 },
          policies: { $push: { policy_number: '$policy_number', policy_start_date: '$policy_start_date', policy_end_date: '$policy_end_date' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user: { _id: '$user._id', firstname: '$user.firstname', email: '$user.email' },
          policy_count: 1,
          policies: 1
      }
    }
    ]);
    res.json({ aggregation: agg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4) Create scheduled message: POST /schedule
app.post('/schedule', async (req, res) => {
  try {
    const { message, runAt, day, time } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    let runDate;
    if (runAt) runDate = new Date(runAt);
    else if (day && time) runDate = new Date(`${day}T${time}:00`);
    else return res.status(400).json({ error: 'runAt or (day and time) required' });

    if (isNaN(runDate.getTime())) return res.status(400).json({ error: 'Invalid date/time' });

    const scheduled = await ScheduledMessage.create({ message, runAt: runDate });
    scheduleJobForMessage(scheduled);

    res.json({ scheduled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true, pid: process.pid }));


async function runScheduledJob(scheduledDoc) {
  if (scheduledDoc.done) return;
  await Message.create({ message: scheduledDoc.message });
  scheduledDoc.done = true;
  await scheduledDoc.save();
  console.log('Inserted scheduled message:', scheduledDoc._id);
}

function scheduleJobForMessage(scheduledDoc) {
  const date = new Date(scheduledDoc.runAt);
  if (date <= new Date()) {
    runScheduledJob(scheduledDoc).catch(console.error);
    return;
  }
  schedule.scheduleJob(scheduledDoc._id.toString(), date, async function() {
    try {
      await runScheduledJob(scheduledDoc);
    } catch (e) {
      console.error('scheduled job error', e);
    }
  });
}

async function reloadPendingSchedules() {
  const pending = await ScheduledMessage.find({ done: false, runAt: { $gte: new Date(0) } });
  pending.forEach(scheduleJobForMessage);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Worker ${process.pid} listening on ${PORT}`);
  await reloadPendingSchedules();
});
