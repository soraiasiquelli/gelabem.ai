import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ItemListaCompras, ListaComprasService } from '../../services/lista-compras.service';
import { GeladeiraService } from '../../services/geladeira.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-lista-compras',
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-compras.html',
  styleUrl: './lista-compras.css',
})
export class ListaCompras {

  itens: ItemListaCompras[] = []
  itensAcabando: Item[] = []
  carregando = true
  erro = ''

  novoNome = ''
  novaQuantidade = 1
  novaUnidade = 'un'
  salvando = false

  private usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  constructor(
    private listaComprasService: ListaComprasService,
    private geladeiraService: GeladeiraService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.carregarItens()
    this.carregarItensAcabando()
  }

  carregarItens() {
    this.carregando = true
    this.listaComprasService.getItensBD().subscribe({
      next: (itens) => {
        this.itens = itens
        this.carregando = false
        this.cdr.markForCheck()
      },
      error: () => {
        this.erro = 'Erro ao carregar a lista de compras.'
        this.carregando = false
        this.cdr.markForCheck()
      }
    })
  }

  carregarItensAcabando() {
    if (!this.usuario) return

    this.geladeiraService.getItensAcabandoBD(this.usuario.id).subscribe({
      next: (itens) => {
        this.itensAcabando = itens
        this.cdr.markForCheck()
      },
      error: () => {}
    })
  }

  get sugestoes(): Item[] {
    const nomesNaLista = new Set(this.itens.map(item => item.nome.trim().toLowerCase()))
    return this.itensAcabando.filter(item => !nomesNaLista.has(item.nome.trim().toLowerCase()))
  }

  adicionarSugestao(item: Item) {
    if (this.salvando) return

    this.salvando = true
    this.listaComprasService.addItemBD({
      nome: item.nome,
      quantidade: item.quantidade_minima || 1,
      unidade: item.unidade
    }).subscribe({
      next: (novoItem) => {
        this.itens = [novoItem, ...this.itens]
        this.salvando = false
        this.cdr.markForCheck()
      },
      error: () => {
        this.salvando = false
        this.cdr.markForCheck()
      }
    })
  }

  adicionarItem() {
    const nome = this.novoNome.trim()
    if (!nome || this.salvando) return

    this.salvando = true
    this.listaComprasService.addItemBD({
      nome,
      quantidade: this.novaQuantidade || 1,
      unidade: this.novaUnidade
    }).subscribe({
      next: (item) => {
        this.itens = [item, ...this.itens]
        this.novoNome = ''
        this.novaQuantidade = 1
        this.novaUnidade = 'un'
        this.salvando = false
        this.cdr.markForCheck()
      },
      error: () => {
        this.salvando = false
        this.cdr.markForCheck()
      }
    })
  }

  toggleComprado(item: ItemListaCompras) {
    if (!item.id) return
    const comprado = !item.comprado
    item.comprado = comprado
    this.listaComprasService.marcarCompradoBD(item.id, comprado).subscribe({
      error: () => {
        item.comprado = !comprado
        this.cdr.markForCheck()
      }
    })
  }

  removerItem(item: ItemListaCompras) {
    if (!item.id) return
    this.listaComprasService.removeItemBD(item.id).subscribe({
      next: () => {
        this.itens = this.itens.filter(i => i.id !== item.id)
        this.cdr.markForCheck()
      }
    })
  }

  goBack() {
    this.router.navigate(['/home'])
  }
}
