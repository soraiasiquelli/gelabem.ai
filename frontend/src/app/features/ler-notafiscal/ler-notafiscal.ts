import { Component } from '@angular/core';
import { FormularioLerNota } from '../formulario-ler-nota/formulario-ler-nota';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-ler-notafiscal',
  imports: [TPipe, FormularioLerNota],
  templateUrl: './ler-notafiscal.html',
  styleUrl: './ler-notafiscal.css',
})
export class LerNotafiscal {}
