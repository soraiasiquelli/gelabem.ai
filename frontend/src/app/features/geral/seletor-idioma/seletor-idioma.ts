import { Component, inject, input } from '@angular/core';
import { I18n, IDIOMAS, Idioma } from '../../../i18n/i18n.service';

// Seletor PT | EN. `flutuante` fixa o botão no canto superior direito (telas públicas).
@Component({
  selector: 'app-seletor-idioma',
  templateUrl: './seletor-idioma.html',
  styleUrl: './seletor-idioma.css',
})
export class SeletorIdioma {
  i18n = inject(I18n)
  flutuante = input(false)
  idiomas = IDIOMAS

  escolher(codigo: Idioma) {
    this.i18n.definir(codigo)
  }
}
