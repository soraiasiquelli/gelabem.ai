require("dotenv").config();

const express = require('express')
const cors = require("cors")
const models = require('./models');
const multer = require("multer")
const upload = multer({dest: './uploads'})
const sequelize = require('./db'); 
const bcrypt = require('bcryptjs')



const axios = require('axios');

const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'chave_secreta'



const Item = models.Item;
const Categoria = models.Categoria
const Usuario = models.Usuario
const Local = models.Local
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

const LIMITE_IA_GRATIS = Number(process.env.LIMITE_IA_GRATIS) || 20


const fs = require('fs');

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

app.get('/itens', async (req, res) => {
  try {
    const usuarioId = Number(req.query.usuario_id)
    const where = { usuario_id: usuarioId }

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


app.post("/vision", upload.single("image"), async (req, res) => {
  console.log("🚀 Entrou na rota /vision");

  try {
    const usuarioId = Number(req.body.usuario_id)

    if (!usuarioId || Number.isNaN(usuarioId)) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: "Usuário não encontrado." })
    }

    const usuario = await Usuario.findByPk(usuarioId)

    if (!usuario) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: "Usuário não encontrado." })
    }

    if (usuario.nivel === 'comum' && usuario.usos_ia >= LIMITE_IA_GRATIS) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        error: "Você atingiu o limite gratuito de análises por IA. Faça upgrade pra premium pra continuar usando.",
        limite: LIMITE_IA_GRATIS,
        usados: usuario.usos_ia
      })
    }

    // 1. Buscar categorias no banco
    const categoriasDB = await Categoria.findAll();

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

Formato obrigatório:
[
  {
    "nome": "banana",
    "categoria": "Frutas",
    "quantidade": 3
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
    }));

    if (usuario.nivel === 'comum') {
      usuario.usos_ia += 1
      await usuario.save()
    }

    res.json({
      resultado: resultadoFinal,
      usosIA: usuario.usos_ia,
      limiteIA: LIMITE_IA_GRATIS
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

app.post('/itens', async (req, res) => {
  try {
    console.log("BODY RECEBIDO:", req.body);

    const item = await Item.create({
      nome: req.body.nome,
      quantidade: req.body.quantidade,
      categoria_id: Number(req.body.categoria),
      local_id: Number(req.body.local),
      usuario_id: Number(req.body.usuario_id)
    });

    res.json(item);

  } catch (err) {
    console.error("🔥 ERRO NO CREATE:", err);
    res.status(500).json({ error: err.message });
  }
});


app.post('/usuarios', async (req, res) => {
try {
    console.log("BODY RECEBIDO:", req.body);
    const senha = req.body.senha
    

    const saltos = 10

    const senhaHash = await bcrypt.hash(senha, saltos)

    const usuario = await Usuario.create({
          nome: req.body.nome,
          email: req.body.email,
          senha: senhaHash,
        });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel
      }
    });

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

      const token = jwt.sign(
        {id: usuario.id, email: usuario.email},
        SECRET,
        {expiresIn: '7d'}
      )
      
     res.json({
    token, // ← adiciona isso
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      nivel: usuario.nivel
    }
  })



    } catch (error) {
        console.log("Erro Login")
    }
})  

app.get('/usuarios/:usuarioId/armazenamentos', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId)
    const locais = await Local.findAll({ where: { usuario_id: usuarioId } })
    res.json(locais)
  } catch (err) {
    console.error("🔥 ERRO AO BUSCAR ARMAZENAMENTOS:", err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/usuarios/:usuarioId/armazenamentos', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId)
    const armazenamentos = req.body.armazenamentos

    const usuario = await Usuario.findByPk(usuarioId)
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario não encontrado' })
    }

    const existentes = await Local.findAll({ where: { usuario_id: usuarioId } })
    const nomesExistentes = existentes.map(local => local.nome)

    const novos = armazenamentos.filter(nome => !nomesExistentes.includes(nome))

    if (novos.length) {
      await Local.bulkCreate(novos.map(nome => ({ nome, usuario_id: usuarioId })))
    }

    const locais = await Local.findAll({ where: { usuario_id: usuarioId } })

    res.json(locais)
  } catch (err) {
    console.error("🔥 ERRO AO SALVAR ARMAZENAMENTOS:", err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/itens/:id', async (req, res) => {
  await Item.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Item removido' });
});

const PORT = process.env.PORT || 3000

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("Banco conectado!");

// alter:true acumula FKs/índices duplicados a cada restart até estourar o limite de chaves do MySQL — ver histórico de constraints duplicadas em locais/itens
await sequelize.sync();
    console.log("Tabelas sincronizadas!");

    console.log(`Backend rodando na porta ${PORT}`);
  } catch (err) {
    console.error("Erro ao conectar/sincronizar banco:", err);
  }
});