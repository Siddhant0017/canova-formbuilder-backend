
const mongoose = require('mongoose');

const dateSettingsSchema = new mongoose.Schema({
    format: { type: String, default: 'DD/MM/YYYY' }
});

const linearScaleSettingsSchema = new mongoose.Schema({
    min: { type: Number, default: 0 },
    max: { type: Number, default: 10 },
    minLabel: { type: String, default: 'Scale Starting' },
    maxLabel: { type: String, default: 'Scale Ending' },
    defaultValue: { type: Number, default: 5 }
});

const ratingSettingsSchema = new mongoose.Schema({
    maxStars: { type: Number, default: 5 },
    starCount: { type: Number, default: 5 }
});

const fileSettingsSchema = new mongoose.Schema({
    maxFiles: { type: Number, default: 5 },
    maxFileSize: { type: String, default: '5mb' },
    allowedTypes: [{ type: String }]
});

const questionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: [
            'text', 'textarea', 'multiple-choice', 'checkbox', 'dropdown',
            'date', 'linear-scale', 'rating', 'file-upload', 'image', 'video'
        ],
        required: true
    },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    options: [{ id: String, text: String, isCorrect: Boolean }],
    required: { type: Boolean, default: false },
    order: { type: Number, required: true },
    pageId: { type: String, required: true },
    dateSettings: dateSettingsSchema,
    linearScaleSettings: linearScaleSettingsSchema,
    ratingSettings: ratingSettingsSchema,
    fileSettings: fileSettingsSchema,
});

const pageLogicSchema = new mongoose.Schema({
    conditions: [{
        id: String,
        fieldId: String,
        operator: String,
        value: String,
    }],
    passRedirect: { type: String },
    failRedirect: { type: String }
});

const accessControlSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required for access control']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    level: {
        type: String,
        enum: ['view', 'edit', 'share'],
        required: true
    },
    grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    grantedAt: {
        type: Date,
        default: Date.now
    }
});

const pageSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    questions: [{ type: String }],
    layout: [{
        type: mongoose.Schema.Types.Mixed
    }],
    active: { type: Boolean, default: false },
    conditionalLogic: pageLogicSchema
});

const viewHistorySchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    sessionId: {
        type: String
    }
});

const formSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Form title is required'], trim: true },
    description: { type: String, trim: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [questionSchema],
    pages: [pageSchema],
    design: {
        backgroundColor: { type: String, default: '#ffffff' },
        sectionColor: { type: String, default: '#f5f5f5' },
        theme: { type: String, enum: ['light', 'dark'], default: 'light' }
    },
    defaultRedirect: { type: String, default: '' },
    accessControl: [accessControlSchema],
    visibility: { type: String, enum: ['public', 'restricted'], default: 'restricted' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date, default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    
   
    viewCount: {
        type: Number,
        default: 0
    },
    viewHistory: [viewHistorySchema],
    

    lastViewed: {
        type: Date,
        default: null
    },
    uniqueViewers: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Add index for better query performance on analytics
formSchema.index({ project: 1, viewCount: -1 });
formSchema.index({ 'viewHistory.timestamp': 1 });
formSchema.index({ creator: 1, viewCount: -1 });

module.exports = mongoose.model('Form', formSchema);
