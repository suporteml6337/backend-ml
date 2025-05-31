const express = require("express");
const axios = require("axios");
const { Buffer } = require("buffer");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Sua chave secreta do Payevo
const SECRET_KEY = "sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g";

// Codifica autenticação Basic Auth
const basicAuth = "Basic " + Buffer.from(`${SECRET_KEY}:x`).toString("base64");

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

// Função para gerar payload PIX localmente (fallback)
function gerarPixFallback(customerName, cpf, street, city, amount) {
  // Exemplo simples de copiacola fixo pra teste
  const valorFormatado = (amount / 100).toFixed(2); // 17175 → 171.75

  // Simula um copiacola real
  return `00020126580014br.gov.bcb.pix0136fakesample-guid${cpf}0212Compra via PIX030452040406167.905802BR5911PAYFLEXLTDA6009SAOPAULO62250521mpqrinter113136325620630430316304${valorFormatado}`;
}

// Rota POST pra gerar PIX com fallback
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
    // Tenta chamar a API principal com timeout curto
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
        timeout: 4000 // ⏱️ Tempo reduzido pra evitar travamento
      }
    );

    // Se der certo, retorna o QR Code real
    const pixCode = apiResponse.data?.pix?.qrcode;

    if (pixCode) {
      let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixCode)}`;
      if (productId) redirectUrl += `&produto=${encodeURIComponent(productId)}`;
      if (cpf) redirectUrl += `&cpf=${encodeURIComponent(cpf)}`;

      return res.json({ redirect: redirectUrl });

    } else {
      console.warn("⚠️ API Payevo não retornou 'pix.qrcode'");
    }

  } catch (err) {
    console.error("🚨 Erro na API Payevo:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data || null,
      request: !!err.request,
      stack: err.stack
    });

    // Fallback: gera um PIX simulado
    const pixFallback = gerarPixFallback(customerName, cpf, city, amount);

    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixFallback)}&produto=${encodeURIComponent(productId || "")}&cpf=${encodeURIComponent(cpf)}`;

    return res.json({
      redirect: redirectUrl,
      fallback: true,
      details: "API Payevo fora do ar. Usando código PIX temporário."
    });
  }
});

// ✅ Inicia o servidor
app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});
