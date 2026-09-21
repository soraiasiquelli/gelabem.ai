import { Injectable, computed, signal } from '@angular/core';
import { EN } from './en';

export type Idioma = 'pt' | 'en'

export const IDIOMAS: { codigo: Idioma; rotulo: string }[] = [
  { codigo: 'pt', rotulo: 'Português' },
  { codigo: 'en', rotulo: 'English' },
]

// instância única, pra traduzir fora de componentes (mensagens de erro, utilitários) sem injeção
let atual: I18n | null = null

const CHAVE_STORAGE = 'idioma'

function idiomaInicial(): Idioma {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE)
    if (salvo === 'pt' || salvo === 'en') return salvo
  } catch { /* storage bloqueado: segue pro idioma do navegador */ }
  return (navigator.language || 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt'
}

// Tradução em tempo de execução. O texto em português é a própria chave: em 'pt' ele passa direto,
// em 'en' procura no dicionário e, se não achar, cai de volta pro português (nunca mostra uma chave vazia).
@Injectable({ providedIn: 'root' })
export class I18n {

  readonly idioma = signal<Idioma>(idiomaInicial())
  readonly locale = computed(() => (this.idioma() === 'en' ? 'en-US' : 'pt-BR'))

  constructor() {
    atual = this
    document.documentElement.lang = this.idioma() === 'en' ? 'en' : 'pt-BR'
  }

  definir(idioma: Idioma) {
    this.idioma.set(idioma)
    try { localStorage.setItem(CHAVE_STORAGE, idioma) } catch { /* sem persistência */ }
    document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR'
  }

  // t('Você tem {n} itens', { n: 3 })
  t(texto: string, params?: Record<string, string | number>): string {
    // 'Entrar|casa': sufixo de contexto pra palavras iguais com tradução diferente; some no português
    const base = texto.replace(/\|[a-z]+$/, '')
    let resultado = this.idioma() === 'en' ? (EN[texto] ?? base) : base
    if (params) {
      for (const [chave, valor] of Object.entries(params)) {
        resultado = resultado.split(`{${chave}}`).join(String(valor))
      }
    }
    return resultado
  }
}

// tr('Item salvo!')  ou  tr('Vence em {n} dias', { n: 3 })
export function tr(texto: string, params?: Record<string, string | number>): string {
  if (atual) return atual.t(texto, params)
  return params ? Object.entries(params).reduce((r, [k, v]) => r.split(`{${k}}`).join(String(v)), texto) : texto
}
