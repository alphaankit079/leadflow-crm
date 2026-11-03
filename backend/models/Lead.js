const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  callOutcome: { 
    type: String, 
    enum: ['CONNECTED', 'VOICEMAIL', 'MEETING_BOOKED', 'NO_ANSWER'], 
    default: 'CONNECTED' 
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: { type: Date },
  completed: { type: Boolean, default: false },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const emailLogSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  sentBy: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dealValue: { type: Number, required: true, default: 0 },
  currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
  stage: { 
    type: String, 
    enum: ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST'], 
    default: 'NEW' 
  },
  // Enterprise Forecasting & Categorization Fields
  expectedCloseDate: { type: Date, default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000) },
  probability: { type: Number, default: 25, min: 0, max: 100 },
  tags: [{ type: String }],
  
  // Sub-documents
  activities: [activitySchema],
  comments: [commentSchema],
  notes: [noteSchema],
  tasks: [taskSchema],
  emails: [emailLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);