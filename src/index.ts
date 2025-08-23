
if (typeof globalThis.File === "undefined") {
  class FilePolyfill {
    name: string;
    type: string;
    lastModified: number;
    size: number;
    webkitRelativePath: string;
    private _chunks: any[];

    constructor(chunks: any[], filename: string, options: any = {}) {
      this.name = filename;
      this.type = options.type || "";
      this.lastModified = options.lastModified || Date.now();
      this.size = chunks.reduce((acc, chunk) => acc + (chunk.length || 0), 0);
      this.webkitRelativePath = "";
      this._chunks = chunks;
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      const buffer = Buffer.concat(
        this._chunks.map((chunk) => Buffer.from(chunk))
      );
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    }

    async bytes(): Promise<Uint8Array> {
      const buffer = Buffer.concat(
        this._chunks.map((chunk) => Buffer.from(chunk))
      );
      return new Uint8Array(buffer);
    }

    slice(start?: number, end?: number, contentType?: string): Blob {
      // Return a minimal blob-like object
      return new (FilePolyfill as any)(this._chunks, this.name, {
        type: contentType || this.type,
      });
    }

    stream(): ReadableStream {
      throw new Error("ReadableStream not implemented in polyfill");
    }

    async text(): Promise<string> {
      const buffer = Buffer.concat(
        this._chunks.map((chunk) => Buffer.from(chunk))
      );
      return buffer.toString("utf8");
    }
  }

  (globalThis as any).File = FilePolyfill;
}

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./logger.js";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { cli } from "winston/lib/winston/config";
import cookieParser from "cookie-parser";
import cloudinary from "cloudinary";
import bcrypt from "bcrypt";
dotenv.config();
const app = express();
const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };

        logger.info(JSON.stringify(logObject));
      },
    },
  })
);
const client = new PrismaClient();
export default client;
// const findAdmin = async () => {
//   const admin = await client.user.findFirst({
//     where: {
//       id: "admin",
//     },
//   });
//   console.log(admin);
// }
// findAdmin();

app.use(
  cors({
    origin: function (origin: any, callback) {
      console.log("\n=== CORS DEBUG START ===");
      console.log("Request origin:", origin);
      console.log("Origin type:", typeof origin);
      console.log("Origin is undefined:", origin === undefined);
      console.log("Origin is null:", origin === null);

      const allowedOrigins = [
        "https://testingcineprism.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
      ];

      console.log("Allowed origins:", allowedOrigins);
      console.log("Origin in allowed list:", allowedOrigins.includes(origin));
      console.log("No origin (server-to-server):", !origin);

      if (!origin || allowedOrigins.includes(origin)) {
        console.log("✅ CORS: Origin allowed");
        console.log("=== CORS DEBUG END ===\n");
        callback(null, true);
      } else {
        console.log("❌ CORS: Origin blocked");
        console.log("=== CORS DEBUG END ===\n");
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Add explicit preflight handler
app.use((req, res, next) => {
  console.log(`\n=== REQUEST DEBUG ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Origin: ${req.headers.origin}`);
  console.log(`Content-Type: ${req.headers["content-type"]}`);
  console.log(`Cookie header: ${req.headers.cookie}`);
  console.log(`Authorization header: ${req.headers.authorization}`);
  console.log("=== END REQUEST DEBUG ===\n");

  if (req.method === "OPTIONS") {
    console.log("🔄 Handling OPTIONS preflight request");
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,Cookie"
    );
    res.header("Access-Control-Max-Age", "86400"); // 24 hours
    console.log("✅ OPTIONS response headers set");
    return res.status(200).end();
  }

  next();
});
app.use(cookieParser());
app.use(express.json());
const PORT = process.env.PORT || 3000;

import userRouter from "./routes/userRoutes.js";
app.use("/api/v1/user", userRouter);
import adminRouter from "./routes/adminRoutes.js";
app.use("/api/v1/admin", adminRouter);

import postRoutes from "./routes/postRoutes.js";
app.use("/api/v1/posts", postRoutes);

import movieRoutes from "./routes/moviesRouter.js";
app.use("/api/v1/movies", movieRoutes);

import aiNewsRoutes from "./routes/ainewsRoutes.js";
app.use("/api/v1/news", aiNewsRoutes);
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
