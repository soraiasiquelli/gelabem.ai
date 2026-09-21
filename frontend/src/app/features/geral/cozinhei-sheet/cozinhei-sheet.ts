import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { GeladeiraService, Receita } from '../../../services/geladeira.service';
import { ListaComprasService } from '../../../services/lista-compras.service';
import { Item } from '../../../models/item.model';
import { encontrarNoEstoque, passoDaUnidade, unidadeContavel } from '../../../utils/itens';
import { TPipe } from '../../../i18n/t.pipe';

interface IngredienteNoEstoque {
  ingrediente: string
  nome: string
  unidade: string
  total: number
  /** linhas do estoque com esse alimento, do que vence primeiro ao último */
  linhas: Item[]
  marcado: boolean
  usar: number
  passo: number
}

type Estado = 'carregando' | 'confirmar' | 'salvando' | 'pronto' | 'erro'

/**
 * "Cozinhei essa": cruza os ingredientes da receita com o estoque e deixa o usuário
 * confirmar quanto usou de cada um antes de dar baixa (a IA não diz as quantidades,
 * então nada é descontado sem confirmação).
 */
@Component({
  selector: 'app-cozinhei-sheet',
  imports: [TPipe, FormsModule],
  templateUrl: './cozinhei-sheet.html',
  styleUrl: './cozinhei-sheet.css',
})
export class CozinheiSheet implements OnInit {

  @Input({ required: true }) receita!: Receita

  @Output() fechar = new EventEmitter<void>()

  estado: Estado = 'carregando'
  ingredientes: IngredienteNoEstoque[] = []
  semEstoque: string[] = []

  /** o que acabou de vez com a baixa (candidatos à lista de compras) */
  acabaram: IngredienteNoEstoque[] = []
  adicionadosNaLista = false
  salvandoLista = false

  constructor(
    private geladeiraService: GeladeiraService,
    private listaComprasService: ListaComprasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.geladeiraService.getItensBD().subscribe({
      next: (itens) => {
        this.montar(itens)
        this.estado = 'confirmar'
        this.cdr.markForCheck()
      },
      error: () => {
        this.estado = 'erro'
        this.cdr.markForCheck()
      }
    })
  }

  @HostListener('document:keydown.escape')
  aoApertarEsc() {
    this.fechar.emit()
  }

  get marcados(): number {
    return this.ingredientes.filter(i => i.marcado).length
  }

  get temNaoContavel(): boolean {
    return this.ingredientes.some(i => !unidadeContavel(i.unidade))
  }

  private montar(itens: Item[]) {
    const jaIncluidos = new Set<string>()

    for (const ingrediente of this.receita.ingredientesUsados ?? []) {
      const encontrados = encontrarNoEstoque(ingrediente, itens)
      if (!encontrados.length) {
        this.semEstoque.push(ingrediente)
        continue
      }

      // linhas do mesmo alimento em unidades diferentes (1 kg + 500 g) não se somam
      const unidade = encontrados[0].unidade
      const linhas = encontrados.filter(item => item.unidade === unidade)
      const nome = linhas[0].nome
      const chave = nome.trim().toLowerCase()

      // dois ingredientes ("frango" e "peito de frango") podem cair no mesmo item
      if (jaIncluidos.has(chave)) continue
      jaIncluidos.add(chave)

      const total = linhas.reduce((soma, linha) => soma + linha.quantidade, 0)
      const passo = passoDaUnidade(unidade)

      this.ingredientes.push({
        ingrediente,
        nome,
        unidade,
        total,
        linhas,
        // contáveis (2 ovos, 1 cebola) vêm marcados; peso/volume não, porque não dá pra saber quanto foi
        marcado: unidadeContavel(unidade),
        usar: Math.min(passo, total),
        passo
      })
    }
  }

  alterarUso(item: IngredienteNoEstoque, direcao: 1 | -1) {
    const minimo = Math.min(item.passo, item.total)
    item.usar = Math.max(minimo, Math.min(item.total, item.usar + direcao * item.passo))
  }

  /** tira `usar` do que vence primeiro e, se não bastar, da próxima linha */
  private baixas(item: IngredienteNoEstoque) {
    let restante = item.usar
    const baixas: { id: number, delta: number }[] = []

    for (const linha of item.linhas) {
      if (restante <= 0) break
      const tirar = Math.min(linha.quantidade, restante)
      baixas.push({ id: linha.id, delta: -tirar })
      restante -= tirar
    }
    return baixas
  }

  confirmar() {
    const escolhidos = this.ingredientes.filter(i => i.marcado)
    if (!escolhidos.length || this.estado === 'salvando') return

    this.estado = 'salvando'

    const requisicoes = escolhidos
      .flatMap(item => this.baixas(item))
      .map(baixa => this.geladeiraService.ajustarQuantidadeBD(baixa.id, baixa.delta))

    forkJoin(requisicoes).subscribe({
      next: () => {
        this.acabaram = escolhidos.filter(item => item.usar >= item.total)
        this.estado = 'pronto'
        this.cdr.markForCheck()
      },
      error: () => {
        // parte das baixas pode ter passado (ou o item mudou em outro aparelho): recomeça do estoque real
        this.ingredientes = []
        this.semEstoque = []
        this.estado = 'carregando'
        this.ngOnInit()
      }
    })
  }

  adicionarAcabaramNaLista() {
    if (this.salvandoLista || !this.acabaram.length) return
    this.salvandoLista = true

    forkJoin(this.acabaram.map(item => this.listaComprasService.addItemBD({
      nome: item.nome,
      quantidade: item.linhas[0].quantidade_minima || 1,
      unidade: item.unidade
    }))).subscribe({
      next: () => {
        this.adicionadosNaLista = true
        this.salvandoLista = false
        this.cdr.markForCheck()
      },
      error: () => {
        this.salvandoLista = false
        this.cdr.markForCheck()
      }
    })
  }
}
