const express = require('express')
const { Op } = require('sequelize')
const { Usuario, Feedback } = require('../models')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

const TIPOS = ['ideia', 'problema', 'elogio']
const LIMITE_POR_DIA = 10

router.post('/', async (req, res) => {
  try {
    const mensagem = String(req.body.mensagem || '').trim()
    if (mensagem.length < 5) {
      return res.status(400).json({ error: 'Conta um pouco mais pra gente entender (mínimo 5 caracteres).' })
    }
    if (mensagem.length > 2000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 2000 caracteres).' })
    }

    const enviadosHoje = await Feedback.count({
      where: {
        usuario_id: req.usuarioId,
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
    if (enviadosHoje >= LIMITE_POR_DIA) {
      return res.status(429).json({ error: 'Você já enviou várias sugestões hoje. Volte amanhã, obrigado!' })
    }

    await Feedback.create({
      usuario_id: req.usuarioId,
      tipo: TIPOS.includes(req.body.tipo) ? req.body.tipo : 'ideia',
      mensagem,
      pagina: String(req.body.pagina || '').slice(0, 120) || null
    })

    res.status(201).json({ message: 'Obrigado! Sua sugestão foi enviada.' })
  } catch (err) {
    console.error('🔥 ERRO EM POST /feedback:', err)
    res.status(500).json({ error: 'Não foi possível enviar agora. Tente novamente.' })
  }
})

// leitura só pra contas admin (nivel = 'admin' na tabela usuarios)
router.get('/', async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuarioId, { attributes: ['id', 'nivel'] })
    if (!usuario || usuario.nivel !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' })
    }

    const feedbacks = await Feedback.findAll({ order: [['id', 'DESC']], limit: 200 })
    if (!feedbacks.length) return res.json([])

    const autores = await Usuario.findAll({
      where: { id: { [Op.in]: [...new Set(feedbacks.map(f => f.usuario_id))] } },
      attributes: ['id', 'nome', 'email']
    })
    const porId = new Map(autores.map(u => [u.id, u]))

    res.json(feedbacks.map(f => ({
      id: f.id,
      tipo: f.tipo,
      mensagem: f.mensagem,
      pagina: f.pagina,
      criado_em: f.createdAt,
      autor: porId.get(f.usuario_id)
        ? { nome: porId.get(f.usuario_id).nome, email: porId.get(f.usuario_id).email }
        : null
    })))
  } catch (err) {
    console.error('🔥 ERRO EM GET /feedback:', err)
    res.status(500).json({ error: 'Erro ao buscar feedbacks.' })
  }
})

module.exports = router
