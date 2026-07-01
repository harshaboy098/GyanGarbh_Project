const mongoose = require('mongoose');

const ticketTimelineSchema = new mongoose.Schema({
    action: { type: String, required: true },
    note: { type: String, default: '' },
    performedBy: { type: String, required: true },
    performedByRole: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const supportTicketSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '', trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, default: 'general', trim: true },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'escalated_hr', 'escalated_assistant', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    tier: {
        type: String,
        enum: ['tier1', 'specialist', 'assistant', 'admin'],
        default: 'tier1',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignedTo: { type: String, default: '', trim: true },
    createdBy: { type: String, required: true, trim: true },
    createdByRole: { type: String, required: true, trim: true },
    timeline: { type: [ticketTimelineSchema], default: [] },
    resolvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
