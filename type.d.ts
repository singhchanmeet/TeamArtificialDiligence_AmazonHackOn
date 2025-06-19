export interface ProductProps {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

export interface StoreProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  quantity: number;
}

export interface stateProps {
  productData: [];
  favoriteData: [];
  userInfo: [] | null | string;
  next: any;
}

// Extend NextAuth types
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }

  interface User {
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
  }
}
