const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'In Progress', 'Completed'], 
        default: 'Pending' 
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // User who assigned the task
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who received the task
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' }, // Task priority
    completedAt: { type: Date }, // Timestamp when task is completed
    dueDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
