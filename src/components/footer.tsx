
import Link from 'next/link';
import Image from 'next/image';
import type { SiteConfig } from '@/lib/site-config-schema';
import { logoFonts } from '@/lib/site-config-schema';

interface FooterProps {
    siteConfig: SiteConfig;
}

const LogoDisplay = ({ siteConfig }: { siteConfig: SiteConfig }) => {
    const { logo, siteName } = siteConfig;
    if (logo.type === 'text' && logo.text && logo.font) {
        return (
            <span
                className="text-xl font-bold"
                style={{ fontFamily: logoFonts[logo.font] }}
            >
                {logo.text}
            </span>
        );
    }
    if (logo.type === 'image' && logo.imageUrl) {
        return <Image src={logo.imageUrl} alt="Site Logo" width={160} height={35} className="object-contain" />;
    }
    return <span className="text-xl font-semibold">{siteName || 'NutriSmart'}</span>;
};


export default function Footer({ siteConfig }: FooterProps) {
  return (
    <footer className="w-full border-t bg-secondary/30">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          
          <div className="flex flex-col items-start gap-4 md:col-span-12 lg:col-span-4">
             <Link href="/" className="flex items-center gap-2">
                <LogoDisplay siteConfig={siteConfig} />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Nutrição inteligente para uma vida saudável. Junte-se a nós e transforme sua relação com a comida.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:col-span-8 lg:col-span-8 lg:pl-16">
            <div className='col-span-1'>
              <h3 className="mb-4 font-semibold text-foreground">Produto</h3>
              <ul className="space-y-3">
                <li><Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">Funcionalidades</Link></li>
                <li><Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
                 <li><Link href="/#testimonials" className="text-muted-foreground hover:text-primary transition-colors">Depoimentos</Link></li>
              </ul>
            </div>
            <div className='col-span-1'>
              <h3 className="mb-4 font-semibold text-foreground">Empresa</h3>
              <ul className="space-y-3">
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Sobre Nós</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Carreiras</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Imprensa</Link></li>
              </ul>
            </div>
            <div className='col-span-1'>
              <h3 className="mb-4 font-semibold text-foreground">Legal</h3>
              <ul className="space-y-3">
                 <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Termos de Serviço</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

        </div>
        <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
                © {new Date().getFullYear()} {siteConfig.siteName}. Todos os direitos reservados.
            </p>
        </div>
      </div>
    </footer>
  );
}
