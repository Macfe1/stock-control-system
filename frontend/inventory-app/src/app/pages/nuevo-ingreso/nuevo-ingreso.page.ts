import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';

type MovementType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT';

const MOVEMENT_OPTIONS: Array<{ label: string; value: MovementType }> = [
    { label: 'Entrada', value: 'INBOUND' },
    { label: 'Salida', value: 'OUTBOUND' },
    { label: 'Transferencia', value: 'TRANSFER' },
    { label: 'Ajuste', value: 'ADJUSTMENT' },
];

@Component({
    standalone: true,
    selector: 'app-nuevo-ingreso',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './nuevo-ingreso.page.html',
    styleUrls: ['./nuevo-ingreso.page.css'],
})
export class NuevoIngresoPage {
    form: FormGroup;
    movementOptions = MOVEMENT_OPTIONS;

    // demo: reemplaza por datos reales (Hasura) cuando conectes
    bodegas = [
        { id: 'bod-1', nombre: 'Bodega Central' },
        { id: 'bod-2', nombre: 'Bodega Norte' },
    ];

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            sku: [''],
            cantidad: [null, [Validators.min(1)]],
            // 👇 valor real que enviarás a Hasura
            tipo: this.fb.control<MovementType>('INBOUND', { nonNullable: true }),
            bodegaOrigen: [null, Validators.required],
            bodegaDestino: [null],
            razon: [''],
        });
    }

    submit() {
        if (this.form.invalid) return;
        const payload = this.form.value as {
            sku: string;
            cantidad: number | null;
            tipo: MovementType;
            bodegaOrigen: string | null;
            bodegaDestino: string | null;
            razon: string;
        };
        console.log('payload listo para Hasura:', payload);
        // TODO: aquí harás la mutation a Hasura.
    }
}
