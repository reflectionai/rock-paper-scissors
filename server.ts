import express from "express";
import { PrismaClient } from "@prisma/client";
import * as http from "http";
import { Server, WebSocketServer, WebSocket } from "ws";
import { z } from "zod";

export const ChoiceSchema = z.union([
  z.literal("rock"),
  z.literal("paper"),
  z.literal("scissors"),
]);

export type Choice = z.infer<typeof ChoiceSchema>;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const port = 3000;

const prisma = new PrismaClient();

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", async (message: Server) => {
    try {
      const parsedMessage = message.toString();
      const result = ChoiceSchema.safeParse(parsedMessage);
      if (!result.success) {
        ws.send(JSON.stringify({ error: "Invalid choice" }));
        return;
      }
      const newChoice = result.data;
      const choices = await prisma.choice.findMany();
      switch (choices.length) {
        case 0:
          await prisma.choice.create({ data: { choice: newChoice } });
          ws.send(
            JSON.stringify({
              message: "Choice recorded. Waiting for the other player.",
            })
          );
          break;
        case 1:
          const [oldChoice] = choices;
          wss.clients.forEach((client: WebSocket) => {
            client.send(JSON.stringify([oldChoice.choice, newChoice]));
          });
          await prisma.choice.deleteMany();
      }
    } catch (error) {
      ws.send(JSON.stringify(error));
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Implement a simple version of rock/paper/scissors, using a typescript backend with
// the following functionality:

// It receives a message, which it parses as "rock", "paper," or "scissors." It then
// waits for a second message which it parses the same way. It communicates to the senders
// of _both_ messages what the values of the first and the second messages were. It then
// resets the state so that more games can be played.

// Note that players do not know whether they are player 1 or player 2 and should not have
// to identify themselves as such.

// 1. Define the database schema
// 2. What is the structure of the API
// 3. Implement using either typescript of python
