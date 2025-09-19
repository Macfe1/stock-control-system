import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    standalone: true,
    selector: 'app-login-page',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.css']
})
export class LoginPage {
    loading = signal(false);
    errorMsg = signal<string | null>(null);

    form!: FormGroup; // se inicializa en el constructor

    constructor(private fb: FormBuilder, private auth: AuthService) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(4)]],
        });
    }

    async submit() {
        this.errorMsg.set(null);
        if (this.form.invalid) return;

        this.loading.set(true);
        const { email, password } = this.form.value as { email: string; password: string };

        try {
            await this.auth.login(email, password);
        } catch (e: any) {
            this.errorMsg.set(e?.message ?? 'Error al iniciar sesión.');
        } finally {
            this.loading.set(false);
        }
    }
}
