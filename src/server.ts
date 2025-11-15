import express from "express";
import { Player } from "./interfaces/player";
import { Club } from "./interfaces/club";

const app = express();

// ----------------- Helpers -----------------
function formatMarketValue(value: number | undefined | null): string {
    if (value === null || value === undefined) {
        return "-";
    }

    const n = Number(value);
    if (!Number.isFinite(n)) {
        return "-";
    }

    if (n >= 1_000_000) {
        return `${Math.round(n / 1_000_000)} miljoen`;
    }
    if (n >= 1_000) {
        return `${Math.round(n / 1_000)} duizend`;
    }
    return n.toString();
}


// ----------------- Static & views -----------------
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "src/views");

// ----------------- Data -----------------
let players: Player[] = [];
let clubs: Club[] = [];

async function loadData(): Promise<void> {
    if (players.length > 0 && clubs.length > 0) return;

    console.log("Fetching JSON from GitHub...");

    const playersUrl =
        "https://raw.githubusercontent.com/erxnkosx/Project-Webontwikkeling/main/src/data/players.json";
    const clubsUrl =
        "https://raw.githubusercontent.com/erxnkosx/Project-Webontwikkeling/main/src/data/clubs.json";

    const [playersRes, clubsRes] = await Promise.all([
        fetch(playersUrl),
        fetch(clubsUrl),
    ]);

    if (!playersRes.ok) throw new Error("Failed to fetch players.json");
    if (!clubsRes.ok) throw new Error("Failed to fetch clubs.json");

    const playersJson = await playersRes.json();
    const clubsJson = await clubsRes.json();

    players = Array.isArray(playersJson) ? (playersJson as Player[]) : [];
    clubs = Array.isArray(clubsJson) ? (clubsJson as Club[]) : [];

    console.log(`Loaded ${players.length} players and ${clubs.length} clubs.`);
}

// ----------------- Routes -----------------
app.get("/", (req, res) => {
    res.redirect("/players");
});

// Players list
app.get("/players", async (req, res) => {
    await loadData();

    const q = (req.query.q as string) || "";
    const sortParam = (req.query.sort as string) || "name";
    const order = (req.query.order as string) === "desc" ? "desc" : "asc";

    const allowedSortFields = [
        "name",
        "club",
        "age",
        "position",
        "isBasisspeler",
        "marketValueEur",
    ];

    const sort = allowedSortFields.includes(sortParam) ? sortParam : "name";
    const dir = order === "asc" ? 1 : -1;

    let list = [...players];

    // filter op naam
    if (q) {
        const needle = q.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(needle));
    }

    // kleine helper voor string-vergelijking (voorkomt undefined.localeCompare)
    function compareStrings(a: string | undefined, b: string | undefined): number {
        const sa = (a || "").toLowerCase();
        const sb = (b || "").toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
    }

    // sorteren
    list.sort((a, b) => {
        switch (sort) {
            case "club":
                return compareStrings(a.club?.name, b.club?.name);

            case "position":
                return compareStrings(a.position, b.position);

            case "isBasisspeler": {
                const av = a.isBasisspeler ? 1 : 0;
                const bv = b.isBasisspeler ? 1 : 0;
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
        formatMarketValue,
    });
});

// Player detail
app.get("/players/:id", async (req, res) => {
    await loadData();

    const id = req.params.id;
    const player = players.find((p) => p.id === id);

    if (!player) {
        return res.status(404).send("Player not found");
    }

    const club = clubs.find(
        (c) =>
            c.id.toLowerCase() === player.club.id.toLowerCase() ||
            c.name.toLowerCase() === player.club.name.toLowerCase()
    );

    res.render("player-detail", {
        player,
        club,
        formatMarketValue,
    });
});

// Clubs list
app.get("/clubs", async (req, res) => {
    await loadData();
    res.render("clubs-list", { clubs });
});

// Club detail
app.get("/clubs/:id", async (req, res) => {
    await loadData();

    const id = req.params.id;
    const club = clubs.find((c) => c.id === id);

    if (!club) {
        return res.status(404).send("Club not found");
    }

    const clubPlayers = players.filter(
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

// ----------------- Start -----------------
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
