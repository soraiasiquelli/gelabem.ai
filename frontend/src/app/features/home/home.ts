import { ChangeDetectorRef, Component } from '@angular/core';
import { GeladeiraService, ItemVencendo, Receita } from '../../services/geladeira.service';
import { LoginService } from '../../services/auth/login.service';
import { ListaComprasService } from '../../services/lista-compras.service';
import { FeedbackService } from '../../services/feedback.service';
import { quandoVence } from '../../utils/validade';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from "@angular/router";
import { Observable, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { TPipe } from '../../i18n/t.pipe';
import { tr } from '../../i18n/i18n.service';

const TIPOS_DISPONIVEIS = [
  { nome: 'geladeira', label: 'Geladeira', icone: '🧊', desc: 'Frescos' },
  { nome: 'freezer', label: 'Freezer', icone: '❄️', desc: 'Congelados' },
  { nome: 'despensa', label: 'Despensa', icone: '🏺', desc: 'Secos e enlatados' },
  { nome: 'frigobar', label: 'Frigobar', icone: '🧃', desc: 'Bebidas e petiscos' },
]

/** o anel conta até 7 dias; passou disso, o alimento nem entra em "vence em breve" */
const JANELA_ANEL_DIAS = 7
const RAIO_ANEL = 26
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * RAIO_ANEL

export interface AnelValidade {
  /** comprimento do arco preenchido (stroke-dasharray) */
  arco: number
  circunferencia: number
  cor: string
  numero: string
  descricao: string
}

@Component({
  selector: 'app-home',
  imports: [TPipe, AsyncPipe, RouterLink],
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

  /** vencidos ou que vencem nos próximos dias, do que vence primeiro ao último */
  itensVencendo: ItemVencendo[] = []
  readonly maxVencendoVisiveis = 6
  quandoVence = quandoVence

  sugestoes: Receita[] = []
  carregandoSugestoes = true
  erroSugestoes = ''

  totalListaCompras = 0

  fecharAlerta() {
    this.itensAcabando = []
  }

  private api = environment.apiUrl
  private usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  get primeiroNome(): string {
    const nome = this.usuario?.nome || ''
    return nome.split(' ')[0] || tr('por aí')
  }

  get inicial(): string {
    return (this.usuario?.nome || '?').trim().charAt(0).toUpperCase()
  }

  get vencendoVisiveis(): ItemVencendo[] {
    return this.itensVencendo.slice(0, this.maxVencendoVisiveis)
  }

  constructor(
    private geladeiraService: GeladeiraService,
    private loginService: LoginService,
    private listaComprasService: ListaComprasService,
    private feedbackService: FeedbackService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    this.carregarLocais()
    this.carregarItensVencendo()
    this.carregarItensAcabando()
    this.carregarSugestoes()
    this.carregarListaCompras()
  }

  sugerirMelhoria() {
    this.feedbackService.abrir()
  }

  /**
   * Anel de contagem regressiva: o arco é o tempo que ainda resta (esvazia conforme a validade chega).
   * Já vencido ou vencendo hoje, o anel fica cheio e vermelho: é o único estado que grita.
   */
  anel(item: ItemVencendo): AnelValidade {
    const dias = item.dias_restantes
    const urgente = dias <= 0
    const fracao = urgente ? 1 : Math.max(0.1, Math.min(1, dias / JANELA_ANEL_DIAS))

    return {
      arco: CIRCUNFERENCIA_ANEL * fracao,
      circunferencia: CIRCUNFERENCIA_ANEL,
      cor: urgente ? 'var(--erro)' : 'var(--ambar)',
      numero: dias < 0 ? '!' : String(dias),
      descricao: tr('{nome} vence {quando}', { nome: item.nome, quando: this.quandoVence(item.data_validade) })
    }
  }

  carregarItensVencendo() {
    if (!this.usuario) return

    this.geladeiraService.getItensVencendoBD().subscribe({
      next: (itens) => {
        this.itensVencendo = itens
        this.cdr.markForCheck()
      },
      error: (err) => {
        console.error('Erro ao buscar itens que vencem em breve:', err)
      }
    })
  }

  carregarItensAcabando() {
    if (!this.usuario) return

    this.http.get<any[]>(`${this.api}/itens-acabando/${this.usuario.id}`)
      .subscribe({
        next: (itens) => {
          this.itensAcabando = itens
          this.cdr.markForCheck()
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

  carregarSugestoes() {
    if (!this.usuario) {
      this.carregandoSugestoes = false
      return
    }

    this.carregandoSugestoes = true
    this.erroSugestoes = ''

    this.geladeiraService.sugerirReceitas().subscribe({
      next: (res) => {
        this.sugestoes = (res.receitas || []).slice(0, 3)
        this.carregandoSugestoes = false
        this.cdr.markForCheck()
      },
      error: (err) => {
        // 404 = cozinha vazia ainda, não é bem um erro, é um estado esperado
        this.erroSugestoes = err.status === 404 ? '' : tr('Não conseguimos buscar sugestões agora.')
        this.sugestoes = []
        this.carregandoSugestoes = false
        this.cdr.markForCheck()
      }
    })
  }

  carregarListaCompras() {
    this.listaComprasService.getItensBD().subscribe({
      next: (itens) => {
        this.totalListaCompras = itens.filter(i => !i.comprado).length
        this.cdr.markForCheck()
      },
      error: () => {}
    })
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
