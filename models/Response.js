// backend/models/Response.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true
    },
    answer: {
        type: mongoose.Schema.Types.Mixed, 
        required: true
    }
});

const responseSchema = new mongoose.Schema({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    respondent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    },
    answers: [answerSchema],
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Response', responseSchema);