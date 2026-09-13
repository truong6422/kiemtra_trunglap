const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        seq: {
            type: Number,
            default: 0
        }
    },
    {
        collection: 'counter'
    }
);

module.exports = mongoose.model(
    'Counter',
    CounterSchema, 'counter'
);