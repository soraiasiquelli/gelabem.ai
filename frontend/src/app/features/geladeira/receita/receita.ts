import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeladeiraService, Receita as ReceitaModel } from '../../../services/geladeira.service';
import { LoginService } from '../../../services/auth/login.service';

@Component({
  selector: 'app-receita',
  imports: [],
  templateUrl: './receita.html',
  styleUrl: './receita.css',
})
export class Receita {

  tipo = 'geladeira'
  carregando = true
  erro = ''
  receita?: ReceitaModel

  constructor(
    private geladeiraService: GeladeiraService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.tipo = this.route.snapshot.paramMap.get('armazenamento') || 'geladeira'

    const itensParam = this.route.snapshot.queryParamMap.get('itens')
    const itemIds = itensParam
      ? itensParam.split(',').map(Number).filter(id => !Number.isNaN(id))
      : []

    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (!usuario) {
      this.erro = 'Faça login para gerar uma receita.'
      this.carregando = false
      return
    }

    if (itemIds.length) {
      this.buscarReceita(usuario.id, undefined, itemIds)
      return
    }

    this.loginService.getArmazenamentos(usuario.id).subscribe({
      next: (locais) => {
        const local = locais.find(l => l.nome === this.tipo)
        this.buscarReceita(usuario.id, local?.id)
      },
      error: () => this.buscarReceita(usuario.id)
    })
  }

  private buscarReceita(usuarioId: number, localId?: number, itemIds?: number[]) {
    this.geladeiraService.gerarReceita(usuarioId, localId, itemIds).subscribe({
      next: (res) => {
        this.receita = res.receita
        this.carregando = false
        this.cdr.markForCheck()
      },
      error: (err) => {
        this.erro = err?.error?.error || 'Erro ao gerar a receita. Tente novamente.'
        this.carregando = false
        this.cdr.markForCheck()
      }
    })
  }

  goBack() {
    this.router.navigate(['/armazenamento', this.tipo])
  }
}
