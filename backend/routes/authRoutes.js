const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. Register New Company Workspace + Admin Account
router.post('/register-company', async (req, res) => {
  try {
    const { companyName, adminName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const workspace = await Workspace.create({ name: companyName, slug });

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      workspaceId: workspace._id,
      name: adminName,
      email,
      password: hashedPassword,
      role: 'ADMIN'
    });

    const token = jwt.sign(
      { userId: adminUser._id, workspaceId: workspace._id, role: adminUser.role, name: adminUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Workspace created successfully',
      token,
      user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role, company: workspace.name }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('workspaceId', 'name slug');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, workspaceId: user.workspaceId._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, company: user.workspaceId.name }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Invite Team Member (Only ADMIN or MANAGER can add Sales Reps)
router.post('/add-member', protect, authorizeRoles('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = await User.create({
      workspaceId: req.user.workspaceId,
      name,
      email,
      password: hashedPassword,
      role: role || 'REP'
    });

    res.status(201).json({
      message: 'Team member added',
      member: { id: newMember._id, name, email, role: newMember.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Get All Team Members of Current Workspace (For Lead Assignment Dropdown)
router.get('/team', protect, async (req, res) => {
  try {
    const members = await User.find(
      { workspaceId: req.user.workspaceId },
      'name email role'
    ).sort({ createdAt: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;