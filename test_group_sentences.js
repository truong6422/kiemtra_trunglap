const {
    gomCauLienTiep
} = require("./utils/tien_xu_ly");

const matches = [

    { sentenceIndex: 101, source: "A" },
    { sentenceIndex: 102, source: "A" },
    { sentenceIndex: 103, source: "A" },

    { sentenceIndex: 120, source: "B" },

    { sentenceIndex: 150, source: "C" },
    { sentenceIndex: 151, source: "C" }

];

console.log(
    JSON.stringify(
        gomCauLienTiep(matches),
        null,
        2
    )
);
