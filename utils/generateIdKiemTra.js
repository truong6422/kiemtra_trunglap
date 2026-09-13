const Counter =
    require('../models/counter');

async function generateIdKiemTra() {

    const counter =
        await Counter.findOneAndUpdate(

            {
                _id: 'ket_qua_kiem_tra'
            },

            {
                $inc: {
                    seq: 1
                }
            },

            {
                new: true,
                upsert: true
            }

        );

    return (
        'KT' +
        String(counter.seq)
            .padStart(6, '0')
    );
}

module.exports = {
    generateIdKiemTra
};