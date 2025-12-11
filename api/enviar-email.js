// api/enviar-email.js
import nodemailer from 'nodemailer';

// A Vercel injeta req (pedido) e res (resposta) automaticamente
export default async function handler(req, res) {
  // Configuração do CORS (para permitir que seu site fale com essa função)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Se for apenas uma verificação do navegador (OPTIONS), responde OK e para.
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Só aceitamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, nomeCliente, pdfBase64 } = req.body;

  if (!email || !pdfBase64) {
    return res.status(400).json({ error: 'Faltando dados (email ou PDF)' });
  }

  // Configuração do Gmail (lendo das variáveis de ambiente por segurança)
  // Se não tiver variável, usa o que você mandou (mas recomendo usar .env!)
  const user = process.env.EMAIL_USER || "contatosampaiojair@gmail.com";
  const pass = process.env.EMAIL_PASS || "ekvd flqt aczg wled"; 

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `Sistema de Relatórios <${user}>`,
      to: email,
      subject: "Relatório de Serviços",
      text: `Olá${nomeCliente ? " " + nomeCliente : ""}, segue em anexo o seu relatório de serviços prestados.`,
      attachments: [
        {
          filename: "relatorio-servicos.pdf",
          content: pdfBase64.split("base64,")[1], // Limpa o cabeçalho do base64
          encoding: "base64",
        },
      ],
    });

    return res.status(200).json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return res.status(500).json({ error: "Erro ao enviar e-mail." });
  }
}