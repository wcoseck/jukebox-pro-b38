const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const prisma = new PrismaClient();
const SECRET_KEY = "my-secret-key";

app.use(express.json());

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.slice(7);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (typeof password !== "string") {
    return res.status(400).json({ error: "Password must be a string" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });

    const token = jwt.sign({ id: user.id }, SECRET_KEY);

    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: "Error creating user" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id }, SECRET_KEY);
  res.json({ token });
});

app.get("/playlists", authenticate, async (req, res) => {
  const playlists = await prisma.playlist.findMany({
    where: { userId: req.user.id },
  });
  res.json(playlists);
});

app.post("/playlists", authenticate, async (req, res) => {
  const { name, description, trackIds } = req.body;

  const playlist = await prisma.playlist.create({
    data: {
      name,
      description,
      userId: req.user.id,
      tracks: { connect: trackIds.map((id) => ({ id })) },
    },
  });

  res.json(playlist);
});

app.get("/playlists/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  const playlist = await prisma.playlist.findUnique({
    where: { id: Number(id) },
    include: { tracks: true },
  });

  if (!playlist || playlist.userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(playlist);
});

app.get("/tracks", async (req, res) => {
  const tracks = await prisma.track.findMany();
  res.json(tracks);
});

app.get("/tracks/:id", async (req, res) => {
  const { id } = req.params;

  const track = await prisma.track.findUnique({
    where: { id: Number(id) },
  });

  if (!track) return res.status(404).json({ error: "Track not found" });

  const playlists = req.user
    ? await prisma.playlist.findMany({
        where: {
          userId: req.user.id,
          tracks: { some: { id: track.id } },
        },
      })
    : [];

  res.json({ ...track, playlists });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
