import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormularioItem } from '../geladeira/formulario-item/formulario-item';

/**
 * Primeiro passo depois de criar a conta: a foto vem antes de qualquer configuração,
 * porque ver a IA identificando os alimentos é o que mostra o valor do app.
 */
@Component({
  selector: 'app-comecar',
  imports: [FormularioItem],
  templateUrl: './comecar.html',
  styleUrl: './comecar.css',
})
export class Comecar {

  itensSalvos = 0

  private usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  constructor(private router: Router) {}

  get primeiroNome(): string {
    return (this.usuario?.nome || '').split(' ')[0]
  }

  aoSalvar() {
    this.itensSalvos++
  }

  concluir() {
    this.router.navigate(['/home'])
  }
}
