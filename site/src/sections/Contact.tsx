import { useState, type FormEvent } from "react";
import {
  FaAt,
  FaComment,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaTag,
  FaUser,
} from "react-icons/fa";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import { images, joinSteps, site } from "../data/site";
import "./Contact.css";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="contact">
      <PageHero
        kicker="Participe"
        title="A porta da sede está aberta."
        subtitle="Crianças a partir de 6,5 anos, jovens até completar 22 anos, famílias e voluntários. Três passos para entrar na trilha."
        image={images.community}
      />

      <section className="section">
        <div className="container steps">
          {joinSteps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08} className="step">
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section contact__split">
        <div className="container contact__grid">
          <Reveal>
            <span className="kicker">Fale conosco</span>
            <h2>Escreva — ou venha no sábado.</h2>
            <div className="contact__facts">
              <p>
                <FaMapMarkerAlt />
                <span>
                  {site.address}
                  <br />
                  {site.neighborhood} · {site.city}
                  <br />
                  {site.addressExtra}
                </span>
              </p>
              <p>
                <FaPhone /> {site.phone}
              </p>
              <p>
                <FaEnvelope /> {site.email}
              </p>
              <p className="contact__meet">{site.meetings}</p>
            </div>
            <div className="contact__map">
              <iframe
                title="Mapa da sede"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=Travessa%20Comandante%20Gustavo%20Cramer%2090%20Porto%20Alegre&t=&z=16&ie=UTF8&iwloc=&output=embed"
              />
            </div>
          </Reveal>

          <Reveal delay={0.1} className="contact__form">
            <h3>Envie uma mensagem</h3>
            {sent ? (
              <p className="contact__ok">
                Mensagem registrada. Em um site em produção, este formulário
                seguiria para a secretaria do grupo. Obrigado pelo interesse —
                até sábado.
              </p>
            ) : (
              <form onSubmit={onSubmit}>
                <label>
                  <FaUser />
                  <input
                    required
                    name="name"
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  <FaAt />
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="Seu e-mail"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  <FaTag />
                  <input
                    required
                    name="subject"
                    placeholder="Assunto (ex.: inscrição Alcateia)"
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                  />
                </label>
                <label className="is-area">
                  <FaComment />
                  <textarea
                    required
                    name="message"
                    rows={5}
                    placeholder="Conte a idade do jovem e como conheceu o grupo"
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                  />
                </label>
                <button className="btn btn-primary btn-full" type="submit">
                  Enviar mensagem
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
