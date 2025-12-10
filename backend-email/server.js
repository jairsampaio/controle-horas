const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Configuração do upload em memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ CONFIGURE SEU E-MAIL AQUI (GMAIL)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "contatosampaiojair@gmail.com",      // <<< TROCAR
    pass: "ekvd flqt aczg wled",         // <<< TROCAR
  },
});

// ✅ ROTA PARA ENVIO DO PDF
app.post("/enviar-pdf", upload.single("pdf"), async (req, res) => {
  try {
    const { email, nomeCliente } = req.body;
    const arquivo = req.file;

    if (!arquivo) {
      return res.status(400).json({ erro: "PDF não enviado" });
    }

    await transporter.sendMail({
      from: "Sistema de Relatórios <contatosampaiojair@gmail.com>",
      to: email,
      subject: "Relatório de Serviços",
      text: `Olá${nomeCliente ? " " + nomeCliente : ""}, segue em anexo o seu relatório.`,
      attachments: [
        {
          filename: "relatorio-servicos.pdf",
          content: arquivo.buffer,
        },
      ],
    });

    res.json({ sucesso: true });
  } catch (erro) {
    console.error("Erro ao enviar e-mail:", erro);
    res.status(500).json({ erro: "Erro ao enviar e-mail" });
  }
});

// ✅ INICIA O SERVIDOR
app.listen(3333, () => {
  console.log("✅ Servidor de e-mail rodando em http://localhost:3333");
});
