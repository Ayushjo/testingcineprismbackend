"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_js_1 = __importDefault(require("./logger.js"));
const morgan_1 = __importDefault(require("morgan"));
const client_1 = require("@prisma/client");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const morganFormat = ":method :url :status :response-time ms";
app.use((0, morgan_1.default)(morganFormat, {
    stream: {
        write: (message) => {
            const logObject = {
                method: message.split(" ")[0],
                url: message.split(" ")[1],
                status: message.split(" ")[2],
                responseTime: message.split(" ")[3],
            };
            logger_js_1.default.info(JSON.stringify(logObject));
        },
    },
}));
const client = new client_1.PrismaClient();
exports.default = client;
// const findAdmin = async () => {
//   const admin = await client.user.findFirst({
//     where: {
//       id: "admin",
//     },
//   });
//   console.log(admin);
// }
// findAdmin();
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        console.log("Origin received:", origin); // Add this line
        const allowedOrigins = ["https://testingcineprism.vercel.app"];
        if (!origin || allowedOrigins.includes(origin)) {
            console.log("Origin allowed"); // Add this line
            callback(null, true);
        }
        else {
            console.log("Origin blocked:", origin); // Add this line
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
const userRoutes_js_1 = __importDefault(require("./routes/userRoutes.js"));
app.use("/api/v1/user", userRoutes_js_1.default);
app.listen(PORT, () => {
    logger_js_1.default.info(`Server is running on port ${PORT}`);
});
