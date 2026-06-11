import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectToDatabase();
          const user = await User.findOne({
            email: String(credentials.email).toLowerCase().trim(),
          }).lean();

          if (!user) throw new Error('Invalid email or password');

          // For existing users migrating from passwordless OTP
          if (!user.password) {
            throw new Error('Please use Forgot Password to set a password for your account.');
          }

          const bcrypt = await import('bcryptjs');
          const isValid = await bcrypt.compare(String(credentials.password), user.password);

          if (!isValid) throw new Error('Invalid email or password');

          // Update lastLoginAt asynchronously without blocking
          User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec().catch(console.error);

          return {
            id: String(user._id),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          if (error instanceof Error) {
            throw error; // Pass the specific error message to the client
          }
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
