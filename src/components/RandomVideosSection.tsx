import VideoCarousel, { type CarouselVideo } from "@/components/VideoCarousel";
import { CAROUSEL_PAGE_SIZE } from "@/lib/carousel";

type Props = {
  videos: CarouselVideo[];
  kicker: string;
  title: string;
  brandPrefix: string;
  brandSuffix: string;
};

export default function RandomVideosSection({
  videos,
  kicker,
  title,
  brandPrefix,
  brandSuffix,
}: Props) {
  return (
    <section id="random" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <VideoCarousel
        mode="random"
        initialVideos={videos}
        brandPrefix={brandPrefix}
        brandSuffix={brandSuffix}
        visibleCount={CAROUSEL_PAGE_SIZE}
      />
    </section>
  );
}
