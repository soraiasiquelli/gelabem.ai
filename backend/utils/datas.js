// Datas de validade são "só data" (YYYY-MM-DD) e o app é usado no Brasil,
// então "hoje" precisa ser calculado no fuso de São Paulo, não no do servidor.
const FUSO = 'America/Sao_Paulo'

function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO })
}

function paraUTC(data) {
  const [ano, mes, dia] = String(data).slice(0, 10).split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

function somarDias(data, dias) {
  return new Date(paraUTC(data) + dias * 86400000).toISOString().slice(0, 10)
}

// dias que faltam até a data (negativo = já venceu). null quando não há data.
function diasAte(data) {
  if (!data) return null
  return Math.round((paraUTC(data) - paraUTC(hoje())) / 86400000)
}

// Aceita só datas reais no formato YYYY-MM-DD; qualquer outra coisa vira null.
function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null
  const data = new Date(`${valor}T00:00:00Z`)
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) return null
  return valor
}

// Converte a estimativa da IA ("dura N dias") em uma data. null quando não há estimativa confiável.
function validadeEmDias(dias) {
  const n = Number(dias)
  if (!Number.isFinite(n) || n < 0 || n > 3650) return null
  return somarDias(hoje(), Math.round(n))
}

module.exports = { hoje, somarDias, diasAte, dataValida, validadeEmDias }
