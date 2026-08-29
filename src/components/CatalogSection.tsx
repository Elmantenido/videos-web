import Link from "next/link";
import VideoCarousel, { type CarouselVideo } from "@/components/VideoCarousel";
import { CAROUSEL_PAGE_SIZE } from "@/lib/home-data";

type Props = {
  videos: CarouselVideo[];
  totalVideos: number;
  kicker: string;
  titleLine1: string;
  titleEmphasis: string;
  viewAllLabel: string;
  emptyStateText: string;
  brandPrefix: string;
  brandSuffix: string;
};

export default function CatalogSection({
  videos,
  totalVideos,
  kicker,
  titleLine1,
  titleEmphasis,
  viewAllLabel,
  emptyStateText,
  brandPrefix,
  brandSuffix,
}: Props) {
  return (
    <section id="catalogo" className="catalog-section">
      <div className="section-heading">
        <div><p className="section-kicker">{kicker}</p><h2>{titleLine1} <em>{titleEmphasis}</em></h2></div>
        <Link href="#catalogo" className="view-all">{viewAllLabel} <span>→</span></Link>
      </div>
      <VideoCarousel
        mode="latest"
        initialVideos={videos}
        brandPrefix={brandPrefix}
        brandSuffix={brandSuffix}
        visibleCount={CAROUSEL_PAGE_SIZE}
      />
      {totalVideos === 0 && (
        <p className="empty-state">
          {emptyStateText} <Link href="/admin">/admin</Link>.
        </p>
      )}
    </section>
  );
}
