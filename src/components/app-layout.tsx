
// src/components/app-layout.tsx
'use client';

import React, { useState, useMemo, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart3, History, Settings, LogOut, Menu, User as UserIcon, ChefHat, Users, LayoutDashboard, BookMarked, Briefcase, Settings2, UserPlus, Shield, CreditCard, Building, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/user';
import DashboardHeader from './dashboard-header';
import { Separator } from './ui/separator';
import type { SiteConfig } from '@/lib/site-config-schema';
import { logoFonts } from '@/lib/site-config-schema';
import SubscriptionOverlay from './subscription-overlay';
import { Skeleton } from './ui/skeleton';
import { SiteConfigContext } from '@/context/site-config-context';
import TutorialGuide from './tutorial-guide';


interface AppLayoutProps {
  user: User | null;
  userProfile: UserProfile | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
  children: React.ReactNode;
}

const navItemsPatient = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard, premium: false, id: 'nav-dashboard' },
  { href: '/analysis', label: 'Análise', icon: BarChart3, premium: true, id: 'nav-analysis' },
  { href: '/plan', label: 'Plano Alimentar', icon: BookMarked, premium: true, id: 'nav-plan' },
  { href: '/chef', label: 'Chef Virtual', icon: ChefHat, premium: true, id: 'nav-chef' },
  { href: '/history', label: 'Histórico', icon: History, premium: false, id: 'nav-history' },
];

const navItemsProfessional = [
  { href: '/pro/dashboard', label: 'Dashboard', icon: Briefcase },
  { href: '/pro/patients', label: 'Pacientes', icon: Users },
  { href: '/pro/library', label: 'Biblioteca', icon: Library },
];

const navItemsAdmin = [
    { href: '/pro/professionals', label: 'Profissionais', icon: UserPlus },
    { href: '/pro/settings', label: 'Configurações', icon: Settings2 },
];

const navItemsSuperAdmin = [
     { href: '/pro/dashboard', label: 'Dashboard', icon: Building },
     { href: '/pro/settings', label: 'Config. Padrão', icon: Settings2 },
];


const NavLink = ({ id, href, label, icon: Icon, pathname, onClick }: { id?: string; href: string; label: string; icon: React.ElementType; pathname: string; onClick?: () => void }) => {
  const isActive = pathname === href || (href !== '/dashboard' && href !== '/pro/dashboard' && pathname.startsWith(href));

  return (
    <Link
      id={id}
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-lg px-4 py-3 text-lg md:text-base md:py-2 md:px-3 text-muted-foreground transition-all",
        "hover:bg-primary/10 hover:text-primary",
        isActive && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
};

const NavSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className='px-4 mt-4'>
        <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        <div className="grid items-start text-sm font-medium">
            {children}
        </div>
    </div>
);

const LogoDisplay = ({ logo, siteName }: { logo: SiteConfig['logo']; siteName: string }) => {
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


export default function AppLayout({ user, userProfile, onProfileUpdate, children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const siteConfig = useContext(SiteConfigContext);
  
  const isProfessional = userProfile?.profileType === 'professional';
  const isAdmin = isProfessional && userProfile?.role === 'admin';
  const isSuperAdmin = userProfile?.role === 'super-admin';
  
  const checkAccess = () => {
    if (isProfessional) return true;

    const isPremiumFeature = navItemsPatient.find(item => pathname.startsWith(item.href))?.premium || false;
    if (!isPremiumFeature) return true;

    if (userProfile?.patientRoomId) return true;
    
    const status = userProfile?.subscriptionStatus;
    const endsAt = userProfile?.subscriptionEndsAt?.toDate();

    if (status === 'active' && endsAt && endsAt > new Date()) return true;
    
    return false; 
  };

  const hasAccess = checkAccess();
  
  const renderNavLinks = (isMobile = false) => {
    const navLinkProps = (item: any) => ({
      ...item,
      pathname: pathname,
      onClick: () => isMobile && setSheetOpen(false),
    });

    return (
        <>
            {!isSuperAdmin && (
                <NavSection title={isProfessional ? "Meu Diário" : "Menu"}>
                    {navItemsPatient.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
                </NavSection>
            )}

            {isProfessional && (
                <>
                    <Separator className="my-4" />
                    <NavSection title="Gestão Profissional">
                        {!isSuperAdmin && navItemsProfessional.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
                        
                        {isAdmin && !isSuperAdmin && navItemsAdmin.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}

                        {isSuperAdmin && navItemsSuperAdmin.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
                    </NavSection>
                </>
            )}
        </>
    );
  };
  
  if (!siteConfig) {
    return (
      <div className="grid h-screen w-full md:grid-cols-[260px_1fr]">
        <div className="hidden border-r bg-sidebar-background md:block no-print">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-20 items-center border-b px-6">
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex-1 py-4 overflow-y-auto">
              <div className="px-4 mt-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col h-screen">
          <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print shrink-0">
            <Skeleton className="h-10 w-10 md:hidden" />
            <div className="flex-1" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-muted/40">
            <Skeleton className="h-full w-full" />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-screen w-full md:grid-cols-[260px_1fr]">
      <div className="hidden border-r bg-sidebar-background md:block no-print">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-20 items-center border-b px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LogoDisplay logo={siteConfig.logo} siteName={siteConfig.siteName} />
            </Link>
          </div>
          <div className="flex-1 py-4 overflow-y-auto">
            {renderNavLinks()}
          </div>
        </div>
      </div>
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print shrink-0">
             <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 w-full max-w-sm">
                    <SheetHeader className="flex h-20 items-center border-b px-6">
                         <Link href="/" className="flex items-center gap-2 font-semibold">
                           <LogoDisplay logo={siteConfig.logo} siteName={siteConfig.siteName} />
                        </Link>
                         <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">
                         {renderNavLinks(true)}
                    </div>
                </SheetContent>
            </Sheet>
            
            <div className="w-full flex-1 flex items-center justify-between">
              {/* O título da página agora será definido dentro de cada página para usar a nova fonte */}
            </div>

            <DashboardHeader
                user={user}
                userProfile={userProfile}
                onProfileUpdate={onProfileUpdate}
            />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-muted/40 print:bg-white print:p-0 relative">
          {hasAccess ? children : <SubscriptionOverlay />}
          {userProfile && pathname === '/dashboard' && (
             <TutorialGuide 
                isNewUser={true} 
                onComplete={() => onProfileUpdate({ isNewUser: false })}
            />
          )}
        </main>
      </div>
    </div>
  );
}
