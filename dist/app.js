"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const promises_1 = require("readline/promises");
const process_1 = require("process");
const playersData = JSON.parse(fs.readFileSync("src/data/players.json", "utf-8"));
const players = Array.isArray(playersData) ? playersData.flat() : [];
const clubs = JSON.parse(fs.readFileSync("src/data/clubs.json", "utf-8"));
const rl = (0, promises_1.createInterface)({ input: process_1.stdin, output: process_1.stdout });
async function main() {
    console.log("Welcome to the JSON data viewer!\n");
    let running = true;
    while (running) {
        console.log("1. View all data");
        console.log("2. Filter by ID");
        console.log("3. Exit\n");
        const choice = (await rl.question("Please enter your choice: ")).trim();
        console.log();
        switch (choice) {
            case "1": {
                players.forEach((p) => console.log(`- ${p.name} (${p.id})`));
                console.log();
                break;
            }
            case "2": {
                const id = (await rl.question("Please enter the ID you want to filter by: ")).trim();
                console.log();
                const p = players.find((x) => String(x.id).toLowerCase() === id.toLowerCase());
                if (p) {
                    const skills = (p.skills || []).join(", ");
                    const clubRef = p.club || { name: "", id: "" };
                    console.log(`- ${p.name} (${p.id})`);
                    console.log(`  - Description: ${p.description}`);
                    console.log(`  - Age: ${p.age}`);
                    console.log(`  - Basisspeler: ${p.isBasisspeler}`);
                    console.log(`  - Birthdate: ${p.birthDate}`);
                    console.log(`  - Image: ${p.imageUrl}`);
                    console.log(`  - Position: ${p.position}`);
                    console.log(`  - PositionType: ${p.positionType}`);
                    console.log(`  - Skills: ${skills}`);
                    console.log(`  - Club: ${clubRef.name} (${clubRef.id})`);
                    const clubInfo = clubs.find((c) => String(c.id).toLowerCase() === String(clubRef.id).toLowerCase() ||
                        String(c.name).toLowerCase() === String(clubRef.name).toLowerCase());
                    if (clubInfo) {
                        console.log("  - Club info:");
                        console.log(`        • Stadium: ${clubInfo.stadium}`);
                        console.log(`        • Founded Year: ${clubInfo.foundedYear}`);
                        console.log(`        • Coach: ${clubInfo.coach}`);
                        console.log(`        • Country: ${clubInfo.country}`);
                        console.log(`        • Logo: ${clubInfo.logoUrl}`);
                    }
                    else {
                        console.log("  - Club info: not found");
                    }
                    console.log();
                    break;
                }
                const c = clubs.find((x) => String(x.id).toLowerCase() === id.toLowerCase());
                if (c) {
                    console.log(`- ${c.name} (${c.id})`);
                    console.log(`  - Stadium: ${c.stadium}`);
                    console.log(`  - Founded: ${c.foundedYear}`);
                    console.log(`  - Coach: ${c.coach}`);
                    console.log(`  - Country: ${c.country}`);
                    console.log(`  - Logo: ${c.logoUrl}\n`);
                }
                else {
                    console.log(`No item found with id "${id}".\n`);
                }
                break;
            }
            case "3":
                running = false;
                break;
            default:
                console.log("Invalid choice. Please select 1, 2, or 3.\n");
                break;
        }
    }
    await rl.close();
    console.log("Programma wordt afgesloten, goodbye!");
}
main();
