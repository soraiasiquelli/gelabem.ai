import { Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '../../environments/environment';

export type Consentimento = 'aceito' | 'recusado' | null

const CHAVE_CONSENTIMENTO = 'analytics-consentimento'
const CHAVE_CAMPANHA = 'analytics-campanha'

let atual: Analytics | null = null

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function lerConsentimento(): Consentimento {
  try {
    const v = localStorage.getItem(CHAVE_CONSENTIMENTO)
    return v === 'aceito' || v === 'recusado' ? v : null
  } catch { return null }
}

// UTMs do link de divulgação: guardados na primeira visita, porque a URL perde o "?utm_..." ao navegar
// e o consentimento pode vir depois. Só vão pro GA se a pessoa aceitar.
function campanhaDaUrl(): Record<string, string> {
  try {
    const params = new URLSearchParams(location.search)
    const c: Record<string, string> = {}
    for (const [utm, gtag] of [['utm_source', 'campaign_source'], ['utm_medium', 'campaign_medium'], ['utm_campaign', 'campaign_name'], ['utm_term', 'campaign_term'], ['utm_content', 'campaign_content']]) {
      const v = params.get(utm)
      if (v) c[gtag] = v.slice(0, 100)
    }
    if (Object.keys(c).length) {
      sessionStorage.setItem(CHAVE_CAMPANHA, JSON.stringify(c))
      return c
    }
    return JSON.parse(sessionStorage.getItem(CHAVE_CAMPANHA) || '{}')
  } catch { return {} }
}

// Google Analytics 4 com consentimento: o script do Google só é baixado depois do "Aceitar".
// Nunca enviamos e-mail, nome nem o que a pessoa guarda na geladeira: só a rota visitada e eventos genéricos.
@Injectable({ providedIn: 'root' })
export class Analytics {

  readonly consentimento = signal<Consentimento>(lerConsentimento())
  // sem ID (ambiente de desenvolvimento) não há banner nem rastreamento
  readonly ativo = !!environment.gaMeasurementId

  private carregado = false
  private campanha = campanhaDaUrl()

  constructor(router: Router) {
    atual = this
    if (!this.ativo) return

    // consentimento já dado numa visita anterior: o page_view sai no NavigationEnd da navegação inicial
    if (this.consentimento() === 'aceito') this.carregar(false)

    router.events.subscribe(e => {
      if (e instanceof NavigationEnd) this.paginaVista()
    })
  }

  aceitar() {
    this.salvar('aceito')
    if (this.carregado) this.consentir(true)
    else this.carregar(true)
  }

  recusar() {
    this.salvar('recusado')
    this.consentir(false)
  }

  evento(nome: string, params: Record<string, string | number> = {}) {
    if (this.ativo && this.carregado && this.consentimento() === 'aceito') window.gtag?.('event', nome, params)
  }

  private salvar(valor: 'aceito' | 'recusado') {
    this.consentimento.set(valor)
    try { localStorage.setItem(CHAVE_CONSENTIMENTO, valor) } catch { /* sem persistência */ }
  }

  private consentir(permitido: boolean) {
    // flag oficial do GA pra desligar a coleta sem recarregar a página
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${environment.gaMeasurementId}`] = !permitido
    window.gtag?.('consent', 'update', { analytics_storage: permitido ? 'granted' : 'denied' })
    if (!permitido) this.apagarCookies()
    else this.paginaVista()
  }

  // enviarPagina: true só quando o aceite acontece agora (a navegação atual já terminou e ninguém mais vai enviá-la)
  private carregar(enviarPagina: boolean) {
    if (this.carregado) return
    const id = environment.gaMeasurementId
    this.carregado = true
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false

    window.dataLayer = window.dataLayer || []
    // o gtag.js exige `arguments` (não aceita array): por isso function e não arrow
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    // send_page_view desligado: as trocas de rota do Angular são enviadas em paginaVista()
    window.gtag('config', id, { send_page_view: false, ...this.campanha })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(script)

    if (enviarPagina) this.paginaVista()
  }

  private paginaVista() {
    if (this.carregado && this.consentimento() === 'aceito') window.gtag?.('event', 'page_view')
  }

  private apagarCookies() {
    for (const c of document.cookie.split(';')) {
      const nome = c.split('=')[0].trim()
      if (nome === '_ga' || nome.startsWith('_ga_')) {
        document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    }
  }
}

// registrarEvento('sign_up', { method: 'email' }): dispara de fora de componentes sem injeção
export function registrarEvento(nome: string, params: Record<string, string | number> = {}) {
  atual?.evento(nome, params)
}
