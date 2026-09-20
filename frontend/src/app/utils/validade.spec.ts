import { dataEmDias, diasParaVencer, quandoVence, situacaoValidade } from './validade';

describe('validade utils', () => {

  it('dataEmDias e diasParaVencer são inversas', () => {
    expect(diasParaVencer(dataEmDias(0))).toBe(0)
    expect(diasParaVencer(dataEmDias(5))).toBe(5)
    expect(diasParaVencer(dataEmDias(-3))).toBe(-3)
  })

  it('sem data não há situação nem texto', () => {
    expect(diasParaVencer(null)).toBeNull()
    expect(situacaoValidade(undefined)).toBeNull()
    expect(quandoVence('')).toBe('')
  })

  it('classifica vencido, hoje, breve e ok', () => {
    expect(situacaoValidade(dataEmDias(-1))).toEqual({ nivel: 'vencido', texto: 'Venceu ontem' })
    expect(situacaoValidade(dataEmDias(-4))).toEqual({ nivel: 'vencido', texto: 'Venceu há 4 dias' })
    expect(situacaoValidade(dataEmDias(0))).toEqual({ nivel: 'hoje', texto: 'Vence hoje' })
    expect(situacaoValidade(dataEmDias(1))).toEqual({ nivel: 'breve', texto: 'Vence amanhã' })
    expect(situacaoValidade(dataEmDias(3))).toEqual({ nivel: 'breve', texto: 'Vence em 3 dias' })
    expect(situacaoValidade(dataEmDias(10))).toEqual({ nivel: 'ok', texto: 'Vence em 10 dias' })
  })

  it('validade distante mostra a data em vez de "em N dias"', () => {
    const situacao = situacaoValidade(dataEmDias(200))!
    expect(situacao.nivel).toBe('ok')
    expect(situacao.texto).toMatch(/^Vence em \d{2}\/\d{2}\/\d{4}$/)
  })

  it('quandoVence gera o texto curto dos chips', () => {
    expect(quandoVence(dataEmDias(0))).toBe('hoje')
    expect(quandoVence(dataEmDias(1))).toBe('amanhã')
    expect(quandoVence(dataEmDias(2))).toBe('em 2 dias')
    expect(quandoVence(dataEmDias(-1))).toBe('venceu ontem')
    expect(quandoVence(dataEmDias(-3))).toBe('venceu há 3 dias')
  })
})
