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

  @Output()
  remover = new EventEmitter<Item>()

  clicouRemover(){
    this.remover.emit(this.item)
  }

  
}