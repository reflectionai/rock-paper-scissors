import express from "express";
import { PrismaClient } from "@prisma/client";
import * as http from "http";
import { WebSocketServer } from "ws";
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

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
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
          wss.clients.forEach((client) => {
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
