const mongoose = require('mongoose');

const RoomMemberSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  status: { type: String, enum: ['active', 'pending', 'leaving'], default: 'active' },
  joinedAt: { type: Date, default: Date.now }
});

// Ensure a user cannot have duplicate memberships in the same room
RoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RoomMember', RoomMemberSchema);
