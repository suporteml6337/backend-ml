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

  // Valida campos essenciais
  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados essenciais incompletos" });
  }

  try {
    // Busca produto em tempo real no produtos.json
    const produtoRes = await axios.get("https://appmercadodigital.com/tela-02/page-cart/produtos.json ");
    const produto = produtoRes.data[productId];

    // Se não encontrar o produto, usa dados genéricos
    const productName = produto?.nome || "Produto Desconhecido";
    const productPrice = produto?.preco ? Math.round(parseFloat(produto.preco) * 100) : amount;

    // Dados da transação
    const data = {
      amount: productPrice,
      description: `Compra via PIX - ${productName}`,
      paymentMethod: "PIX",
      customer: {
        name: customerName || "Não informado",
        email: customerEmail || "cliente@example.com",
        phone: phone || "+5511999998888",
        document: {
          number: cpf,
          type: "CPF"
        },
        address: {
          street: street || "Não informado",
          streetNumber: streetNumber || "",
          complement: "",
          zipCode: cpf.replace(/\D/g, "").slice(0, 8),
          neighborhood: neighborhood || "Não informado",
          city: city || "Não informado",
          state,
          country
        }
      },
      items: [{
        title: productName,
        unitPrice: productPrice,
        quantity: 1
      }]
    };

    // Envia pra API do Payevo
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

    // ✅ Monta a URL final com os dados OPCIONAIS
    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixCode)}`;

    if (productId) redirectUrl += `&produto=${encodeURIComponent(productId)}`;
    if (cpf) redirectUrl += `&cpf=${encodeURIComponent(cpf)}`;

    // ✅ Redireciona pro cod.html com todos os dados
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
