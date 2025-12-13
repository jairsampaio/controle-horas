import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 👇 MUDANÇA 1: Agora lemos o 'cc' que vem do React
  const { email, cc, nomeCliente, pdfBase64 } = req.body;

  if (!email || !pdfBase64) {
    return res.status(400).json({ error: 'Faltando dados (email ou PDF)' });
  }

  // ⚠️ SEGURANÇA: Notei que sua senha estava exposta. 
  // O ideal é usar process.env.EMAIL_PASS, mas mantive a lógica para funcionar agora.
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // Se por algum motivo o Vercel não carregar (embora deva), a função vai parar.
  if (!user || !pass) {
    return res.status(500).json({ error: "Variáveis de ambiente (EMAIL_USER/PASS) ausentes." });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `Sistema de Relatórios <${user}>`,
      to: email,
      cc: cc, // 👈 MUDANÇA 2: Adicionamos o campo de Cópia aqui!
      subject: "Relatório de Serviços",
      text: `Olá${nomeCliente ? " " + nomeCliente : ""}, segue em anexo o seu relatório de serviços prestados.`,
      attachments: [
        {
          filename: "relatorio-servicos.pdf",
          content: pdfBase64.split("base64,")[1],
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