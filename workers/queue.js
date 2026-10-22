const { Queue } = require('bullmq');

//const connection = { host: 'localhost', port: 6379 };

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379
};

const plagiarismQueue = new Queue('plagiarismQueueV2', { connection }); // <-- Sửa ở đây

async function addPlagiarismTask(data) {
    await plagiarismQueue.add(
        'check-plagiarism',
        data,
        {
            attempts: 3,

            backoff: {
                type: 'exponential',
                delay: 5000
            },

            removeOnComplete: 100,

            removeOnFail: 100
        }
    );
}

module.exports = { addPlagiarismTask };