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

  if (!amount || !cpf || !street || !streetNumber || !neighborhood || !city) {
    return res.status(400).json({ error: "Dados obrigatórios faltando" });
  }

  try {
    // Envia pra API Payevo
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

    // ✅ Mostra a resposta completa da API pra debug
    console.log("📨 Resposta da API Payevo:", apiResponse.data);

    // ✅ Tenta encontrar o qrcode em diferentes formatos
    let pixCode =
      apiResponse.data?.pix?.qrcode ||
      apiResponse.data?.qrcode ||
      apiResponse.data?.payload ||
      apiResponse.data?.transactionId ||
      null;

    if (!pixCode) {
      console.warn("⚠️ QR Code não encontrado na resposta da API");
      
      const fallbackPix = gerarPixFallback(customerName, cpf, street, city, amount, productId);
      let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(fallbackPix)}&produto=${encodeURIComponent(productId)}&cpf=${encodeURIComponent(cpf)}`;

      return res.json({
        redirect: redirectUrl,
        fallback: true,
        details: "API Payevo não retornou 'pix.qrcode'. Usando fallback."
      });
    }

    // ✅ Redireciona com o copiacola
    let redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(pixCode)}&produto=${encodeURIComponent(productId)}&cpf=${encodeURIComponent(cpf)}`;
    
    res.json({ redirect: redirectUrl });

  } catch (err) {
    console.error("🚨 Erro ao gerar PIX:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data || null,
      request: !!err.request
    });

    const fallbackPix = gerarPixFallback(customerName, cpf, street, city, amount, productId);

    redirectUrl = `/tela-02/produtos/Checkout/page-da-chave-pix/pagamento-via-pix/pages/cod.html?copiacola=${encodeURIComponent(fallbackPix)}&produto=${encodeURIComponent(productId)}&cpf=${encodeURIComponent(cpf)}`;

    return res.status(500).json({
      redirect: redirectUrl,
      fallback: true,
      details: "Falha completa na API Payevo. Usando PIX simulado.",
      error: err.message
    });
  }
});
