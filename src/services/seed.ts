import fs from "fs";
import path from "path";
import { getDb } from "./mongo.js";

export async function seedDatabase() {
    const db = await getDb();

    const clubsCol = db.collection("clubs");
    const playersCol = db.collection("players");

    if (await clubsCol.countDocuments() === 0) {
        const clubs = JSON.parse(fs.readFileSync("src/data/clubs.json", "utf8"));
        await clubsCol.insertMany(clubs);
        console.log("Inserted clubs");
    }

    if (await playersCol.countDocuments() === 0) {
        const players = JSON.parse(fs.readFileSync("src/data/players.json", "utf8"));
        await playersCol.insertMany(players);
        console.log("Inserted players");
    }
}
