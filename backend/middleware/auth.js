const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'chave_secreta'

// Verifica o token JWT enviado no header Authorization e injeta o id do
// usuário autenticado em req.usuarioId. Sem isso, qualquer rota que confiasse
// no usuario_id enviado pelo próprio cliente podia ser usada pra ler/escrever
// dados de qualquer outra conta.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Você precisa estar logado.' })
  }

  try {
    const payload = jwt.verify(token, SECRET)
    req.usuarioId = payload.id
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' })
  }
}

module.exports = { authMiddleware, SECRET }
