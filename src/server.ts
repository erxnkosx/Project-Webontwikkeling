import express from "express";
import { MongoClient, Db, Collection } from "mongodb";
import { Player } from "./interfaces/player";
import { Club } from "./interfaces/club";
import fs from "fs";

const app = express();

function formatMarketValue(value: number): string {
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} million`;
    if (value >= 1_000) return `${Math.round(value / 1_000)} k`;
    return value.toString();
}

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "src/views");

const url = "mongodb+srv://user:user1905@projecttransfermarkt.d6wldo9.mongodb.net/?appName=ProjectTransfermarkt";
const client = new MongoClient(url);

let db: Db;
let playersCol: Collection<Player>;
let clubsCol: Collection<Club>;

async function seedDatabase() {
    if ((await playersCol.countDocuments()) === 0) {
        const seedPlayers = JSON.parse(
            fs.readFileSync("src/data/players.json", "utf8")
        );
        await playersCol.insertMany(seedPlayers);
        console.log("Seeded players collection");
    }

    if ((await clubsCol.countDocuments()) === 0) {
        const seedClubs = JSON.parse(
            fs.readFileSync("src/data/clubs.json", "utf8")
        );
        await clubsCol.insertMany(seedClubs);
        console.log("Seeded clubs collection");
    }
}

let playersCache: Player[] = [];
let clubsCache: Club[] = [];

async function loadData() {
    if (!playersCache.length) {
        playersCache = await playersCol.find().toArray();
    }
    if (!clubsCache.length) {
        clubsCache = await clubsCol.find().toArray();
    }
}

app.get("/", async (req, res) => {
    await loadData();

    const totalPlayers = playersCache.length;
    const totalClubs = clubsCache.length;

    const totalMarketValueEur = playersCache.reduce(
        (sum, p) => sum + (p.marketValueEur ?? 0),
        0
    );

    res.render("home", {
        totalPlayers,
        totalClubs,
        totalMarketValueEur,
        formatMarketValue,
    });
});

app.get("/players", async (req, res) => {
    await loadData();

    const q = (req.query.q as string) || "";
    const sortParam = (req.query.sort as string) || "name";
    const order = (req.query.order as string) === "desc" ? "desc" : "asc";

    const starterParam = (req.query.starter as string) || "all";
    const clubNameParam = (req.query.clubName as string) || "";

    const allowedSort: Array<
        "name" | "club" | "age" | "position" | "isStarter" | "marketValueEur" 
        > = ["name", "club", "age", "position", "isStarter", "marketValueEur"];

    const sort = allowedSort.includes(sortParam as any)
        ? (sortParam as (typeof allowedSort)[number])
        : "name";

    const dir = order === "asc" ? 1 : -1;

    let list = [...playersCache];

    if (q) {
        const needle = q.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(needle));
    }

    if (starterParam === "yes") {
        list = list.filter((p) => p.isStarter);
    } else if (starterParam === "no") {
        list = list.filter((p) => !p.isStarter);
    }

    if (clubNameParam) {
        const clubNeedle = clubNameParam.toLowerCase();
        list = list.filter((p) =>
            (p.club?.name || "").toLowerCase().includes(clubNeedle)
        );
    }

    function compareStrings(a?: string, b?: string): number {
        const sa = (a || "").toLowerCase();
        const sb = (b || "").toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
    }

    list.sort((a, b) => {
        switch (sort) {
            case "club":
                return compareStrings(a.club?.name, b.club?.name);
            case "position":
                return compareStrings(a.position, b.position);
            case "isStarter": {
                const av = a.isStarter ? 1 : 0;
                const bv = b.isStarter ? 1 : 0;
                return (av - bv) * dir;
            }
            case "marketValueEur":
                return (a.marketValueEur - b.marketValueEur) * dir;
            case "age":
                return (a.age - b.age) * dir;
            case "name":
            default:
                return compareStrings(a.name, b.name);
        }
    });

    res.render("players-list", {
        players: list,
        q,
        sort,
        order,
        starter: starterParam,
        clubName: clubNameParam,
        formatMarketValue,
    });
});

app.get("/players/:id", async (req, res) => {
    await loadData();

    const id = req.params.id;
    const player = playersCache.find((p) => p.id === id);

    if (!player) return res.status(404).send("Player not found");

    const club = clubsCache.find(
        (c) =>
            c.id.toLowerCase() === player.club.id.toLowerCase() ||
            c.name.toLowerCase() === player.club.name.toLowerCase()
    );

    res.render("player-detail", { player, club, formatMarketValue });
});

app.get("/clubs", async (req, res) => {
    await loadData();

    const q = (req.query.q as string) || "";
    const sortParam = (req.query.sort as string) || "name";
    const order = (req.query.order as string) === "desc" ? "desc" : "asc";
    const dir = order === "asc" ? 1 : -1;

    const allowedSort: Array<"name" | "foundedYear" | "country" | "stadium"> = [
        "name",
        "foundedYear",
        "country",
        "stadium",
    ];

    const sort = allowedSort.includes(sortParam as any)
        ? (sortParam as (typeof allowedSort)[number])
        : "name";

    let list = [...clubsCache];

    if (q) {
        const needle = q.toLowerCase();
        list = list.filter((c) => c.name.toLowerCase().includes(needle));
    }

    function cmp(a?: string | number, b?: string | number): number {
        if (typeof a === "string" && typeof b === "string") {
            const sa = a.toLowerCase();
            const sb = b.toLowerCase();
            if (sa < sb) return -1 * dir;
            if (sa > sb) return 1 * dir;
            return 0;
        }
        const av = Number(a ?? 0);
        const bv = Number(b ?? 0);
        return (av - bv) * dir;
    }

    list.sort((a, b) => {
        switch (sort) {
            case "foundedYear":
                return cmp(a.foundedYear, b.foundedYear);
            case "country":
                return cmp(a.country, b.country);
            case "stadium":
                return cmp(a.stadium, b.stadium);
            case "name":
            default:
                return cmp(a.name, b.name);
        }
    });

    res.render("clubs-list", { clubs: list, q, sort, order });
});

app.get("/clubs/:id", async (req, res) => {
    await loadData();

    const id = req.params.id;
    const club = clubsCache.find((c) => c.id === id);

    if (!club) return res.status(404).send("Club not found");

    const clubPlayers = playersCache.filter(
        (p) =>
            p.club.id.toLowerCase() === club.id.toLowerCase() ||
            p.club.name.toLowerCase() === club.name.toLowerCase()
    );

    const totalMarketValueEur = clubPlayers.reduce(
        (sum, p) => sum + (p.marketValueEur || 0),
        0
    );

    res.render("club-detail", {
        club,
        clubPlayers,
        totalMarketValueEur,
        formatMarketValue,
    });
});


const PORT = 3000;

async function start() {
    try {
        await client.connect();
        db = client.db("transfermarkt");
        playersCol = db.collection<Player>("players");
        clubsCol = db.collection<Club>("clubs");

        await seedDatabase();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server", err);
        process.exit(1);
    }
}

start();
