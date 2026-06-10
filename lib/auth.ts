import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        // otpVerified is a flag set client-side after /api/otp/verify succeeds
        otpVerified: { label: 'OTP Verified', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || credentials.otpVerified !== 'true') {
          return null;
        }

        try {
          await connectToDatabase();
          const user = await User.findOne({
            email: String(credentials.email).toLowerCase().trim(),
          }).lean();

          if (!user) return null;

          return {
            id: String(user._id),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
});
