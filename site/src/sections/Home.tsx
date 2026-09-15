import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  FaArrowDown,
  FaArrowRight,
  FaCompass,
  FaLeaf,
} from "react-icons/fa";
import Counter from "../components/Counter";
import Reveal from "../components/Reveal";
import {
  activities,
  events,
  images,
  metodo,
  news,
  ramos,
  site,
} from "../data/site";
import { easeOut } from "../lib/motion";
import logo from "../assets/images/arno_logo.png";
import "./Home.css";

const words = [
  "Honra",
  "Lealdade",
  "Boa Ação",
  "Fraternidade",
  "Cortesia",
  "Natureza",
  "Disciplina",
  "Alegria",
  "Respeito",
  "Pureza",
];

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="home">
      <section className="hero" ref={heroRef}>
        <motion.div
          className="hero__bg"
          style={{
            backgroundImage: `url(${images.night})`,
            y,
          }}
        />
        <div className="hero__veil" />
        <div className="hero__glow" />
        <img
          src={logo}
          alt=""
          className="hero__mark"
          aria-hidden="true"
        />

        <motion.div className="hero__inner container" style={{ opacity }}>
          <motion.p
            className="kicker"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
          >
            Porto Alegre · desde {site.founded}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.28, ease: easeOut }}
          >
            A aventura que
            <em> forma o caráter.</em>
          </motion.h1>

          <motion.p
            className="hero__lead"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.48, ease: easeOut }}
          >
            O {site.name} é um grupo de referência em escotismo: método,
            natureza e caráter — no bairro {site.neighborhood}, aberto a jovens
            de 6,5 a 21 anos, até a Partida do Clã.
          </motion.p>

          <motion.div
            className="hero__actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.64, ease: easeOut }}
          >
            <Link to="/participe" className="btn btn-primary">
              Quero ser escoteiro <FaArrowRight />
            </Link>
            <Link to="/sobre" className="btn btn-ghost">
              Conhecer o grupo
            </Link>
          </motion.div>
        </motion.div>

        <a href="#trilha" className="hero__scroll" aria-label="Rolar para o conteúdo">
          <FaArrowDown />
          <span>Desça a trilha</span>
        </a>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[...words, ...words].map((word, i) => (
            <span key={`${word}-${i}`}>
              <FaLeaf /> {word}
            </span>
          ))}
        </div>
      </div>

      <section className="section intro" id="trilha">
        <div className="container intro__grid">
          <Reveal>
            <span className="kicker">Por que existimos</span>
            <h2>Educação pelo movimento, não pelo discurso.</h2>
            <p className="lead">
              Escotismo é um método. Aqui, a criança, o adolescente e o jovem
              assumem o próprio desenvolvimento — com a Promessa, a Lei, as
              equipes e a natureza. O Arno Friedrich vive o Programa Educativo
              da UEB, sábado a sábado, no sul do Brasil.
            </p>
            <ul className="intro__points">
              <li>
                <FaCompass /> Método Educativo Escoteiro da UEB
              </li>
              <li>
                <FaCompass /> Quatro ramos, da Alcateia ao Clã Pioneiro
              </li>
              <li>
                <FaCompass /> Sede no Lindóia, porta aberta à cidade
              </li>
            </ul>
            <Link to="/ramos" className="btn btn-dark">
              Ver os ramos <FaArrowRight />
            </Link>
          </Reveal>

          <Reveal delay={0.12} className="intro__visual">
            <div
              className="intro__photo"
              style={{ backgroundImage: `url(${images.camp})` }}
            />
            <div className="intro__card">
              <span>Reuniões</span>
              <strong>{site.meetings}</strong>
              <em>{site.addressExtra}</em>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="stats">
        <div className="container stats__row">
          <Counter value={new Date().getFullYear() - site.founded} suffix="+" label="anos de trilha" />
          <Counter value={4} label="ramos educativos" />
          <Counter value={8} label="elementos do Método" />
          <Counter value={1} label="Promessa de honra" />
        </div>
      </section>

      <section className="section ramos-preview">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="kicker">Progressão</span>
              <h2>Quatro ramos, uma mesma bússola.</h2>
              <p className="lead">
                No Arno Friedrich funcionam Alcateia, Tropa Escoteira, Tropa
                Sênior e Clã Pioneiro. Cada ramo tem ênfase, lema e marco
                simbólico próprios, conforme o POR.
              </p>
            </Reveal>
          </div>

          <div className="ramos-preview__grid">
            {ramos.map((ramo, i) => (
              <Reveal key={ramo.id} delay={i * 0.08}>
                <Link
                  to={`/ramos#${ramo.id}`}
                  className={`ramo-card ramo-card--${ramo.tone}`}
                >
                  <span className="ramo-card__ages">{ramo.ages}</span>
                  <h3>{ramo.branch}</h3>
                  <p>{ramo.summary}</p>
                  <span className="ramo-card__go">
                    Explorar <FaArrowRight />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section metodo">
        <div className="container">
          <div className="section-head center">
            <Reveal>
              <span className="kicker">Método</span>
              <h2>O que torna o Método Educativo Escoteiro inconfundível.</h2>
            </Reveal>
          </div>
          <div className="metodo__grid">
            {metodo.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.07} className="metodo__item">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="join-band">
        <div
          className="join-band__bg"
          style={{ backgroundImage: `url(${images.fire})` }}
        />
        <div className="join-band__veil" />
        <img
          src={logo}
          alt=""
          className="join-band__mark"
          aria-hidden="true"
        />
        <div className="container join-band__content">
          <Reveal>
            <span className="kicker">Seja escoteiro</span>
            <h2>Uma tarde. Uma patrulha. Uma vida diferente.</h2>
            <p>
              Ser escoteiro é ganhar amigos, aprender de verdade e tornar-se
              alguém melhor — ao ar livre, com propósito. Venha num sábado.
            </p>
            <div className="hero__actions">
              <Link to="/participe" className="btn btn-primary">
                Inscrever-se <FaArrowRight />
              </Link>
              <Link to="/agenda" className="btn btn-ghost">
                Ver a agenda
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section mosaic">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="kicker">Vivência</span>
              <h2>O programa em movimento.</h2>
            </Reveal>
          </div>
          <div className="mosaic__grid">
            {activities.slice(0, 4).map((item, i) => (
              <Reveal
                key={item.id}
                delay={i * 0.06}
                className={`mosaic__cell mosaic__cell--${i + 1}`}
              >
                <Link to="/atividades" className="mosaic__card">
                  <img src={item.image} alt="" />
                  <div>
                    <small>{item.tag}</small>
                    <h3>{item.title}</h3>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section news-home">
        <div className="container news-home__layout">
          <div>
            <Reveal>
              <span className="kicker">Agenda & notícias</span>
              <h2>O que vem pela frente.</h2>
              <p className="lead">
                O calendário é o pulso do grupo. Confira os próximos encontros
                e as últimas histórias da trilha.
              </p>
              <Link to="/agenda" className="btn btn-outline">
                Abrir agenda <FaArrowRight />
              </Link>
            </Reveal>

            <div className="news-home__events">
              {events.slice(0, 3).map((event, i) => {
                const d = new Date(`${event.date}T12:00:00`);
                return (
                  <Reveal key={event.id} delay={i * 0.08} className="mini-event">
                    <time>
                      {d.getDate()}
                      <small>
                        {d.toLocaleDateString("pt-BR", { month: "short" })}
                      </small>
                    </time>
                    <div>
                      <strong>{event.title}</strong>
                      <span>{event.time}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          <div className="news-home__cards">
            {news.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08} className="news-card">
                <small>{item.date}</small>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
