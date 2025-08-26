"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_jwt_1 = require("passport-jwt");
const __1 = __importDefault(require(".."));
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Missing Google OAuth environment variables:");
    console.error("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing");
    console.error("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Missing");
    throw new Error("Google OAuth environment variables are required");
}
// Google OAuth Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists
        let user = await __1.default.user.findFirst({
            where: {
                OR: [{ googleId: profile.id }, { email: profile.emails[0].value }],
            },
        });
        if (user && !user.googleId) {
            // Update existing user with Google ID
            user = await __1.default.user.update({
                where: { id: user.id },
                data: {
                    googleId: profile.id,
                    profilePicture: profile.photos[0].value,
                    isEmailVerified: true,
                },
            });
        }
        else if (!user) {
            // Create new user
            user = await __1.default.user.create({
                data: {
                    googleId: profile.id,
                    username: profile.displayName || profile.emails[0].value.split("@")[0],
                    email: profile.emails[0].value,
                    profilePicture: profile.photos[0].value,
                    isEmailVerified: true,
                },
            });
        }
        return done(null, user);
    }
    catch (error) {
        return done(error, false);
    }
}));
// JWT Strategy (only from Authorization header)
passport_1.default.use(new passport_jwt_1.Strategy({
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.ACCESS_TOKEN_SECRET,
}, async (payload, done) => {
    try {
        const user = await __1.default.user.findFirst({
            where: { id: payload.id },
        });
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    }
    catch (error) {
        return done(error, false);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await __1.default.user.findFirst({
            where: { id },
        });
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
exports.default = passport_1.default;
