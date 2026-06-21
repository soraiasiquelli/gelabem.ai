import { Component, Output } from '@angular/core';
import { EventEmitter } from '@angular/core';

@Component({
  selector: 'app-btn-adicionar',
  imports: [],
  templateUrl: './btn-adicionar.html',
  styleUrl: './btn-adicionar.css',
})
export class BtnAdicionar {

  @Output() adicionarClick = new EventEmitter<void>()




    abrirFormulario(){
    this.adicionarClick.emit()
  }

 
}
