import { Server } from "socket.io";
import config from "config";
import jwt from "jsonwebtoken";

type JwtPayload = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

const port = config.get<number>("io.port");
const clientOrigin = config.get<string>("io.clientOrigin");
const jwtSecret = config.get<string>("jwtSecret");

const io = new Server({
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
  },
});

// ✅ אימות JWT לפני connection
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing token"));

    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!payload?.id) return next(new Error("Invalid token payload"));

    socket.data.user = payload;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as JwtPayload;

  const room = `user:${user.id}`;
  socket.join(room);

  console.log(`🟢 connected user=${user.id} socket=${socket.id} room=${room}`);

  socket.on("disconnect", () => {
    console.log(`🔴 disconnected user=${user.id} socket=${socket.id}`);
  });
});


export function emitToUser(userId: string, event: string, payload: any) {
  io.to(`user:${userId}`).emit(event, payload);
}

io.listen(port);
console.log(`✅ io listening on port ${port}`);