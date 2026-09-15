import {
  FaBullseye,
  FaHeart,
  FaQuoteLeft,
} from "react-icons/fa";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import {
  images,
  leiEscoteira,
  leiLobinho,
  por,
  principios,
  promessaEscoteira,
  promessaLobinho,
  proposito,
  site,
  team,
  timeline,
} from "../data/site";
import "./About.css";

export default function About() {
  return (
    <div className="about">
      <PageHero
        kicker="O Grupo"
        title="Uma trilha de honra no sul do Brasil."
        subtitle={`Fundado em ${site.founded}, o ${site.name} forma cidadãos em ${site.neighborhood}, ${site.city} — pelo Método Educativo Escoteiro da UEB.`}
        image={images.forest}
      />

      <section className="section">
        <div className="container about__story">
          <Reveal>
            <span className="kicker">História</span>
            <h2>Mais de três décadas aprendendo ao ar livre.</h2>
            <p className="lead">
              O grupo nasceu para oferecer às crianças, adolescentes e jovens
              de Porto Alegre uma educação complementar à família, à escola e
              à fé: física, intelectual, afetiva, social, espiritual e do
              caráter. A sede, junto ao Lindóia Tênis Clube, é casa, palco e
              ponto de partida para o campo.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="about__portrait">
            <div
              className="about__photo"
              style={{ backgroundImage: `url(${images.kids})` }}
            />
          </Reveal>
        </div>
      </section>

      <section className="section about__time">
        <div className="container">
          <div className="section-head center">
            <Reveal>
              <span className="kicker">Linha do tempo</span>
              <h2>Marcos da caminhada.</h2>
            </Reveal>
          </div>
          <ol className="timeline">
            {timeline.map((item, i) => (
              <Reveal key={item.year} delay={i * 0.08} className="timeline__item">
                <span>{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section about__mv">
        <div className="container about__mv-grid">
          <Reveal className="about__panel">
            <FaBullseye />
            <h3>Propósito</h3>
            <p>{proposito}</p>
          </Reveal>
          <Reveal delay={0.1} className="about__panel">
            <FaHeart />
            <h3>Princípios</h3>
            <ul className="about__principles">
              {principios.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section lei">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="kicker">Regra 008 · POR</span>
              <h2>Lei Escoteira</h2>
              <p className="lead">
                Dez artigos. Um caráter. Texto oficial dos Escoteiros do
                Brasil, para o Ramo Escoteiro, Sênior e Pioneiro.
              </p>
            </Reveal>
          </div>
          <ol className="lei__grid">
            {leiEscoteira.map((artigo, i) => (
              <Reveal key={artigo.n} delay={i * 0.04} className="lei__card">
                <span>{artigo.n}</span>
                <p>{artigo.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section lei lei--lobinho">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="kicker">Regra 009 · POR</span>
              <h2>Lei do Lobinho</h2>
              <p className="lead">
                Cinco artigos para a Alcateia. O primeiro código de honra da
                criança no Movimento.
              </p>
            </Reveal>
          </div>
          <ol className="lei__grid lei__grid--five">
            {leiLobinho.map((artigo, i) => (
              <Reveal key={artigo.n} delay={i * 0.04} className="lei__card">
                <span>{artigo.n}</span>
                <p>{artigo.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="promise">
        <div className="container">
          <Reveal>
            <FaQuoteLeft />
            <blockquote>{promessaEscoteira}</blockquote>
            <cite>Promessa Escoteira · Regra 004 · {por.edition}</cite>
          </Reveal>
          <Reveal delay={0.1} className="promise__second">
            <blockquote className="promise__lobinho">{promessaLobinho}</blockquote>
            <cite>Promessa do Lobinho · Regra 005 · {por.edition}</cite>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head center">
            <Reveal>
              <span className="kicker">Escotistas e dirigentes</span>
              <h2>Quem conduz a trilha.</h2>
            </Reveal>
          </div>
          <div className="team">
            {team.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.08} className="team__card">
                <div className="team__avatar">{member.name.charAt(0)}</div>
                <h3>{member.name}</h3>
                <span>{member.role}</span>
                <p>{member.bio}</p>
              </Reveal>
            ))}
          </div>
          <p className="about__por">
            Textos oficiais conforme {por.title} ({por.edition}, versão{" "}
            {por.version}, atualizado em {por.updated}). {por.source}.
          </p>
        </div>
      </section>
    </div>
  );
}
