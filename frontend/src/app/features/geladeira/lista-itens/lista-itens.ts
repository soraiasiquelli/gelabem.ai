import { Component, Input } from '@angular/core';
import { GeladeiraService } from '../../../services/geladeira.service'
import { ItemCard } from '../item-card/item-card';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest, forkJoin, map, of } from 'rxjs';
import { Item } from '../../../models/item.model';

function agruparPorNome(itens: Item[]): Item[] {
  const grupos = new Map<string, Item>()

  for (const item of itens) {
    const chave = item.nome.trim().toLowerCase()
    const existente = grupos.get(chave)

    if (existente) {
      existente.quantidade += item.quantidade
      existente.ids!.push(item.id)
    } else {
      grupos.set(chave, { ...item, ids: [item.id] })
    }
  }

  return Array.from(grupos.values())
}

@Component({
  selector: 'app-lista-itens',
  imports: [ItemCard, AsyncPipe],
  templateUrl: './lista-itens.html',
  styleUrl: './lista-itens.css',
})
export class ListaItens {
  itens$!: Observable<Item[]>;

  private _localId?: number
  private categoriaIdSubject = new BehaviorSubject<number | undefined>(undefined)

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

  constructor(private geladeiraService: GeladeiraService){
    this.carregarItens()
  }

  carregarItens() {
    if (this._localId === undefined) {
      this.itens$ = of([])
      return
    }

    this.itens$ = combineLatest([
      this.geladeiraService.getItensBD(this._localId),
      this.categoriaIdSubject
    ]).pipe(
      map(([itens, categoriaId]) => {
        const filtrados = categoriaId
          ? itens.filter(item => item.categoria_id === categoriaId)
          : itens
        return agruparPorNome(filtrados)
      })
    )
  }

  removerItem(item: Item) {
    if (!item.ids?.length) return

    const remocoes = item.ids.map((id: number) => this.geladeiraService.removeItem(id))

    forkJoin(remocoes).subscribe(() => {
      this.carregarItens()
    });
  }


}
