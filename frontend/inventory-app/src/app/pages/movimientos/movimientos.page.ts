import { Component, computed, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { MovementsService, Movement, MovementType } from '../../services/movements.service';
import { ProductsService, Product } from '../../services/products.service';
import { WarehousesService, Warehouse } from '../../services/warehouses.service';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';

@Component({
  standalone: true,
  selector: 'app-movimientos',
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: './movimientos.page.html',
  styleUrls: ['./movimientos.page.css'],
})
export class MovimientosPage implements OnInit, OnDestroy {
  // ✅ Declarar como propiedad sin inicializar
  form!: FormGroup;

  constructor(
    public auth: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private movements: MovementsService,
    private products: ProductsService,
    private warehouses: WarehousesService,
  ) {}

  private subs: Subscription[] = [];
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  // ==== Roles
  isAdmin = computed(() => this.auth.role() === 'admin');

  // ==== Data VM
  rows = signal<Movement[]>([]);
  productsOpts = signal<Product[]>([]);
  warehousesOpts = signal<Warehouse[]>([]);

  // KPIs
  total   = computed(() => this.rows().length);
  totalIn = computed(() => this.rows().filter(r => r.type==='INBOUND').length);
  totalOut= computed(() => this.rows().filter(r => r.type==='OUTBOUND').length);
  totalTr = computed(() => this.rows().filter(r => r.type==='TRANSFER').length);

  // Dots menu
  openMenuIndex = signal<number | null>(null);
  toggleRowMenu(i: number) {
    this.openMenuIndex.set(this.openMenuIndex() === i ? null : i);
  }

  // ==== Modal crear/editar movimiento
  isFormOpen = signal(false);
  editingId = signal<string | null>(null);

  // Reglas de validación por tipo
  get mustHaveWarehouse() {
    const t = this.form?.value?.type;
    return t === 'INBOUND' || t === 'OUTBOUND' || t === 'ADJUSTMENT';
  }

  // ==== Confirm modal (para desactivar/eliminar)
  confirmOpen = signal(false);
  confirmTitle = signal('Confirmar acción');
  confirmSubtitle = signal('');
  private _confirmDo: (() => void | Promise<void>) | null = null;

  openConfirm(title: string, subtitle: string, run: () => void | Promise<void>) {
    if (!this.isAdmin()) return;
    this.confirmTitle.set(title);
    this.confirmSubtitle.set(subtitle);
    this._confirmDo = run;
    this.confirmOpen.set(true);
    this.openMenuIndex.set(null);
  }
  closeConfirm() { this.confirmOpen.set(false); this._confirmDo = null; }
  async confirmProceed() { await this._confirmDo?.(); this.closeConfirm(); }

  // ==== Lifecycle: cargar listas
  ngOnInit() {
    // ✅ Inicializar form aquí, después del constructor
    this.form = this.fb.group({
      type:        ['INBOUND' as MovementType, Validators.required],
      product_id:  [null as string | null, Validators.required],
      warehouse_id:[null as string | null], // requerido segun tipo
      quantity:    [0, [Validators.required, Validators.min(1)]],
      reason:      ['' as string | null],
    });

    // Reaccionar al cambio de tipo para reglas simples
    this.form.get('type')!.valueChanges.subscribe(() => {
      if (this.mustHaveWarehouse) {
        this.form.get('warehouse_id')!.addValidators([Validators.required]);
      } else {
        this.form.get('warehouse_id')!.clearValidators();
      }
      this.form.get('warehouse_id')!.updateValueAndValidity();
    });

    // Movimientos
    this.subs.push(
      this.movements.watchList().valueChanges.subscribe(({ data }: any) => {
        this.rows.set(data?.stock_movements ?? []);
      })
    );
    // Productos para selects
    this.subs.push(
      this.products.watchList(true).valueChanges.subscribe(({ data }: any) => {
        this.productsOpts.set(data?.products ?? []);
      })
    );
    // Bodegas para selects
    this.subs.push(
      this.warehouses.watchList(true).valueChanges.subscribe(({ data }: any) => {
        this.warehousesOpts.set(data?.warehouses ?? []);
      })
    );
  }

  // ==== Helpers UI
  typeLabel(t: MovementType) {
    return t === 'INBOUND' ? 'Entrada'
         : t === 'OUTBOUND' ? 'Salida'
         : t === 'TRANSFER' ? 'Transferencia'
         : 'Ajuste';
  }

  chipClass(t: MovementType) {
    return t === 'INBOUND' ? 'chip chip-green'
         : t === 'OUTBOUND' ? 'chip chip-red'
         : t === 'TRANSFER' ? 'chip chip-yellow'
         : 'chip chip-gray';
  }

  openCreate() {
    // operador y admin pueden abrir
    if (this.auth.role() === 'public') return;
    this.editingId.set(null);
    this.form.reset({
      type: 'INBOUND',
      product_id: null,
      warehouse_id: null,
      quantity: 1,
      reason: ''
    });
    this.isFormOpen.set(true);
  }

  openEdit(row: Movement) {
    if (!this.isAdmin()) return;
    this.editingId.set(row.id);
    this.form.reset({
      type: row.type,
      product_id: row.product_id,
      warehouse_id: row.warehouse_id ?? null,
      quantity: row.quantity,
      reason: row.reason ?? ''
    });
    this.isFormOpen.set(true);
  }

  closeForm() { this.isFormOpen.set(false); }

  async submitForm() {
    if (this.form.invalid) return;

    const payload = this.form.value as {
      type: MovementType; product_id: string; warehouse_id: string | null; quantity: number; reason: string | null;
    };

    // Validaciones mínimas pedidas: reason obligatorio si ADJUSTMENT
    if (payload.type === 'ADJUSTMENT' && !payload.reason) {
      alert('La razón es obligatoria para los Ajustes.');
      return;
    }

    // Construir objeto para mutation
    const obj = {
      type: payload.type,
      product_id: payload.product_id,
      warehouse_id: payload.warehouse_id, // si tu TRANSFER usa dos campos, ver notas más abajo
      quantity: Number(payload.quantity),
      reason: payload.reason || null,
      active: true,
      user_id: this.auth.user()?.id ?? '00000000-0000-0000-0000-000000000000', // si manejas id en auth mock
    };

    if (!this.editingId()) {
      // CREATE (operator/admin)
      await firstValueFrom(this.movements.insert(obj));
    } else {
      // UPDATE (solo admin)
      if (!this.isAdmin()) return;
      await firstValueFrom(this.movements.update(this.editingId()!, {
        type: obj.type,
        product_id: obj.product_id,
        warehouse_id: obj.warehouse_id,
        quantity: obj.quantity,
        reason: obj.reason,
      }));
    }

    this.closeForm();
  }

  // Acciones admin
  askDeactivate(row: Movement) {
    this.openConfirm('Desactivar movimiento', 'Se mantendrá para trazabilidad (active=false).', async () => {
      await firstValueFrom(this.movements.deactivate(row.id));
    });
  }
  askDelete(row: Movement) {
    this.openConfirm('Eliminar movimiento', 'Eliminar puede afectar la trazabilidad. ¿Seguro?', async () => {
      await firstValueFrom(this.movements.delete(row.id));
    });
  }

  goNuevoIngreso() {
    this.router.navigate(['/app/nuevo-ingreso']);
  }
}