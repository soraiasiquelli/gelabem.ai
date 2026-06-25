import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-planos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planos.html',
  styleUrl: './planos.css',
})
export class Planos {

  // plano do usuário logado — busque do localStorage ou do backend
  planoAtual: 'free' | 'pro' | 'premium' = 'free'

  anual = false

  // controla o modal de upgrade (chame mostrarModal = true quando atingir limite)
  mostrarModal = false

  constructor(private router: Router) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
    if (usuario?.plano) this.planoAtual = usuario.plano
  }

  goBack() {
    this.router.navigate(['/home'])
  }

  assinar(plano: 'pro' | 'premium') {
    // Redireciona para o link de pagamento da Kiwify
    const links: Record<string, string> = {
      pro: 'https://pay.kiwify.com.br/VGlke5m',
      premium: 'https://pay.kiwify.com.br/nIuqUiG',
    }
    window.open(links[plano], '_blank')
  }

  fecharModal() {
    this.mostrarModal = false
  }

  abrirModal() {
    this.mostrarModal = true
  }
}