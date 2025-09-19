import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import { ProductsService, Product } from '../../services/products.service';
import { WarehousesService, Warehouse } from '../../services/warehouses.service';
import { InventoryService, InventoryRow } from '../../services/inventory.service';
import { Subscription, firstValueFrom } from 'rxjs';

type TabKey = 'bodegas' | 'productos' | 'inventario';

@Component({
  standalone: true,
  selector: 'app-bodegas-productos',
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './bodegas-productos.page.html',
  styleUrls: ['./bodegas-productos.page.css'],
})
export class BodegasProductosPage implements OnInit, OnDestroy {
  constructor(
    public auth: AuthService,
    private products: ProductsService,
    private warehouses: WarehousesService,
    private inventory: InventoryService,
  ) {}

  // ---------------- Lifecycle ----------------
  private subs: Subscription[] = [];
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  ngOnInit() {
    // Productos
    this.subs.push(
      this.products.watchList(false).valueChanges.subscribe(({ data }) => {
        const list: Product[] = (data as any).products ?? [];
        this.productosVM.set(
          list.map(p => ({
            id: p.id,
            nombre: p.name,
            sku: p.sku,
            desc: p.description ?? null,
            unidad: p.unit,
            precio: this.formatCOP(Number(p.price ?? 0)),
            activo: !!p.active,
          }))
        );
      })
    );

    // Bodegas
    this.subs.push(
      this.warehouses.watchList(false).valueChanges.subscribe(({ data }) => {
        const list: Warehouse[] = (data as any).warehouses ?? [];
        this.bodegasVM.set(
          list.map(w => ({
            id: w.id,
            nombre: w.name,
            codigo: w.code,
            direccion: w.address ?? null,
            estado: w.active ? 'Activo' : 'Inactivo',
          }))
        );
      })
    );

    // Inventario
    this.subs.push(
      this.inventory.watchList().valueChanges.subscribe(({ data }) => {
        const list: InventoryRow[] = (data as any).inventory ?? [];
        this.inventarioVM.set(
          list.map(r => ({
            product_id: r.product_id,
            warehouse_id: r.warehouse_id,
            producto: r.product?.name ?? '',
            sku: r.product?.sku ?? '',
            bodega: r.warehouse?.name ?? '',
            codigo: r.warehouse?.code ?? '',
            cantidad: Number(r.quantity ?? 0),
          }))
        );
      })
    );
  }

  // ---------------- Estado base ----------------
  active = signal<TabKey>('bodegas');
  isAdmin = computed(() => this.auth.role() === 'admin');
  canSeeInventory = computed(() => this.auth.role() !== 'public');

  primaryLabel = computed(() =>
    this.active() === 'bodegas' ? '+ Nueva Bodega'
    : this.active() === 'productos' ? '+ Nuevo Producto'
    : this.isAdmin() ? '+ Nuevo (inventario)' : '+ Nuevo (bloqueado)'
  );

  // VMs (¡en el HTML se consumen con paréntesis: bodegasVM(), etc.!)
  bodegasVM = signal<Array<{ id:string; nombre:string; codigo:string; direccion:string|null; estado:string }>>([]);
  productosVM = signal<Array<{ id:string; nombre:string; sku:string; desc:string|null; unidad:string; precio:string; activo:boolean }>>([]);
  inventarioVM = signal<Array<{ product_id:string; warehouse_id:string; producto:string; sku:string; bodega:string; codigo:string; cantidad:number }>>([]);

  // ---------------- UI: menú ⋯ y modal confirm ----------------
  openMenuIndex = signal<number | null>(null);
  toggleRowMenu(i: number) {
    this.openMenuIndex.set(this.openMenuIndex() === i ? null : i);
  }

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

  // ---------------- Productos (CRUD + desactivar) ----------------
  private formatCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  async createProduct() {
    const sku  = prompt('SKU:'); if (!sku) return;
    const name = prompt('Nombre:'); if (!name) return;
    const description = prompt('Descripción (opcional):') || null;
    const unit = prompt('Unidad (ej: UND, g, ml):') || 'UND';
    const priceStr = prompt('Precio (número):'); if (!priceStr) return;
    const price = Number(priceStr);

    await firstValueFrom(this.products.insert({ sku, name, description, unit, price, active: true }));
    await this.products.refetchList();
  }

  async editProduct(i: number) {
    const vm = this.productosVM()[i]; if (!vm) return;
    const name = prompt('Nuevo nombre:', vm.nombre) ?? vm.nombre;
    const unit = prompt('Unidad:', vm.unidad) ?? vm.unidad;
    const price = Number((prompt('Precio:', vm.precio.replace(/[^\d]/g, '')) ?? '0').replace(/[^\d]/g, ''));

    await firstValueFrom(this.products.update(vm.id, { name, unit, price }));
    await this.products.refetchList();
  }

  askProductDeactivate(i: number) {
    const vm = this.productosVM()[i];
    this.openConfirm(
      'Desactivar producto',
      `El producto "${vm?.nombre}" quedará inactivo (active=false).`,
      async () => {
        await firstValueFrom(this.products.deactivate(vm!.id));
        await this.products.refetchList();
      }
    );
  }

  askProductDelete(i: number) {
    const vm = this.productosVM()[i];
    this.openConfirm(
      'Eliminar producto',
      'Se recomienda desactivar para conservar trazabilidad. ¿Eliminar de todas formas?',
      async () => {
        await firstValueFrom(this.products.delete(vm!.id));
        await this.products.refetchList();
      }
    );
  }

  // ---------------- Bodegas (CRUD + desactivar) ----------------
  async createWarehouse() {
    const code = prompt('Código:'); if (!code) return;
    const name = prompt('Nombre:'); if (!name) return;
    const address = prompt('Dirección (opcional):') || null;

    await firstValueFrom(this.warehouses.insert({ code, name, address, active: true }));
    await this.warehouses.refetchList();
  }

  async editWarehouse(i: number) {
    const vm = this.bodegasVM()[i]; if (!vm) return;
    const name = prompt('Nuevo nombre:', vm.nombre) ?? vm.nombre;
    const address = prompt('Dirección:', vm.direccion ?? '') ?? vm.direccion ?? '';

    await firstValueFrom(this.warehouses.update(vm.id, { name, address }));
    await this.warehouses.refetchList();
  }

  askWarehouseDeactivate(i: number) {
    const vm = this.bodegasVM()[i];
    this.openConfirm(
      'Desactivar bodega',
      `La bodega "${vm?.nombre}" quedará inactiva.`,
      async () => {
        await firstValueFrom(this.warehouses.deactivate(vm!.id));
        await this.warehouses.refetchList();
      }
    );
  }

  askWarehouseDelete(i: number) {
    const vm = this.bodegasVM()[i];
    this.openConfirm(
      'Eliminar bodega',
      'Se recomienda desactivar para conservar trazabilidad. ¿Eliminar de todas formas?',
      async () => {
        await firstValueFrom(this.warehouses.delete(vm!.id));
        await this.warehouses.refetchList();
      }
    );
  }

  // ---------------- Inventario (confirmado porque no es ideal tocarlo) ----------------
  askInventoryCreate() {
    this.openConfirm(
      'Crear/Upsert inventario (no recomendado)',
      'Lo ideal es hacerlo mediante Movimiento para mantener trazabilidad. ¿Continuar?',
      async () => {
        const product_id = prompt('product_id:'); if (!product_id) return;
        const warehouse_id = prompt('warehouse_id:'); if (!warehouse_id) return;
        const qty = Number(prompt('Cantidad:', '0') ?? 0);
        await firstValueFrom(this.inventory.upsert(product_id, warehouse_id, qty));
        // Si tienes watchList en inventory, se actualizará solo; si no, añade un refetch() en el service.
      }
    );
  }

  askInventoryUpdate(i: number) {
    const vm = this.inventarioVM()[i]; if (!vm) return;
    this.openConfirm(
      'Actualizar inventario (no recomendado)',
      `${vm.producto} @ ${vm.bodega}. ¿Continuar?`,
      async () => {
        const qty = Number(prompt('Nueva cantidad:', String(vm.cantidad)) ?? vm.cantidad);
        await firstValueFrom(this.inventory.update(vm.product_id, vm.warehouse_id, qty));
      }
    );
  }

  askInventoryDelete(i: number) {
    const vm = this.inventarioVM()[i]; if (!vm) return;
    this.openConfirm(
      'Eliminar inventario (no recomendado)',
      `${vm.producto} @ ${vm.bodega}. ¿Eliminar?`,
      async () => {
        await firstValueFrom(this.inventory.delete(vm.product_id, vm.warehouse_id));
      }
    );
  }

  // ---------------- Botón grande y tabs ----------------
  onPrimary() {
    if (this.active() === 'bodegas')   return this.createWarehouse();
    if (this.active() === 'productos') return this.createProduct();
    if (this.active() === 'inventario') {
      if (!this.isAdmin()) return;
      return this.askInventoryCreate();
    }
  }

  onTab(tab: TabKey) {
    if (tab === 'inventario' && !this.canSeeInventory()) return;
    this.active.set(tab);
    this.openMenuIndex.set(null);
  }
}
