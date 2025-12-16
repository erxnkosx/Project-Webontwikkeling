import express from "express";
import { MongoClient, Db, Collection } from "mongodb";
import fs from "fs";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { Player } from "./interfaces/player";
import { Club } from "./interfaces/club";
import { User } from "./models/User";
import { seedDefaultUsers } from "./seed/seedUsers";
import { requireAuth, requireAdmin, requireGuest } from "./middleware/auth";

const app = express();
const PORT = 3000;

function formatMarketValue(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} million`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} k`;
  return value.toString();
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "src/views");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://user:user1905@projecttransfermarkt.d6wldo9.mongodb.net/?appName=ProjectTransfermarkt";

const client = new MongoClient(MONGO_URI);

let db: Db;
let playersCol: Collection<Player>;
let clubsCol: Collection<Club>;

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

async function seedDatabase() {
  if ((await playersCol.countDocuments()) === 0) {
    const players = JSON.parse(
      fs.readFileSync("src/data/players.json", "utf8")
    );
    await playersCol.insertMany(players);
    console.log("Players seeded");
  }

  if ((await clubsCol.countDocuments()) === 0) {
    const clubs = JSON.parse(
      fs.readFileSync("src/data/clubs.json", "utf8")
    );
    await clubsCol.insertMany(clubs);
    console.log("Clubs seeded");
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

app.get("/", (req, res) => {
  if (!req.session.user) {
    const showError = req.query.auth === "required";

    return res.render("home", {
      page: "home",
      showAuthError: showError,
      totalPlayers: playersCache.length,
      totalClubs: clubsCache.length,
      totalMarketValueEur: playersCache.reduce(
        (s, p) => s + (p.marketValueEur ?? 0),
        0
      ),
      formatMarketValue,
    });
  }

  res.redirect("/dashboard");
});

app.get("/dashboard", requireAuth, async (req, res) => {
  await loadData();

  res.render("home", {
    page: "home",
    totalPlayers: playersCache.length,
    totalClubs: clubsCache.length,
    totalMarketValueEur: playersCache.reduce(
      (s, p) => s + (p.marketValueEur ?? 0),
      0
    ),
    formatMarketValue,
  });
});

app.get("/players", requireAuth, async (req, res) => {
  await loadData();

  const q = (req.query.q as string) || "";
  const starter = (req.query.starter as string) || "all";
  const clubName = (req.query.clubName as string) || "";
  const sort = (req.query.sort as string) || "name";
  const order = (req.query.order as string) || "asc";

  let list = [...playersCache];

  if (q) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase())
    );
  }

  if (starter !== "all") {
    list = list.filter(p =>
      starter === "yes" ? p.isStarter : !p.isStarter
    );
  }

  if (clubName) {
    list = list.filter(p =>
      p.club?.name.toLowerCase().includes(clubName.toLowerCase())
    );
  }

  list.sort((a: any, b: any) => {
    const av = sort === "club" ? a.club?.name : a[sort];
    const bv = sort === "club" ? b.club?.name : b[sort];
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
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

app.get("/players/:id", requireAuth, async (req, res) => {
  await loadData();

  const player = playersCache.find(p => p.id === req.params.id);
  if (!player) return res.status(404).send("Player not found");

  const club = clubsCache.find(c => c.id === player.club.id);

  res.render("player-detail", {
    page: "players",
    player,
    club,
    formatMarketValue,
  });
});

app.get("/players/:id/edit", requireAdmin, async (req, res) => {
  await loadData();

  const player = playersCache.find(p => p.id === req.params.id);
  if (!player) return res.status(404).send("Player not found");

  res.render("player-edit", {
    page: "players",
    player,
    clubs: clubsCache,
  });
});

app.post("/players/:id/edit", requireAdmin, async (req, res) => {
  const id = req.params.id;

  const club = clubsCache.find(c => c.id === req.body.clubId);
  if (!club) return res.status(400).send("Invalid club");

  await playersCol.updateOne(
    { id },
    {
      $set: {
        name: req.body.name,
        age: Number(req.body.age),
        position: req.body.position,
        marketValueEur: Number(req.body.marketValueEur),
        isStarter: req.body.isStarter === "true",
        club: { id: club.id, name: club.name },
      },
    }
  );

  playersCache = await playersCol.find().toArray();
  res.redirect(`/players/${id}`);
});

app.get("/clubs", requireAuth, async (req, res) => {
  await loadData();

  const q = (req.query.q as string) || "";
  const sort = (req.query.sort as string) || "name";
  const order = (req.query.order as string) || "asc";

  let list = [...clubsCache];

  if (q) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase())
    );
  }

  list.sort((a: any, b: any) => {
    const av = a[sort];
    const bv = b[sort];
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
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

app.get("/clubs/:id", requireAuth, async (req, res) => {
  await loadData();

  const club = clubsCache.find(c => c.id === req.params.id);
  if (!club) return res.status(404).send("Club not found");

  const clubPlayers = playersCache.filter(p => p.club.id === club.id);
  const totalMarketValueEur = clubPlayers.reduce(
    (s, p) => s + (p.marketValueEur ?? 0),
    0
  );

  res.render("club-detail", {
    page: "clubs",
    club,
    clubPlayers,
    totalMarketValueEur,
    formatMarketValue,
  });
});

app.get("/login", requireGuest, (req, res) => {
  const showAuthError = req.query.auth === "required";

  res.render("login", {
    error: showAuthError
      ? "Je moet eerst inloggen om spelers of clubs te bekijken."
      : null
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.render("login", { error: "Onjuiste login" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.render("login", { error: "Onjuiste login" });

  req.session.user = {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
  };

  res.redirect("/dashboard");
});

app.get("/register", requireGuest, (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (await User.findOne({ username })) {
    return res.render("register", { error: "Username bestaat al" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username, passwordHash, role: "USER" });

  res.redirect("/login");
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

async function start() {
  try {
    await client.connect();
    db = client.db("transfermarkt");

    playersCol = db.collection<Player>("players");
    clubsCol = db.collection<Club>("clubs");

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB & Mongoose connected");

    await seedDatabase();
    await seedDefaultUsers();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}
start();