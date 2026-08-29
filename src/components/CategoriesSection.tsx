import Link from "next/link";

type Category = { id: number; name: string; slug: string };

type Props = {
  categories: Category[];
  totalVideos: number;
  kicker: string;
  titleLine1: string;
  titleEmphasis: string;
  pillAllLabel: string;
  centered?: boolean;
};

export default function CategoriesSection({
  categories,
  totalVideos,
  kicker,
  titleLine1,
  titleEmphasis,
  pillAllLabel,
  centered = false,
}: Props) {
  return (
    <section
      id="categorias"
      className={`category-strip ${centered ? "category-strip-centered" : ""}`}
    >
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{titleLine1} <em>{titleEmphasis}</em></h2>
      </div>
      <nav className="category-links" aria-label="Categories">
        <Link className="category-pill selected" href="#catalogo">{pillAllLabel} <span>{totalVideos}</span></Link>
        {categories.map((category) => (
          <Link key={category.id} className="category-pill" href={`/categoria/${category.slug}`}>
            {category.name}
          </Link>
        ))}
      </nav>
    </section>
  );
}
