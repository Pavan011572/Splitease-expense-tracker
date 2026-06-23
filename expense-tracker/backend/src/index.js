require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('./models/User');
const Room = require('./models/Room');
const RoomMember = require('./models/RoomMember');
const Expense = require('./models/Expense');
const Verification = require('./models/Verification');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'expense_tracker_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/splitease';

app.use(cors());
app.use(express.json());

// ─── MongoDB Connection ──────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => console.log('📁 Connected to MongoDB database successfully.'))
  .catch(err => console.error('❌ Failed to connect to MongoDB:', err.message));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, mobile, email, upiId, password } = req.body;
    if (!fullName || !mobile || !password)
      return res.status(400).json({ error: 'fullName, mobile, password required' });
    
    const existingUser = await User.findOne({ mobile });
    if (existingUser)
      return res.status(409).json({ error: 'Mobile already registered' });
    
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      fullName,
      mobile,
      email: email || '',
      upiId: upiId || '',
      password: hashed
    });
    await user.save();
    
    const token = jwt.sign({ id: user._id.toString(), mobile: user.mobile }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user._id.toString(), fullName: user.fullName, mobile: user.mobile, email: user.email, upiId: user.upiId }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user._id.toString(), mobile: user.mobile }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id.toString(), fullName: user.fullName, mobile: user.mobile, email: user.email, upiId: user.upiId }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── PROFILE ROUTES ───────────────────────────────────────────────────────────
app.get('/api/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), fullName: user.fullName, mobile: user.mobile, email: user.email, upiId: user.upiId });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

app.patch('/api/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { email, upiId } = req.body;
    if (email !== undefined) user.email = email;
    if (upiId !== undefined) user.upiId = upiId;
    await user.save();
    
    res.json({ id: user._id.toString(), fullName: user.fullName, mobile: user.mobile, email: user.email, upiId: user.upiId });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// ─── ROOM ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/rooms', auth, async (req, res) => {
  try {
    const memberships = await RoomMember.find({ userId: req.user.id });
    const rooms = await Promise.all(memberships.map(async m => {
      const room = await Room.findById(m.roomId).lean();
      if (!room) return null;
      const admin = await User.findById(room.adminId).lean();
      const memberCount = await RoomMember.countDocuments({ roomId: room._id, status: 'active' });
      return {
        ...room,
        id: room._id.toString(),
        role: m.role,
        status: m.status,
        adminName: admin?.fullName,
        memberCount
      };
    }));
    
    const validRooms = rooms.filter(r => r !== null);
    const created = validRooms.filter(r => r.adminId.toString() === req.user.id);
    const joined = validRooms.filter(r => r.adminId.toString() !== req.user.id && r.status !== 'pending');
    const pending = await RoomMember.countDocuments({ userId: req.user.id, status: 'pending' });
    
    res.json({ all: validRooms, created, joined, pending, rooms: validRooms });
  } catch (err) {
    res.status(500).json({ error: 'Server error listing rooms' });
  }
});

app.post('/api/rooms', auth, async (req, res) => {
  try {
    const { name, maxMembers, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name required' });
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new Room({
      name,
      maxMembers: maxMembers || 10,
      description: description || '',
      code,
      adminId: req.user.id
    });
    await room.save();
    
    const membership = new RoomMember({
      roomId: room._id,
      userId: req.user.id,
      role: 'admin',
      status: 'active'
    });
    await membership.save();
    
    const admin = await User.findById(req.user.id);
    res.status(201).json({
      ...room.toObject(),
      id: room._id.toString(),
      adminName: admin?.fullName,
      memberCount: 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error creating room' });
  }
});

app.post('/api/rooms/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const room = await Room.findOne({ code: code?.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found with that code' });
    
    const existing = await RoomMember.findOne({ roomId: room._id, userId: req.user.id });
    if (existing) return res.status(409).json({ error: 'Already a member' });
    
    const activeCount = await RoomMember.countDocuments({ roomId: room._id, status: 'active' });
    if (activeCount >= room.maxMembers) return res.status(400).json({ error: 'Room is full' });
    
    const membership = new RoomMember({
      roomId: room._id,
      userId: req.user.id,
      role: 'member',
      status: 'active'
    });
    await membership.save();
    
    const admin = await User.findById(room.adminId);
    res.json({
      ...room.toObject(),
      id: room._id.toString(),
      adminName: admin?.fullName,
      memberCount: activeCount + 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error joining room' });
  }
});

app.get('/api/rooms/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    const membership = await RoomMember.findOne({ roomId: room._id, userId: req.user.id });
    if (!membership) return res.status(403).json({ error: 'Not a member' });
    
    const memberships = await RoomMember.find({ roomId: room._id, status: 'active' });
    const members = await Promise.all(memberships.map(async m => {
      const u = await User.findById(m.userId).lean();
      return { id: u?._id.toString(), fullName: u?.fullName, mobile: u?.mobile, upiId: u?.upiId, role: m.role };
    }));
    
    const admin = await User.findById(room.adminId).lean();
    res.json({
      ...room,
      id: room._id.toString(),
      adminName: admin?.fullName,
      members,
      memberCount: members.length,
      myStatus: membership.status
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error loading room detail' });
  }
});

// Leave Room Request
app.post('/api/rooms/:id/leave-request', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.adminId.toString() === req.user.id) {
      return res.status(400).json({ error: 'Admin cannot request to leave. Dissolve or pass admin status.' });
    }
    const membership = await RoomMember.findOne({ roomId: req.params.id, userId: req.user.id });
    if (!membership) return res.status(404).json({ error: 'Not a member of this room' });
    membership.status = 'leaving';
    await membership.save();
    res.json({ success: true, status: 'leaving' });
  } catch (err) {
    res.status(500).json({ error: 'Server error requesting leave' });
  }
});

// Admin list leave requests
app.get('/api/rooms/:id/leave-requests', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.adminId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only room admin can view leave requests' });
    }
    const leavingMemberships = await RoomMember.find({ roomId: req.params.id, status: 'leaving' });
    const requests = await Promise.all(leavingMemberships.map(async m => {
      const u = await User.findById(m.userId).lean();
      return { id: u?._id.toString(), fullName: u?.fullName, mobile: u?.mobile };
    }));
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching leave requests' });
  }
});

// Admin approves leave request
app.post('/api/rooms/:id/approve-leave', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.adminId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only room admin can approve leave requests' });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    
    const result = await RoomMember.findOneAndDelete({ roomId: req.params.id, userId });
    if (!result) return res.status(404).json({ error: 'Leave request not found for this user' });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error approving leave' });
  }
});

// ─── EXPENSE ROUTES ───────────────────────────────────────────────────────────
app.get('/api/rooms/:id/expenses', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ roomId: req.params.id }).lean();
    const enriched = await Promise.all(expenses.map(async e => {
      const payer = await User.findById(e.paidById).lean();
      return {
        ...e,
        id: e._id.toString(),
        paidByName: payer?.fullName
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching room expenses' });
  }
});

app.post('/api/rooms/:id/expenses', auth, async (req, res) => {
  try {
    const { title, amount, splitType, targetMemberId, category } = req.body;
    if (!title || !amount) return res.status(400).json({ error: 'title and amount required' });
    
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    let splits = [];
    if (splitType === 'single_member') {
      if (!targetMemberId) return res.status(400).json({ error: 'Target roommate required for single split' });
      splits = [{ userId: targetMemberId, amount: parseFloat(amount), paid: false }];
    } else if (splitType === 'all_other') {
      const memberships = await RoomMember.find({ roomId: req.params.id, status: 'active' });
      if (memberships.length === 0) {
        return res.status(400).json({ error: 'No active members in the room' });
      }
      const perHead = parseFloat(amount) / memberships.length;
      splits = memberships.map(m => ({ userId: m.userId, amount: perHead, paid: false }));
    } else {
      // Default: split equally among all active members
      const memberships = await RoomMember.find({ roomId: req.params.id, status: 'active' });
      const perHead = parseFloat(amount) / memberships.length;
      splits = memberships.map(m => ({ userId: m.userId, amount: perHead, paid: false }));
    }
    
    const expense = new Expense({
      roomId: req.params.id,
      title,
      amount: parseFloat(amount),
      category: category || 'General',
      paidById: req.user.id,
      splits
    });
    await expense.save();
    
    const payer = await User.findById(req.user.id);
    res.status(201).json({
      ...expense.toObject(),
      id: expense._id.toString(),
      paidByName: payer?.fullName
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error creating expense' });
  }
});

app.delete('/api/expenses/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    if (new Date(expense.createdAt) < sixHoursAgo)
      return res.status(400).json({ error: 'Can only delete expenses within 6 hours' });
    
    if (expense.paidById.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only the payer can delete this expense' });
    
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting expense' });
  }
});

// ─── BALANCE ROUTES ───────────────────────────────────────────────────────────
app.get('/api/rooms/:id/balances', auth, async (req, res) => {
  try {
    const roomExpenses = await Expense.find({ roomId: req.params.id }).lean();
    const memberships = await RoomMember.find({ roomId: req.params.id, status: 'active' });
    const members = memberships.map(m => m.userId.toString());
    
    const balanceMap = {};
    members.forEach(uid => { balanceMap[uid] = 0; });
    
    roomExpenses.forEach(exp => {
      const paidByIdStr = exp.paidById.toString();
      if (balanceMap[paidByIdStr] !== undefined) {
        balanceMap[paidByIdStr] += exp.amount;
      }
      exp.splits.forEach(s => {
        const splitUidStr = s.userId.toString();
        if (balanceMap[splitUidStr] !== undefined) {
          balanceMap[splitUidStr] -= s.amount;
        }
      });
    });
    
    const balances = await Promise.all(Object.entries(balanceMap).map(async ([uid, net]) => {
      const user = await User.findById(uid).lean();
      return {
        userId: uid,
        fullName: user?.fullName,
        upiId: user?.upiId,
        netBalance: parseFloat(net.toFixed(2))
      };
    }));
    
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: 'Server error computing balances' });
  }
});

// ─── VERIFICATION ROUTES ──────────────────────────────────────────────────────
app.get('/api/verifications', auth, async (req, res) => {
  try {
    const sentList = await Verification.find({ senderId: req.user.id }).lean();
    const sent = await Promise.all(sentList.map(async v => {
      const receiver = await User.findById(v.receiverId).lean();
      const expense = v.expenseId ? await Expense.findById(v.expenseId).lean() : null;
      return {
        ...v,
        id: v._id.toString(),
        receiverName: receiver?.fullName,
        expenseTitle: expense?.title
      };
    }));
    
    const receivedList = await Verification.find({ receiverId: req.user.id }).lean();
    const received = await Promise.all(receivedList.map(async v => {
      const sender = await User.findById(v.senderId).lean();
      const expense = v.expenseId ? await Expense.findById(v.expenseId).lean() : null;
      return {
        ...v,
        id: v._id.toString(),
        senderName: sender?.fullName,
        expenseTitle: expense?.title
      };
    }));
    
    res.json({ sent, received });
  } catch (err) {
    res.status(500).json({ error: 'Server error listing verifications' });
  }
});

app.post('/api/verifications', auth, async (req, res) => {
  try {
    const { receiverId, roomId, expenseId, amount, utrNumber } = req.body;
    if (!receiverId || !amount) return res.status(400).json({ error: 'receiverId and amount required' });
    
    const v = new Verification({
      senderId: req.user.id,
      receiverId,
      roomId: roomId || null,
      expenseId: expenseId || null,
      amount: parseFloat(amount),
      utrNumber: utrNumber || '',
      status: 'pending'
    });
    await v.save();
    
    res.status(201).json({ ...v.toObject(), id: v._id.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Server error sending verification request' });
  }
});

app.patch('/api/verifications/:id', auth, async (req, res) => {
  try {
    const v = await Verification.findById(req.params.id);
    if (!v) return res.status(404).json({ error: 'Verification not found' });
    
    if (v.receiverId.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only receiver can update' });
    
    const previousStatus = v.status;
    v.status = req.body.status || v.status;
    v.updatedAt = new Date();
    await v.save();
    
    // Automatically resolve balance if request is confirmed
    if (v.status === 'confirmed' && previousStatus !== 'confirmed' && v.roomId) {
      const sender = await User.findById(v.senderId);
      const receiver = await User.findById(v.receiverId);
      
      const settlementExpense = new Expense({
        roomId: v.roomId,
        title: `Settlement: ${sender?.fullName} to ${receiver?.fullName}`,
        amount: v.amount,
        category: 'Other',
        paidById: v.senderId,
        splits: [{ userId: v.receiverId, amount: v.amount, paid: true }]
      });
      await settlementExpense.save();
    }
    
    res.json({ ...v.toObject(), id: v._id.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating verification status' });
  }
});

// ─── RECENT DELETABLE EXPENSES ────────────────────────────────────────────────
app.get('/api/expenses/recent', auth, async (req, res) => {
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recent = await Expense.find({
      paidById: req.user.id,
      createdAt: { $gte: sixHoursAgo }
    }).lean();
    
    const enriched = recent.map(e => ({ ...e, id: e._id.toString() }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Server error listing recent deletable expenses' });
  }
});

// DELETE ROOM (Admin only)
app.delete('/api/rooms/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.adminId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the room creator (admin) can delete this room' });
    }
    
    // Cascade delete RoomMember, Expense, Verification
    await RoomMember.deleteMany({ roomId: room._id });
    await Expense.deleteMany({ roomId: room._id });
    await Verification.deleteMany({ roomId: room._id });
    await Room.findByIdAndDelete(room._id);
    
    res.json({ success: true, message: 'Room and all its associated data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting room' });
  }
});

// Volatile OTP Store: mobile number -> { code, expiresAt }
const otps = {};

// Forgot Password Request
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: 'Mobile number required' });
    
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ error: 'No user registered with this mobile number' });
    
    // Generate a 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otps[mobile] = { code, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 minutes
    
    console.log(`\n🔑 [OTP Verification] Code generated for ${mobile}: ${code}\n`);
    
    res.json({ success: true, message: 'OTP verification code sent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error sending OTP' });
  }
});

// Reset Password Verification
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { mobile, otpCode, newPassword } = req.body;
    if (!mobile || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'mobile, otpCode, and newPassword are required' });
    }
    
    const record = otps[mobile];
    if (!record) return res.status(400).json({ error: 'No active OTP verification session found' });
    if (record.expiresAt < Date.now()) {
      delete otps[mobile];
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }
    if (record.code !== otpCode) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }
    
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Hash new password and save
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    
    // Clear OTP session
    delete otps[mobile];
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: 'Server error resetting password' });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
