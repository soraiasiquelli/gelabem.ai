import { tr } from '../i18n/i18n.service';
export type NivelValidade = 'vencido' | 'hoje' | 'breve' | 'ok'

export interface SituacaoValidade {
  nivel: NivelValidade
  texto: string
}

const MS_DIA = 86400000

/** Data (YYYY-MM-DD) daqui a `dias` dias, no calendário do aparelho. */
export function dataEmDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Dias que faltam até a data (negativo = já venceu). null quando o item não tem validade. */
export function diasParaVencer(data?: string | null): number | null {
  if (!data) return null
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((new Date(ano, mes - 1, dia).getTime() - hoje.getTime()) / MS_DIA)
}

export function situacaoValidade(data?: string | null): SituacaoValidade | null {
  const dias = diasParaVencer(data)
  if (dias === null) return null

  if (dias < 0) return { nivel: 'vencido', texto: dias === -1 ? tr('Venceu ontem') : tr('Venceu há {n} dias', { n: -dias }) }
  if (dias === 0) return { nivel: 'hoje', texto: tr('Vence hoje') }
  if (dias === 1) return { nivel: 'breve', texto: tr('Vence amanhã') }
  if (dias <= 3) return { nivel: 'breve', texto: tr('Vence em {n} dias', { n: dias }) }
  if (dias <= 30) return { nivel: 'ok', texto: tr('Vence em {n} dias', { n: dias }) }

  const [ano, mes, dia] = (data as string).slice(0, 10).split('-')
  return { nivel: 'ok', texto: tr('Vence em {data}', { data: `${dia}/${mes}/${ano}` }) }
}

/** Texto curto pra chips: "amanhã", "hoje", "há 2 dias", "em 3 dias". */
export function quandoVence(data?: string | null): string {
  const dias = diasParaVencer(data)
  if (dias === null) return ''
  if (dias < -1) return tr('venceu há {n} dias', { n: -dias })
  if (dias === -1) return tr('venceu ontem')
  if (dias === 0) return tr('hoje')
  if (dias === 1) return tr('amanhã')
  return tr('em {n} dias', { n: dias })
}
