import { Autoplay, Pagination, EffectFade, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/zoom';

export default function PhotoGallery({ photos }: { photos: string[] }) {
    if (!photos || photos.length === 0) return (
        <div className="w-full h-96 bg-gray-800 flex items-center justify-center text-gray-500">
            No Photos
        </div>
    );

    return (
        <div className="photo-gallery-root relative w-full aspect-[3/4] overflow-hidden rounded-xl">
            <Swiper
                modules={[Autoplay, Pagination, EffectFade, Zoom]}
                effect="fade"
                spaceBetween={0}
                slidesPerView={1}
                pagination={{ clickable: true, dynamicBullets: true }}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                zoom={true}
                loop={photos.length > 1}
                className="w-full h-full"
            >
                {photos.map((url, idx) => (
                    <SwiperSlide key={idx} className="w-full h-full">
                        <div className="swiper-zoom-container w-full h-full">
                            <img
                                src={url}
                                alt={`Profile ${idx}`}
                                className="w-full h-full object-cover"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                            />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    </SwiperSlide>
                ))}
            </Swiper>
            <style>{`
        .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.5);
          opacity: 1;
        }
        .swiper-pagination-bullet-active {
          background: #fff;
          width: 20px;
          border-radius: 4px;
          transition: width 0.3s;
        }
      `}</style>
        </div>
    );
}
