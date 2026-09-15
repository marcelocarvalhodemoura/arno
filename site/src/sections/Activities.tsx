import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import { activities, images } from "../data/site";
import "./Activities.css";

export default function Activities() {
  return (
    <div className="acts">
      <PageHero
        kicker="Vivência"
        title="O programa é o que se vive — não o que se anuncia."
        subtitle="Acampamentos, serviço, jogos, técnicas e a natureza como sala de aula. Um repertório pensado para inspirar grupos em todo o país."
        image={images.hike}
      />

      <section className="section">
        <div className="container acts__grid">
          {activities.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.05} className="act">
              <div
                className="act__img"
                style={{ backgroundImage: `url(${item.image})` }}
              >
                <span>{item.tag}</span>
              </div>
              <div className="act__body">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section acts__note">
        <div className="container acts__note-box">
          <Reveal>
            <span className="kicker">Além da sede</span>
            <h2>Eventos distritais, regionais e nacionais.</h2>
            <p className="lead">
              Os jovens do Arno Friedrich participam de acampamentos da UEB,
              competições de conhecimentos, Mutirões e atividades com outros
              grupos do Rio Grande do Sul. O grupo é uma porta para o
              Movimento — não um mundo fechado.
            </p>
            <Link to="/agenda" className="btn btn-dark">
              Ver o calendário <FaArrowRight />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div
              className="acts__wide"
              style={{ backgroundImage: `url(${images.camp})` }}
            />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
