// src/app/register/page.tsx
'use client';

import * as React from 'react';
import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { UserProfile } from '@/types/user';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { SiteConfigContext } from '@/context/site-config-context';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoDisplay } from '@/components/logo-display';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof formSchema>;

const generateShareCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const siteConfig = useContext(SiteConfigContext);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    if (!auth || !firestore) {
      toast({
        title: "Erro de inicialização",
        description: "Serviços de autenticação ou banco de dados não disponíveis.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: values.fullName });
        
        const userDocRef = doc(firestore, 'users', user.uid);
        
        const userDocData: UserProfile = {
            id: user.uid,
            tenantId: user.uid, // For patients, their tenantId is their own UID
            fullName: values.fullName,
            email: values.email,
            profileType: 'patient',
            createdAt: serverTimestamp() as Timestamp,
            isNewUser: true, // Set flag for tutorial
            dashboardShareCode: generateShareCode(),
            calorieGoal: 2000,
            waterGoal: 2000,
            proteinGoal: 140,
            subscriptionStatus: 'inactive',
        };
        
        await setDoc(userDocRef, userDocData).catch(error => {
            const contextualError = new FirestorePermissionError({
                operation: 'create',
                path: userDocRef.path,
                requestResourceData: userDocData,
            });
            errorEmitter.emit('permission-error', contextualError);
            throw error;
        });
        
        toast({
            title: 'Bem-vindo(a)! 🎉',
            description: 'Sua conta foi criada. Redirecionando para o seu diário...',
        });
        
        router.push('/dashboard');

    } catch (error: any) {
        console.error("Erro no registro:", error);
        let description = "Ocorreu um erro desconhecido. Por favor, tente novamente.";
        
        // This is a simple error handling. A more robust solution would be more specific.
        if (error.code === 'auth/email-already-in-use') {
            description = "Este e-mail já está sendo utilizado por outra conta.";
        } else if (error.code === 'auth/invalid-email') {
            description = "O formato do e-mail fornecido é inválido.";
        } else if (error.code === 'auth/weak-password') {
            description = "A senha fornecida é muito fraca.";
        } else if (!error.message.includes('permission-error')) {
            // Only show generic firebase auth errors if it's not our custom permission error
             description = error.message || "Não foi possível completar o cadastro. Verifique os dados e tente novamente.";
        }

        toast({
            title: 'Erro no Cadastro',
            description,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
       <div className="relative hidden flex-col justify-between bg-primary p-10 text-white lg:flex dark:border-r">
            <div className="relative z-20 flex items-center text-lg font-medium text-white bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                {siteConfig ? <LogoDisplay logo={siteConfig.logo} siteName={siteConfig.siteName} /> : <Skeleton className="h-8 w-32" />}
            </div>
            
            <div className="relative z-10 my-auto mx-auto w-full max-w-md animate-fade-in" style={{animationDelay: '150ms'}}>
                <Image
                    src="https://i.imgur.com/Q6gSmZm.png"
                    alt="Visão geral do aplicativo NutriSmart"
                    width={800}
                    height={600}
                    className="rounded-3xl object-cover shadow-2xl"
                />
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
                <CardTitle className="text-3xl font-bold font-heading">Crie sua Conta</CardTitle>
                <CardDescription>Comece sua jornada para uma vida mais saudável hoje mesmo.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl><Input type="password" placeholder="Confirme sua senha" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full !mt-6" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Conta
                    </Button>
                    </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                    Faça login
                    </Link>
                </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
