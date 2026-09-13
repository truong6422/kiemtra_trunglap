const fs = require("fs");

const sentenceMap =
    JSON.parse(
        fs.readFileSync(
            "./sentence_map.json",
            "utf8"
        )
    );

const sentenceIndex =
    82; // đổi thử

const found =
    sentenceMap.find(
        x =>
            x.sentenceIndex ===
            sentenceIndex
    );

console.log(found);