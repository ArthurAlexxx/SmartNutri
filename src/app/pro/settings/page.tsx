
// src/app/pro/settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Palette, Save, Image as ImageIcon, Type, Settings as SettingsIcon, AlertCircle, ChevronDown, User, FileImage, CaseSensitive, Shield, Baseline, Sparkles, BookCopy, Users } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Unsubscribe, setDoc } from 'firebase/firestore';
import Image from 'next/image';

import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { getSiteConfig } from '@/lib/get-site-config-client';
import { type SiteConfig, siteSettingsSchema, type SiteSettings, colorOptions, logoFonts, titleFontSizes } from '@/lib/site-config-schema';
import { defaultSiteConfig } from '@/lib/default-site-config';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const ImageUrlInput = ({ form, name, label }: { form: any; name: `heroSection.imageUrl` | `professionalProfileSection.imageUrl` | `logo.imageUrl` | `ctaSection.imageUrl`; label: string; }) => {
    const [imageUrl, setImageUrl] = useState(form.getValues(name));
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const subscription = form.watch((value: any) => {
            const newUrl = value[name];
            if (newUrl !== imageUrl) {
                setImageUrl(newUrl);
                setIsValid(null); // Reset validation state on new URL
            }
        });
        return () => subscription.unsubscribe();
    }, [form, name, imageUrl]);

    const handleImageError = () => setIsValid(false);
    const handleImageLoad = () => setIsValid(true);

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
                <Input {...form.register(name)} />
            </FormControl>
            <FormMessage>{(form.formState.errors as any)[name]?.message}</FormMessage>
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="text-sm p-0 h-auto flex items-center gap-1 text-muted-foreground">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        {isOpen ? 'Ocultar Pré-visualização' : 'Mostrar Pré-visualização'}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 animate-in fade-in-0">
                    <div className="w-full h-48 relative rounded-md border flex items-center justify-center bg-muted/50 overflow-hidden">
                        {imageUrl ? (
                            <>
                                <Image
                                    key={imageUrl} // Force re-render on URL change
                                    src={imageUrl}
                                    alt="Pré-visualização"
                                    fill
                                    className="object-contain"
                                    onError={handleImageError}
                                    onLoad={handleImageLoad}
                                    unoptimized={true}
                                />
                                {isValid === false && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive p-2">
                                        <AlertCircle className="h-8 w-8" />
                                        <span className="text-xs mt-1 font-semibold text-center">URL inválida ou a imagem não pôde ser carregada.</span>
                                    </div>
                                )}
                            </>
                        ) : (
                             <div className="flex flex-col items-center text-center text-muted-foreground p-2">
                                <ImageIcon className="h-8 w-8" />
                                <span className="text-xs mt-1">Nenhuma imagem para pré-visualizar.</span>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </FormItem>
    );
};


export default function ProSettingsPage() {
  const { user, isUserLoading, userProfile, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<SiteSettings>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      ...defaultSiteConfig
    },
  });

  const logoType = form.watch('logo.type');
  const isSuperAdmin = userProfile?.role === 'super-admin';

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    if (userProfile === null) {
        // Still loading profile, wait.
        return;
    }
    
    // Security Check: Only allow admins and super-admins to access this page
    if (userProfile.profileType !== 'professional' || !['admin', 'super-admin'].includes(userProfile.role || '')) {
      toast({ title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.', variant: 'destructive' });
      router.push('/pro/dashboard');
      return;
    }

    setAuthChecked(true);

    const tenantIdToLoad = userProfile.role === 'super-admin' ? 'default' : userProfile.tenantId;

    if (firestore && tenantIdToLoad) {
        const unsubConfig = getSiteConfig(firestore, tenantIdToLoad, (config) => {
            form.reset({
              ...config,
              logo: {
                ...config.logo,
                text: config.logo.text || config.siteName,
              }
            });
            setLoading(false);
        });
        return () => unsubConfig();
    } else {
        setLoading(false); // No tenantId, probably an error state, but stop loading.
    }
    
  }, [user, userProfile, isUserLoading, router, firestore, form, toast]);

  const onSubmit = async (data: SiteSettings) => {
    if (!user || !firestore || !userProfile) {
        toast({ title: 'Erro', description: 'Você não está autenticado ou a clínica não foi identificada.' });
        return;
    }
    if (userProfile.profileType !== 'professional' || !['admin', 'super-admin'].includes(userProfile.role || '')) {
        toast({ title: 'Permissão Negada', description: 'Apenas administradores podem alterar as configurações do site.', variant: 'destructive' });
        return;
    }
    
    // If logo type is image, clear text, if text, clear imageUrl
    if (data.logo.type === 'image') {
      data.logo.text = '';
    } else {
      data.logo.imageUrl = '';
    }
    
    const tenantIdToEdit = userProfile.role === 'super-admin' ? 'default' : userProfile.tenantId;
    if (!tenantIdToEdit) {
        toast({ title: 'Erro Crítico', description: 'ID do cliente não encontrado.' });
        return;
    }

    const configRef = doc(firestore, `tenants/${tenantIdToEdit}/config`, 'site');
    
    const payload: Partial<SiteConfig> = {
        siteName: data.siteName,
        logo: data.logo,
        theme: data.theme,
        heroSection: data.heroSection,
        professionalProfileSection: data.professionalProfileSection,
    };

    if (isSuperAdmin) {
        payload.featuresSection = data.featuresSection;
        payload.ctaSection = data.ctaSection;
        payload.finalCtaSection = data.finalCtaSection;
        payload.testimonialsSection = data.testimonialsSection;
    }

    setDoc(configRef, payload, { merge: true })
        .then(() => {
            toast({
                title: 'Configurações Salvas!',
                description: 'As configurações do seu site foram atualizadas com sucesso.',
            });
            form.reset(data); 
        })
        .catch(error => {
             const permissionError = new FirestorePermissionError({
                path: configRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  if (loading || isUserLoading || !authChecked) {
    return (
      <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
        <div className="flex w-full h-full flex-col bg-background items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando configurações...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
       <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 animate-fade-in text-center sm:text-left gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground font-heading flex items-center gap-3 justify-center sm:justify-start">
                        <SettingsIcon className='h-8 w-8'/> Configurações do Site
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mt-2 mx-auto sm:mx-0">
                        {isSuperAdmin 
                            ? "Personalize a aparência e os textos da plataforma principal e os padrões para novos clientes."
                            : "Personalize a aparência e textos da sua página pública."
                        }
                    </p>
                </div>
                <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <Accordion type="multiple" defaultValue={['geral', 'hero', 'sobre', 'features', 'cta', 'testimonials', 'finalCta']} className="w-full">
                <AccordionItem value="geral">
                    <AccordionTrigger className='text-xl font-semibold'>Geral e Tema</AccordionTrigger>
                    <AccordionContent className='pt-6'>
                         <CardContent className="space-y-6">
                            <FormField control={form.control} name="siteName" render={({ field }) => (<FormItem><FormLabel>Nome do Site</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField
                                control={form.control}
                                name="logo.type"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Tipo de Logo</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex gap-4"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="image" id="logo-image" />
                                            </FormControl>
                                            <FormLabel htmlFor='logo-image' className="font-normal flex items-center gap-2"><FileImage className='h-4 w-4' /> Imagem</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="text" id="logo-text" />
                                            </FormControl>
                                            <FormLabel htmlFor='logo-text' className="font-normal flex items-center gap-2"><CaseSensitive className='h-4 w-4' /> Texto</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {logoType === 'image' && (
                                <ImageUrlInput form={form} name="logo.imageUrl" label="URL da Logo" />
                            )}
                            {logoType === 'text' && (
                                <div className='space-y-6'>
                                     <FormField control={form.control} name="logo.text" render={({ field }) => (<FormItem><FormLabel>Texto do Logo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField
                                        control={form.control}
                                        name="logo.font"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fonte do Logo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma fonte" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {Object.entries(logoFonts).map(([name, family]) => (
                                                            <SelectItem key={name} value={name}>
                                                                <span style={{ fontFamily: family }}>{name}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="theme.primaryColor"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='flex items-center gap-2'><Palette className='h-4 w-4' /> Cor Principal</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma cor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(colorOptions).map(([name, hex]) => (
                                                <SelectItem key={name} value={name}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: hex }} />
                                                        {name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="theme.titleFontSize"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='flex items-center gap-2'><Baseline className='h-4 w-4' /> Tamanho da Fonte do Título</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Selecione um tamanho" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.keys(titleFontSizes).map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="hero">
                    <AccordionTrigger className='text-xl font-semibold'>Seção Principal (Hero)</AccordionTrigger>
                    <AccordionContent className='pt-6'>
                         <CardContent className="space-y-6">
                            <FormField control={form.control} name="heroSection.title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="heroSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Subtítulo</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="heroSection.cta" render={({ field }) => (<FormItem><FormLabel>Texto do Botão (CTA)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <ImageUrlInput form={form} name="heroSection.imageUrl" label="URL da Imagem do Hero" />
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="sobre">
                    <AccordionTrigger className='text-xl font-semibold'>{isSuperAdmin ? "Sobre o Profissional (Padrão)" : "Sobre Mim"}</AccordionTrigger>
                    <AccordionContent className='pt-6'>
                         <CardContent className="space-y-6">
                            <FormField control={form.control} name="professionalProfileSection.title" render={({ field }) => (<FormItem><FormLabel>Título da Seção</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <ImageUrlInput form={form} name="professionalProfileSection.imageUrl" label="URL da sua Foto" />
                            <FormField control={form.control} name="professionalProfileSection.aboutMe" render={({ field }) => (<FormItem><FormLabel>Biografia</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="professionalProfileSection.location" render={({ field }) => (<FormItem><FormLabel>Localização</FormLabel><FormControl><Input placeholder="Ex: São Paulo, SP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="professionalProfileSection.hours" render={({ field }) => (<FormItem><FormLabel>Horário de Atendimento</FormLabel><FormControl><Input placeholder="Ex: Seg - Sex, 9h - 18h" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
                {isSuperAdmin && (
                    <>
                         <AccordionItem value="features">
                            <AccordionTrigger className='text-xl font-semibold'>Seção de Funcionalidades</AccordionTrigger>
                            <AccordionContent className='pt-6'>
                                 <CardContent className="space-y-6">
                                    <FormField control={form.control} name="featuresSection.title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="featuresSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Subtítulo</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="cta">
                            <AccordionTrigger className='text-xl font-semibold'>Seção Sobre o Sistema (CTA)</AccordionTrigger>
                            <AccordionContent className='pt-6'>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="ctaSection.title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="ctaSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Subtítulo</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="ctaSection.cta" render={({ field }) => (<FormItem><FormLabel>Texto do Botão (CTA)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <ImageUrlInput form={form} name="ctaSection.imageUrl" label="URL da Imagem da Seção" />
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="testimonials">
                            <AccordionTrigger className='text-xl font-semibold'>Seção de Depoimentos</AccordionTrigger>
                            <AccordionContent className='pt-6'>
                                 <CardContent className="space-y-6">
                                    <FormField control={form.control} name="testimonialsSection.title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="finalCta">
                            <AccordionTrigger className='text-xl font-semibold'>Seção Final (CTA)</AccordionTrigger>
                            <AccordionContent className='pt-6'>
                                 <CardContent className="space-y-6">
                                    <FormField control={form.control} name="finalCtaSection.title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="finalCtaSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Subtítulo</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="finalCtaSection.cta" render={({ field }) => (<FormItem><FormLabel>Texto do Botão (CTA)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                    </>
                )}
            </Accordion>
          </form>
        </Form>
       </div>
    </AppLayout>
  );
}
