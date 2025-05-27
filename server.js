// Rota POST pra gerar PIX
app.post("https://backend-ml-1-4z88.onrender.com/gerar-pix", async (req, res) => {
  const {
    amount,
    name,
    email,
    cpf,
    street,
    streetNumber,
    neighborhood,
    city,
    phone
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
      document: { number: cpf, type: "CPF" },
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
      title: name || "Produto Teste",
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
          Accept: "application/json"
        },
        timeout: 10000
      }
    );

    const pixCode = response.data?.pix?.qrcode;
    if (!pixCode) {
      return res.status(500).json({
        error: "QR Code não recebido da API",
        api_response: response.data
      });
    }

    res.json({
      redirect: `/cod.html?copiacola=${encodeURIComponent(pixCode)}`
    });

  } catch (err) {
    let errorMessage = "Erro desconhecido";

    if (err.response) {
      // Erro com resposta da API Payevo
      errorMessage = `API Payevo respondeu com código ${err.response.status}: ` + JSON.stringify(err.response.data);
    } else if (err.request) {
      // Nenhuma resposta foi recebida
      errorMessage = `Sem resposta da API: ${err.message}`;
    } else {
      // Outro erro qualquer
      errorMessage = err.message;
    }

    return res.status(500).json({
      error: "Falha ao gerar PIX",
      details: errorMessage
    });
  }
});
