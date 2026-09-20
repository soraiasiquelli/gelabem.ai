import { Component, Input, Output, EventEmitter} from '@angular/core';
import { Item } from '../../../models/item.model';
import { SituacaoValidade, situacaoValidade } from '../../../utils/validade';
import { passoDaUnidade } from '../../../utils/itens';

@Component({
  selector: 'app-item-card',
  imports: [],
  templateUrl: './item-card.html',
  styleUrl: './item-card.css',
})
export class ItemCard {

  @Input()
  item!: Item;

  @Input()
  selecionavel = false;

  @Input()
  selecionado = false;

  @Output()
  remover = new EventEmitter<Item>()

  @Output()
  editar = new EventEmitter<Item>()

  @Output()
  selecionar = new EventEmitter<Item>()

  /** "usei um": tira um passo da quantidade (chegando a zero o item acaba) */
  @Output()
  consumir = new EventEmitter<Item>()

  @Output()
  repor = new EventEmitter<Item>()

  get validade(): SituacaoValidade | null {
    return situacaoValidade(this.item.data_validade)
  }

  get passo(): number {
    return passoDaUnidade(this.item.unidade)
  }

  clicouRemover(){
    this.remover.emit(this.item)
  }

  clicouEditar(){
    this.editar.emit(this.item)
  }

  clicouCard(){
    if (this.selecionavel) {
      this.selecionar.emit(this.item)
    }
  }

}
