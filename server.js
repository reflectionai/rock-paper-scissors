"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChoiceSchema = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const http = __importStar(require("http"));
const ws_1 = require("ws");
const zod_1 = require("zod");
exports.ChoiceSchema = zod_1.z.union([
    zod_1.z.literal("rock"),
    zod_1.z.literal("paper"),
    zod_1.z.literal("scissors"),
]);
const app = (0, express_1.default)();
const server = http.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const port = 3000;
const prisma = new client_1.PrismaClient();
wss.on("connection", (ws) => {
    ws.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const parsedMessage = message.toString();
            const result = exports.ChoiceSchema.safeParse(parsedMessage);
            if (!result.success) {
                ws.send(JSON.stringify({ error: "Invalid choice" }));
                return;
            }
            const newChoice = result.data;
            const choices = yield prisma.choice.findMany();
            switch (choices.length) {
                case 0:
                    yield prisma.choice.create({ data: { choice: newChoice } });
                    ws.send(JSON.stringify({
                        message: "Choice recorded. Waiting for the other player.",
                    }));
                    break;
                case 1:
                    const [oldChoice] = choices;
                    const clients = Array.from(wss.clients);
                    wss.clients.forEach((client) => {
                        client.send(JSON.stringify([oldChoice.choice, newChoice]));
                    });
                    yield prisma.choice.deleteMany();
            }
        }
        catch (error) {
            ws.send(JSON.stringify(error));
        }
    }));
});
server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
