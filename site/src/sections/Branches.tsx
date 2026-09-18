import { Link, useLocation } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { useEffect } from "react";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import { images, ramos } from "../data/site";
import "./Branches.css";

export default function Branches() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const node = document.getElementById(hash.slice(1));
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);
  return (
    <div className="branches">
      <PageHero
        kicker="Ramos"
        title="Cada idade tem o seu território."
        subtitle="O grupo oferece Alcateia, Tropa Escoteira, Tropa Sênior e Clã Pioneiro. Quatro idades, o mesmo sábado — e a Lei Escoteira como bússola."
        image={images.trail}
      />

      {ramos.map((ramo, i) => (
        <section
          key={ramo.id}
          className={`section branch branch--${ramo.tone} ${i % 2 ? "branch--flip" : ""}`}
          id={ramo.id}
        >
          <div className="container branch__grid">
            <Reveal>
              <span className="kicker">{ramo.ages}</span>
              <h2>{ramo.branch}</h2>
              <p className="branch__unit">
                {ramo.name} · {ramo.members}
              </p>
              <p className="lead">{ramo.details}</p>
              <p className="branch__marco">{ramo.marco}</p>
              <p className="branch__promise">Lema: “{ramo.lema}”</p>
              <Link to="/participe" className="btn btn-dark">
                Ingressar neste ramo <FaArrowRight />
              </Link>
            </Reveal>
            <Reveal delay={0.1} className="branch__panel">
              <div
                className="branch__photo"
                style={{
                  backgroundImage: `url(${i % 2 ? images.summit : images.lake})`,
                }}
              />
              <div className="branch__chip" style={{ background: ramo.color }}>
                {ramo.name}
              </div>
            </Reveal>
          </div>
        </section>
      ))}
    </div>
  );
}
