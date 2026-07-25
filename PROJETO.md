# 🚀 OMNI ITO — Guia do Sistema & Visão de Futuro

Bem-vindo à documentação oficial do **OMNI ITO**! Este documento foi preparado especialmente para a equipe interna do **Instituto de Traumatologia e Ortopedia (ITO)** com o objetivo de apresentar a visão, as funcionalidades, a arquitetura visual e as intenções estratégicas por trás da plataforma.

---

## 🎯 1. Intenção & Objetivo Principal

O **OMNI ITO** nasce com uma missão clara: **Modernizar, integrar e humanizar a gestão de pessoas, clima organizacional e comunicação interna do ITO.**

### Principais Objetivos:
- **Centralização da Gestão de RH:** Unificar dados operacionais, pesquisas de clima, holerites/folha de pagamento, recrutamento e ouvidoria em um só ecossistema seguro e intuitivo.
- **Voz Sigilosa aos Colaboradores:** Garantir um canal 100% anônimo para que todos possam expressar sentimentos, sugestões ou preocupações sem qualquer receio de exposição (sem gravação de IP, e-mail ou dados pessoais).
- **Engajamento e Cultura:** Valorizar o time por meio de iniciativas como a eleição do *Funcionário do Mês*, acompanhamento do clima semanal (*Pulse*) e acesso facilitado ao *Manual de Cultura*.
- **Inteligência Estratégica para a Gestão:** Proporcionar à coordenação dados em tempo real sobre satisfação, paridade de gênero, distribuição por setores e folha de compensação.

---

## ✨ 2. Identidade Visual & Experiência de Uso (Design System)

A interface do **OMNI ITO** foi projetada sob o conceito de **"Soft & Premium Human Tech"**, equilibrando elegância médica/corporativa com dinamismo moderno.

### Princípios de Design:
1. **Linguagem de Cores Exclusiva (Azul Periwinkle & Navy):**
   - **Acento Primário:** Azul Periwinkle (`#4F6DF5`) — transmite confiança, tecnologia e acolhimento.
   - **Tema Escuro (Dark Mode):** Navy Profundo (`#0A0E17` e `#121A2A`) — elegante, confortável para uso prolongado e distante de pretos genéricos.
   - **Tema Claro (Light Mode):** Soft Blue (`#F3F5FB`) — limpo, amplo e de altíssima legibilidade.

2. **Simetria & Geometria Fluida (SVG Nativo):**
   - A marca **OMNI ITO** utiliza um símbolo vetorial minimalista em formato de laço infinito duplo, representando a conexão contínua entre o time e a instituição.
   - O símbolo adapta automaticamente sua cor de acordo com o plano de fundo e o tema selecionado.

3. **Responsividade Total (Mobile-First):**
   - Todas as telas públicas e privadas se adaptam com perfeição a **Smartphones, Tablets e Desktops**, com áreas de toque otimizadas (`touch-manipulation`) e cabeçalhos simétricos (`grid grid-cols-3`).

---

## 🛠️ 3. Módulos e Funcionalidades

O ecossistema divide-se em duas áreas principais: **Canais Públicos** (acessíveis a todos os colaboradores) e **Painel Privado de Gestão** (destinado à liderança e RH).

### 🌐 A. Canais Públicos (Acesso Rápido)
1. **🗳️ Funcionário do Mês (`/funcionario-do-mes`):**
   - Votação ágil e intuitiva.
   - **Mecanismo de Proteção:** O colaborador digita a partir da 4ª letra do próprio nome para se identificar, podendo selecionar apenas 1 colega elegível (excluindo a si mesmo).
   - **Visual Interativo:** Efeito de seleção com destaque azul e troféu 🏆.

2. **💬 Ouvidoria Anônima (`/ouvidoria`):**
   - Canal direto para envio de Elogios, Sugestões, Reclamações ou Denúncias.
   - Garante **anonimato total** (sem captura de IP ou e-mail), com controle de taxa de envios (1 envio a cada 3h por dispositivo) para evitar spam.

3. **⭐ Pesquisa de Satisfação (`/pesquisa`):**
   - Avaliação por categorias (Comunicação, Estrutura, Liderança, etc.) com escala de 1 a 5 estrelas interativas.

4. **⚡ Pulse Semanal (`/pulse`):**
   - Termômetro de clima da semana em menos de 30 segundos usando 4 humores expressivos (😀 Ótima, 🙂 Boa, 😕 Mais ou menos, 😞 Difícil).

5. **📖 Manual de Cultura (`/cultura`):**
   - Guia interativo dos valores, visão e diretrizes comportamentais do ITO.

---

### 🔒 B. Painel Administrativo (`/app/*`)
1. **📊 Dashboard Geral & Indicadores de Clima:**
   - Visualização da média de satisfação, distribuição de humores do Pulse e alertas de atenção para o RH.

2. **👥 Gestão de Colaboradores & Paridade de Gênero:**
   - Gráficos atualizados refletindo **todos os colaboradores** (ativos e desligados), permitindo uma visão histórica realista do quadro.

3. **💰 Gestão de Compensação & Folha (`/app/folha`):**
   - Controle de salários, holerites, distribuição por senioridade e acompanhamento financeiro.

4. **📌 Gestão de Vagas & Recrutamento (`/app/vagas`):**
   - Acompanhamento do funil de processos seletivos abertos no ITO.

---

## 🔒 4. Privacidade, Segurança & Performance

- **Arquitetura Severless com Supabase:** Banco de dados seguro, com comunicação criptografada via HTTPS e RPCs protegidas.
- **Garantia do Anonimato:** As tabelas de ouvidores e pesquisas não armazenam chaves estrangeiras de usuários nem registros de rede (IP/Device Hash é processado efemeramente apenas para rate-limiting local).
- **Performance de Elite:** Desenvolvido com React, Vite e TailwindCSS, garantindo carregamento instantâneo em qualquer rede móvel.

---

## 📌 Resumo para a Equipe

O **OMNI ITO** não é apenas um software, é o **ponto de encontro digital da nossa cultura**. Ele foi feito para que cada colaborador se sinta ouvido, valorizado e conectado à evolução constante do **Instituto de Traumatologia e Ortopedia**.

*Documentação atualizada em Julho de 2026.*
