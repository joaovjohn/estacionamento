# Jogo de Estacionamento 3D

Jogo de estacionamento desenvolvido em 3D na materia de Computacao Grafica onde o jogador deve conduzir um carro do ponto de partida ate o ponto de chegada, desviando de obstaculos ao longo do percurso.

## Objetivo

Conduzir o carro pela pista, partindo do ponto verde (PARTIDA) e chegando ao ponto vermelho (CHEGADA), evitando colidir com os cones e caixas espalhados pelo caminho.

## Controles

- W ou Seta para cima: Acelerar
- S ou Seta para baixo: Re
- A ou Seta para esquerda: Virar a esquerda
- D ou Seta para direita: Virar a direita
- Espaco: Freio

## Sistema de Pontuacao

- Pontuacao inicial: 1000 pontos
- Colisao com cone: -10 pontos
- Colisao com caixa: -25 pontos

## Instalacao

### Pre-requisitos

- Node.js (versao 18 ou superior)
- npm (gerenciador de pacotes do Node.js)

### Passos

1. Clone o repositorio ou baixe os arquivos do projeto

2. Instale as dependencias:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse o jogo no navegador pelo endereco exibido no terminal (geralmente http://localhost:5173)

## Scripts Disponiveis

- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Compila o projeto para producao
- `npm run preview`: Visualiza a versao de producao
- `npm run lint`: Executa o linter para verificar erros no codigo
- `npm run format`: Formata o codigo com Prettier

### Dependencias Principais

- **Three.js (v0.182.0)**: Biblioteca para renderizacao de graficos 3D no navegador. Utilizada para criar a cena, camera, iluminacao, carregar modelos 3D e renderizar o jogo.

- **cannon-es (v0.20.0)**: Motor de fisica 3D em JavaScript. Utilizado para simular a fisica do carro, colisoes entre objetos e interacao com obstaculos.

## Modelos 3D

Os modelos 3D utilizados no jogo sao do pacote Kenney Car Kit, disponibilizados gratuitamente em https://kenney.nl/
