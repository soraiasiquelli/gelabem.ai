require("dotenv").config();

const express = require('express')
const cors = require("cors")
const models = require('./models');
const multer = require("multer")
const upload = multer({dest: './uploads'})
const sequelize = require('./db');
const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')



const axios = require('axios');

const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { OAuth2Client } = require('google-auth-library')
const { authMiddleware, SECRET } = require('./middleware/auth');
const { carregarCasa } = require('./middleware/casa');
const { locaisDaCasa } = require('./services/casa');
const { hoje, somarDias, diasAte, dataValida, validadeEmDias } = require('./utils/datas');
const { descreverItens, REGRA_VALIDADE } = require('./utils/itens');

// rotas que enxergam o que é compartilhado na casa (req.idsCasa) além do usuário logado
const auth = [authMiddleware, carregarCasa]

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const Item = models.Item;
const Categoria = models.Categoria
const Usuario = models.Usuario
const Local = models.Local
const ListaCompras = models.ListaCompras
const app = express();

app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

const Anthropic = require('@anthropic-ai/sdk');
const sharp = require('sharp');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const { ErroCotaIA, verificarCota, registrarUso, resumoCota } = require('./services/cotaIA')
const cacheSugestoes = require('./services/cacheSugestoes')

const LOCAIS_VALIDOS = ['geladeira', 'freezer', 'despensa', 'frigobar']

const fs = require('fs');

app.use('/casa', require('./routes/casa'))
app.use('/feedback', require('./routes/feedback'))

// Todo usuário novo começa com uma geladeira, pra ir direto pra foto sem escolher nada antes.
async function criarLocaisIniciais(usuarioId) {
  await Local.create({ nome: 'geladeira', usuario_id: usuarioId })
}

function montarSessao(usuario) {
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    SECRET,
    { expiresIn: '7d' }
  )

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      nivel: usuario.nivel
    }
  }
}

app.get('/', (req, res) => {
    res.send('API rodando')

}) 

app.get('/categorias', async (req, res) => {
  try {
    const categorias = await Categoria.findAll();
    res.json(categorias);
  } catch (error) {
    console.log("ERRO NO GET /CATEGORIAS:", error);
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
});

app.get('/itens', auth, async (req, res) => {
  try {
    const where = { usuario_id: { [Op.in]: req.idsCasa } }

    if (req.query.local_id) {
      where.local_id = Number(req.query.local_id)
    }

    const itens = await Item.findAll({ where });
    res.json(itens);
  } catch (error) {
    console.log("ERRO NO GET /ITENS:", error);
    res.status(500).json({ error: "Erro ao buscar itens" });
  }
});

// Quanto da cota mensal de IA o usuário já usou (limiteIA null = sem limite)
app.get('/uso-ia', authMiddleware, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuarioId)
    if (!usuario) return res.status(401).json({ error: "Usuário não encontrado." })
    res.json(resumoCota(usuario))
  } catch (error) {
    console.log("ERRO NO GET /USO-IA:", error);
    res.status(500).json({ error: "Erro ao buscar o uso de IA" });
  }
});

// Itens que já venceram ou vencem nos próximos `dias` dias (padrão 3), do que vence primeiro pro último.
app.get('/itens-vencendo', auth, async (req, res) => {
  try {
    const dias = Math.min(Math.max(parseInt(req.query.dias, 10) || 3, 0), 30)

    const itens = await Item.findAll({
      where: {
        usuario_id: { [Op.in]: req.idsCasa },
        data_validade: { [Op.ne]: null, [Op.lte]: somarDias(hoje(), dias) }
      },
      include: [{ model: Local, attributes: ['nome'] }],
      order: [['data_validade', 'ASC']]
    })

    res.json(itens.map(item => ({ ...item.toJSON(), dias_restantes: diasAte(item.data_validade) })))
  } catch (error) {
    console.log("ERRO NO GET /ITENS-VENCENDO:", error);
    res.status(500).json({ error: "Erro ao buscar itens que vencem em breve" });
  }
});

app.post('/leitura-nota', authMiddleware, upload.single("image"), async (req, res) => {
  console.log("Entrou na rota de /leitura-nota")

  try {
    const usuario = await Usuario.findByPk(req.usuarioId)
    if (!usuario) {
      fs.unlinkSync(req.file.path)
      return res.status(401).json({ error: "Usuário não encontrado." })
    }
    verificarCota(usuario)

    // 1. Processa imagem e busca categorias ao mesmo tempo
    const [imageBuffer, categoriasDB] = await Promise.all([
      sharp(req.file.path)
        .resize({ width: 640, height: 1280, fit: 'inside' })
        .jpeg({ quality: 70 })
        .toBuffer(),
      Categoria.findAll()
    ])

    const imageBase64 = imageBuffer.toString('base64')

    const categoriasMap = {}
    categoriasDB.forEach(cat => {
      categoriasMap[cat.nome.toLowerCase()] = cat.id
    })

    // 2. Prompt simplificado
    const prompt = `Leia esta nota fiscal. Retorne APENAS JSON com itens alimentícios. Ignore higiene/limpeza.
Categorias: ${categoriasDB.map(c => c.nome).join(', ')}
"dias_validade": estimativa de quantos dias o item dura a partir da compra, guardado do jeito normal (null se não estraga ou se não der pra estimar).
Formato: [{"nome":"Arroz","quantidade":2,"categoria":"Grãos e Cereais","unidade":"un","dias_validade":180}]`

    // 3. Chamar o Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: prompt }
        ]
      }]
    })

    const text = response.content.find(b => b.type === 'text')?.text || ''
    fs.unlinkSync(req.file.path)

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const resultado = JSON.parse(cleanText)

    const resultadoFinal = resultado.map(item => ({
      nome: item.nome,
      quantidade: Number(item.quantidade) || 1,
      categoria: item.categoria,
      categoria_id: categoriasMap[item.categoria?.toLowerCase()] || null,
      unidade: item.unidade || 'un',
      validade_sugerida: item.dias_validade == null ? null : validadeEmDias(item.dias_validade)
    }))

    await registrarUso(usuario)

    res.json({ resultado: resultadoFinal, ...resumoCota(usuario) })

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    if (error instanceof ErroCotaIA) {
      return res.status(403).json({ error: error.message })
    }
    console.error("🔥 ERRO NO /leitura-nota:", error)
    res.status(500).json({ error: "Erro ao processar a nota fiscal." })
  }
})

app.post("/vision", authMiddleware, upload.single("image"), async (req, res) => {
  console.log("🚀 Entrou na rota /vision");

  try {
    const usuarioId = req.usuarioId

    const usuario = await Usuario.findByPk(usuarioId)

    if (!usuario) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: "Usuário não encontrado." })
    }

    try {
      verificarCota(usuario)
    } catch (erroCota) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: erroCota.message, ...resumoCota(usuario) })
    }

    // 1. Buscar categorias no banco
    const categoriasDB = await Categoria.findAll();

    // a estimativa de validade muda muito com onde o alimento fica guardado
    const local = LOCAIS_VALIDOS.includes(req.body.local) ? req.body.local : 'geladeira'

    // 2. Montar prompt
    const prompt = `
Você é um sistema de organização de geladeira.
Analise a imagem e identifique os alimentos visíveis.
Retorne APENAS JSON válido, sem markdown, sem explicações.

Categorias permitidas:
${categoriasDB.map(c => `- ${c.nome}`).join("\n")}

Regras:
- não invente categorias, use exatamente os nomes acima
- cada tipo diferente de alimento deve ser um item separado na lista
- "quantidade" deve ser a quantidade real daquele alimento visível na imagem
- "confianca" é "alta" quando você tem certeza do que é o alimento, e "baixa" quando está em dúvida (embalagem parcialmente visível, alimento coberto, item ambíguo)
- "dias_validade" é uma estimativa realista de quantos dias, a partir de hoje, o alimento ainda dura guardado em: ${local}. Use null se ele não estraga (sal, açúcar) ou se não der pra estimar. Seja conservador: é melhor avisar cedo do que tarde.

Formato obrigatório:
[
  {
    "nome": "banana",
    "categoria": "Frutas",
    "quantidade": 3,
    "confianca": "alta",
    "dias_validade": 5
  }
]
`;

    // 4. Redimensionar a imagem (reduz custo/tempo de análise) e converter pra base64
    const imageBuffer = await sharp(req.file.path)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    const imageBase64 = imageBuffer.toString('base64');

    // 5. Chamar API Claude (com retry em caso de sobrecarga temporária - erro 529)
    const TENTATIVAS = 3
    let response
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: prompt }
            ]
          }]
        });
        break
      } catch (erroClaude) {
        const sobrecarregado = erroClaude.status === 529 || erroClaude.error?.error?.type === 'overloaded_error'
        if (!sobrecarregado || tentativa === TENTATIVAS) throw erroClaude
        console.log(`⏳ Claude sobrecarregado, tentativa ${tentativa}/${TENTATIVAS}, tentando de novo...`)
        await new Promise(resolve => setTimeout(resolve, tentativa * 1500))
      }
    }

    const text = response.content.find(b => b.type === 'text')?.text || ''
    console.log("IA respondeu:", text);

    fs.unlinkSync(req.file.path);

    // 6. Limpar e parsear JSON
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const resultado = JSON.parse(cleanText);

    const resultadoFinal = resultado.map(item => ({
      nome: item.nome,
      categoria: item.categoria,
      quantidade: Number(item.quantidade) || 1,
      confianca: item.confianca === 'baixa' ? 'baixa' : 'alta',
      validade_sugerida: item.dias_validade == null ? null : validadeEmDias(item.dias_validade),
    }));

    await registrarUso(usuario)

    res.json({
      resultado: resultadoFinal,
      ...resumoCota(usuario)
    });

  } catch (error) {
    console.log("🔥 ERRO:", error.message);
    const sobrecarregado = error.status === 529 || error.error?.error?.type === 'overloaded_error'
    res.status(sobrecarregado ? 503 : 500).json({
      error: sobrecarregado
        ? "A IA está sobrecarregada no momento. Tente novamente em alguns instantes."
        : "Erro na IA"
    });
  }
});

app.post('/gerar-receita', auth, async(req, res) => {
  try {
    console.log("Entrou na rota /gerar-receita ")

    const usuario = await Usuario.findByPk(req.usuarioId)
    if (!usuario) {
      return res.status(401).json({ error: "Usuário não encontrado." })
    }
    verificarCota(usuario)

    const localID = req.body.local_id ? Number(req.body.local_id) : null
    const itemIds = Array.isArray(req.body.item_ids)
      ? req.body.item_ids.map(Number).filter(id => !Number.isNaN(id))
      : []

    const where = { usuario_id: { [Op.in]: req.idsCasa } }
    if (itemIds.length) {
      where.id = { [Op.in]: itemIds }
    } else if (localID) {
      where.local_id = localID
    }

    const itens = await Item.findAll({ where, include: Categoria })

    if (!itens.length) {
      return res.status(404).json({ error: "Nenhum item encontrado para gerar uma receita." })
    }

    const prompt = `Você é um chef de cozinha. Com base nos itens disponíveis abaixo, sugira UMA receita prática e gostosa, usando o máximo possível desses itens. Pode sugerir itens extras simples (sal, óleo, água, temperos básicos) se necessário, mas marque-os como "ingredientesFaltantes".
${REGRA_VALIDADE}

Itens disponíveis:
${descreverItens(itens)}

Retorne APENAS JSON válido, sem markdown, sem explicações, no formato:
{
  "titulo": "Nome da receita",
  "tempoPreparo": "30 minutos",
  "porcoes": 4,
  "ingredientesUsados": ["item 1", "item 2"],
  "ingredientesFaltantes": ["item que precisa comprar"],
  "modoPreparo": ["passo 1", "passo 2"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content.find(b => b.type === 'text')?.text || ''
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const receita = JSON.parse(cleanText)

    await registrarUso(usuario)

    res.json({ receita, ...resumoCota(usuario) })

  } catch (error) {
      if (error instanceof ErroCotaIA) {
        return res.status(403).json({ error: error.message })
      }
      console.log("ERRO", error)
      res.status(500).json({ error: "Erro ao gerar a receita." })
  }
})

app.post('/itens', auth, async (req, res) => {
  try {
    console.log("BODY RECEBIDO:", req.body);

    const item = await Item.create({
      nome: req.body.nome,
      quantidade: req.body.quantidade,
      categoria_id: Number(req.body.categoria),
      local_id: Number(req.body.local),
      usuario_id: req.usuarioId,
      unidade: req.body.unidade,
      quantidade_minima: req.body.quantidade_minima,
      data_validade: dataValida(req.body.data_validade)
    });

    res.json(item);

  } catch (err) {
    console.error("🔥 ERRO NO CREATE:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/itens/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id)
    if (!item || !req.idsCasa.includes(item.usuario_id)) {
      return res.status(404).json({ error: "Item não encontrado" })
    }
    res.json(item)
  } catch (error) {
    console.log("ERRO NO GET /ITENS/:id:", error);
    res.status(500).json({ error: "Erro ao buscar item" });
  }
});

app.put('/itens/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id)
    if (!item || !req.idsCasa.includes(item.usuario_id)) {
      return res.status(404).json({ error: "Item não encontrado" })
    }

    await item.update({
      nome: req.body.nome,
      quantidade: req.body.quantidade,
      categoria_id: Number(req.body.categoria),
      local_id: Number(req.body.local),
      unidade: req.body.unidade,
      quantidade_minima: req.body.quantidade_minima,
      data_validade: dataValida(req.body.data_validade)
    });

    res.json(item);

  } catch (err) {
    console.error("🔥 ERRO NO UPDATE:", err);
    res.status(500).json({ error: err.message });
  }
});

// Baixa (ou reposição) rápida: soma `delta` à quantidade. Se chegar a zero o item sai
// da cozinha ("acabou"); a resposta traz `removido: true` pra tela poder oferecer
// colocar o item na lista de compras.
app.patch('/itens/:id/quantidade', auth, async (req, res) => {
  try {
    const delta = Number(req.body.delta)
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
      return res.status(400).json({ error: "Informe uma quantidade válida." })
    }

    const item = await Item.findByPk(req.params.id)
    if (!item || !req.idsCasa.includes(item.usuario_id)) {
      return res.status(404).json({ error: "Item não encontrado" })
    }

    const novaQuantidade = item.quantidade + delta

    if (novaQuantidade <= 0) {
      const snapshot = item.toJSON()
      await item.destroy()
      return res.json({ removido: true, item: snapshot })
    }

    await item.update({ quantidade: novaQuantidade })
    res.json({ removido: false, item })

  } catch (err) {
    console.error("🔥 ERRO NO PATCH /itens/:id/quantidade:", err);
    res.status(500).json({ error: "Erro ao atualizar a quantidade." });
  }
});

app.get("/itens-acabando/:usuarioId", auth, async (req, res) => {
  try {
    if (Number(req.params.usuarioId) !== req.usuarioId) {
      return res.status(403).json({ error: "Acesso negado." })
    }

    const itens = await Item.findAll({
      where: { usuario_id: { [Op.in]: req.idsCasa } }
    })

    const itensAcabando = itens.filter(item =>
      item.quantidade_minima !== null &&
      item.quantidade <= item.quantidade_minima
    )

    res.json(itensAcabando)

  } catch (err) {
    console.error("Erro ao buscar itens acabando:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/usuarios', async (req, res) => {
try {
    console.log("BODY RECEBIDO:", { ...req.body, senha: '***' });
    const { nome, email, senha } = req.body

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' })
    }

    if (await Usuario.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'Esse e-mail já tem uma conta. Entre ou use outro e-mail.' })
    }

    const saltos = 10

    const senhaHash = await bcrypt.hash(senha, saltos)

    const usuario = await Usuario.create({
          nome,
          email,
          senha: senhaHash,
        });

    await criarLocaisIniciais(usuario.id)

    res.json(montarSessao(usuario));

  } catch (err) {
    console.error("🔥 ERRO NO CREATE:", err);
    res.status(500).json({ error: err.message });
  }
});



app.post('/login', async(req, res) => {
    try {
      console.log("Body recebido", req.body)

      const {email, senha} = req.body

      const usuario = await Usuario.findOne({
        where: {email}
      })

      if(!usuario){
        return res.status(404).json({error: 'Usuario não encontrado'})
      }
      
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
      if(!senhaCorreta){
        return res.status(401).json({error: 'Senha incorreta'})
      }

      res.json(montarSessao(usuario))

    } catch (error) {
        console.error("🔥 ERRO NO LOGIN:", error)
        res.status(500).json({ error: "Erro ao entrar. Tente novamente." })
    }
})

// Entrar/criar conta com Google. O front manda o ID token que o Google entregou ao usuário;
// só confiamos nele depois de validar assinatura e audiência com o client id do app.
app.post('/login/google', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Login com Google não está configurado.' })
    }

    const credential = req.body.credential
    if (!credential) {
      return res.status(400).json({ error: 'Credencial do Google não enviada.' })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    const dados = ticket.getPayload()

    if (!dados?.email || !dados.email_verified) {
      return res.status(401).json({ error: 'Sua conta Google precisa ter o e-mail verificado.' })
    }

    let usuario = await Usuario.findOne({ where: { google_id: dados.sub } })
    let novo = false

    if (!usuario) {
      usuario = await Usuario.findOne({ where: { email: dados.email } })

      if (usuario) {
        // já existia conta com esse e-mail (cadastro por senha): vincula ao Google
        await usuario.update({ google_id: dados.sub })
      } else {
        // conta criada pelo Google não tem senha própria; guardamos um hash aleatório
        // só pra coluna obrigatória, ninguém consegue entrar por senha com ele
        const senhaAleatoria = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
        usuario = await Usuario.create({
          nome: dados.name || dados.email.split('@')[0],
          email: dados.email,
          senha: senhaAleatoria,
          google_id: dados.sub
        })
        await criarLocaisIniciais(usuario.id)
        novo = true
      }
    }

    res.json({ ...montarSessao(usuario), novo })

  } catch (error) {
    console.error("🔥 ERRO NO LOGIN GOOGLE:", error.message)
    res.status(401).json({ error: "Não foi possível entrar com o Google. Tente novamente." })
  }
})

app.get('/usuarios/:usuarioId/armazenamentos', auth, async (req, res) => {
  try {
    if (Number(req.params.usuarioId) !== req.usuarioId) {
      return res.status(403).json({ error: "Acesso negado." })
    }
    res.json(await locaisDaCasa(req.idsCasa))
  } catch (err) {
    console.error("🔥 ERRO AO BUSCAR ARMAZENAMENTOS:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/usuarios/:usuarioId/armazenamentos', auth, async (req, res) => {
  try {
    if (Number(req.params.usuarioId) !== req.usuarioId) {
      return res.status(403).json({ error: "Acesso negado." })
    }
    const usuarioId = req.usuarioId
    const armazenamentos = req.body.armazenamentos

    const usuario = await Usuario.findByPk(usuarioId)
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario não encontrado' })
    }

    // compara com os locais da casa toda, senão cada morador criaria o seu "freezer"
    const nomesExistentes = (await locaisDaCasa(req.idsCasa)).map(local => local.nome)

    const novos = armazenamentos.filter(nome => !nomesExistentes.includes(nome))

    if (novos.length) {
      await Local.bulkCreate(novos.map(nome => ({ nome, usuario_id: usuarioId })))
    }

    res.json(await locaisDaCasa(req.idsCasa))
  } catch (err) {
    console.error("🔥 ERRO AO SALVAR ARMAZENAMENTOS:", err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/itens/:id', auth, async (req, res) => {
  const item = await Item.findByPk(req.params.id)
  if (!item || !req.idsCasa.includes(item.usuario_id)) {
    return res.status(404).json({ error: "Item não encontrado" })
  }
  await item.destroy();
  res.json({ message: 'Item removido' });
});

app.get('/lista-compras', auth, async (req, res) => {
  try {
    const itens = await ListaCompras.findAll({
      where: { usuario_id: { [Op.in]: req.idsCasa } },
      order: [['comprado', 'ASC'], ['id', 'DESC']]
    })
    res.json(itens)
  } catch (error) {
    console.log("ERRO NO GET /LISTA-COMPRAS:", error);
    res.status(500).json({ error: "Erro ao buscar lista de compras" });
  }
});

app.post('/lista-compras', auth, async (req, res) => {
  try {
    const item = await ListaCompras.create({
      nome: req.body.nome,
      quantidade: req.body.quantidade || 1,
      unidade: req.body.unidade || 'un',
      usuario_id: req.usuarioId
    });
    res.json(item);
  } catch (err) {
    console.error("🔥 ERRO NO CREATE LISTA-COMPRAS:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/lista-compras/:id', auth, async (req, res) => {
  try {
    const item = await ListaCompras.findByPk(req.params.id)
    if (!item || !req.idsCasa.includes(item.usuario_id)) {
      return res.status(404).json({ error: "Item não encontrado" })
    }

    const dados = {}
    if (req.body.nome !== undefined) dados.nome = req.body.nome
    if (req.body.quantidade !== undefined) dados.quantidade = req.body.quantidade
    if (req.body.unidade !== undefined) dados.unidade = req.body.unidade
    if (req.body.comprado !== undefined) dados.comprado = req.body.comprado

    await item.update(dados);
    res.json(item);
  } catch (err) {
    console.error("🔥 ERRO NO UPDATE LISTA-COMPRAS:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/lista-compras/:id', auth, async (req, res) => {
  const item = await ListaCompras.findByPk(req.params.id)
  if (!item || !req.idsCasa.includes(item.usuario_id)) {
    return res.status(404).json({ error: "Item não encontrado" })
  }
  await item.destroy();
  res.json({ message: 'Item removido' });
});

const OBJETIVOS_PROMPT = {
  economico: 'priorize receitas econômicas, que não exigem comprar muitos itens extras',
  rapido: 'priorize receitas rápidas de fazer',
  facil: 'priorize receitas fáceis, com poucos passos, boas pra quem não tem experiência',
  proteina: 'priorize receitas com boa quantidade de proteína',
  aproveitar: 'priorize receitas que aproveitem o máximo possível dos itens disponíveis, especialmente os que estão perto de acabar',
}

const TEMPO_PROMPT = {
  ate15: 'o tempo de preparo deve ser de até 15 minutos',
  ate30: 'o tempo de preparo deve ser de até 30 minutos',
  mais30: 'pode ser uma receita mais elaborada, com mais de 30 minutos de preparo',
}

// "O que posso cozinhar?" — sugere várias receitas com base no que o usuário tem
app.post('/receitas/sugestoes', auth, async (req, res) => {
  try {
    const localID = req.body.local_id ? Number(req.body.local_id) : null
    const tempo = TEMPO_PROMPT[req.body.tempo] || null
    const objetivo = OBJETIVOS_PROMPT[req.body.objetivo] || null
    const priorizar = Array.isArray(req.body.priorizar) ? req.body.priorizar.filter(Boolean) : []

    const where = { usuario_id: { [Op.in]: req.idsCasa } }
    if (localID) where.local_id = localID

    const itens = await Item.findAll({ where, include: Categoria })

    if (!itens.length) {
      return res.status(404).json({ error: "Adicione alimentos na sua cozinha pra receber sugestões de receita." })
    }

    // mesma cozinha, mesmos filtros e mesmo dia: reaproveita a resposta em vez de chamar a IA de novo
    const assinaturaItens = itens.map(i => `${i.id}:${i.quantidade}:${i.data_validade || ''}`).sort()
    const chaveCache = cacheSugestoes.chaveDe([req.idsCasa, localID, req.body.tempo, req.body.objetivo, priorizar, assinaturaItens, hoje()])
    const emCache = cacheSugestoes.obter(chaveCache)
    if (emCache) {
      return res.json({ receitas: emCache })
    }
    if (!cacheSugestoes.podeBuscarNova(req.usuarioId)) {
      return res.status(429).json({ error: "Muitas buscas seguidas. Espere alguns minutos e tente de novo." })
    }

    const restricoes = [tempo, objetivo].filter(Boolean)
    if (priorizar.length) {
      restricoes.push(`dê preferência a receitas que usem: ${priorizar.join(', ')}`)
    }

    const prompt = `Você é um chef de cozinha prático. Com base nos itens disponíveis abaixo, sugira de 3 a 4 receitas variadas e realistas, usando o máximo possível desses itens.
Pode sugerir itens extras simples (sal, óleo, água, temperos básicos) marcados como "ingredientesFaltantes".
${REGRA_VALIDADE}
Em "aproveitaVencendo" liste, com o nome exato do item, os que vencem em até 3 dias e são usados na receita (lista vazia se nenhum).

Itens disponíveis:
${descreverItens(itens)}

${restricoes.length ? `Preferências do usuário:\n- ${restricoes.join('\n- ')}\n` : ''}
Retorne APENAS JSON válido, sem markdown, sem explicações, no formato:
[
  {
    "titulo": "Nome da receita",
    "tempoPreparo": "25 minutos",
    "dificuldade": "Fácil",
    "porcoes": 4,
    "ingredientesUsados": ["item 1", "item 2"],
    "ingredientesFaltantes": ["item que precisa comprar"],
    "aproveitaVencendo": ["item que vence logo"],
    "modoPreparo": ["passo 1", "passo 2"]
  }
]`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content.find(b => b.type === 'text')?.text || ''
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const receitas = JSON.parse(cleanText)

    cacheSugestoes.guardar(chaveCache, receitas)

    res.json({ receitas })

  } catch (error) {
    console.error("ERRO EM /receitas/sugestoes", error)
    res.status(500).json({ error: "Erro ao buscar sugestões de receita." })
  }
})

// Assistente de cozinha — chat que conhece os alimentos do usuário
app.post('/chat', auth, async (req, res) => {
  try {
    const mensagem = (req.body.mensagem || '').trim()
    if (!mensagem) {
      return res.status(400).json({ error: "Escreva uma mensagem." })
    }

    const usuario = await Usuario.findByPk(req.usuarioId)
    if (!usuario) {
      return res.status(401).json({ error: "Usuário não encontrado." })
    }
    verificarCota(usuario)

    const historico = Array.isArray(req.body.historico) ? req.body.historico.slice(-10) : []

    const itens = await Item.findAll({ where: { usuario_id: { [Op.in]: req.idsCasa } } })
    const listaItens = itens.length
      ? descreverItens(itens).replace(/\n/g, ', ')
      : 'nenhum alimento cadastrado ainda'

    const system = `Você é o assistente de cozinha do Gelabem. Ajude o usuário a decidir o que cozinhar usando o que ele já tem em casa.
Alimentos que o usuário tem cadastrados agora: ${listaItens}.
${REGRA_VALIDADE}
Regras:
- respostas curtas, diretas e em português do Brasil, tom amigável e sem infantilizar
- quando sugerir uma receita, estruture com um título, o tempo estimado e o modo de preparo em passos curtos
- se faltar informação (tempo disponível, quantas pessoas, tipo de refeição), pergunte antes de sugerir
- nunca invente que o usuário tem um ingrediente que não está na lista acima
- se a lista de alimentos estiver vazia, sugira que ele fotografe a cozinha ou adicione itens manualmente`

    const messages = historico
      .filter(m => m && m.texto)
      .map(m => ({ role: m.autor === 'assistente' ? 'assistant' : 'user', content: String(m.texto) }))

    messages.push({ role: 'user', content: mensagem })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system,
      messages
    })

    const resposta = response.content.find(b => b.type === 'text')?.text || 'Não consegui responder agora, tenta de novo.'

    await registrarUso(usuario)

    res.json({ resposta, ...resumoCota(usuario) })

  } catch (error) {
    if (error instanceof ErroCotaIA) {
      return res.status(403).json({ error: error.message })
    }
    console.error("ERRO EM /chat", error)
    const sobrecarregado = error.status === 529 || error.error?.error?.type === 'overloaded_error'
    res.status(sobrecarregado ? 503 : 500).json({
      error: sobrecarregado
        ? "O assistente está sobrecarregado no momento. Tente novamente em instantes."
        : "Não foi possível responder agora."
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("Banco conectado!");

// alter:true acumula FKs/índices duplicados a cada restart até estourar o limite de chaves do MySQL — ver histórico de constraints duplicadas em locais/itens
await sequelize.sync({alter: true});
    console.log("Tabelas sincronizadas!");

    console.log(`Backend rodando na porta ${PORT}`);
  } catch (err) {
    console.error("Erro ao conectar/sincronizar banco:", err);
  }
});