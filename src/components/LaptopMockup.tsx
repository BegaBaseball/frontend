import { LaptopMockupProps } from '../types/landing';

export default function LaptopMockup({
  activeFeature,
  features,
  scrollProgress,
  laptopRef
}: LaptopMockupProps) {
  return (
    <div
      ref={laptopRef}
      className="sticky top-24"
      style={{
        transform: `translateY(${scrollProgress * 130}px)`,
        transition: 'transform 0.1s linear'
      }}
    >
      {/* Background decorative box */}
      <div
        style={{
          position: 'absolute',
          top: '2rem',
          right: '-1rem',
          width: '100%',
          height: '100%',
          borderRadius: '1.5rem',
          backgroundColor: '#d1fae5',
          zIndex: 0
        }}
      />

      {/* Laptop */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Screen */}
        <div
          className="relative p-3"
          style={{
            backgroundColor: '#1f2937',
            borderRadius: '1rem 1rem 0 0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Notch */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: '8rem',
              height: '1.5rem',
              backgroundColor: '#1f2937',
              borderRadius: '0 0 1rem 1rem',
              zIndex: 10
            }}
          />

          {/* Screen bezel */}
          <div
            className="relative overflow-hidden"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              aspectRatio: '16/10'
            }}
          >
            <img
              key={activeFeature}
              src={features[activeFeature].image}
              alt={features[activeFeature].title}
              className="w-full h-full object-contain animate-fade-in"
            />
          </div>
        </div>

        {/* Keyboard base */}
        <div
          className="relative"
          style={{
            height: '0.5rem',
            background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)',
            borderRadius: '0 0 1rem 1rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        />

        {/* Shadow under laptop */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '-1rem',
            width: '80%',
            height: '1rem',
            backgroundColor: 'rgba(17, 24, 39, 0.2)',
            filter: 'blur(12px)',
            borderRadius: '9999px'
          }}
        />
      </div>
    </div>
  );
}