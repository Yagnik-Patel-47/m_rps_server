import { createServer } from "http";
import { Server } from "socket.io";
import { generateId } from "./utils/idGenerate.js";
import { calculateResult } from "./utils/logic.js";

const PORT = process.env.PORT || 5000;
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write(`<h2 style="
  font-family: sans-serif;
  margin: 2rem auto;
  width: fit-content;
  text-transform: uppercase;
">Backend Here</h2>`);
  res.end();
});
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let rooms = [];
let serverRooms = io.sockets.adapter.rooms;
let firstChoice;
let secondChoice;
let firstPlayerName;
let secondPlayerName;
let firstPath;
let secondPath;
let firstPlayerPoints;
let secondPlayerPoints;

io.on("connection", (socket) => {
  socket.on("generateRoom", (data) => {
    const roomId = generateId(5);
    let currentRoom = {
      RoomID: roomId,
      RoomPlayers: 1,
      RoomHost: { ...data, id: socket.id },
      RoomStatus: "waiting",
    };
    rooms.push(currentRoom);
    io.sockets.emit("serverRoomsUpdate");
    socket.join(roomId);
    socket.emit("roomGenerated", currentRoom);
  });
  socket.on("joinRoomReq", (roomData, playerData) => {
    let currentRoomIndex;
    let allRoomIDs = new Set();
    let needRoom;

    if (roomData.RoomId.length === 0) {
      socket.emit("roomJoinFailed", "Please enter a valid Room ID.");
      return;
    }

    if (rooms.length === 0) {
      socket.emit("roomJoinFailed", "Room not Found!");
      return;
    }
    rooms.forEach(() => {
      rooms.forEach((roomForId) => {
        allRoomIDs.add(roomForId.RoomID);
        if (roomForId.RoomID === roomData.RoomId) {
          needRoom = roomForId;
        }
      });
    });
    if (allRoomIDs.has(roomData.RoomId)) {
      if (needRoom.RoomPlayers > 1) {
        socket.emit("roomJoinFailed", "Room is already full.");
        return;
      } else if (needRoom.RoomPlayers === 1) {
        currentRoomIndex = rooms.indexOf(needRoom);
        rooms[currentRoomIndex].secondPlayer = {
          ...playerData,
          id: socket.id,
        };
        rooms[currentRoomIndex].RoomPlayers = 2;
        rooms[currentRoomIndex].RoomStatus = "playing";
        io.sockets.emit("serverRoomsUpdate");
        socket.join(roomData.RoomId);
        console.log(serverRooms);
        io.sockets
          .to(roomData.RoomId)
          .emit("playerJoined", needRoom, socket.id);
        io.sockets.to(roomData.RoomId).emit("entered");
        return;
      }
    } else {
      socket.emit("roomJoinFailed", "Room not Found!");
      return;
    }
  });

  // Close Browser //
  socket.on("disconnect", () => {
    let needID;
    let currentIndex;

    for (let id of serverRooms.keys()) {
      if (id.length === 5 && serverRooms.get(id).size === 1) {
        needID = id;
      }
    }

    io.sockets.to(needID).emit("opponentWentOffline", socket.id);

    rooms.forEach((room) => {
      if (room.RoomID === needID) {
        currentIndex = rooms.indexOf(room);
        rooms.splice(currentIndex, 1);
      }
    });

    io.sockets.emit("serverRoomsUpdate");
  });

  // Show Rooms //
  socket.on("showRooms", () => {
    socket.emit("seeRooms", rooms, serverRooms);
  });

  // Room Exit Events

  socket.on("cancelRoom", (id) => {
    let currentRoomIndex;
    rooms.forEach((room) => {
      if (room.RoomID === id) {
        currentRoomIndex = rooms.indexOf(room);
        rooms.splice(currentRoomIndex, 1);
      }
    });
    socket.broadcast.to(id).emit("leaveSecondPlayer");
    socket.leave(id);
    io.sockets.emit("serverRoomsUpdate");
  });

  socket.on("cancelRoomWaiting", (id) => {
    let currentRoomIndex;
    rooms.forEach((room) => {
      if (room.RoomID === id) {
        currentRoomIndex = rooms.indexOf(room);
        rooms.splice(currentRoomIndex, 1);
      }
    });
    socket.emit("leaveSecondPlayer");
    socket.leave(id);
    io.sockets.emit("serverRoomsUpdate");
  });

  socket.on("secondPlayerOffineWaiting", (id) => {
    rooms.forEach((room) => {
      if (room.RoomID === id) {
        room.secondPlayer = null;
        room.RoomPlayers = 1;
        room.RoomStatus = "waiting";
      }
    });
    socket.to(id).emit("roomUpdate");
    io.sockets.emit("serverRoomsUpdate");
  });

  socket.on("secondPlayerLeft", (id) => {
    rooms.forEach((room) => {
      if (room.RoomID === id) {
        room.secondPlayer = null;
        room.RoomPlayers = 1;
        room.RoomStatus = "waiting";
      }
    });
    socket.broadcast.to(id).emit("roomUpdate");
    socket.emit("cancelTimeout");
    socket.leave(id);
    io.sockets.emit("serverRoomsUpdate");
  });

  socket.on("leaveMe", (id) => {
    socket.leave(id);
  });

  socket.on("destroyRoomOffline", (id) => {
    let currentRoomIndex;
    rooms.forEach((room) => {
      if (room.RoomID === id) {
        currentRoomIndex = rooms.indexOf(room);
        rooms.splice(currentRoomIndex, 1);
      }
    });
    socket.emit("roomClosed");
    socket.leave(id);
    io.sockets.emit("serverRoomsUpdate");
  });

  socket.on("destroyRoom", (id) => {
    let currentRoomIndex;
    rooms.forEach((room) => {
      if (room.RoomID === id) {
        currentRoomIndex = rooms.indexOf(room);
        rooms.splice(currentRoomIndex, 1);
      }
    });
    socket.broadcast.to(id).emit("roomClosed");
    socket.leave(id);
    io.sockets.emit("serverRoomsUpdate");
  });

  // Game Events
  socket.on("gameStart", (room) => {
    io.sockets.to(room.roomId).emit("takeTurn", socket.id);
  });
  socket.on("turnTaked", (choice, roomID, path, name, points) => {
    firstChoice = choice;
    firstPlayerName = name;
    firstPath = path;
    firstPlayerPoints = points;
    socket.broadcast.to(roomID).emit("secondPlayerTurn", choice);
  });
  socket.on("secondTurnTaked", (choice, roomID, path, name, round, points) => {
    secondChoice = choice;
    secondPlayerName = name;
    secondPath = path;
    secondPlayerPoints = points;
    let resultObject = calculateResult(
      firstChoice,
      firstPlayerName,
      firstPath,
      firstPlayerPoints,
      secondChoice,
      secondPlayerName,
      secondPath,
      secondPlayerPoints,
      round
    );
    io.sockets.to(roomID).emit("results", resultObject);
  });
  socket.on("restartRound", (id) => {
    firstChoice = undefined;
    firstPath = undefined;
    firstPlayerName = undefined;
    secondPath = undefined;
    secondPlayerName = undefined;
    secondChoice = undefined;
    io.sockets.to(id).emit("takeTurn", socket.id);
  });

  socket.on("requestRooms", () => {
    socket.emit("sendRooms", rooms);
  });
});

server.listen(PORT);
