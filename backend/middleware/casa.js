const { idsDaCasa } = require('../services/casa')

// Roda depois do authMiddleware. Coloca em req.idsCasa os ids de todos que dividem
// a mesma casa com o usuário (só ele mesmo, se não estiver em nenhuma). As rotas de
// dados usam essa lista no lugar de req.usuarioId pra enxergar o que é compartilhado.
async function carregarCasa(req, res, next) {
  try {
    req.idsCasa = await idsDaCasa(req.usuarioId)
    next()
  } catch (err) {
    console.error('Erro ao carregar a casa do usuário:', err)
    res.status(500).json({ error: 'Erro ao carregar seus dados.' })
  }
}

module.exports = { carregarCasa }
