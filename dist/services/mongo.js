"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
const url = "mongodb://localhost:27017";
const client = new mongodb_1.MongoClient(url);
const dbName = "transfermarkt";
async function getDb() {
    await client.connect();
    return client.db(dbName);
}
