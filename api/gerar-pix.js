export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { valor, descricao } = req.body;

  if (!valor || !descricao) {
    return res.status(400).json({ error: 'Valor e descrição são obrigatórios' });
  }

  // Suas credenciais reais da PayEvo
  const SECRET_KEY = 'sk_like_Bz6zlBxSxwtWEuhIBSLkRUNC3q7BG8J9Q4Nezrbct92IVr6g';
  const COMPANY_ID = '2e8276c7-c1c8-4e48-a6d7-da3add526be1';

  try {
    const response = await fetch('https://api.payevo.com.br/api/v1/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
        'company_id': COMPANY_ID
      },
      body: JSON.stringify({
        value: parseFloat(valor),
        description: descricao,
        payment_method: 'pix'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro PayEvo:', data);
      return res.status(500).json({ error: 'Erro ao gerar Pix' });
    }

    return res.status(200).json({
      qrcode: data.charge?.pix_qr_code,
      copia_cola: data.charge?.pix_emv
    });
  } catch (err) {
    console.error('Erro geral:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar Pix' });
  }
}
