const express = require("express");
const axios = require("axios");
const { Buffer } = require("buffer");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Sua chave secreta do Payevo
const SECRET_KEY = "sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g";
const basicAuth = "Basic " + Buffer.from(`${SECRET_KEY}:x`).toString("base64");

// Middleware de CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = "https://appmercadodigital.com"; 

  if (!origin || origin === allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }

  if (req.method === 'OPTIONS') return res.status(200).end();

  next();
});

app.use(express.json());

// Rota pra gerar PIX
app.post("/gerar-pix", async (req, res) => {
  const {
    amount,
    customerName,
    cpf,
    street,
    streetNumber,
    neighborhood,
    city,
    productId
  } = req.body;

  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados obrigatórios faltando" });
  }

  try {
    // Simula resposta rápida
    const pixFallback = gerarPixFallback(customerName, cpf, street, city, amount, productId);

    setTimeout(() => {
      let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixFallback)}&produto=${productId}&cpf=${cpf}`;
      res.json({ redirect: redirectUrl });
    }, 1500); // 1.5s é rápido o suficiente

  } catch (err) {
    console.error("🚨 Erro ao gerar PIX:", err.message);
    const pixFallback = gerarPixFallback(customerName, cpf, street, city, amount, productId);
    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixFallback)}&produto=${productId}&cpf=${cpf}`;
    res.status(500).json({ redirect: redirectUrl, fallback: true });
  }
});

function gerarPixFallback(nome, cpf, rua, cidade, amount, produtoID) {
  const valorFormatado = (amount / 100).toFixed(2);
  const guid = Math.random().toString(36).substring(2, 15);
  return `00020126580014br.gov.bcb.pix0136${guid}${cpf}0212${nome}030452040406${valorFormatado}5802BR5911PAYFLEXLTDA6009${cidade}62250521mpqrinter11313632562063043031`;
}

app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});
