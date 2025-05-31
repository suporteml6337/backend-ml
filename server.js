const express = require("express");
const axios = require("axios");
const { Buffer } = require("buffer");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Sua chave secreta do Payevo
const SECRET_KEY = "sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g";

// Codifica autenticação Basic Auth
const basicAuth = "Basic " + Buffer.from(`${SECRET_KEY}:x`).toString("base64`);

// ✅ Middleware de CORS atualizado
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = "https://appmercadodigital.com"; 

  if (!origin || origin === allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Trata preflight
  }

  next();
});

app.use(express.json());

// Rota POST pra gerar PIX
app.post("/gerar-pix", async (req, res) => {
  const {
    amount,
    customerName,
    customerEmail,
    cpf,
    street,
    streetNumber,
    neighborhood,
    city,
    state = "SP",
    country = "BR",
    phone,
    productId
  } = req.body;

  // Campos obrigatórios
  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados obrigatórios faltando" });
  }

  try {
    // Envia pra API Payevo com timeout menor
    const apiResponse = await axios.post(
      "https://api.payevo.com.br/functions/v1/transactions", 
      {
        amount,
        description: `Compra via PIX - ${customerName}`,
        paymentMethod: "PIX",
        customer: {
          name: customerName,
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
            state,
            country
          }
        },
        items: [{
          title: "Produto Comprado",
          unitPrice: amount,
          quantity: 1
        }]
      },
      {
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 4000 // ⏱️ Reduzido pra evitar lentidão
      }
    );

    // ✅ Validação robusta da resposta
    const pixCode = apiResponse.data?.pix?.qrcode;
    if (!pixCode) {
      console.error("❌ QR Code não encontrado na resposta da API:", apiResponse.data);
      return res.status(504).json({
        error: "Falha na resposta da API Payevo",
        details: "QR Code não foi retornado pela API",
        data: apiResponse.data
      });
    }

    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixCode)}`;
    if (productId) redirectUrl += `&produto=${encodeURIComponent(productId)}`;
    if (cpf) redirectUrl += `&cpf=${encodeURIComponent(cpf)}`;

    res.json({ redirect: redirectUrl });

  } catch (err) {
    // ✅ Tratamento de erro detalhado
    let errorMessage = err.message;

    if (err.response) {
      errorMessage = `API Respondeu (${err.response.status}): ${JSON.stringify(err.response.data)}`;
    } else if (err.request) {
      errorMessage = `Timeout ou rede falhou. Nenhuma resposta da API.`;
    }

    console.error("🚨 Erro completo:", {
      message: err.message,
      request: err.request ? "Requisição feita, sem resposta clara" : null,
      response: err.response?.data || null,
      stack: err.stack
    });

    // ✅ Retorna erro com detalhes úteis pros clientes
    return res.status(500).json({
      error: "Falha ao gerar PIX",
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Inicia o servidor
app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});
