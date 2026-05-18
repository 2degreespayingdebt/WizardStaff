import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function generateToken(userId: string, role: string): string;
export declare function verifyToken(token: string): {
    userId: string;
    role: string;
} | null;
//# sourceMappingURL=auth.d.ts.map