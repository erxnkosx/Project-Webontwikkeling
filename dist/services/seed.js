"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const fs_1 = __importDefault(require("fs"));
const mongo_js_1 = require("./mongo.js");
async function seedDatabase() {
    const db = await (0, mongo_js_1.getDb)();
    const clubsCol = db.collection("clubs");
    const playersCol = db.collection("players");
    if (await clubsCol.countDocuments() === 0) {
        const clubs = JSON.parse(fs_1.default.readFileSync("src/data/clubs.json", "utf8"));
        await clubsCol.insertMany(clubs);
        console.log("Inserted clubs");
    }
    if (await playersCol.countDocuments() === 0) {
        const players = JSON.parse(fs_1.default.readFileSync("src/data/players.json", "utf8"));
        await playersCol.insertMany(players);
        console.log("Inserted players");
    }
}
