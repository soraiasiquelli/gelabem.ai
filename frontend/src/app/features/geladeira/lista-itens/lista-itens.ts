import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { GeladeiraService } from '../../../services/geladeira.service'
import { ListaComprasService } from '../../../services/lista-compras.service';
import { ItemCard } from '../item-card/item-card';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, combineLatest, forkJoin, map } from 'rxjs';
import { Item } from '../../../models/item.model';
import { ordenarPorValidade, passoDaUnidade } from '../../../utils/itens';

function agruparPorNome(itens: Item[]): Item[] {
  const grupos = new Map<string, Item>()

  for (const item of itens) {
    const chave = item.nome.trim().toLowerCase()
    const existente = grupos.get(chave)

    if (existente) {
      existente.quantidade += item.quantidade
      existente.ids!.push(item.id)
      existente.linhas!.push(item)
      // o grupo mostra a validade que chega primeiro
      if (item.data_validade && (!existente.data_validade || item.data_validade < existente.data_validade)) {
        existente.data_validade = item.data_validade
      }
    } else {
      grupos.set(chave, { ...item, ids: [item.id], linhas: [item] })
    }
  }

  const agrupados = Array.from(grupos.values())
  // dentro do grupo, o que vence primeiro é o primeiro a ser consumido
  agrupados.forEach(grupo => grupo.linhas = ordenarPorValidade(grupo.linhas!))
  return agrupados
}

function iconePorCategoria(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('fruta')) return '🍎'
  if (n.includes('verdura') || n.includes('legume') || n.includes('hortifruti')) return '🥬'
  if (n.includes('carne') || n.includes('frango') || n.includes('peixe') || n.includes('proteína')) return '🥩'
  if (n.includes('latic')) return '🥛'
  if (n.includes('grão') || n.includes('grao') || n.includes('cereal') || n.includes('massa')) return '🌾'
  if (n.includes('bebida')) return '🧃'
  if (n.includes('congel')) return '❄️'
  if (n.includes('tempero') || n.includes('condiment') || n.includes('molho')) return '🧂'
  if (n.includes('pão') || n.includes('pao') || n.includes('padaria')) return '🍞'
  return '🍽️'
}

export interface GrupoItens {
  nome: string
  icone: string
  itens: Item[]
}

@Component({
  selector: 'app-lista-itens',
  imports: [ItemCard, AsyncPipe],
  templateUrl: './lista-itens.html',
  styleUrl: './lista-itens.css',
})
export class ListaItens implements OnDestroy {
  grupos$!: Observable<GrupoItens[]>;

  /** itens como vêm do servidor; baixas e remoções atualizam isso direto, sem buscar a lista de novo */
  private itensBrutos$ = new BehaviorSubject<Item[]>([])
  private carregamento?: Subscription

  private _localId?: number
  private categoriaIdSubject = new BehaviorSubject<number | undefined>(undefined)
  private categoriasSubject = new BehaviorSubject<{ id: number, nome: string }[]>([])

  /** aviso temporário no rodapé (ex.: "Leite acabou" com atalho pra lista de compras) */
  aviso: { texto: string, item?: Item } | null = null
  private timerAviso?: ReturnType<typeof setTimeout>

  @Input()
  modoSelecao = false

  @Input()
  selecionados: Set<number> = new Set()

  /** Nomes das categorias (id → nome) usados só pra agrupar visualmente quando "Todos" está selecionado */
  @Input()
  set categorias(valor: { id: number, nome: string }[]) {
    this.categoriasSubject.next(valor ?? [])
  }

  @Output()
  selecionarItem = new EventEmitter<Item>()

  @Input()
  set localId(value: number | undefined) {
    this._localId = value
    this.carregarItens()
  }
  get localId(): number | undefined {
    return this._localId
  }

  @Input()
  set categoriaId(value: number | undefined) {
    this.categoriaIdSubject.next(value)
  }

  constructor(
    private geladeiraService: GeladeiraService,
    private listaComprasService: ListaComprasService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ){
    this.grupos$ = combineLatest([this.itensBrutos$, this.categoriaIdSubject, this.categoriasSubject]).pipe(
      map(([itens, categoriaId, categorias]) => {
        const filtrados = categoriaId
          ? itens.filter(item => item.categoria_id === categoriaId)
          : itens
        const agrupados = agruparPorNome(filtrados)

        // com um filtro de categoria já ativo (chip clicado), não faz sentido repetir o cabeçalho
        if (categoriaId) {
          return agrupados.length ? [{ nome: '', icone: '', itens: agrupados }] : []
        }
        return this.agruparPorCategoria(agrupados, categorias)
      })
    )

    this.carregarItens()
  }

  ngOnDestroy() {
    clearTimeout(this.timerAviso)
    this.carregamento?.unsubscribe()
  }

  carregarItens() {
    this.carregamento?.unsubscribe()

    if (this._localId === undefined) {
      this.itensBrutos$.next([])
      return
    }

    this.carregamento = this.geladeiraService.getItensBD(this._localId).subscribe({
      next: (itens) => this.itensBrutos$.next(itens),
      error: (err) => console.error('Erro ao carregar itens:', err)
    })
  }

  private agruparPorCategoria(itens: Item[], categorias: { id: number, nome: string }[]): GrupoItens[] {
    const nomePorId = new Map(categorias.map(c => [c.id, c.nome]))
    const grupos = new Map<string, GrupoItens>()

    for (const item of itens) {
      const nome = (item.categoria_id && nomePorId.get(item.categoria_id)) || 'Outros'
      if (!grupos.has(nome)) {
        grupos.set(nome, { nome, icone: iconePorCategoria(nome), itens: [] })
      }
      grupos.get(nome)!.itens.push(item)
    }

    return Array.from(grupos.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  editarItem(item: Item) {
    const id = item.ids?.[0] ?? item.id
    const tipo = this.route.snapshot.paramMap.get('tipo') || 'geladeira'
    this.router.navigate(['/armazenamento', tipo, 'editar', id])
  }

  removerItem(item: Item) {
    if (!item.ids?.length) return

    const remocoes = item.ids.map((id: number) => this.geladeiraService.removeItem(id))

    forkJoin(remocoes).subscribe(() => {
      const removidos = new Set(item.ids)
      this.itensBrutos$.next(this.itensBrutos$.value.filter(i => !removidos.has(i.id)))
    });
  }

  /** "Usei um": a baixa sai da unidade que vence primeiro (o mais antigo é o primeiro a ser usado) */
  consumirItem(item: Item) {
    const linha = item.linhas?.[0] ?? item
    this.ajustarQuantidade(linha, -passoDaUnidade(linha.unidade), item)
  }

  /** Comprei mais: entra na unidade que vence por último */
  reporItem(item: Item) {
    const linhas = item.linhas?.length ? item.linhas : [item]
    const linha = linhas[linhas.length - 1]
    this.ajustarQuantidade(linha, passoDaUnidade(linha.unidade), item)
  }

  private ajustarQuantidade(linha: Item, delta: number, grupo: Item) {
    this.geladeiraService.ajustarQuantidadeBD(linha.id, delta).subscribe({
      next: ({ removido, item }) => {
        const atuais = this.itensBrutos$.value
        this.itensBrutos$.next(
          removido
            ? atuais.filter(i => i.id !== linha.id)
            : atuais.map(i => i.id === linha.id ? { ...i, quantidade: item.quantidade } : i)
        )

        // só "acabou" de verdade quando não sobrou nenhuma outra unidade do mesmo alimento
        if (removido && (grupo.linhas?.length ?? 1) <= 1) {
          this.mostrarAviso(`${grupo.nome} acabou.`, grupo)
        }
      },
      // 404 = já mudou em outro aparelho/morador; busca o estado real
      error: () => this.carregarItens()
    })
  }

  private mostrarAviso(texto: string, item?: Item) {
    clearTimeout(this.timerAviso)
    this.aviso = { texto, item }
    this.cdr.markForCheck()
    this.timerAviso = setTimeout(() => this.fecharAviso(), 7000)
  }

  fecharAviso() {
    clearTimeout(this.timerAviso)
    this.aviso = null
    this.cdr.markForCheck()
  }

  adicionarNaListaDeCompras() {
    const item = this.aviso?.item
    if (!item) return

    this.listaComprasService.addItemBD({
      nome: item.nome,
      quantidade: item.quantidade_minima || 1,
      unidade: item.unidade
    }).subscribe({
      next: () => this.mostrarAviso(`${item.nome} entrou na lista de compras ✓`),
      error: () => this.mostrarAviso('Não foi possível adicionar à lista agora.')
    })
  }

  isSelecionado(item: Item): boolean {
    const ids = item.ids?.length ? item.ids : [item.id]
    return ids.every(id => this.selecionados.has(id))
  }

}
