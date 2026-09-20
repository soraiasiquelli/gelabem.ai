const { diasAte } = require('./datas')

function rotuloValidade(dias) {
  if (dias === null) return ''
  if (dias < 0) return `VENCIDO há ${-dias} dia(s)`
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  return `vence em ${dias} dias`
}

// Quem vence primeiro vem primeiro; itens sem data vão pro fim.
function ordenarPorValidade(itens) {
  return [...itens].sort((a, b) => {
    if (!a.data_validade && !b.data_validade) return 0
    if (!a.data_validade) return 1
    if (!b.data_validade) return -1
    return a.data_validade < b.data_validade ? -1 : a.data_validade > b.data_validade ? 1 : 0
  })
}

// Lista de itens em texto pros prompts da IA, já com a validade quando existe.
function descreverItens(itens) {
  return ordenarPorValidade(itens)
    .map(item => {
      const partes = [`${item.quantidade} ${item.unidade}`]
      if (item.Categoria) partes.push(item.Categoria.nome)
      const validade = rotuloValidade(diasAte(item.data_validade))
      if (validade) partes.push(validade)
      return `${item.nome} (${partes.join(', ')})`
    })
    .join('\n')
}

// Regra comum a todas as receitas: o objetivo do app é não jogar comida fora.
const REGRA_VALIDADE = `Alguns itens informam a validade. Dê prioridade aos que vencem primeiro, porque evitar desperdício é o objetivo principal. Nunca use itens marcados como VENCIDO.`

module.exports = { descreverItens, ordenarPorValidade, rotuloValidade, REGRA_VALIDADE }
