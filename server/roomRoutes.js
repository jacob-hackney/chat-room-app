import express from "express";
import lmdb from "lmdb";
import jwt from "jsonwebtoken";

const router = express.Router();

const RoomDB = lmdb.open("rooms");
RoomDB.put("Global", null);

router.get("/all", (req, res) => {
  res.json(RoomDB.getRange());
});

router.get("/:roomName/has-password", (req, res) => {
  const room = RoomDB.get(req.params.roomName);
  if (room) {
    res.json(true);
    return;
  } else if (room === null) {
    res.json(false);
    return;
  } else {
    res
      .status(404)
      .json({ message: `Room ${req.params.roomName} doesn't exist` });
  }
});

router.post("/create", (req, res) => {
  try {
    const { roomName, password, token } = req.body;
    let username;
    try {
      username = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET).username;
    } catch {
      res.status(401).json({ message: "Access token is invalid or expired" });
      return;
    }

    if (!username) {
      res
        .status(401)
        .json({ message: "You must be signed in to create a room" });
    } else if (RoomDB.get(roomName)) {
      res.status(409).json({ message: "Room already exists" });
    } else if (!roomName || !password) {
      res
        .status(400)
        .json({ message: "Both a room name and password are required" });
    } else {
      RoomDB.put(roomName, { password: password || null, owner: username });
      res.status(201).json({ message: "Room created" });
    }
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

router.delete("/:roomName", (req, res) => {
  const room = RoomDB.get(req.params.roomName);
  let username;
  try {
    username = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.ACCESS_TOKEN_SECRET
    );
  } catch {
    res.status(401).json({ message: "Access token is invalid or expired" });
    return;
  }

  if(username !== room.owner) {
    res.status(403).json({ message: "You don't own this room" });
    return;
  }

  if (room) {
    RoomDB.del(req.params.roomName);
    res.json({ message: "Room deleted" });
  }
});

export default router;
