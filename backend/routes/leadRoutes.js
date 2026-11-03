const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Default Stage Win Probabilities
const STAGE_PROBABILITY = {
  NEW: 15,
  CONTACTED: 30,
  DEMO_SCHEDULED: 55,
  NEGOTIATION: 80,
  WON: 100,
  LOST: 0
};

// 1. Get All Leads (With Search, Stage, Date Range, Currency & Tag Filter)
router.get('/', protect, async (req, res) => {
  try {
    const { stage, search, startDate, endDate, currency, tag } = req.query;
    const query = { workspaceId: req.user.workspaceId };

    if (req.user.role === 'REP') {
      query.assignedTo = req.user.userId;
    }
    if (stage) query.stage = stage;
    if (currency && currency !== 'ALL') query.currency = currency;
    if (tag && tag !== 'ALL') query.tags = tag;

    if (search) {
      query.$or = [
        { name: { $regex: search,$options: 'i' } },
        { companyName: { $regex: search,$options: 'i' } },
        { email: { $regex: search,$options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email role')
      .sort({ updatedAt: -1 });

    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Dashboard Analytics Summary, Forecast & Funnel Conversion Data
router.get('/analytics', protect, async (req, res) => {
  try {
    const query = { workspaceId: req.user.workspaceId };
    if (req.user.role === 'REP') query.assignedTo = req.user.userId;

    const leads = await Lead.find(query);
    const totalLeads = leads.length;
    const totalPipelineValue = leads.reduce((sum, l) => sum + l.dealValue, 0);
    const wonDeals = leads.filter(l => l.stage === 'WON');
    const wonRevenue = wonDeals.reduce((sum, l) => sum + l.dealValue, 0);

    // Weighted Revenue Forecast (Deal Value * Probability %)
    const forecastedRevenue = leads
      .filter(l => l.stage !== 'LOST')
      .reduce((sum, l) => sum + Math.round(l.dealValue * ((l.probability ?? 25) / 100)), 0);

    const stagesList = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST'];
    const stageChartData = stagesList.map(stg => {
      const stageLeads = leads.filter(l => l.stage === stg);
      return {
        key: stg,
        name: stg.replace('_', ' '),
        count: stageLeads.length,
        revenue: stageLeads.reduce((sum, l) => sum + l.dealValue, 0),
        conversionPct: totalLeads > 0 ? Math.round((stageLeads.length / totalLeads) * 100) : 0
      };
    });

    res.json({
      totalLeads,
      totalPipelineValue,
      forecastedRevenue,
      wonDealsCount: wonDeals.length,
      wonRevenue,
      conversionRate: totalLeads ? ((wonDeals.length / totalLeads) * 100).toFixed(1) : 0,
      stageChartData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Get Stale Leads Alert (Inactive for 3+ days in NEW or CONTACTED stage)
router.get('/stale-alerts', protect, async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const query = {
      workspaceId: req.user.workspaceId,
      stage: { $in: ['NEW', 'CONTACTED'] },
      updatedAt: { $lt: threeDaysAgo }
    };

    if (req.user.role === 'REP') {
      query.assignedTo = req.user.userId;
    }

    const staleLeads = await Lead.find(query).select('name companyName stage updatedAt currency');
    res.json({ count: staleLeads.length, leads: staleLeads });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Create New Lead
router.post('/', protect, async (req, res) => {
  try {
    const { name, companyName, email, phone, dealValue, currency, expectedCloseDate, probability, tags } = req.body;
    
    const lead = new Lead({
      workspaceId: req.user.workspaceId,
      assignedTo: req.user.userId,
      name,
      companyName,
      email,
      phone,
      dealValue: Number(dealValue) || 0,
      currency: currency || 'INR',
      expectedCloseDate: expectedCloseDate || new Date(+new Date() + 14 * 24 * 60 * 60 * 1000),
      probability: probability !== undefined ? Number(probability) : 20,
      tags: Array.isArray(tags) ? tags : [],
      stage: 'NEW',
      activities: [{ action: `Lead created by ${req.user.name}`, performedBy: req.user.userId }]
    });

    await lead.save();
    const populatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.status(201).json(populatedLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. Update Lead Stage (Auto-updates Win Probability)
router.patch('/:id/stage', protect, async (req, res) => {
  try {
    const { stage } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.stage = stage;
    if (STAGE_PROBABILITY[stage] !== undefined) {
      lead.probability = STAGE_PROBABILITY[stage];
    }

    lead.activities.push({
      action: `Stage moved to ${stage} (${lead.probability}% prob) by ${req.user.name}`,
      performedBy: req.user.userId
    });

    await lead.save();
    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 6. Update Lead Forecasting Details & Tags
router.patch('/:id/details', protect, async (req, res) => {
  try {
    const { probability, expectedCloseDate, tags } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (probability !== undefined) lead.probability = Number(probability);
    if (expectedCloseDate) lead.expectedCloseDate = expectedCloseDate;
    if (tags) lead.tags = tags;

    lead.activities.push({
      action: `Deal forecast/tags updated by ${req.user.name}`,
      performedBy: req.user.userId
    });

    await lead.save();
    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 7. Assign Lead to Team Member
router.patch('/:id/assign', protect, async (req, res) => {
  try {
    const { assignedToId, assignedToName } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.assignedTo = assignedToId;
    lead.activities.push({
      action: `Lead reassigned to ${assignedToName} by ${req.user.name}`,
      performedBy: req.user.userId
    });

    await lead.save();
    console.log(`[Notification Engine] Email sent to ${assignedToName} regarding lead: ${lead.name}`);

    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json({ message: 'Lead assigned successfully', lead: updatedLead });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 8. Add Team Comment / Chat per Lead
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.comments.push({
      text: text.trim(),
      author: req.user.userId,
      authorName: req.user.name
    });

    lead.activities.push({
      action: `Comment by ${req.user.name}: "${text.substring(0, 35)}..."`,
      performedBy: req.user.userId
    });

    await lead.save();
    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9. Add Call Note / Interaction History
router.post('/:id/call-notes', protect, async (req, res) => {
  try {
    const { text, callOutcome } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Note text cannot be empty' });
    }

    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.notes.push({
      text: text.trim(),
      callOutcome: callOutcome || 'CONNECTED',
      author: req.user.userId,
      authorName: req.user.name
    });

    lead.activities.push({
      action: `Call logged by ${req.user.name} [${callOutcome || 'CONNECTED'}]: "${text.substring(0, 35)}..."`,
      performedBy: req.user.userId
    });

    await lead.save();
    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. Add Task / Follow-up Reminder to Lead
router.post('/:id/tasks', protect, async (req, res) => {
  try {
    const { title, dueDate } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.tasks.push({
      title: title.trim(),
      dueDate: dueDate || new Date(+new Date() + 2 * 24 * 60 * 60 * 1000),
      completed: false,
      createdBy: req.user.name
    });

    lead.activities.push({
      action: `Task scheduled by ${req.user.name}: "${title.trim()}"`,
      performedBy: req.user.userId
    });

    await lead.save();
    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 11. Toggle Task Completion
router.patch('/:id/tasks/:taskId', protect, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const task = lead.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.completed = !task.completed;
    lead.activities.push({
      action: `Task "${task.title}" marked as ${task.completed ? 'Completed' : 'Pending'} by ${req.user.name}`,
      performedBy: req.user.userId
    });

    await lead.save();
    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. Send Direct In-App Email to Lead
router.post('/:id/send-email', protect, async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and email body are required' });
    }

    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.emails.push({
      subject: subject.trim(),
      body: body.trim(),
      sentBy: req.user.name
    });

    lead.activities.push({
      action: `Email sent to ${lead.email} by ${req.user.name} — Subject: "${subject.trim()}"`,
      performedBy: req.user.userId
    });

    // Auto-advance stage if NEW
    if (lead.stage === 'NEW') {
      lead.stage = 'CONTACTED';
      lead.probability = 30;
    }

    await lead.save();
    console.log(`[SMTP Dispatcher] Outbound email sent to ${lead.email} | Subject: ${subject}`);

    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    res.json(updatedLead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. Delete Lead
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role === 'REP') {
      return res.status(403).json({ message: 'Sales reps are not authorized to delete leads' });
    }

    const lead = await Lead.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 14. Seed Rich Enterprise Demo Leads
router.post('/seed-demo', protect, async (req, res) => {
  try {
    const demoLeads = [
      { 
        name: 'Rohan Sharma', companyName: 'Razorpay', email: 'rohan@razorpay.com', phone: '+91 9876543210', 
        dealValue: 425000, stage: 'NEW', probability: 20, tags: ['Enterprise', 'Inbound'],
        tasks: [{ title: 'Send introductory enterprise deck', dueDate: new Date(+new Date() + 86400000), createdBy: req.user.name }]
      },
      { 
        name: 'Priya Verma', companyName: 'Zomato', email: 'priya.verma@zomato.com', phone: '+91 9876543211',
        dealValue: 275000, stage: 'CONTACTED', probability: 30, tags: ['Enterprise', 'Outbound'],
        tasks: [{ title: 'Schedule discovery call', dueDate: new Date(+new Date() + 2 * 86400000), createdBy: req.user.name }]
      },
      {
        name: 'Arjun Mehta', companyName: 'Freshworks', email: 'arjun.mehta@freshworks.com', phone: '+91 9876543212',
        dealValue: 185000, stage: 'DEMO_SCHEDULED', probability: 55, tags: ['SaaS', 'Inbound']
      },
      {
        name: 'Ananya Iyer', companyName: 'PhonePe', email: 'ananya.iyer@phonepe.com', phone: '+91 9876543213',
        dealValue: 520000, stage: 'NEGOTIATION', probability: 80, tags: ['Enterprise', 'Priority']
      }
    ];

    const leads = await Lead.insertMany(demoLeads.map(lead => ({
      ...lead,
      workspaceId: req.user.workspaceId,
      assignedTo: req.user.userId
    })));

    res.status(201).json({ message: 'Demo leads seeded successfully', count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;