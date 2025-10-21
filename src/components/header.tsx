
// src/components/header.tsx
'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import type { SiteConfig } from '@/lib/site-config-schema';
import { logoFonts } from '@/lib/site-config-schema';

const NavLink = ({ href, children, onClick, className }: { href: string; children: React.ReactNode, onClick?: () => void, className?: string }) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn("transition-colors hover:text-primary text-base", className)}
  >
    {children}
  </Link>
);

interface HeaderProps {
    siteConfig: SiteConfig;
}

const LogoDisplay = ({ siteConfig }: { siteConfig: SiteConfig }) => {
    const { logo, siteName } = siteConfig;
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
    return <span className="text-xl font-semibold">{siteName || 'NutriSmart'}</span>;
};


export default function Header({ siteConfig }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
        window.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  const navLinkStyle = "font-medium text-muted-foreground";

  const navLinks = (
    <>
      <NavLink href="/#about-pro" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Sobre Mim</NavLink>
      <NavLink href="/#features" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Funcionalidades</NavLink>
      <NavLink href="/#testimonials" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Depoimentos</NavLink>
    </>
  );

  return (
    <header className={cn(
        'sticky top-0 z-50 w-full border-b transition-shadow duration-300',
        isScrolled ? 'bg-background/80 backdrop-blur-lg shadow-sm' : 'bg-background'
    )}>
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
            <LogoDisplay siteConfig={siteConfig} />
        </Link>
        
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
            <div className='hidden md:flex items-center gap-2'>
              {user ? (
                 <Button asChild className="rounded-full">
                   <Link href="/dashboard">Ir para o App</Link>
                </Button>
              ) : (
                <>
                   <Button asChild variant="outline" className="rounded-full">
                       <Link href="/login">Login</Link>
                   </Button>
                   <Button asChild className="rounded-full">
                       <Link href="/register">Cadastre-se</Link>
                   </Button>
                </>
              )}
            </div>

          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Menu de Navegação</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                 <Link href="/" className="flex items-center gap-2 border-b pb-6 mb-6">
                    <LogoDisplay siteConfig={siteConfig} />
                </Link>
                <nav className="grid gap-6">
                  {navLinks}
                  <div className='grid gap-4 pt-6 border-t'>
                      {user ? (
                         <Button asChild>
                            <Link href="/dashboard" onClick={() => setSheetOpen(false)}>Ir para o App</Link>
                         </Button>
                      ) : (
                        <>
                           <Button asChild>
                              <Link href="/login" onClick={() => setSheetOpen(false)}>Login</Link>
                           </Button>
                           <Button asChild variant="secondary">
                              <Link href="/register" onClick={() => setSheetOpen(false)}>Cadastre-se</Link>
                           </Button>
                        </>
                       )}
                   </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
