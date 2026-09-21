import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n } from './i18n.service';

// {{ 'Entrar' | t }}  ou  {{ 'Você tem {n} itens' | t: { n: total } }}
// Impuro de propósito: precisa reavaliar quando o idioma (um signal) muda.
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(I18n)

  transform(texto: string | null | undefined, params?: Record<string, string | number>): string {
    if (!texto) return ''
    return this.i18n.t(texto, params)
  }
}
