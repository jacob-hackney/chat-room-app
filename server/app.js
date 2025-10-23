import express from "express";
import lmdb from "lmdb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import roomRouter from "./roomRoutes";

const app = express();
app.use(express.json());
app.use("/rooms", roomRouter);

const UserDB = lmdb.open("users");

app.post("/user/signup", async (req, res) => {
  const { username, password } = req.body;
  if (lmdb.get(username)) {
    res.status(409).json({ message: "User already exists" });
    return;
  } else if (!username || !password) {
    res
      .status(400)
      .json({ message: "Both a username and password are required" });
    return;
  } else if (password.length < 6) {
    res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });
    return;
  } else {
    const salt = await bcrypt.genSalt(8);
    const hashedPassword = await bcrypt.hash(password, salt);
    lmdb.put(username, hashedPassword);
    res.status(201).json({ message: "User created" });
  }
});

app.post("/user/login", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = lmdb.get(username);
  if (hashedPassword && (await bcrypt.compare(password, hashedPassword))) {
    res.status(200).json({
      message: "Login successful",
      accessToken: jwt.sign(
        { username, iat: Date.now() },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      ),
      refreshToken: jwt.sign(
        { username, iat: Date.now(), type: "refresh" },
        "refresh-" + process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "14d" }
      ),
    });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

export default app;
