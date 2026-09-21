// Idioma da resposta: o frontend manda `Accept-Language: pt | en`. Português é o padrão.
// As mensagens do servidor são escritas em português; em inglês são traduzidas por este dicionário
// (texto sem tradução sai em português, nunca quebra).

const EN = {
  'Erro ao buscar categorias': 'Error fetching categories',
  'Erro ao buscar itens': 'Error fetching items',
  'Usuário não encontrado.': 'User not found.',
  'Erro ao buscar o uso de IA': 'Error fetching AI usage',
  'Erro ao buscar itens que vencem em breve': 'Error fetching items expiring soon',
  'Erro ao processar a nota fiscal.': 'Error processing the receipt.',
  'Nenhum item encontrado para gerar uma receita.': 'No items found to generate a recipe.',
  'Erro ao gerar a receita.': 'Error generating the recipe.',
  'Item não encontrado': 'Item not found',
  'Erro ao buscar item': 'Error fetching item',
  'Informe uma quantidade válida.': 'Enter a valid quantity.',
  'Erro ao atualizar a quantidade.': 'Error updating the quantity.',
  'Acesso negado.': 'Access denied.',
  'Preencha nome, e-mail e senha.': 'Fill in name, email and password.',
  'Esse e-mail já tem uma conta. Entre ou use outro e-mail.': 'This email already has an account. Log in or use another email.',
  'Usuario não encontrado': 'User not found',
  'Senha incorreta': 'Wrong password',
  'Erro ao entrar. Tente novamente.': 'Error logging in. Please try again.',
  'Login com Google não está configurado.': 'Google login is not configured.',
  'Credencial do Google não enviada.': 'Google credential not sent.',
  'Sua conta Google precisa ter o e-mail verificado.': 'Your Google account must have a verified email.',
  'Não foi possível entrar com o Google. Tente novamente.': "We couldn't sign you in with Google. Please try again.",
  'Item removido': 'Item removed',
  'Erro ao buscar lista de compras': 'Error fetching the shopping list',
  'Adicione alimentos na sua cozinha pra receber sugestões de receita.': 'Add food to your kitchen to get recipe suggestions.',
  'Muitas buscas seguidas. Espere alguns minutos e tente de novo.': 'Too many searches in a row. Wait a few minutes and try again.',
  'Erro ao buscar sugestões de receita.': 'Error fetching recipe suggestions.',
  'Escreva uma mensagem.': 'Write a message.',
  'O assistente está sobrecarregado no momento. Tente novamente em instantes.': 'The assistant is overloaded right now. Please try again shortly.',
  'Não foi possível responder agora.': "We can't answer right now.",
  'Erro ao processar sua casa. Tente novamente.': 'Error processing your home. Please try again.',
  'Conta um pouco mais pra gente entender (mínimo 5 caracteres).': 'Tell us a bit more so we can understand (at least 5 characters).',
  'Mensagem muito longa (máximo 2000 caracteres).': 'Message too long (2000 characters max).',
  'Você já enviou várias sugestões hoje. Volte amanhã, obrigado!': "You've already sent several suggestions today. Come back tomorrow, thanks!",
  'Obrigado! Sua sugestão foi enviada.': 'Thank you! Your suggestion was sent.',
  'Não foi possível enviar agora. Tente novamente.': "We couldn't send it right now. Please try again.",
  'Erro ao buscar feedbacks.': 'Error fetching feedback.',
  'Você precisa estar logado.': 'You need to be logged in.',
  'Sua sessão expirou. Entre novamente.': 'Your session expired. Please log in again.',
  'Erro ao carregar seus dados.': 'Error loading your data.',
  'Você já faz parte de uma casa.': 'You are already part of a home.',
  'Saia da sua casa atual antes de entrar em outra.': 'Leave your current home before joining another one.',
  'Não encontramos uma casa com esse código.': "We couldn't find a home with that code.",
  'Você não faz parte de uma casa.': 'You are not part of a home.',
}

// mensagens com número no meio
const PADROES_EN = [
  [/^Você usou seus (\d+) usos de IA deste mês\. Eles voltam no dia 1º\.$/, 'You have used your $1 AI uses this month. They come back on the 1st.'],
  [/^Essa casa já tem (\d+) moradores, que é o limite\.$/, 'This home already has $1 members, which is the limit.'],
]

function idiomaDe(req) {
  const h = String((req.headers && req.headers['accept-language']) || '').trim().toLowerCase()
  return h.startsWith('en') ? 'en' : 'pt'
}

function traduzir(idioma, texto) {
  if (idioma !== 'en' || typeof texto !== 'string') return texto
  if (EN[texto]) return EN[texto]
  for (const [re, saida] of PADROES_EN) {
    if (re.test(texto)) return texto.replace(re, saida)
  }
  return texto
}

// middleware: define req.idioma e traduz `error`/`message`/`erro` de todo res.json
function middlewareIdioma(req, res, next) {
  req.idioma = idiomaDe(req)
  if (req.idioma === 'en') {
    const json = res.json.bind(res)
    res.json = (corpo) => {
      if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) {
        for (const chave of ['error', 'message']) {
          if (typeof corpo[chave] === 'string') corpo = { ...corpo, [chave]: traduzir('en', corpo[chave]) }
        }
      }
      return json(corpo)
    }
  }
  next()
}

// Linha para os prompts da IA (texto livre). Vazia em português, que já é o idioma dos prompts.
function instrucaoIdioma(req) {
  return req.idioma === 'en' ? 'IMPORTANT: write your entire answer in English.' : ''
}

module.exports = { idiomaDe, traduzir, middlewareIdioma, instrucaoIdioma }
