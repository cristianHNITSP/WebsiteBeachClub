// React Bits: StarBorder (JS-TW), adaptado a tokens.
// Dos destellos recorren el filo. Keyframes en website/site.css.
// Solo en la acción destacada de una pantalla (SISTEMA-DE-DISENO §6).
const StarBorder = ({
  as: Component = 'button',
  className = '',
  innerClassName = '',
  color = 'var(--secondary)',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}) => {
  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-full ${className}`}
      style={{
        padding: `${thickness}px 0`,
        ...rest.style
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0 motion-reduce:hidden"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        aria-hidden="true"
        className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0 motion-reduce:hidden"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className={`relative z-1 flex items-center justify-center gap-2 border border-primary/40 bg-primary text-primary-foreground font-semibold rounded-full ${innerClassName || 'text-sm py-3 px-6'}`}
      >
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
