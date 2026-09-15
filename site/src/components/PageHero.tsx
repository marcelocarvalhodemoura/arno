type PageHeroProps = {
  kicker: string;
  title: string;
  subtitle: string;
  image: string;
};

export default function PageHero({ kicker, title, subtitle, image }: PageHeroProps) {
  return (
    <header className="page-hero">
      <div
        className="page-hero__bg"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="page-hero__veil" />
      <div className="container page-hero__content">
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
