import { Link } from "react-router-dom";
import { FaClock, FaMapMarkerAlt } from "react-icons/fa";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import { events, images, site } from "../data/site";
import "./Calendar.css";

export default function Calendar() {
  return (
    <div className="cal">
      <PageHero
        kicker="Agenda"
        title="O ano escoteiro, sábado a sábado."
        subtitle="Reuniões, acampamentos, serviço e formação. Um calendário claro para famílias — e um modelo simples para outros grupos copiar."
        image={images.camp}
      />

      <section className="section">
        <div className="container cal__layout">
          <div className="cal__list">
            {events.map((event, i) => {
              const d = new Date(`${event.date}T12:00:00`);
              return (
                <Reveal key={event.id} delay={i * 0.06} className="event">
                  <div className="event__date">
                    <strong>{d.getDate()}</strong>
                    <span>
                      {d.toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                  </div>
                  <div className="event__body">
                    <small>{event.tag}</small>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <span>
                      <FaClock /> {event.time}
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <aside className="cal__side">
            <Reveal>
              <h3>Ritmo semanal</h3>
              <p>
                <strong>{site.meetings}</strong>
              </p>
              <p>
                <FaMapMarkerAlt /> {site.address}, {site.neighborhood}
              </p>
              <hr />
              <h3>O que levar</h3>
              <p>
                Uniforme completo nas reuniões formais. Em dias de chuva, o
                programa migra para o salão — a trilha não para.
              </p>
              <hr />
              <h3>Primeira visita</h3>
              <p>
                Famílias são bem-vindas. Crianças a partir de 6,5 anos e jovens
                até completar 22 anos. Agende pelo formulário ou apareça no
                início da tarde de sábado.
              </p>
              <Link to="/participe" className="btn btn-primary btn-full">
                Quero visitar
              </Link>
            </Reveal>
          </aside>
        </div>
      </section>
    </div>
  );
}
