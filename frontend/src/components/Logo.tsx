import Image from 'next/image';

// Ruta pública del logo: coloca tu imagen en frontend/public/logo.png
export const LOGO_SRC = '/logo.png';

interface LogoProps {
   size?: number;
   className?: string;
}

export default function Logo({ size = 40, className = '' }: LogoProps) {
   return (
      <Image
         src={LOGO_SRC}
         alt="PetConnect Logo"
         width={size}
         height={size}
         className={`object-contain ${className}`}
         priority
      />
   );
}

