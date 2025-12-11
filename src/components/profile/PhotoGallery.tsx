import { Pagination, EffectFade, Zoom } from 'swiper/modules';
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
                modules={[Pagination, EffectFade, Zoom]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                spaceBetween={0}
                slidesPerView={1}
                pagination={{ clickable: true, dynamicBullets: true }}
                zoom={true}
                loop={photos.length > 1}
                className="w-full h-full text-white"
            >
                {photos.map((url, idx) => (
                    <SwiperSlide key={idx} className="w-full h-full bg-[#1a1a22] overflow-hidden relative">
                        {/* Blurred Background Layer (Fill empty space) */}
                        <div
                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-125 saturate-150 pointer-events-none"
                            style={{ backgroundImage: `url(${url})` }}
                        />

                        {/* Shadow Gradient Overlay for contrast */}
                        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                        {/* Main Image (Centered & Contained) */}
                        <div className="swiper-zoom-container w-full h-full relative z-10">
                            <img
                                src={url}
                                alt={`Profile ${idx}`}
                                className="w-full h-full object-contain drop-shadow-xl"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                            />
                        </div>
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
