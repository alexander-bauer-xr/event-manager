import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { verifyToken } from '../utils/crypto';
import { Errors } from '../utils/errors';

export interface AdminClaims {
  slug: string;
  role: 'admin';
}

export class AuthService {
  async verifyAdminLogin(slug: string, token: string): Promise<string> {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { adminTokenHash: true },
    });

    if (!event) {
      throw Errors.INVALID_CREDENTIALS();
    }

    const isValid = await verifyToken(event.adminTokenHash, token);
    if (!isValid) {
      throw Errors.INVALID_CREDENTIALS();
    }

    const claims: AdminClaims = {
      slug,
      role: 'admin',
    };

    const jwtToken = jwt.sign(claims, config.jwtSecret, {
      expiresIn: '12h',
    });

    return jwtToken;
  }

  verifyJwt(token: string): AdminClaims {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AdminClaims;
      if (decoded.role !== 'admin' || !decoded.slug) {
        throw Errors.INVALID_TOKEN();
      }
      return decoded;
    } catch {
      throw Errors.INVALID_TOKEN();
    }
  }

  extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

export const authService = new AuthService();
