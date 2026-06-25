import { Component, Input, Output, EventEmitter} from '@angular/core';
import { Item } from '../../../models/item.model';

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