import { ChangeDetectorRef, Component } from '@angular/core';
import { GeladeiraService } from '../../services/geladeira.service';
import { LoginService } from '../../services/auth/login.service';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from "@angular/router";
import { Observable, map, of, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http'; // ← adiciona

const TIPOS_DISPONIVEIS = [
  { nome: 'geladeira', label: 'Geladeira', icone: '🧊' },
  { nome: 'freezer', label: 'Freezer', icone: '❄️' },
  { nome: 'despensa', label: 'Despensa', icone: '🏺' },
  { nome: 'frigobar', label: 'Frigobar', icone: '🧃' },
]

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

  totalItens$!: Observable<number>;
  locais$!: Observable<string[]>;

  tiposDisponiveis = TIPOS_DISPONIVEIS
  mostrarOpcoes = false
  salvando = false

  itensAcabando: any[] = []
  mostrarAlerta = true

  fecharAlerta() {
    this.itensAcabando = []
  }

  private api = 'http://localhost:3000' // ← ou sua URL de produção
  private usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  constructor(
    private geladeiraService: GeladeiraService,
    private loginService: LoginService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient // ← adiciona
  ) {
    this.carregarLocais()
    this.carregarItensAcabando() // ← adiciona
  }

  carregarItensAcabando() {
    if (!this.usuario) return

    this.http.get<any[]>(`${this.api}/itens-acabando/${this.usuario.id}`)
      .subscribe({
        next: (itens) => {
          this.itensAcabando = itens
        },
        error: (err) => {
          console.error('Erro ao buscar itens acabando:', err)
        }
      })
  }

  carregarLocais() {
    const locaisCompletos$ = this.usuario
      ? this.loginService.getArmazenamentos(this.usuario.id)
      : of([])

    this.locais$ = locaisCompletos$.pipe(
      map(locais => locais.map(local => local.nome))
    )

    this.totalItens$ = locaisCompletos$.pipe(
      switchMap(locais => {
        const geladeira = locais.find(local => local.nome === 'geladeira')
        return geladeira
          ? this.geladeiraService.getItensBD(geladeira.id).pipe(map(itens => itens.length))
          : of(0)
      })
    )
  }

  toggleOpcoes() {
    this.mostrarOpcoes = !this.mostrarOpcoes
  }

  adicionarTipo(nomesAtuais: string[], tipo: string) {
    if (!this.usuario || this.salvando) return

    this.salvando = true

    this.loginService.salvarArmazenamentos(this.usuario.id, [...nomesAtuais, tipo]).subscribe({
      next: () => {
        this.salvando = false
        this.mostrarOpcoes = false
        this.carregarLocais()
        this.cdr.markForCheck()
      },
      error: (err) => {
        console.log('Erro ao adicionar armazenamento:', err)
        this.salvando = false
        this.cdr.markForCheck()
      }
    })
  }
}