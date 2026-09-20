const crypto = require('crypto')

// As sugestões de receita não gastam a cota de IA do usuário (a Home as pede toda vez que abre),
// então o custo é contido aqui: mesma cozinha + mesmos filtros = mesma resposta por algumas horas,
// e há um teto de buscas novas por hora por usuário. Fica em memória: reiniciar o servidor limpa.
const VALIDADE_MS = 3 * 60 * 60 * 1000
const MAX_ENTRADAS = 500
const BUSCAS_NOVAS_POR_HORA = 30
const UMA_HORA_MS = 60 * 60 * 1000

const cache = new Map()
const buscasPorUsuario = new Map()

function chaveDe(partes) {
  return crypto.createHash('sha1').update(JSON.stringify(partes)).digest('hex')
}

function obter(chave) {
  const entrada = cache.get(chave)
  if (!entrada) return null
  if (entrada.expira < Date.now()) {
    cache.delete(chave)
    return null
  }
  return entrada.receitas
}

function guardar(chave, receitas) {
  if (cache.size >= MAX_ENTRADAS) {
    cache.delete(cache.keys().next().value)
  }
  cache.set(chave, { receitas, expira: Date.now() + VALIDADE_MS })
}

// true e registra a busca, ou false se o usuário já fez buscas demais na última hora
function podeBuscarNova(usuarioId) {
  const agora = Date.now()
  const recentes = (buscasPorUsuario.get(usuarioId) || []).filter(t => agora - t < UMA_HORA_MS)
  if (recentes.length >= BUSCAS_NOVAS_POR_HORA) {
    buscasPorUsuario.set(usuarioId, recentes)
    return false
  }
  recentes.push(agora)
  buscasPorUsuario.set(usuarioId, recentes)
  return true
}

module.exports = { chaveDe, obter, guardar, podeBuscarNova }
