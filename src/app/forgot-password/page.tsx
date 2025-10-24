// src/app/forgot-password/page.tsx
'use client';

import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { SiteConfigContext } from '@/context/site-config-context';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoDisplay } from '@/components/logo-display';

const formSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const siteConfig = useContext(SiteConfigContext);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const handlePasswordReset = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSubmitted(true);
    } catch (error: any) {
      let description = "Ocorreu um erro desconhecido. Tente novamente.";
      if (error.code === 'auth/user-not-found') {
        description = "Nenhuma conta encontrada com este e-mail.";
      }
      toast({
        title: 'Erro ao Enviar E-mail',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
       <div className="relative hidden flex-col justify-between bg-muted p-10 text-white lg:flex dark:border-r">
          <Image
            src="https://images.unsplash.com/photo-1576091160323-838b816a1b63?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Profissional de saúde usando um tablet"
            fill
            className="object-cover"
            />
            <div className="absolute inset-0 bg-primary/90" />
          <div className="relative z-20 flex items-center text-lg font-medium text-white">
            {siteConfig ? <LogoDisplay logo={siteConfig.logo} siteName={siteConfig.siteName} /> : <Skeleton className="h-8 w-32" />}
          </div>
          <div className="relative z-20 mt-auto max-w-md">
            <blockquote className="space-y-2">
              <p className="text-lg text-primary-foreground/90">
                &ldquo;Cuidar da sua saúde hoje dá mais vida ao seu futuro. Cada escolha conta.&rdquo;
              </p>
              <footer className="text-sm text-primary-foreground/80">Equipe NutriSmart</footer>
            </blockquote>
          </div>
        </div>
        <div className="flex items-center justify-center py-12 px-4 sm:px-0">
             <Card className="w-full max-w-md shadow-2xl animate-fade-in relative mx-auto">
                <Link href="/" className="absolute top-4 left-4">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </Link>
                <CardHeader className="text-center pt-16">
                    <CardTitle className="text-3xl font-bold font-heading">Redefinir Senha</CardTitle>
                    <CardDescription>
                        {submitted 
                        ? 'Verifique sua caixa de entrada.'
                        : 'Insira seu e-mail para receber um link de redefinição.'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                {submitted ? (
                    <div className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            Se uma conta com este e-mail existir, um link para redefinir sua senha foi enviado. O link expira em alguns minutos.
                        </p>
                        <Button asChild>
                            <Link href="/login">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar para o Login
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                                <Input placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Link de Redefinição
                        </Button>
                    </form>
                    </Form>
                )}
                {!submitted && (
                    <div className="mt-6 text-center text-sm">
                        Lembrou a senha?{' '}
                        <Link href="/login" className="font-semibold text-primary hover:underline">
                            Faça login
                        </Link>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
