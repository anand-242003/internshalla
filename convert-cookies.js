const fs = require("fs");

const inputFile = "internshala.com_21-09-2026 (1).json";

const exported = JSON.parse(
    fs.readFileSync(inputFile, "utf8")
);

if (!Array.isArray(exported.cookies)) {
    throw new Error("Invalid cookie export format");
}

fs.writeFileSync(
    "cookies.json",
    JSON.stringify(exported.cookies, null, 2)
);

console.log(
    `Created cookies.json with ${exported.cookies.length} cookies`
);