import { useState, useEffect, useRef } from 'react';

/*
 * Magnet (React Bits), adaptado:
 *  · solo re-renderiza cuando la posición cambia de verdad (el original hacía
 *    setState en CADA mousemove de la página, aunque el cursor estuviera lejos);
 *  · sin estilo en línea de display/position en el envoltorio: lo pone la clase
 *    (así una clase puede ocultarlo, p. ej. en móvil);
 *  · `disabled` vuelve al centro (reducir movimiento, botón deshabilitado);
 *  · `maxOffset` topa el desplazamiento en px (que no choque con sus vecinos).
 */
const CENTRO = { x: 0, y: 0 };

const Magnet = ({
  children,
  padding = 100,
  disabled = false,
  magnetStrength = 2,
  maxOffset = Infinity,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.5s ease-in-out',
  wrapperClassName = '',
  innerClassName = '',
  ...props
}) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState(CENTRO);
  const magnetRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      setIsActive(false);
      setPosition(CENTRO);
      return;
    }

    const handleMouseMove = e => {
      if (!magnetRef.current) return;

      const { left, top, width, height } = magnetRef.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const distX = Math.abs(centerX - e.clientX);
      const distY = Math.abs(centerY - e.clientY);

      if (distX < width / 2 + padding && distY < height / 2 + padding) {
        setIsActive(true);
        const tope = v => Math.round(Math.max(-maxOffset, Math.min(maxOffset, v)));
        const x = tope((e.clientX - centerX) / magnetStrength);
        const y = tope((e.clientY - centerY) / magnetStrength);
        setPosition(p => (p.x === x && p.y === y ? p : { x, y }));
      } else {
        setIsActive(false);
        setPosition(CENTRO);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [padding, disabled, magnetStrength, maxOffset]);

  const transitionStyle = isActive ? activeTransition : inactiveTransition;

  return (
    <div ref={magnetRef} className={wrapperClassName} {...props}>
      <div
        className={innerClassName}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: transitionStyle,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Magnet;
