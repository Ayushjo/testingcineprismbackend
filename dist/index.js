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
const cloudinary_1 = __importDefault(require("cloudinary"));
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
        }
        else {
            console.log("❌ CORS: Origin blocked");
            console.log("=== CORS DEBUG END ===\n");
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
}));
cloudinary_1.default.v2.config({
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
        res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,Cookie");
        res.header("Access-Control-Max-Age", "86400"); // 24 hours
        console.log("✅ OPTIONS response headers set");
        return res.status(200).end();
    }
    next();
});
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
const userRoutes_js_1 = __importDefault(require("./routes/userRoutes.js"));
app.use("/api/v1/user", userRoutes_js_1.default);
const adminRoutes_js_1 = __importDefault(require("./routes/adminRoutes.js"));
app.use("/api/v1/admin", adminRoutes_js_1.default);
app.listen(PORT, () => {
    logger_js_1.default.info(`Server is running on port ${PORT}`);
});
