const { hoje } = require('../utils/datas')

// Beta gratuito: cada conta tem uma cota única de usos de IA por mês (foto, nota fiscal,
// receita e assistente contam igual). Contas 'premium' e 'admin' não têm limite.
const LIMITE_IA_MENSAL = Number(process.env.LIMITE_IA_GRATIS) || 20

class ErroCotaIA extends Error {
  constructor(usados) {
    super(`Você usou seus ${LIMITE_IA_MENSAL} usos de IA deste mês. Eles voltam no dia 1º.`)
    this.status = 403
    this.usados = usados
  }
}

function limitada(usuario) {
  return usuario.nivel === 'comum'
}

function mesAtual() {
  return hoje().slice(0, 7)
}

// usos já feitos no mês corrente (o contador "zera" sozinho quando o mês vira)
function usosNoMes(usuario) {
  return usuario.usos_ia_mes === mesAtual() ? usuario.usos_ia : 0
}

// chamar ANTES de gastar IA: lança ErroCotaIA se a conta já esgotou o mês
function verificarCota(usuario) {
  if (!limitada(usuario)) return
  const usados = usosNoMes(usuario)
  if (usados >= LIMITE_IA_MENSAL) throw new ErroCotaIA(usados)
}

// chamar DEPOIS de a IA responder com sucesso: falha da IA não gasta a cota do usuário
async function registrarUso(usuario) {
  if (!limitada(usuario)) return
  await usuario.update({ usos_ia: usosNoMes(usuario) + 1, usos_ia_mes: mesAtual() })
}

function resumoCota(usuario) {
  return {
    usosIA: limitada(usuario) ? usosNoMes(usuario) : 0,
    limiteIA: limitada(usuario) ? LIMITE_IA_MENSAL : null
  }
}

module.exports = { LIMITE_IA_MENSAL, ErroCotaIA, verificarCota, registrarUso, resumoCota }
