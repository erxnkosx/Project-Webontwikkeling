import { MongoClient } from "mongodb";

const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

const dbName = "transfermarkt";

export async function getDb() {
    await client.connect(); 
    return client.db(dbName);
}
