import photoNatureza from "../assets/photos/natureza.jpg";
import photoTropa from "../assets/photos/tropa-lis.jpg";
import photoAperto from "../assets/photos/aperto.jpg";
import photoTrilhaPedra from "../assets/photos/trilha-pedra.jpg";
import photoGuaiba from "../assets/photos/vista-guaiba.jpg";
import photoPatrulha from "../assets/photos/patrulha.jpg";
import photoHero from "../assets/photos/hero-grupo.jpg";
import photoEntrada from "../assets/photos/grupo-entrada.jpg";
import photoSede from "../assets/photos/sede.jpg";
import photoAtividade from "../assets/photos/atividade.jpg";
import photoTrilhaJovens from "../assets/photos/trilha-jovens.jpg";

export const images = {
  forest: photoNatureza,
  camp: photoTropa,
  fire: photoAperto,
  hike: photoTrilhaPedra,
  lake: photoGuaiba,
  kids: photoPatrulha,
  night: photoHero,
  trail: photoEntrada,
  community: photoSede,
  map: photoAtividade,
  summit: photoTrilhaJovens,
};

export const site = {
  name: "Grupo Escoteiro Arno Friedrich",
  shortName: "G.E. Arno Friedrich",
  city: "Porto Alegre · RS",
  neighborhood: "Lindóia",
  founded: 1991,
  address: "Travessa Comandante Gustavo Cramer, 90",
  addressExtra: "Junto ao Lindóia Tênis Clube",
  phone: "(51) 3330-9784",
  email: "contato@arnofriedrich.org.br",
  meetings: "Sábados, 14h30 às 17h30",
  facebook: "https://www.facebook.com/GrupoEscoteiroArnoFriedrich/",
  instagram: "https://www.instagram.com/gearnofriedrich/",
};

export const por = {
  title: "Princípios, Organização e Regras",
  edition: "POR 2025",
  version: "2.0",
  updated: "6 de julho de 2026",
  source: "Escoteiros do Brasil · União dos Escoteiros do Brasil (UEB)",
};

export const proposito =
  "Contribuir para que crianças, adolescentes e jovens assumam seu próprio desenvolvimento, para que alcancem seu pleno potencial físico, intelectual, afetivo, social, espiritual e do caráter, como indivíduos, como cidadãs e cidadãos responsáveis e membros ativos de suas comunidades local, nacional e internacional.";

export const principios = [
  "Compromisso com o aprimoramento da sua espiritualidade, seja ela inspirada em Deus ou em outras convicções.",
  "Compromisso de cooperação com os outros e de respeito com a natureza, para a construção de um mundo melhor.",
  "Compromisso consigo mesmo.",
];

export const promessaEscoteira =
  "Prometo, pela minha honra, fazer o melhor possível para: cumprir meus deveres para com Deus e minha Pátria; ajudar o próximo em toda e qualquer ocasião; e obedecer à Lei Escoteira.";

export const promessaLobinho =
  "Prometo fazer o melhor possível para: cumprir meus deveres para com Deus e minha Pátria; obedecer à Lei do Lobinho; e fazer todos os dias uma boa ação.";

export const leiEscoteira = [
  { n: "I", text: "O escoteiro é honrado e digno de confiança." },
  { n: "II", text: "O escoteiro é leal." },
  {
    n: "III",
    text: "O escoteiro está sempre alerta para ajudar o próximo e pratica diariamente uma boa ação.",
  },
  {
    n: "IV",
    text: "O escoteiro é amigo de todos e irmão dos demais escoteiros.",
  },
  { n: "V", text: "O escoteiro é cortês." },
  { n: "VI", text: "O escoteiro é bom para os animais e as plantas." },
  { n: "VII", text: "O escoteiro é obediente e disciplinado." },
  { n: "VIII", text: "O escoteiro é alegre e sorri nas dificuldades." },
  { n: "IX", text: "O escoteiro é econômico e respeita o bem alheio." },
  { n: "X", text: "O escoteiro é limpo de corpo e alma." },
];

export const leiLobinho = [
  { n: "I", text: "O Lobinho ouve sempre os Velhos Lobos." },
  { n: "II", text: "O Lobinho pensa primeiro nos outros." },
  { n: "III", text: "O Lobinho abre os olhos e os ouvidos." },
  { n: "IV", text: "O Lobinho é limpo e está sempre alegre." },
  { n: "V", text: "O Lobinho diz sempre a verdade." },
];

export const ramos = [
  {
    id: "lobinho",
    name: "Alcateia",
    branch: "Ramo Lobinho",
    ages: "6,5 a 10 anos",
    members: "Lobinhos e Lobinhas",
    color: "#e8b923",
    tone: "gold",
    lema: "Melhor Possível",
    marco: "Ser Livre como os Lobos",
    summary: "Socialização na Selva da Jângal. Matilhas, jogos e o primeiro compromisso com a Lei do Lobinho.",
    details:
      "Concebido para crianças de seis anos e meio a dez anos, o Ramo Lobinho concentra a ênfase educativa no processo de socialização. O marco simbólico é “Ser Livre como os Lobos”, ligado ao Livro da Jângal, de Rudyard Kipling. A Alcateia reúne até 24 crianças, organizadas em Matilhas de quatro a seis integrantes.",
  },
  {
    id: "escoteiro",
    name: "Tropa Escoteira",
    branch: "Ramo Escoteiro",
    ages: "11 a 14 anos",
    members: "Escoteiros e Escoteiras",
    color: "#2d8a4e",
    tone: "pine",
    lema: "Sempre Alerta",
    marco: "Descobrir novos territórios com um grupo de amigos",
    summary: "Autonomia na patrulha. Vida em equipe, natureza e a Promessa Escoteira como bússola.",
    details:
      "Para adolescentes de 11 a 14 anos, o Ramo Escoteiro enfatiza a criação e a ampliação da autonomia. O programa se fundamenta na vida em equipe e no encontro com a natureza. A Tropa tem efetivo máximo de 32 jovens, em Patrulhas de 4 a 8 integrantes — base permanente para acampamentos, jogos e serviço.",
  },
  {
    id: "senior",
    name: "Tropa Sênior",
    branch: "Ramo Sênior",
    ages: "15 a 17 anos",
    members: "Seniores e Guias",
    color: "#c8102e",
    tone: "clay",
    lema: "Sempre Alerta",
    marco: "Viver aventuras, superar desafios",
    summary: "Autoconhecimento e identidade. Aventura, desafio e a formação do caráter na adolescência.",
    details:
      "O Ramo Sênior atende jovens de 15 a 17 anos — Seniores e Guias. A ênfase educativa é o autoconhecimento, a aceitação e o aprimoramento das características pessoais, auxiliando o jovem a formar sua identidade. A Tropa Sênior (ou Tropa de Guias) tem efetivo máximo de 32 jovens.",
  },
  {
    id: "pioneiro",
    name: "Clã Pioneiro",
    branch: "Ramo Pioneiro",
    ages: "18 a 22 incompletos",
    members: "Pioneiros e Pioneiras",
    color: "#8b1a2b",
    tone: "wine",
    lema: "Servir",
    marco: "Explorar o mundo, ampliar horizontes",
    summary: "Cidadania em ato. Projetos, Equipes de Interesse e a Partida antes dos 22 anos.",
    details:
      "O Ramo Pioneiro é para jovens de 18 a 22 anos incompletos. A ênfase é ampliar a visão de mundo e viver a cidadania, colocando em prática os valores da Promessa e da Lei no círculo mais amplo da vida adulta. O Clã é misto, sem efetivo máximo, e organiza Equipes de Interesse para projetos e serviço. A saída ocorre na Cerimônia de Partida, antes de completar 22 anos.",
  },
];

export const metodo = [
  {
    title: "Promessa e Lei Escoteira",
    text: "O marco ético que o jovem escolhe viver. A Promessa e a Lei orientam a conduta e o estilo de vida escoteiro.",
  },
  {
    title: "Aprender fazendo",
    text: "Educação pela prática e pela reflexão: o jovem experimenta, erra, corrige e consolida o que viveu.",
  },
  {
    title: "Progressão pessoal",
    text: "Cada criança, adolescente ou jovem avança no próprio ritmo, reconhecido pelo programa do seu Ramo.",
  },
  {
    title: "Sistema de Equipes",
    text: "Matilhas, patrulhas, equipes de interesse: pequenos grupos em que o jovem lidera, é liderado e coopera.",
  },
  {
    title: "Suporte do adulto",
    text: "Escotistas acompanham, desafiam e protegem — sem substituir o protagonismo de quem está em formação.",
  },
  {
    title: "Marco simbólico",
    text: "Histórias, lemas e rituais que dão sentido à idade: da Jângal à exploração do mundo.",
  },
  {
    title: "Natureza",
    text: "O ambiente natural é espaço privilegiado de aprendizagem, aventura e respeito à criação.",
  },
  {
    title: "Envolvimento comunitário",
    text: "A boa ação diária e o serviço à comunidade são deveres de todos os membros do Movimento.",
  },
];

export const activities = [
  {
    id: 1,
    title: "Acampamentos",
    tag: "Campo",
    description:
      "Noites sob as estrelas, fogueira, cozinha de campo e a patrulha funcionando como uma pequena comunidade.",
    image: images.camp,
  },
  {
    id: 2,
    title: "Serviço à comunidade",
    tag: "Cidadania",
    description:
      "Ações concretas no bairro Lindóia e em Porto Alegre: mutirões, campanhas e projetos pensados pelos jovens.",
    image: images.community,
  },
  {
    id: 3,
    title: "Trilhas e expedições",
    tag: "Aventura",
    description: "Caminhadas, orientação e desafios progressivos — do parque urbano à serra gaúcha.",
    image: images.hike,
  },
  {
    id: 4,
    title: "Técnicas e especialidades",
    tag: "Saber",
    description: "Primeiros socorros, nós, pioneirias, astronomia, comunicação e dezenas de especialidades da UEB.",
    image: images.map,
  },
  {
    id: 5,
    title: "Jogos escoteiros",
    tag: "Método",
    description: "O jogo como ferramenta educativa: estratégia, corpo, imaginação e o prazer de estar junto.",
    image: images.kids,
  },
  {
    id: 6,
    title: "Guardiões da natureza",
    tag: "Ambiente",
    description: "Plantio, educação ambiental e o compromisso da Lei: ser bom para os animais e as plantas.",
    image: images.forest,
  },
];

export const events = [
  {
    id: 1,
    date: "2026-09-12",
    title: "Reunião de boas-vindas às famílias",
    description: "Conheça a sede, as chefias e o método. Ideal para quem pensa em ingressar neste semestre.",
    time: "14:30 – 17:30",
    tag: "Aberto",
  },
  {
    id: 2,
    date: "2026-09-26",
    title: "Acampamento de primavera",
    description: "Fim de semana em campo para Alcateia, Tropas e Clã, com atividades por ramo e fogueira conjunta.",
    time: "Sexta a domingo",
    tag: "Campo",
  },
  {
    id: 3,
    date: "2026-10-10",
    title: "Oficina de primeiros socorros",
    description: "Treinamento prático com instrutores voluntários. Aberto a jovens a partir do Ramo Escoteiro.",
    time: "09:00 – 12:00",
    tag: "Formação",
  },
  {
    id: 4,
    date: "2026-10-24",
    title: "Mutirão no Lindóia",
    description: "Ação de serviço no entorno da sede: limpeza, plantio e convivência com a comunidade.",
    time: "14:30 – 17:30",
    tag: "Serviço",
  },
  {
    id: 5,
    date: "2026-11-07",
    title: "Jornada de especialidades",
    description: "Ateliês simultâneos de culinária, orientação, comunicação e artes — o jovem escolhe o desafio.",
    time: "14:30 – 17:30",
    tag: "Sede",
  },
];

export const news = [
  {
    date: "22 Ago 2026",
    title: "Inscrições abertas para o segundo semestre",
    excerpt: "Há vagas na Alcateia e na Tropa Escoteira. A primeira reunião pode ser experimental, sem compromisso.",
  },
  {
    date: "08 Ago 2026",
    title: "Projeto de arborização no bairro",
    excerpt: "Jovens do Ramo Sênior lideram o plantio de mudas nativas em parceria com moradores do Lindóia.",
  },
  {
    date: "19 Jul 2026",
    title: "Acampamento de inverno: o que aprendemos",
    excerpt: "Frio, fogueira e patrulhas autônomas. Um relato do campo que marcou o meio do ano.",
  },
];

export const timeline = [
  {
    year: "1991",
    title: "A fundação",
    text: "Nasce o Grupo Escoteiro Arno Friedrich em Porto Alegre, com o propósito de oferecer aos jovens uma educação pelo movimento, pela natureza e pelo exemplo.",
  },
  {
    year: "1990s",
    title: "Raízes no Lindóia",
    text: "A sede se consolida junto ao Lindóia Tênis Clube. O grupo torna-se referência de vizinhança, serviço e formação de chefias.",
  },
  {
    year: "2000s",
    title: "Da Alcateia ao Clã",
    text: "Alcateia, Tropas e Clã passam a conviver no mesmo sábado, num ciclo contínuo do lobo ao pioneiro.",
  },
  {
    year: "Hoje",
    title: "Quatro ramos, uma trilha",
    text: "Alcateia, Tropas e Clã no mesmo sábado: Lobinho, Escoteiro, Sênior e Pioneiro — a progressão que o grupo oferece hoje, do lobo ao servir.",
  },
];

export const team = [
  {
    name: "Carlos Silva",
    role: "Chefe de Grupo",
    bio: "Coordena a unidade, as chefias e o diálogo com famílias e comunidade.",
  },
  {
    name: "Maria Oliveira",
    role: "Subchefe de Grupo",
    bio: "Apoia o programa educativo e o cuidado com cada jovem e cada ramo.",
  },
  {
    name: "Roberto Santos",
    role: "Diretor de Atividades",
    bio: "Desenha acampamentos, saídas e o calendário que dá ritmo ao ano escoteiro.",
  },
];

export const joinSteps = [
  {
    n: "01",
    title: "Conheça a sede",
    text: "Envie uma mensagem ou venha num sábado. Conversamos com a família e apresentamos o método.",
  },
  {
    n: "02",
    title: "Reunião experimental",
    text: "O jovem participa de uma tarde com o ramo correspondente à idade — sem uniforme, com curiosidade.",
  },
  {
    n: "03",
    title: "Ingresso",
    text: "Com a decisão tomada, formalizamos o registro anual na UEB — condição para a prática do Escotismo no Brasil — e preparamos a recepção na matilha, na patrulha ou no Clã.",
  },
];
