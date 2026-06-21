import { Component } from '@angular/core';
import { FormularioItem } from '../formulario-item/formulario-item';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

const TITULOS: Record<string, string> = {
  geladeira: 'Geladeira',
  freezer: 'Freezer',
  despensa: 'Despensa',
  frigobar: 'Frigobar',
}

@Component({
  selector: 'app-tela-criar',
  imports: [FormularioItem],
  templateUrl: './tela-criar.html',
  styleUrl: './tela-criar.css',
})
export class TelaCriar {

  titulo = 'item'

  constructor(private location: Location, private route: ActivatedRoute) {
    const tipo = this.route.snapshot.paramMap.get('tipo') || ''
    this.titulo = TITULOS[tipo] || 'item'
  }

  goBack(){
    this.location.back()
  }
}
