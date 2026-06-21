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

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


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

    // 4. Ler imagem em base64
    const imageBase64 = fs.readFileSync(req.file.path, {
      encoding: "base64",
    });

    // 5. Chamar API Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype, // "image/jpeg", "image/png", etc.
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const text = response.response.text();
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

    res.json({ resultado: resultadoFinal });

  } catch (error) {
    console.log("🔥 ERRO:", error.message);
    res.status(500).json({ error: "Erro na IA" });
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

await sequelize.sync({ alter: true });
    console.log("Tabelas sincronizadas!");

    console.log(`Backend rodando na porta ${PORT}`);
  } catch (err) {
    console.error("Erro ao conectar/sincronizar banco:", err);
  }
});