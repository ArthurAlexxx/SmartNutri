
// src/app/[locale]/register/page.tsx
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
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { UserProfile } from '@/types/user';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { SiteConfigContext } from '@/context/site-config-context';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoDisplay } from '@/components/logo-display';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres.')
    .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra.')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número.'),
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

const PasswordStrengthMeter = ({ password }: { password?: string }) => {
    const [strength, setStrength] = React.useState({ score: 0, label: '', color: '' });
    const t = useTranslations('Register.PasswordStrength');

    const checkStrength = (pass: string) => {
        let score = 0;
        const hasLetters = /[a-zA-Z]/.test(pass);
        const hasNumbers = /[0-9]/.test(pass);
        const hasSymbols = /[^a-zA-Z0-9]/.test(pass);

        if (pass.length >= 8) score++;
        if (hasLetters && hasNumbers) score++;
        if (hasSymbols) score++;
        if (pass.length >= 12) score++;

        let label = t('weak');
        let color = 'bg-red-500';

        if (score >= 4) {
            label = t('strong');
            color = 'bg-green-500';
        } else if (score >= 2) {
            label = t('medium');
            color = 'bg-yellow-500';
        }
        
        setStrength({ score, label, color });
    };

    React.useEffect(() => {
        if (password) {
            checkStrength(password);
        } else {
            setStrength({ score: 0, label: '', color: '' });
        }
    }, [password]);

    if (!password) return null;

    return (
        <div className="space-y-1">
            <div className="h-1.5 w-full bg-muted rounded-full">
                <div className={cn("h-full rounded-full password-strength-bar", strength.color)} style={{ width: `${strength.score * 25}%` }}></div>
            </div>
            <p className="text-xs font-semibold" style={{ color: strength.color.replace('bg-', 'text-') }}>
                {t('label')}: {strength.label}
            </p>
        </div>
    );
};


export default function RegisterPage() {
  const t = useTranslations('Register');
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
    mode: 'onBlur'
  });

  const watchedPassword = form.watch('password');


  const handleRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    if (!auth || !firestore) {
      toast({
        title: t('errorInitTitle'),
        description: t('errorInitDescription'),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;
        
        await sendEmailVerification(user);

        await updateProfile(user, { displayName: values.fullName });
        
        const userDocRef = doc(firestore, 'users', user.uid);
        
        const userDocData: UserProfile = {
            id: user.uid,
            tenantId: user.uid,
            fullName: values.fullName,
            email: values.email,
            profileType: 'patient',
            createdAt: serverTimestamp() as Timestamp,
            isNewUser: true,
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
            title: t('successTitle'),
            description: t('successDescription'),
        });
        
        router.push('/dashboard');

    } catch (error: any) {
        console.error(t('errorLog'), error);
        let description = t('errorUnknown');
        
        if (error.code === 'auth/email-already-in-use') {
            description = t('errorEmailInUse');
        } else if (error.code === 'auth/invalid-email') {
            description = t('errorInvalidEmail');
        } else if (error.code === 'auth/weak-password') {
            description = t('errorWeakPassword');
        } else if (!error.message.includes('permission-error')) {
             description = error.message || t('errorCheckData');
        }

        toast({
            title: t('errorTitle'),
            description,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 relative">
        <Image
            src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt={t('backgroundAlt')}
            fill
            className="object-cover -z-10"
        />
        <div className="absolute inset-0 bg-black/80 -z-10" />

        <Card className="w-full max-w-md shadow-2xl animate-fade-in bg-background/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    {siteConfig ? <LogoDisplay logo={siteConfig.logo} siteName={siteConfig.siteName} /> : <Skeleton className="h-8 w-32" />}
                </div>
                <CardTitle className="text-3xl font-bold font-heading">{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('fullNameLabel')}</FormLabel>
                        <FormControl><Input placeholder={t('fullNamePlaceholder')} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('emailLabel')}</FormLabel>
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
                        <FormLabel>{t('passwordLabel')}</FormLabel>
                        <FormControl><Input type="password" placeholder={t('passwordPlaceholder')} {...field} /></FormControl>
                        <PasswordStrengthMeter password={watchedPassword} />
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                        <FormControl><Input type="password" placeholder={t('confirmPasswordPlaceholder')} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full !mt-6" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('submitButton')}
                </Button>
                </form>
            </Form>
            <div className="mt-6 text-center text-sm">
                {t('hasAccount')}{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                {t('loginLink')}
                </Link>
            </div>
            </CardContent>
        </Card>
    </div>
  );
}
