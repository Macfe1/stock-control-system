export type Role = 'public' | 'operator' | 'admin';

export interface SessionUser {
    id: string;
    email: string;
    role: Role;
}

export interface SessionState {
    user: SessionUser | null;
}
