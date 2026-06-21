import { Component } from '@angular/core';
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

  constructor(
    private geladeiraService: GeladeiraService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.categorias = this.geladeiraService.getCategorias();

    this.tipo = this.route.snapshot.paramMap.get('tipo') || 'geladeira'
    this.meta = METADATA[this.tipo] || METADATA['geladeira']

    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (usuario) {
      this.loginService.getArmazenamentos(usuario.id).subscribe(locais => {
        const local = locais.find(l => l.nome === this.tipo)
        this.localId = local?.id
      })
    }
  }

  selecionarCategoria(categoria: string){
    this.categoriaSelecionada = categoria
  }

  selecionarTodos(){
    this.categoriaSelecionada = "Todos"
    this.geladeiraService.resetFiltro()
  }

  filtrarItens(categoriaId: number){
    this.geladeiraService.filtrarItens(categoriaId)
  }

  goBack(){
    this.router.navigate(['/home'])
  }

}
