import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../services/auth/login.service';

@Component({
  selector: 'app-escolher-armazenamento',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './escolher-armazenamento.html',
  styleUrl: './escolher-armazenamento.css',
})
export class EscolherArmazenamento {

  selecionados: string[] = ['geladeira']

  constructor(private router: Router, private loginService: LoginService) {}

  toggleCard(id: string) {
    const index = this.selecionados.indexOf(id)
    if (index === -1) {
      this.selecionados.push(id)
    } else {
      if (this.selecionados.length > 1) {
        this.selecionados.splice(index, 1)
      }
    }
  }

  continuar() {
    localStorage.setItem('armazenamentos', JSON.stringify(this.selecionados))

    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

    if (!usuario) {
      this.router.navigate(['/home'])
      return
    }

    this.loginService.salvarArmazenamentos(usuario.id, this.selecionados).subscribe({
      next: () => {
        this.router.navigate(['/home'])
      },
      error: (err) => {
        console.log('Erro ao salvar armazenamentos:', err)
        if (err.status === 404) {
          localStorage.removeItem('usuario')
          this.router.navigate(['/login'])
          return
        }
        this.router.navigate(['/home'])
      }
    })
  }
}