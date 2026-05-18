export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: Date;
}
export declare function createUser(username: string, email: string, passwordHash: string, displayName?: string): Promise<User>;
export declare function findUserByEmail(email: string): Promise<User | null>;
export declare function findUserById(id: string): Promise<User | null>;
export declare function findUserByUsername(username: string): Promise<User | null>;
export declare function updateUser(id: string, updates: Partial<Pick<User, 'displayName' | 'avatarUrl'>>): Promise<User | null>;
//# sourceMappingURL=user.d.ts.map