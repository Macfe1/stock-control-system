import { Injectable, computed, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';                   // 👈 IMPORTANTE
import { SessionState, SessionUser, Role } from '../models/auth.models';

const GET_USER_BY_EMAIL = gql`
    query GetUserByEmail($email: String!) {
    users(where: { email: { _eq: $email } }) {
        id
        email
        password_hash
        role
        active
    }
    }
`;

const SESSION_STORAGE_KEY = 'session';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private state = signal<SessionState>({ user: null });

    user = computed(() => this.state().user);
    role = computed<Role | null>(() => this.state().user?.role ?? null);
    isLoggedIn = computed(() => !!this.state().user);

    constructor(private apollo: Apollo, private router: Router) {
        this.restoreSession();
    }

    private persistSession(user: SessionUser | null) {
        if (user) {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        }
    }

    private restoreSession() {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return;
        try {
            const user: SessionUser = JSON.parse(raw);
            this.state.set({ user });
        } catch {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        }
    }

    /**
     * DEMO (solo dev): valida email/contraseña en el front.
     * Producción: mover validación a servidor y emitir JWT.
     */
    async login(email: string, password: string) {
        // ✅ usa firstValueFrom para obtener el resultado
        const result = await firstValueFrom(
            this.apollo.query<{
                users: Array<{ id: string; email: string; password_hash: string; role: string; active: boolean }>;
            }>({
                query: GET_USER_BY_EMAIL,
                variables: { email },
                fetchPolicy: 'no-cache',
                context: {
                    headers: {
                        // Para que el query de login funcione sin sesión (dev)
                        'x-hasura-role': 'public',
                    },
                },
            })
        );

        const u = result.data?.users?.[0];   // 👈 ahora "data" existe
        if (!u) throw new Error('Usuario no encontrado.');
        if (u.active === false) throw new Error('Usuario inactivo.');

        // SOLO DEMO: comparación directa
        if (password !== u.password_hash) throw new Error('Credenciales inválidas.');

        // normaliza rol (por si viene en mayúsculas)
        const role = (u.role || '').toLowerCase() as Role;

        const user: SessionUser = { id: u.id, email: u.email, role };
        this.state.set({ user });
        this.persistSession(user);

        await this.router.navigate(['/app/dashboard']);
    }

    async logout() {
        this.state.set({ user: null });
        this.persistSession(null);
        try {
            await this.apollo.client.clearStore();
        } catch { }
        await this.router.navigate(['/login']);
    }
}
