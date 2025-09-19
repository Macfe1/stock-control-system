import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';

type MovementType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT';
type Action = 'update' | 'deactivate' | 'delete';

interface MovementRow {
  id: string;
  date: string;                 // ISO/visual para la tabla
  userId: string;
  userName: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  sku: string;
  type: MovementType;
  quantity: number;
  reason: string;
  active?: boolean;             // para “desactivar” (soft delete)
}

@Component({
  standalone: true,
  selector: 'app-movimientos',
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './movimientos.page.html',
  styleUrls: ['./movimientos.page.css'],
})
export class MovimientosPage {
  constructor(public auth: AuthService, private router: Router) {}

  isAdmin = computed(() => this.auth.role() === 'admin');

  // MOCK data (reemplazar por query a Hasura)
  rows = signal<MovementRow[]>([
    { id:'m1', date:'2025-10-02', userId:'u6', userName:'Andrés Ramírez', productId:'p1', productName:'Café Molido Tradicional', warehouseId:'w1', warehouseName:'Cajicá G412', sku:'KS7350TUS', type:'INBOUND',  quantity:486, reason:'Reposición', active:true },
    { id:'m2', date:'2025-10-02', userId:'u6', userName:'Andrés Ramírez', productId:'p2', productName:'Detergente Multiusos',    warehouseId:'w1', warehouseName:'Cajicá G412', sku:'GT3791PER', type:'OUTBOUND', quantity:30,  reason:'Salida a tienda', active:true },
    { id:'m3', date:'2025-10-02', userId:'u6', userName:'Andrés Ramírez', productId:'p2', productName:'Detergente Multiusos',    warehouseId:'w2', warehouseName:'Bogotá J321', sku:'GT3791PER', type:'TRANSFER', quantity:18,  reason:'Traslado', active:true },
    { id:'m4', date:'2025-10-02', userId:'u6', userName:'Andrés Ramírez', productId:'p1', productName:'Café Molido Tradicional', warehouseId:'w1', warehouseName:'Cajicá G412', sku:'KS7350TUS', type:'ADJUSTMENT', quantity:2,   reason:'Ajuste inventario', active:true },
    { id:'m5', date:'2025-10-02', userId:'u6', userName:'Andrés Ramírez', productId:'p1', productName:'Café Molido Tradicional', warehouseId:'w1', warehouseName:'Cajicá G412', sku:'KS7350TUS', type:'INBOUND',  quantity:120, reason:'Reposición', active:true },
  ]);

  // KPIs
  total   = computed(() => this.rows().length);
  totalIn = computed(() => this.rows().filter(r => r.type==='INBOUND').length);
  totalOut= computed(() => this.rows().filter(r => r.type==='OUTBOUND').length);
  totalTr = computed(() => this.rows().filter(r => r.type==='TRANSFER').length);

  // Menú ⋯
  openMenuIndex = signal<number | null>(null);
  toggleRowMenu(i: number) {
    this.openMenuIndex.set(this.openMenuIndex() === i ? null : i);
  }

  // ===== Modal de confirmación (reutilizable) =====
  confirmOpen = signal(false);
  confirmAction = signal<Action | null>(null);
  confirmRowId = signal<string | null>(null);
  confirmTitle = signal('Confirmar acción');
  confirmSubtitle = signal('Esta operación afecta la trazabilidad.');

  openConfirm(action: Action, rowId: string) {
    if (!this.isAdmin()) return;
    this.confirmAction.set(action);
    this.confirmRowId.set(rowId);

    if (action === 'update') {
      this.confirmTitle.set('Editar movimiento');
      this.confirmSubtitle.set('Evita editar movimientos históricos salvo que sea estrictamente necesario.');
    } else if (action === 'deactivate') {
      this.confirmTitle.set('Desactivar movimiento');
      this.confirmSubtitle.set('El movimiento quedará inactivo (active=false) para conservar la trazabilidad.');
    } else {
      this.confirmTitle.set('Eliminar movimiento');
      this.confirmSubtitle.set('Eliminar un movimiento puede romper la trazabilidad. Considera desactivarlo.');
    }

    this.confirmOpen.set(true);
    this.openMenuIndex.set(null);
  }
  closeConfirm() {
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
    this.confirmRowId.set(null);
  }
  confirmProceed() {
    const action = this.confirmAction();
    const id = this.confirmRowId();
    if (!action || !id) return;

    // TODO: sustituir por mutations a Hasura
    if (action === 'deactivate') {
      const list = this.rows().map(r => r.id === id ? { ...r, active: false } : r);
      this.rows.set(list);
      console.log('[MOVIMIENTOS] deactivate (soft delete)', id);
      alert(`(Demo) Movimiento desactivado: ${id}`);
    } else if (action === 'delete') {
      const list = this.rows().filter(r => r.id !== id);
      this.rows.set(list);
      console.log('[MOVIMIENTOS] delete (hard delete)', id);
      alert(`(Demo) Movimiento eliminado: ${id}`);
    } else {
      console.log('[MOVIMIENTOS] update', id);
      alert(`(Demo) Editar movimiento: ${id}`);
    }

    this.closeConfirm();
  }
  // ================================================

  goNuevoIngreso() {
    this.router.navigate(['/app/nuevo-ingreso']);
  }

  // Helpers UI
  typeLabel(t: MovementType) {
    return t === 'INBOUND' ? 'Entrada'
         : t === 'OUTBOUND' ? 'Salida'
         : t === 'TRANSFER' ? 'Transferencia'
         : 'Ajuste';
  }
}
