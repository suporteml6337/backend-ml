const express = require("express");
const axios = require("axios");
const { Buffer } = require("buffer");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Sua chave secreta do Payevo
const SECRET_KEY = "sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g";

// Codifica autenticação Basic Auth
const basicAuth = "Basic " + Buffer.from(`${SECRET_KEY}:x`).toString("base64");

app.use(express.json());

// Rota POST pra gerar PIX
app.post("/gerar-pix", async (req, res) => {
  const {
    amount,
    name,
    email,
    cpf,
    street,
    streetNumber,
    neighborhood,
    city,
    phone,
  } = req.body;

  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const data = {
    amount,
    description: `Compra de: ${name}`,
    paymentMethod: "PIX",
    customer: {
      name,
      email: email || "cliente@example.com",
      phone: phone || "+5511999998888",
      document: {
        number: cpf,
        type: "CPF",
      },
      address: {
        street,
        streetNumber,
        complement: "",
        zipCode: cpf.replace(/\D/g, "").slice(0, 8),
        neighborhood,
        city,
        state: "SP",
        country: "BR",
      },
    },
    items: [
      {
        title: name || "Produto Teste",
        unitPrice: amount,
        quantity: 1,
      },
    ],
  };

  try {
    const response = await axios.post(
      "https://api.payevo.com.br/functions/v1/transactions ",
      data,
      {
        headers: {
          Authorization: basicAffirmation,
        },
      }
    );

    const pixCode = response.data?.pix?.qrcode;
    if (!pixCode) {
      console.error("QR Code não encontrado:", response.data);
      return res.status(500).json({ error: "QR Code não recebido da API" });
    }

    res.json({
      redirect: `/cod.html?copiacola=${encodeURIComponent(pixCode)}`,
    });
  } catch (err) {
    console.error("Erro ao gerar PIX:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Falha ao gerar PIX",
      details: err.response?.data || err.message,
    });
  }
});

// Rota GET pra teste
app.get("/", (req, res) => {
  res.json({ status: "online", message: "Servidor funcionando!" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
