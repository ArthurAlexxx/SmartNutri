// src/components/logo-display.tsx
import Image from 'next/image';
import type { SiteConfig } from '@/lib/site-config-schema';
import { logoFonts } from '@/lib/site-config-schema';

interface LogoDisplayProps {
    logo: SiteConfig['logo'];
    siteName: string;
}

export const LogoDisplay = ({ logo, siteName }: LogoDisplayProps) => {
  if (logo.type === 'image' && logo.imageUrl) {
    return <Image src={logo.imageUrl} alt="Site Logo" width={180} height={40} className="object-contain" priority />;
  }
  if (logo.type === 'text' && logo.text && logo.font) {
    return (
      <span
        className="text-2xl font-bold"
        style={{ fontFamily: logoFonts[logo.font] }}
      >
        {logo.text}
      </span>
    );
  }
  return <span className="text-lg font-bold">{siteName}</span>; // Fallback
};
