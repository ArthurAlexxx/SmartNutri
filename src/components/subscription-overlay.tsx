// src/components/subscription-overlay.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in">
        <Card className="max-w-md w-full text-center shadow-2xl border-primary/20">
            <CardHeader className="p-8">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold">Desbloqueie seu Potencial Máximo</CardTitle>
                <CardDescription className="text-base text-muted-foreground pt-2">
                    Esta é uma funcionalidade Premium. Assine para ter acesso à análise de dados, planos gerados por IA, chef virtual e muito mais.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
                 <Button asChild size="lg" className="w-full h-12 text-lg">
                    <Link href="/pricing">Ver Planos Premium <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <p className="text-sm text-muted-foreground pt-2">
                    Ou ganhe acesso vitalício sem custo ao se conectar com um de nossos nutricionistas parceiros.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
