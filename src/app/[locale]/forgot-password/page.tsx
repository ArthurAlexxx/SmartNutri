// src/app/[locale]/forgot-password/page.tsx
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
import { useTranslations } from 'next-intl';

const formSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPassword');
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
      let description = t('errorUnknown');
      if (error.code === 'auth/user-not-found') {
        description = t('errorUserNotFound');
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
                <CardDescription>
                    {submitted 
                    ? t('submittedDescription')
                    : t('description')
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
            {submitted ? (
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        {t('submittedMessage')}
                    </p>
                    <Button asChild>
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('backToLoginButton')}
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
                        <FormLabel>{t('emailLabel')}</FormLabel>
                        <FormControl>
                            <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('submitButton')}
                    </Button>
                </form>
                </Form>
            )}
            {!submitted && (
                <div className="mt-6 text-center text-sm">
                    {t('rememberedPassword')}{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        {t('loginLink')}
                    </Link>
                </div>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
