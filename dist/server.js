"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const fs_1 = __importDefault(require("fs"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("./models/User");
const seedUsers_1 = require("./seed/seedUsers");
const auth_1 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = 3000;
function formatMarketValue(value) {
    if (value >= 1000000)
        return `${Math.round(value / 1000000)} million`;
    if (value >= 1000)
        return `${Math.round(value / 1000)} k`;
    return value.toString();
}
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static("public"));
app.set("view engine", "ejs");
app.set("views", "src/views");
const MONGO_URI = process.env.MONGO_URI ||
    "mongodb+srv://user:user1905@projecttransfermarkt.d6wldo9.mongodb.net/?appName=ProjectTransfermarkt";
const client = new mongodb_1.MongoClient(MONGO_URI);
let db;
let playersCol;
let clubsCol;
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: MONGO_URI,
        collectionName: "sessions",
    }),
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
    },
}));
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});
async function seedDatabase() {
    if ((await playersCol.countDocuments()) === 0) {
        const players = JSON.parse(fs_1.default.readFileSync("src/data/players.json", "utf8"));
        await playersCol.insertMany(players);
        console.log("Players seeded");
    }
    if ((await clubsCol.countDocuments()) === 0) {
        const clubs = JSON.parse(fs_1.default.readFileSync("src/data/clubs.json", "utf8"));
        await clubsCol.insertMany(clubs);
        console.log("Clubs seeded");
    }
}
let playersCache = [];
let clubsCache = [];
async function loadData() {
    if (!playersCache.length) {
        playersCache = await playersCol.find().toArray();
    }
    if (!clubsCache.length) {
        clubsCache = await clubsCol.find().toArray();
    }
}
app.get("/", (req, res) => {
    if (!req.session.user) {
        const showError = req.query.auth === "required";
        return res.render("home", {
            page: "home",
            showAuthError: showError,
            totalPlayers: playersCache.length,
            totalClubs: clubsCache.length,
            totalMarketValueEur: playersCache.reduce((s, p) => s + (p.marketValueEur ?? 0), 0),
            formatMarketValue,
        });
    }
    res.redirect("/dashboard");
});
app.get("/dashboard", auth_1.requireAuth, async (req, res) => {
    await loadData();
    res.render("home", {
        page: "home",
        totalPlayers: playersCache.length,
        totalClubs: clubsCache.length,
        totalMarketValueEur: playersCache.reduce((s, p) => s + (p.marketValueEur ?? 0), 0),
        formatMarketValue,
    });
});
app.get("/players", auth_1.requireAuth, async (req, res) => {
    await loadData();
    const q = req.query.q || "";
    const starter = req.query.starter || "all";
    const clubName = req.query.clubName || "";
    const sort = req.query.sort || "name";
    const order = req.query.order || "asc";
    let list = [...playersCache];
    if (q) {
        list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    }
    if (starter !== "all") {
        list = list.filter(p => starter === "yes" ? p.isStarter : !p.isStarter);
    }
    if (clubName) {
        list = list.filter(p => p.club?.name.toLowerCase().includes(clubName.toLowerCase()));
    }
    list.sort((a, b) => {
        const av = sort === "club" ? a.club?.name : a[sort];
        const bv = sort === "club" ? b.club?.name : b[sort];
        if (av < bv)
            return order === "asc" ? -1 : 1;
        if (av > bv)
            return order === "asc" ? 1 : -1;
        return 0;
    });
    res.render("players-list", {
        page: "players",
        players: list,
        q,
        starter,
        clubName,
        sort,
        order,
        formatMarketValue,
    });
});
app.get("/players/:id", auth_1.requireAuth, async (req, res) => {
    await loadData();
    const player = playersCache.find(p => p.id === req.params.id);
    if (!player)
        return res.status(404).send("Player not found");
    const club = clubsCache.find(c => c.id === player.club.id);
    res.render("player-detail", {
        page: "players",
        player,
        club,
        formatMarketValue,
    });
});
app.get("/players/:id/edit", auth_1.requireAdmin, async (req, res) => {
    await loadData();
    const player = playersCache.find(p => p.id === req.params.id);
    if (!player)
        return res.status(404).send("Player not found");
    res.render("player-edit", {
        page: "players",
        player,
        clubs: clubsCache,
    });
});
app.post("/players/:id/edit", auth_1.requireAdmin, async (req, res) => {
    const id = req.params.id;
    const club = clubsCache.find(c => c.id === req.body.clubId);
    if (!club)
        return res.status(400).send("Invalid club");
    await playersCol.updateOne({ id }, {
        $set: {
            name: req.body.name,
            age: Number(req.body.age),
            position: req.body.position,
            marketValueEur: Number(req.body.marketValueEur),
            isStarter: req.body.isStarter === "true",
            club: { id: club.id, name: club.name },
        },
    });
    playersCache = await playersCol.find().toArray();
    res.redirect(`/players/${id}`);
});
app.get("/clubs", auth_1.requireAuth, async (req, res) => {
    await loadData();
    const q = req.query.q || "";
    const sort = req.query.sort || "name";
    const order = req.query.order || "asc";
    let list = [...clubsCache];
    if (q) {
        list = list.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
    }
    list.sort((a, b) => {
        const av = a[sort];
        const bv = b[sort];
        if (av < bv)
            return order === "asc" ? -1 : 1;
        if (av > bv)
            return order === "asc" ? 1 : -1;
        return 0;
    });
    res.render("clubs-list", {
        page: "clubs",
        clubs: list,
        q,
        sort,
        order,
    });
});
app.get("/clubs/:id", auth_1.requireAuth, async (req, res) => {
    await loadData();
    const club = clubsCache.find(c => c.id === req.params.id);
    if (!club)
        return res.status(404).send("Club not found");
    const clubPlayers = playersCache.filter(p => p.club.id === club.id);
    const totalMarketValueEur = clubPlayers.reduce((s, p) => s + (p.marketValueEur ?? 0), 0);
    res.render("club-detail", {
        page: "clubs",
        club,
        clubPlayers,
        totalMarketValueEur,
        formatMarketValue,
    });
});
app.get("/login", auth_1.requireGuest, (req, res) => {
    const showAuthError = req.query.auth === "required";
    res.render("login", {
        error: showAuthError
            ? "Je moet eerst inloggen om spelers of clubs te bekijken."
            : null
    });
});
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User_1.User.findOne({ username });
    if (!user)
        return res.render("login", { error: "Onjuiste login" });
    const match = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!match)
        return res.render("login", { error: "Onjuiste login" });
    req.session.user = {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
    };
    res.redirect("/dashboard");
});
app.get("/register", auth_1.requireGuest, (req, res) => {
    res.render("register", { error: null });
});
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (await User_1.User.findOne({ username })) {
        return res.render("register", { error: "Username bestaat al" });
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    await User_1.User.create({ username, passwordHash, role: "USER" });
    res.redirect("/login");
});
app.post("/logout", auth_1.requireAuth, (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});
async function start() {
    try {
        await client.connect();
        db = client.db("transfermarkt");
        playersCol = db.collection("players");
        clubsCol = db.collection("clubs");
        await mongoose_1.default.connect(MONGO_URI);
        console.log("MongoDB & Mongoose connected");
        await seedDatabase();
        await (0, seedUsers_1.seedDefaultUsers)();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error("Failed to start server", err);
        process.exit(1);
    }
}
start();
