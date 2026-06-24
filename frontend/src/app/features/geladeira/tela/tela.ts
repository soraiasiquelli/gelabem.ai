import { ChangeDetectorRef, Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { ListaItens } from '../lista-itens/lista-itens';
import { BtnAdicionar } from '../../geral/btn-adicionar/btn-adicionar';
import { GeladeiraService } from '../../../services/geladeira.service';
import { LoginService } from '../../../services/auth/login.service';
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

const METADATA: Record<string, { titulo: string, desc: string, icone: string, classe: string }> = {
  geladeira: { titulo: 'Geladeira', desc: 'Seus itens frescos', icone: '🧊', classe: 'bloco--geladeira' },
  freezer:   { titulo: 'Freezer',   desc: 'Alimentos congelados', icone: '❄️', classe: 'bloco--freezer' },
  despensa:  { titulo: 'Despensa',  desc: 'Secos e enlatados', icone: '🏺', classe: 'bloco--despensa' },
  frigobar:  { titulo: 'Frigobar',  desc: 'Bebidas e petiscos', icone: '🧃', classe: 'bloco--frigobar' },
}

@Component({
  selector: 'app-tela',
  imports: [ListaItens, BtnAdicionar, RouterLink, NgClass],
  templateUrl: './tela.html',
  styleUrl: './tela.css',
})
export class Tela {

  tipo = 'geladeira'
  meta = METADATA['geladeira']
  localId?: number

  categorias!: { id: number, nome: string }[]
  categoriaSelecionada: string = "Todos"
  categoriaIdSelecionada?: number

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

}
