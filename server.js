const express = require("express");
const axios = require("axios");
const { Buffer } = require("buffer");

// ✅ Inicializa o servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Sua chave secreta do Payevo
const SECRET_KEY = "sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g";

// Codifica autenticação Basic Auth
const basicAuth = "Basic " + Buffer.from(`${SECRET_KEY}:x`).toString("base64");

// ✅ Middleware: CORS - Libera requisições do seu site
app.use((req, res, next) => {
  const allowedOrigin = 'https://appmercadodigital.com ';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Resposta ao preflight
  }

  next();
});

// ✅ Middleware para parsear JSON
app.use(express.json());

// Rota POST pra gerar PIX
app.post("/gerar-pix", async (req, res) => {
  const {
    amount,
    name: customerName,
    email: customerEmail,
    cpf,
    street,
    streetNumber,
    neighborhood,
    city,
    phone,
    productId
  } = req.body;

  // Valida campos mínimos pra gerar o PIX
  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados essenciais incompletos" });
  }

  // Dados da transação (campos obrigatórios)
  const data = {
    amount,
    description: `Compra via PIX`,
    paymentMethod: "PIX",
    customer: {
      name: customerName || "Cliente Desconhecido",
      email: customerEmail || "cliente@example.com",
      phone: phone || "+5511999998888",
      document: {
        number: cpf,
        type: "CPF"
      },
      address: {
        street,
        streetNumber,
        complement: "",
        zipCode: cpf.replace(/\D/g, "").slice(0, 8),
        neighborhood,
        city,
        state: "SP",
        country: "BR"
      }
    },
    items: [{
      title: "Produto Comprado",
      unitPrice: amount,
      quantity: 1
    }]
  };

  try {
    const response = await axios.post(
      "https://api.payevo.com.br/functions/v1/transactions ",
      data,
      {
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 10000
      }
    );

    const pixCode = response.data?.pix?.qrcode;
    if (!pixCode) {
      console.error("❌ QR Code não encontrado:", response.data);
      return res.status(500).json({ error: "QR Code não recebido da API" });
    }

    // ✅ Campos na URL agora são OPCIONAIS
    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixCode)}`;

    // ✅ Adiciona apenas se existirem
    if (productId) redirectUrl += `&produto=${encodeURIComponent(productId)}`;
    if (cpf) redirectUrl += `&cpf=${encodeURIComponent(cpf)}`;

    // ✅ Redireciona com os dados opcionais
    res.json({ redirect: redirectUrl });

  } catch (err) {
    let errorMessage = err.message;

    if (err.response) {
      errorMessage = `API Respondeu (${err.response.status}): ${JSON.stringify(err.response.data)}`;
    } else if (err.request) {
      errorMessage = `Sem resposta da API. Timeout ou rede falhou.`;
    }

    console.error("🚨 Erro completo:", err.toJSON ? err.toJSON() : err);

    return res.status(500).json({
      error: "Falha ao gerar PIX",
      details: errorMessage
    });
  }
});

// ✅ Rota GET raiz pra teste
app.get("/", (req, res) => {
  res.json({ status: "online", message: "Servidor funcionando!" });
});

// ✅ Inicia o servidor
app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});
