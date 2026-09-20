const express = require('express')
const { Usuario, Casa } = require('../models')
const { authMiddleware } = require('../middleware/auth')
const casaService = require('../services/casa')

const router = express.Router()
router.use(authMiddleware)

// Envolve o handler: carrega o usuário logado e traduz ErroCasa em resposta HTTP.
function rota(handler) {
  return async (req, res) => {
    try {
      const usuario = await Usuario.findByPk(req.usuarioId)
      if (!usuario) return res.status(401).json({ error: 'Usuário não encontrado.' })
      await handler(req, res, usuario)
    } catch (err) {
      if (err instanceof casaService.ErroCasa) {
        return res.status(err.status).json({ error: err.message })
      }
      console.error('🔥 ERRO EM /casa:', err)
      res.status(500).json({ error: 'Erro ao processar sua casa. Tente novamente.' })
    }
  }
}

router.get('/', rota(async (req, res, usuario) => {
  const casa = usuario.casa_id ? await casaService.detalhesDaCasa(usuario.casa_id) : null
  res.json({ casa })
}))

router.post('/', rota(async (req, res, usuario) => {
  const casa = await casaService.criarCasa(usuario, req.body.nome)
  res.status(201).json({ casa: await casaService.detalhesDaCasa(casa.id) })
}))

router.post('/entrar', rota(async (req, res, usuario) => {
  const casa = await casaService.entrarNaCasa(usuario, req.body.codigo)
  res.json({ casa: await casaService.detalhesDaCasa(casa.id) })
}))

router.post('/sair', rota(async (req, res, usuario) => {
  await casaService.removerDaCasa(usuario)
  res.json({ casa: null })
}))

// só o dono: invalida o código antigo (útil se o convite vazou)
router.post('/codigo/renovar', rota(async (req, res, usuario) => {
  const casa = usuario.casa_id ? await Casa.findByPk(usuario.casa_id) : null
  if (!casa) throw new casaService.ErroCasa(400, 'Você não faz parte de uma casa.')
  if (casa.dono_id !== usuario.id) throw new casaService.ErroCasa(403, 'Só quem criou a casa pode renovar o código.')

  await casaService.renovarCodigo(casa)
  res.json({ casa: await casaService.detalhesDaCasa(casa.id) })
}))

// só o dono: tira outro morador da casa
router.delete('/membros/:id', rota(async (req, res, usuario) => {
  const casa = usuario.casa_id ? await Casa.findByPk(usuario.casa_id) : null
  if (!casa) throw new casaService.ErroCasa(400, 'Você não faz parte de uma casa.')
  if (casa.dono_id !== usuario.id) throw new casaService.ErroCasa(403, 'Só quem criou a casa pode remover moradores.')

  const alvoId = Number(req.params.id)
  if (alvoId === usuario.id) throw new casaService.ErroCasa(400, 'Para sair da casa, use a opção "Sair da casa".')

  const alvo = await Usuario.findByPk(alvoId)
  if (!alvo || alvo.casa_id !== casa.id) throw new casaService.ErroCasa(404, 'Morador não encontrado nesta casa.')

  await casaService.removerDaCasa(alvo)
  res.json({ casa: await casaService.detalhesDaCasa(casa.id) })
}))

module.exports = router
