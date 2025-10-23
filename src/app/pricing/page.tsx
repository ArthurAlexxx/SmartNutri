
// src/app/pricing/page.tsx
'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { useUser } from '@/firebase';
import type { SiteConfig } from '@/lib/site-config-schema';
import { SiteConfigContext } from '@/context/site-config-context';
import { Skeleton } from '@/components/ui/skeleton';
import CheckoutModal from '@/components/checkout-modal';

const features = {
  free: [
    'Registro de Refeições e Água',
    'Histórico de Consumo',
    'Definição de Metas Pessoais',
    'Conexão com Nutricionista',
  ],
  premium: [
    'Todas as funcionalidades do plano gratuito',
    'Análise de Desempenho com IA',
    'Plano Alimentar Inteligente e Adaptativo',
    'Chef Virtual com Receitas Ilimitadas',
    'Acompanhamento de Tendências de Peso',
  ],
};


const LoadingSkeleton = () => (
   <div className="flex min-h-dvh flex-col bg-background font-sans overflow-x-hidden">
    <header className="sticky top-0 z-50 w-full border-b bg-background h-20 flex items-center container">
      <Skeleton className="h-8 w-32" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </header>
     <main className="flex-1 container py-12">
        <Skeleton className="h-24 w-1/2 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
     </main>
     <footer className="w-full border-t bg-secondary/30 py-12 container">
        <Skeleton className="h-8 w-48" />
     </footer>
   </div>
);


export default function PricingPage() {
    const config = useContext(SiteConfigContext);
    const { user, userProfile } = useUser();
    const [isModalOpen, setModalOpen] = useState(false);
    
    if (!config) {
      return <LoadingSkeleton />;
    }
    
    const handlePremiumClick = () => {
        if (!user) {
            // Se não estiver logado, redireciona para o registro
            window.location.href = '/register';
        } else {
            // Se estiver logado, abre o modal de checkout
            setModalOpen(true);
        }
    };

  return (
    <>
    <div className="flex min-h-screen flex-col bg-background">
      <Header siteConfig={config} />
      <main className="flex-1">
        <section className="container mx-auto py-16 md:py-24 text-center animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground font-heading">
            Planos feitos para <span className="text-primary">você</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Escolha o plano que melhor se adapta à sua jornada. Comece de graça ou desbloqueie todo o poder da nossa IA com o plano Premium.
          </p>
        </section>

        <section className="container mx-auto max-w-4xl pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Plano Gratuito */}
                <Card className="rounded-2xl shadow-sm">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-bold">Gratuito</CardTitle>
                        <CardDescription>O essencial para começar a acompanhar sua saúde, sem custo algum.</CardDescription>
                         <p className="text-4xl font-bold pt-4">R$ 0,00</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <ul className="space-y-4">
                        {features.free.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                <span>{feature}</span>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="p-8 pt-0">
                        <Button asChild size="lg" className="w-full" variant="outline">
                            <Link href="/register">Começar Agora</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Plano Premium */}
                <Card className="relative rounded-2xl border-2 border-primary shadow-2xl shadow-primary/10">
                     <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                            Mais Popular
                        </div>
                    </div>
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl font-bold">Premium</CardTitle>
                        <CardDescription>A experiência completa com todo o poder da inteligência artificial.</CardDescription>
                        <div className="pt-4">
                            <span className="text-4xl font-bold">R$ 9,99</span>
                            <span className="text-muted-foreground"> / mês</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                         <ul className="space-y-4">
                        {features.premium.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                <span>{feature}</span>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="p-8 pt-0">
                        <Button onClick={handlePremiumClick} size="lg" className="w-full">
                            Assinar Premium
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </section>
      </main>
      <Footer siteConfig={config} />
    </div>
    {userProfile && (
        <CheckoutModal 
            isOpen={isModalOpen}
            onOpenChange={setModalOpen}
            userProfile={userProfile}
        />
    )}
    </>
  );
}
