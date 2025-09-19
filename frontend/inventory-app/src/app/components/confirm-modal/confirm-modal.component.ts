//En caso ed que el admin quiera borrar algun regitro de alguna tabla
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-confirm-modal',
  imports: [CommonModule],
  template: `
  <div class="modal-backdrop" *ngIf="open"></div>
  <div class="modal" *ngIf="open">
    <div class="modal-card">
      <div class="modal-head">
        <div class="icon">⚠️</div>
        <div>
          <h3 class="title">{{ title || 'Confirmar acción' }}</h3>
          <p class="subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <div class="modal-body">
        <ng-content></ng-content>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn outline" (click)="cancel.emit()">Cancelar</button>
        <button type="button" class="btn danger" (click)="confirm.emit()">Sí, continuar</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:40}
  .modal{position:fixed;inset:0;display:grid;place-items:center;z-index:50;padding:16px}
  .modal-card{width:100%;max-width:520px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 15px 40px rgba(0,0,0,.15);padding:16px}
  .modal-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:8px}
  .icon{width:36px;height:36px;border-radius:10px;background:#fee2e2;display:grid;place-items:center}
  .title{margin:0;font-size:18px;font-weight:700;color:#111827}
  .subtitle{margin:2px 0 0;font-size:13px;color:#6b7280}
  .modal-body{font-size:14px;color:#374151}
  .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}
  .btn{height:36px;padding:0 12px;border-radius:10px;font-size:14px;border:1px solid #e5e7eb;background:#fff}
  .btn.outline{background:#fff}
  .btn.danger{background:#ef4444;color:#fff;border-color:#ef4444}
  `]
})
export class ConfirmModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
