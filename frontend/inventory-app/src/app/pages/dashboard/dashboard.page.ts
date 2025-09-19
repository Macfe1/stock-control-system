import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-dashboard',
    imports: [CommonModule],
    templateUrl: './dashboard.page.html',
    styleUrls: ['./dashboard.page.css']
})
export class DashboardPage {
    // Datos expuestos al template:
    title = 'Dashboard';
    count = signal(0);
    doubled = computed(() => this.count() * 2);

    // Método que el template puede llamar:
    inc() { this.count.update(n => n + 1); }
}