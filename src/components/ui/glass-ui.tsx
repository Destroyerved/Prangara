import React from 'react';

interface GlassmorphismAnimationProps {
  backgroundImage?: string;
  className?: string;
  children?: React.ReactNode;
  ambient?: boolean;
}

const GlassmorphismAnimation: React.FC<GlassmorphismAnimationProps> = ({
  backgroundImage = 'https://cdn.21st.dev/assets/mirror/f1/f118567c2ad1155dbdf8c6b8ec15c1e5d308a069cc0927105f790fbe8e163185.jpg',
  className = '',
  children,
  ambient = false,
}) => {
  return (
    <div
      className={`fixed inset-0 bg-cover bg-center bg-no-repeat overflow-hidden ${
        ambient ? 'pointer-events-none opacity-25 z-0' : ''
      } ${className}`}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Glass orb 1 */}
      <div className="absolute w-[25vmin] h-[25vmin] rounded-full overflow-hidden shadow-[0.1vw_0.1vw_0_rgba(255,255,255,0.2)] animate-glass-move">
        <div 
          className="absolute inset-[5%] rounded-full bg-cover bg-center bg-no-repeat bg-fixed blur-[2.5vmin]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <div className="absolute -inset-1/4 backdrop-blur-[2.5vmin] backdrop-contrast-[500%]" />
      </div>

      {/* Glass orb 2 */}
      <div className="absolute w-[25vmin] h-[25vmin] rounded-full overflow-hidden shadow-[0.1vw_0.1vw_0_rgba(255,255,255,0.2)] animate-glass-move-delay-1">
        <div 
          className="absolute inset-[5%] rounded-full bg-cover bg-center bg-no-repeat bg-fixed blur-[2.5vmin]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <div className="absolute -inset-1/4 backdrop-blur-[2.5vmin] backdrop-contrast-[500%]" />
      </div>

      {/* Glass orb 3 */}
      <div className="absolute w-[25vmin] h-[25vmin] rounded-full overflow-hidden shadow-[0.1vw_0.1vw_0_rgba(255,255,255,0.2)] animate-glass-move-delay-2">
        <div 
          className="absolute inset-[5%] rounded-full bg-cover bg-center bg-no-repeat bg-fixed blur-[2.5vmin]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <div className="absolute -inset-1/4 backdrop-blur-[2.5vmin] backdrop-contrast-[500%]" />
      </div>

      {/* Glass orb 4 */}
      <div className="absolute w-[25vmin] h-[25vmin] rounded-full overflow-hidden shadow-[0.1vw_0.1vw_0_rgba(255,255,255,0.2)] animate-glass-move-delay-3">
        <div 
          className="absolute inset-[5%] rounded-full bg-cover bg-center bg-no-repeat bg-fixed blur-[2.5vmin]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <div className="absolute -inset-1/4 backdrop-blur-[2.5vmin] backdrop-contrast-[500%]" />
      </div>

      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}

      <style>{`
        @keyframes glass-move {
          0% { top: 10%; left: 10%; }
          25% { top: 10%; left: calc(90% - 25vmin); }
          50% { top: calc(90% - 25vmin); left: calc(90% - 25vmin); }
          75% { top: calc(90% - 25vmin); left: 10%; }
          100% { top: 10%; left: 10%; }
        }

        .animate-glass-move {
          animation: glass-move 4s cubic-bezier(0.6, 0, 0.4, 1) infinite;
        }

        .animate-glass-move-delay-1 {
          animation: glass-move 4s cubic-bezier(0.6, 0, 0.4, 1) infinite;
          animation-delay: -3s;
        }

        .animate-glass-move-delay-2 {
          animation: glass-move 4s cubic-bezier(0.6, 0, 0.4, 1) infinite;
          animation-delay: -2s;
        }

        .animate-glass-move-delay-3 {
          animation: glass-move 4s cubic-bezier(0.6, 0, 0.4, 1) infinite;
          animation-delay: -1s;
        }
      `}</style>
    </div>
  );
};

export default GlassmorphismAnimation;
