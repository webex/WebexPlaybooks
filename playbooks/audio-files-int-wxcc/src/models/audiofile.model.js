import mongoose from 'mongoose';

const audiofileSchema = new mongoose.Schema({
    organizationId: {
        type: String,
    },
    id: {
        type: String,
    },
    version: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true
    },
    blobId: {
        type: String,
    },
    url: {
        type: String,
    },
    description: {
        type: String,
    },
    systemDefault: {
        type: Boolean,
    },
    createdTime: {
        type: Number,
    },
    lastUpdatedTime: {
        type: Number,
    }
},
{
    timestamps: true,
});

const AudioFile = mongoose.model('AudioFile', audiofileSchema);

export default AudioFile;