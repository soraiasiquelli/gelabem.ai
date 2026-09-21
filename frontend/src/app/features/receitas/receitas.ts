import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { FiltrosReceita, GeladeiraService, Receita } from '../../services/geladeira.service';
import { ListaComprasService } from '../../services/lista-compras.service';
import { CozinheiSheet } from '../geral/cozinhei-sheet/cozinhei-sheet';
import { TPipe } from '../../i18n/t.pipe';
import { tr } from '../../i18n/i18n.service';

const FILTROS_TEMPO: { valor: FiltrosReceita['tempo'], label: string }[] = [
  { valor: 'ate15', label: 'Até 15 min' },
  { valor: 'ate30', label: 'Até 30 min' },
  { valor: 'mais30', label: 'Mais de 30 min' },
]

const FILTROS_OBJETIVO: { valor: FiltrosReceita['objetivo'], label: string }[] = [
  { valor: 'economico', label: '💸 Econômico' },
  { valor: 'rapido', label: '⚡ Rápido' },
  { valor: 'facil', label: '🙂 Fácil' },
  { valor: 'proteina', label: '💪 Mais proteína' },
  { valor: 'aproveitar', label: '♻️ Aproveitar o que tenho' },
]

@Component({
  selector: 'app-receitas',
  imports: [TPipe, CozinheiSheet],
  templateUrl: './receitas.html',
  styleUrl: './receitas.css',
})
export class Receitas {

  filtrosTempo = FILTROS_TEMPO
  filtrosObjetivo = FILTROS_OBJETIVO

  tempoSelecionado?: FiltrosReceita['tempo']
  objetivoSelecionado?: FiltrosReceita['objetivo']

  ingredientesDisponiveis: string[] = []
  ingredientesPriorizados = new Set<string>()

  receitas: Receita[] = []
  carregando = true
  erro = ''
  expandido: number | null = null
  adicionadosNaLista = new Set<string>()

  /** receita aberta no painel "Cozinhei essa" */
  receitaCozinhando?: Receita

  constructor(
    private geladeiraService: GeladeiraService,
    private listaComprasService: ListaComprasService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.carregarIngredientes()
    this.buscar()
  }

  private carregarIngredientes() {
    this.geladeiraService.getItensBD().subscribe({
      next: (itens) => {
        const nomes = new Set(itens.map(i => i.nome.trim()))
        this.ingredientesDisponiveis = Array.from(nomes).slice(0, 10)
        this.cdr.markForCheck()
      },
      error: () => {}
    })
  }

  buscar() {
    this.carregando = true
    this.erro = ''
    this.expandido = null

    this.geladeiraService.sugerirReceitas({
      tempo: this.tempoSelecionado,
      objetivo: this.objetivoSelecionado,
      priorizar: Array.from(this.ingredientesPriorizados)
    }).subscribe({
      next: (res) => {
        this.receitas = res.receitas || []
        this.carregando = false
        this.cdr.markForCheck()
      },
      error: (err) => {
        this.receitas = []
        this.erro = err.status === 404
          ? (err.error?.error || tr('Adicione alimentos na sua cozinha pra receber sugestões.'))
          : tr('Não conseguimos buscar receitas agora. Tente de novo em instantes.')
        this.carregando = false
        this.cdr.markForCheck()
      }
    })
  }

  toggleTempo(valor: FiltrosReceita['tempo']) {
    this.tempoSelecionado = this.tempoSelecionado === valor ? undefined : valor
    this.buscar()
  }

  toggleObjetivo(valor: FiltrosReceita['objetivo']) {
    this.objetivoSelecionado = this.objetivoSelecionado === valor ? undefined : valor
    this.buscar()
  }

  toggleIngrediente(nome: string) {
    if (this.ingredientesPriorizados.has(nome)) {
      this.ingredientesPriorizados.delete(nome)
    } else if (this.ingredientesPriorizados.size < 3) {
      this.ingredientesPriorizados.add(nome)
    }
    this.buscar()
  }

  alternarExpandido(index: number) {
    this.expandido = this.expandido === index ? null : index
  }

  chaveIngrediente(receitaIndex: number, ingrediente: string) {
    return `${receitaIndex}::${ingrediente}`
  }

  adicionarNaLista(receitaIndex: number, ingrediente: string) {
    const chave = this.chaveIngrediente(receitaIndex, ingrediente)
    if (this.adicionadosNaLista.has(chave)) return

    this.listaComprasService.addItemBD({ nome: ingrediente, quantidade: 1, unidade: 'un' }).subscribe({
      next: () => {
        this.adicionadosNaLista.add(chave)
        this.cdr.markForCheck()
      },
      error: () => {}
    })
  }

  abrirCozinhei(receita: Receita) {
    this.receitaCozinhando = receita
  }

  fecharCozinhei() {
    this.receitaCozinhando = undefined
  }

  irParaCozinha() {
    this.router.navigate(['/armazenamento/geladeira/adicionar'])
  }
}
