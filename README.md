# ⏳ Controle de Horas - Sistema de Gestão de Serviços

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Um sistema completo (SaaS) para freelancers e prestadores de serviço gerenciarem suas horas trabalhadas, clientes e faturamento. O projeto foi desenvolvido com foco em **Mobile First**, segurança de dados e experiência do usuário (UX).

## 🚀 Funcionalidades Principais

- **📊 Dashboard Executivo:** Gráficos interativos (Recharts) mostrando faturamento por status e principais clientes.
- **📱 Mobile First & PWA:** Design responsivo que adapta tabelas complexas em Cards elegantes no celular.
- **🔒 Segurança Bancária:**
  - Autenticação via **Supabase Auth**.
  - **RLS (Row Level Security):** Dados blindados onde cada usuário vê apenas o que é seu.
  - **Logoff Síncrono:** Encerramento imediato de sessão ao fechar a aba do navegador.
- **📄 Relatórios Profissionais:**
  - Geração de PDF automático.
  - Exportação para Excel (.xlsx) com filtros aplicados.
  - Envio de relatórios por E-mail (Serverless).
- **⚙️ Configurações Dinâmicas:** Definição de valor/hora global persistente no banco de dados.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React.js
- **Estilização:** Tailwind CSS + Lucide Icons
- **Backend (BaaS):** Supabase (PostgreSQL + Auth)
- **Visualização de Dados:** Recharts
- **Manipulação de Arquivos:** SheetJS (Excel) & jsPDF
- **Deploy:** Vercel

## 📸 Capturas de Tela

*(Aqui você pode colocar prints do seu sistema depois, se quiser)*

## 🔧 Como Rodar o Projeto

1. Clone o repositório:
```bash
git clone [https://github.com/jairsampaio/controle-horas.git](https://github.com/jairsampaio/controle-horas.git)