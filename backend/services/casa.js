const crypto = require('crypto')
const { Op } = require('sequelize')
const sequelize = require('../db')
const { Usuario, Casa, Local, Item } = require('../models')

const MAX_MEMBROS = Number(process.env.MAX_MEMBROS_CASA) || 3

// sem 0/O/1/I pra ninguém errar ao digitar o código de um convite
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

class ErroCasa extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

function gerarCodigo() {
  let codigo = ''
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[crypto.randomInt(ALFABETO.length)]
  }
  return codigo
}

async function gerarCodigoLivre() {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const codigo = gerarCodigo()
    if (!(await Casa.findOne({ where: { codigo } }))) return codigo
  }
  throw new Error('Não foi possível gerar um código de convite.')
}

async function idsDaCasa(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ['id', 'casa_id'] })
  if (!usuario || !usuario.casa_id) return [usuarioId]

  const membros = await Usuario.findAll({ where: { casa_id: usuario.casa_id }, attributes: ['id'] })
  return membros.map(m => m.id)
}

// Dentro de uma casa só pode existir um local por nome (o mais antigo vale).
// Sem isso o "geladeira" de cada morador apareceria duplicado.
function deduplicarPorNome(locais) {
  const vistos = new Map()
  for (const local of locais) {
    if (!vistos.has(local.nome)) vistos.set(local.nome, local)
  }
  return Array.from(vistos.values())
}

async function locaisDaCasa(idsUsuarios) {
  const locais = await Local.findAll({
    where: { usuario_id: { [Op.in]: idsUsuarios } },
    order: [['id', 'ASC']]
  })
  return deduplicarPorNome(locais)
}

async function detalhesDaCasa(casaId) {
  const casa = await Casa.findByPk(casaId)
  if (!casa) return null

  const membros = await Usuario.findAll({
    where: { casa_id: casa.id },
    attributes: ['id', 'nome', 'email'],
    order: [['id', 'ASC']]
  })

  return {
    id: casa.id,
    nome: casa.nome,
    codigo: casa.codigo,
    dono_id: casa.dono_id,
    limite_membros: MAX_MEMBROS,
    membros: membros.map(m => ({ id: m.id, nome: m.nome, email: m.email }))
  }
}

async function criarCasa(usuario, nome) {
  if (usuario.casa_id) throw new ErroCasa(409, 'Você já faz parte de uma casa.')

  const codigo = await gerarCodigoLivre()
  const primeiroNome = (usuario.nome || '').split(' ')[0]

  return sequelize.transaction(async (t) => {
    const casa = await Casa.create({
      nome: (nome || '').trim().slice(0, 60) || `Casa de ${primeiroNome}`,
      codigo,
      dono_id: usuario.id
    }, { transaction: t })

    await usuario.update({ casa_id: casa.id }, { transaction: t })
    return casa
  })
}

async function entrarNaCasa(usuario, codigo) {
  if (usuario.casa_id) throw new ErroCasa(409, 'Saia da sua casa atual antes de entrar em outra.')

  const casa = await Casa.findOne({ where: { codigo: String(codigo || '').trim().toUpperCase() } })
  if (!casa) throw new ErroCasa(404, 'Não encontramos uma casa com esse código.')

  const total = await Usuario.count({ where: { casa_id: casa.id } })
  if (total >= MAX_MEMBROS) throw new ErroCasa(403, `Essa casa já tem ${MAX_MEMBROS} moradores, que é o limite.`)

  await sequelize.transaction(async (t) => {
    const membros = await Usuario.findAll({ where: { casa_id: casa.id }, attributes: ['id'], transaction: t })
    const locaisCasa = deduplicarPorNome(await Local.findAll({
      where: { usuario_id: { [Op.in]: membros.map(m => m.id) } },
      order: [['id', 'ASC']],
      transaction: t
    }))

    // O que a pessoa já tinha cadastrado vai pros locais da casa quando o nome bate
    // (a "geladeira" dela vira a "geladeira" da casa); os que a casa ainda não tem ela traz consigo.
    const meusLocais = await Local.findAll({ where: { usuario_id: usuario.id }, transaction: t })
    for (const meu of meusLocais) {
      const daCasa = locaisCasa.find(l => l.nome === meu.nome)
      if (!daCasa) continue

      await Item.update({ local_id: daCasa.id }, { where: { local_id: meu.id }, transaction: t })
      await meu.destroy({ transaction: t })
    }

    await usuario.update({ casa_id: casa.id }, { transaction: t })
  })

  return casa
}

// Tira o usuário da casa (ele mesmo saindo, ou o dono removendo alguém).
// Quem sai leva cópias dos locais com os itens que cadastrou; os locais originais
// ficam com a casa pra ninguém perder o que já estava lá.
async function removerDaCasa(usuario) {
  if (!usuario.casa_id) throw new ErroCasa(400, 'Você não faz parte de uma casa.')

  const casa = await Casa.findByPk(usuario.casa_id)

  await sequelize.transaction(async (t) => {
    const restantes = await Usuario.findAll({
      where: { casa_id: usuario.casa_id, id: { [Op.ne]: usuario.id } },
      order: [['id', 'ASC']],
      transaction: t
    })

    if (!restantes.length) {
      // era o último morador: a casa deixa de existir e ele fica com tudo como está
      if (casa) await casa.destroy({ transaction: t })
      await usuario.update({ casa_id: null }, { transaction: t })
      return
    }

    const herdeiro = restantes.find(u => u.id === casa.dono_id) || restantes[0]
    const idsMembros = [usuario.id, ...restantes.map(u => u.id)]

    const locaisCasa = await Local.findAll({
      where: { usuario_id: { [Op.in]: idsMembros } },
      order: [['id', 'ASC']],
      transaction: t
    })

    // 1. cópia de cada local da casa, própria de quem sai, e os itens dele passam pra ela
    const copias = new Map()
    for (const local of locaisCasa) {
      if (!copias.has(local.nome)) {
        copias.set(local.nome, await Local.create({ nome: local.nome, usuario_id: usuario.id }, { transaction: t }))
      }
    }
    for (const local of locaisCasa) {
      await Item.update(
        { local_id: copias.get(local.nome).id },
        { where: { usuario_id: usuario.id, local_id: local.id }, transaction: t }
      )
    }

    // 2. os locais originais que eram dele passam pra quem fica
    for (const local of locaisCasa.filter(l => l.usuario_id === usuario.id)) {
      const equivalente = locaisCasa.find(l => l.nome === local.nome && l.usuario_id !== usuario.id)
      if (equivalente) {
        await Item.update({ local_id: equivalente.id }, { where: { local_id: local.id }, transaction: t })
        await local.destroy({ transaction: t })
      } else {
        await local.update({ usuario_id: herdeiro.id }, { transaction: t })
      }
    }

    if (casa.dono_id === usuario.id) {
      await casa.update({ dono_id: herdeiro.id }, { transaction: t })
    }
    await usuario.update({ casa_id: null }, { transaction: t })
  })
}

async function renovarCodigo(casa) {
  const codigo = await gerarCodigoLivre()
  await casa.update({ codigo })
  return codigo
}

module.exports = {
  ErroCasa,
  MAX_MEMBROS,
  idsDaCasa,
  locaisDaCasa,
  detalhesDaCasa,
  criarCasa,
  entrarNaCasa,
  removerDaCasa,
  renovarCodigo
}
