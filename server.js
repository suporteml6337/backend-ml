const express = require("express");
const axios = require("axios");
const { Buffer } = require("buffer");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Sua chave secreta do Payevo
const SECRET_KEY = "sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g";

// Codifica autenticação Basic Auth
const basicAuth = "Basic " + Buffer.from(`${SECRET_KEY}:x`).toString("base64");

// Middleware de CORS
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

// Rota pra gerar PIX
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

  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados obrigatórios faltando" });
  }

  try {
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
        timeout: 4000
      }
    );

    console.log("📨 Resposta da API Payevo:", apiResponse.data);

    // ✅ Validação robusta pra evitar erro
    const pixCode = apiResponse.data?.pix?.qrcode;

    if (!pixCode) {
      console.warn("⚠️ QR Code não encontrado na resposta da API");
      
      const pixFallback = gerarPixFallback(customerName, cpf, street, city, amount, productId);
      let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixFallback)}&produto=${encodeURIComponent(productId || "")}&cpf=${encodeURIComponent(cpf)}`;

      return res.json({
        redirect: redirectUrl,
        fallback: true,
        details: "API Payevo não retornou 'pix.qrcode'. Usando fallback."
      });
    }

    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixCode)}&produto=${encodeURIComponent(productId)}&cpf=${encodeURIComponent(cpf)}`;

    res.json({ redirect: redirectUrl });

  } catch (err) {
    console.error("🚨 Erro ao gerar PIX:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data || null,
      request: !!err.request
    });

    const pixFallback = gerarPixFallback(customerName, cpf, street, city, amount, productId);

    redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixFallback)}&produto=${encodeURIComponent(productId)}&cpf=${encodeURIComponent(cpf)}`;

    return res.status(500).json({
      redirect: redirectUrl,
      fallback: true,
      details: "Falha completa na API Payevo. Usando PIX simulado.",
      error: err.message
    });
  }
});

// Função de fallback pra gerar copiacola local
function gerarPixFallback(nome, cpf, rua, cidade, amount, produtoID) {
  const valorFormatado = (amount / 100).toFixed(2); // 17175 → 171.75
  const guid = Math.random().toString(36).substring(2, 15);
  return `00020126580014br.gov.bcb.pix0136${guid}${cpf}0212${nome}030452040406${valorFormatado}5802BR5911PAYFLEXLTDA6009${cidade}62250521mpqrinter11313632562063043031`;
}

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});
