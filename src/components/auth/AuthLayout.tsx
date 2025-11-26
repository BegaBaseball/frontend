import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  showHomeButton?: boolean;
}

export default function AuthLayout({ children, showHomeButton = false }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="fixed rounded-full opacity-90"
          style={{ 
            top: '-100px',
            right: '-80px',
            width: '600px',
            height: '400px',
            background: 'linear-gradient(135deg, #2d5f4f 0%, #3d7f5f 100%)',
            transform: 'rotate(-15deg)'
          }}
        />
        <div 
          className="fixed rounded-full opacity-80"
          style={{ 
            top: '-128px',
            left: '-240px',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(45deg, #2d5f4f 0%, #4a9070 100%)',
            transform: 'rotate(25deg)'
          }}
        />
        <div 
          className="fixed rounded-full opacity-85"
          style={{ 
            bottom: '-160px',
            left: '-160px',
            width: '550px',
            height: '450px',
            background: 'linear-gradient(90deg, #2d5f4f 0%, #3d7f5f 100%)',
            transform: 'rotate(-20deg)'
          }}
        />
        <div 
          className="fixed rounded-full opacity-75"
          style={{ 
            bottom: '-128px',
            right: '-192px',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(180deg, #3d7f5f 0%, #2d5f4f 100%)',
            transform: 'rotate(15deg)'
          }}
        />
      </div>

      {/* Grass decorations */}
      <img 
        src={grassDecor} 
        alt="" 
        className="fixed bottom-0 left-0 w-full h-32 object-cover object-top z-10 pointer-events-none"
      />

      {/* Content Card */}
      <div className="w-full max-w-5xl relative z-20">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left - Character */}
            <div className="p-12 flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
              <img 
                src={grassDecor} 
                alt="" 
                className="absolute bottom-0 left-0 w-full h-24 object-cover object-top opacity-40"
              />
              
              <div className="relative z-10 text-center">
                <img 
                  src={begaCharacter} 
                  alt="BEGA Character" 
                  className="w-72 h-auto mb-8 drop-shadow-2xl"
                />
                <h1 className="text-white mb-2 text-6xl tracking-wider" style={{ fontWeight: 900 }}>BEGA</h1>
                <p className="text-green-100 text-xl">BASEBALL GUIDE</p>
              </div>
            </div>

            <div className="p-12 bg-white relative">
              {showHomeButton && (
                <button
                  onClick={() => navigate('/home')}
                  className="absolute flex items-center gap-2 bg-white rounded-full px-3 py-2 transition-all hover:scale-105 z-50"
                  style={{ 
                    border: '2px solid #2d5f4f',
                    top: '38px',
                    right: '48px',
                  }}
                >
                  <Home className="w-5 h-5" style={{ color: '#2d5f4f' }} />
                </button>
              )}

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}