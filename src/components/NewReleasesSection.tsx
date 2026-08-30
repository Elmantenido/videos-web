import VideoCarousel, { type CarouselVideo } from "@/components/VideoCarousel";
import { CAROUSEL_PAGE_SIZE } from "@/lib/home-data";

type Props = {
  videos: CarouselVideo[];
  kicker: string;
  title: string;
  brandPrefix: string;
  brandSuffix: string;
};

export default function NewReleasesSection({
  videos,
  kicker,
  title,
  brandPrefix,
  brandSuffix,
}: Props) {
  if (videos.length === 0) return null;

  return (
    <section id="new-releases" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <VideoCarousel
        mode="newReleases"
        initialVideos={videos}
        brandPrefix={brandPrefix}
        brandSuffix={brandSuffix}
        visibleCount={CAROUSEL_PAGE_SIZE}
      />
    </section>
  );
}
