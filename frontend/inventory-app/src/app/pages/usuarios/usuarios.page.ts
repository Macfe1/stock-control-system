import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import { UsersService, User, Role } from '../../services/users.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-usuarios',
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.css'],
})
export class UsuariosPage implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private users: UsersService,
    public auth: AuthService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // opcional al editar; requerido al crear
      role: ['public' as Role, [Validators.required]],
      active: [true],
    });
  }

  private subs: Subscription[] = [];
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  // Lista en vivo
  rows = signal<User[]>([]);
  total = computed(() => this.rows().length);

  // Modal Crear/Editar
  isOpen = signal(false);
  isEdit = signal(false);
  editingId = signal<string | null>(null);
  form: FormGroup;

  // Dots menu
  openMenuIndex = signal<number | null>(null);
  toggleRowMenu(i: number) {
    this.openMenuIndex.set(this.openMenuIndex() === i ? null : i);
  }

  // Confirm modal para eliminar / (des)activar
  confirmOpen = signal(false);
  confirmTitle = signal('Confirmar acción');
  confirmSubtitle = signal('Esta operación es irreversible.');
  private _confirmRun: (() => void | Promise<void>) | null = null;

  openConfirm(title: string, subtitle: string, run: () => void | Promise<void>) {
    this.confirmTitle.set(title);
    this.confirmSubtitle.set(subtitle);
    this._confirmRun = run;
    this.confirmOpen.set(true);
    this.openMenuIndex.set(null);
  }
  closeConfirm() { this.confirmOpen.set(false); this._confirmRun = null; }
  async confirmProceed() { await this._confirmRun?.(); this.closeConfirm(); }

  ngOnInit() {
    // Solo por seguridad de UI (ruta ya está protegida con roleGuard admin)
    if (this.auth.role() !== 'admin') return;

    const w = this.users.watchList();
    this.subs.push(
      w.valueChanges.subscribe(({ data }) => {
        const list = (data as any).users as User[] ?? [];
        this.rows.set(list);
      })
    );
  }

  // ---------- Abrir modales ----------
  openCreate() {
    this.isEdit.set(false);
    this.editingId.set(null);
    this.form.reset({ name: '', email: '', password: '', role: 'public', active: true });
    this.isOpen.set(true);
  }

  openEdit(i: number) {
    const u = this.rows()[i]; if (!u) return;
    this.isEdit.set(true);
    this.editingId.set(u.id);
    this.form.reset({
      name: u.name ?? '',
      email: u.email,
      password: '',          // vacío = no cambiar
      role: u.role,
      active: u.active,
    });
    this.isOpen.set(true);
    this.openMenuIndex.set(null);
  }

  closeModal() { this.isOpen.set(false); }

  // ---------- Submit Crear/Editar ----------
  async submit() {
    if (this.form.invalid) return;

    const { name, email, password, role, active } = this.form.value as {
      name: string; email: string; password: string; role: Role; active: boolean;
    };

    if (this.isEdit()) {
      const id = this.editingId()!;
      const set: any = { name, email, role, active };
      if (password && password.trim().length > 0) {
        // Si tienes trigger que hashea "password", envía set.password = password;
        // Si no, envía password_hash directamente:
        set.password_hash = password;
      }
      await firstValueFrom(this.users.update(id, set));
    } else {
      if (!password || password.trim().length < 4) {
        alert('La contraseña es obligatoria (mínimo 4 caracteres) para crear usuario.');
        return;
      }
      // Igual que arriba: usa password o password_hash según tu trigger.
      await firstValueFrom(
        this.users.insert({
          email,
          name,
          role,
          active,
          password_hash: password,
        })
      );
    }

    await this.users.refetchList();
    this.closeModal();
  }

  // ---------- Acciones de fila ----------
  askToggleActive(i: number) {
    const u = this.rows()[i]; if (!u) return;
    if (u.active) {
      this.openConfirm('Desactivar usuario', `El usuario ${u.email} pasará a inactivo.`, async () => {
        await firstValueFrom(this.users.deactivate(u.id));
        await this.users.refetchList();
      });
    } else {
      this.openConfirm('Activar usuario', `El usuario ${u.email} pasará a activo.`, async () => {
        await firstValueFrom(this.users.activate(u.id));
        await this.users.refetchList();
      });
    }
  }

  askDelete(i: number) {
    const u = this.rows()[i]; if (!u) return;
    this.openConfirm('Eliminar usuario', `Se eliminará ${u.email}.`, async () => {
      await firstValueFrom(this.users.delete(u.id));
      await this.users.refetchList();
    });
  }
}
