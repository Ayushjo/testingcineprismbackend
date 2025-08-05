import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./logger.js";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { cli } from "winston/lib/winston/config";
import cookieParser from "cookie-parser";
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
    origin: ["http://localhost:5173", "https://testingcineprism.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());
app.use(express.json());
const PORT = process.env.PORT || 3000;

import userRouter from "./routes/userRoutes.js";
app.use("/api/v1/user", userRouter);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
