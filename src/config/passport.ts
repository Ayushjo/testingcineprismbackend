import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import client from "..";

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await client.user.findFirst({
          where: {
            OR: [{ googleId: profile.id }, { email: profile.emails![0].value }],
          },
        });

        if (user && !user.googleId) {
          // Update existing user with Google ID
          user = await client.user.update({
            where: { id: user.id },
            data: {
              googleId: profile.id,
              profilePicture: profile.photos![0].value,
              isEmailVerified: true,
            },
          });
        } else if (!user) {
          // Create new user
          user = await client.user.create({
            data: {
              googleId: profile.id,
              username:
                profile.displayName || profile.emails![0].value.split("@")[0],
              email: profile.emails![0].value,
              profilePicture: profile.photos![0].value,
              isEmailVerified: true,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// JWT Strategy (only from Authorization header)
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET!,
    },
    async (payload, done) => {
      try {
        const user = await client.user.findFirst({
          where: { id: payload.id },
        });

        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await client.user.findFirst({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
