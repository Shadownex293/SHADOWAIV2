const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String, required: true, unique: true,
        trim: true, minlength: 3, maxlength: 30
    },
    email: {
        type: String, required: true, unique: true,
        trim: true, lowercase: true
    },
    password: {
        type: String, required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'admin' },
    lastLogin: { type: Date, default: null }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
