const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'moderate', 'high'],
    },
    phase: {
        type: String,
        enum: ['todo', 'backlog', 'inProgress', 'done'],
        default: 'todo'
    },
    dueDate: {
        type: Date
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    checklists: [
        {
            title: {
                type: String,
                required: true
            },
            isMarked: {
                type: Boolean,
                default: false
            }
        }
    ],
    markedChecklists: {
        type: Number,
        default: 0
    },
    totalChecklists: {
        type: Number,
        default: 0
    }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
