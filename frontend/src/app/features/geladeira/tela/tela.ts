import { ChangeDetectorRef, Component } from '@angular/core';
import { ListaItens } from '../lista-itens/lista-itens';
import { BtnAdicionar } from '../../geral/btn-adicionar/btn-adicionar';
import { GeladeiraService } from '../../../services/geladeira.service';
import { LoginService } from '../../../services/auth/login.service';
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Item } from '../../../models/item.model';
import { TPipe } from '../../../i18n/t.pipe';
import { tr } from '../../../i18n/i18n.service';

const METADATA: Record<string, { titulo: string, desc: string, icone: string }> = {
  geladeira: { titulo: 'Geladeira', desc: 'Seus itens frescos', icone: '🧊' },
  freezer:   { titulo: 'Freezer',   desc: 'Alimentos congelados', icone: '❄️' },
  despensa:  { titulo: 'Despensa',  desc: 'Secos e enlatados', icone: '🏺' },
  frigobar:  { titulo: 'Frigobar',  desc: 'Bebidas e petiscos', icone: '🧃' },
}

@Component({
  selector: 'app-tela',
  imports: [TPipe, ListaItens, BtnAdicionar, RouterLink],
  templateUrl: './tela.html',
  styleUrl: './tela.css',
})
export class Tela {

  tipo = 'geladeira'
  meta = METADATA['geladeira']
  localId?: number
  usuarioId?: number

  categorias!: { id: number, nome: string }[]
  categoriaSelecionada: string = "Todos"
  categoriaIdSelecionada?: number

  modoSelecao = false
  itensSelecionados: Set<number> = new Set()
  mensagemSelecao = ''

  constructor(
    private geladeiraService: GeladeiraService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.categorias = []
    this.geladeiraService.getCategoriasBD().subscribe(categorias => {
      this.categorias = categorias
      this.cdr.markForCheck()
    })

    this.tipo = this.route.snapshot.paramMap.get('tipo') || 'geladeira'
    this.meta = METADATA[this.tipo] || METADATA['geladeira']

    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (usuario) {
      this.loginService.getArmazenamentos(usuario.id).subscribe(locais => {
        const local = locais.find(l => l.nome === this.tipo)
        this.localId = local?.id
        this.cdr.markForCheck()
      })
    }
  }

  selecionarCategoria(categoria: string){
    this.categoriaSelecionada = categoria
    this.cdr.markForCheck()
  }

  selecionarTodos(){
    this.categoriaSelecionada = "Todos"
    this.categoriaIdSelecionada = undefined
    this.cdr.markForCheck()
  }

  filtrarItens(categoriaId: number){
    this.categoriaIdSelecionada = categoriaId
    this.cdr.markForCheck()
  }

  goBack(){
    this.router.navigate(['/home'])
  }

 gerarReceita(armazenamento: string) {
  if (!this.modoSelecao) {
    this.modoSelecao = true
    this.itensSelecionados.clear()
    this.mensagemSelecao = ''
    this.cdr.markForCheck()
    return
  }

  if (this.itensSelecionados.size === 0) {
    this.mensagemSelecao = tr('Selecione pelo menos um item para gerar a receita.')
    this.cdr.markForCheck()
    return
  }

  const itens = Array.from(this.itensSelecionados).join(',')
  this.modoSelecao = false
  this.router.navigate(['/receita', armazenamento], { queryParams: { itens } })
}

cancelarSelecao() {
  this.modoSelecao = false
  this.itensSelecionados.clear()
  this.mensagemSelecao = ''
  this.cdr.markForCheck()
}

toggleSelecaoItem(item: Item) {
  const ids = item.ids?.length ? item.ids : [item.id]
  const todosSelecionados = ids.every(id => this.itensSelecionados.has(id))

  ids.forEach(id => {
    if (todosSelecionados) {
      this.itensSelecionados.delete(id)
    } else {
      this.itensSelecionados.add(id)
    }
  })

  this.mensagemSelecao = ''
  this.cdr.markForCheck()
}

}
