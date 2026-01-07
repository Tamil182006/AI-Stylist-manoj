const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    imagePath: {
        type: String,
        required: true
    },
    occasion: {
        type: String,
        required: true
    },
    faceShape: String,
    skinTone: String,
    outfit: String,
    hairstyle: String,
    beardStyle: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Result', ResultSchema);
