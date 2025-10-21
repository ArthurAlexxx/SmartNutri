// src/components/settings-modal.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, Share2, Copy, UserCog, CreditCard, ArrowRight, CalendarIcon, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/types/user';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { doc, updateDoc, runTransaction, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { getLocalDateString } from '@/lib/date-utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const formSchema = z.object({
  age: z.coerce.number().min(1, 'A idade deve ser maior que 0.').optional().or(z.literal(NaN)),
  weight: z.coerce.number().min(1, 'O peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetWeight: z.coerce.number().min(1, 'A meta de peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetDate: z.date().optional(),
  whatsappPhoneNumber: z.string().optional(),
  calorieGoal: z.coerce.number().min(1, 'A meta de calorias deve ser maior que 0.'),
  proteinGoal: z.coerce.number().min(1, 'A meta de proteínas deve ser maior que 0.'),
  waterGoal: z.coerce.number().min(1, 'A meta de água deve ser maior que 0.'),
});

type SettingsFormValues = z.infer<typeof formSchema>;

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
  userId: string;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
}

type NavItem = 'settings' | 'share' | 'subscription';

export default function SettingsModal({ isOpen, onOpenChange, userProfile, userId, onProfileUpdate }: SettingsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<NavItem>('settings');
  const firestore = useFirestore();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calorieGoal: 2000,
      proteinGoal: 140,
      waterGoal: 2000,
      age: NaN,
      weight: NaN,
      targetWeight: NaN,
      targetDate: undefined,
      whatsappPhoneNumber: '',
    },
  });
  
  const { isSubmitting, isDirty } = form.formState;

  useEffect(() => {
    if (isOpen) {
      const targetDate = userProfile.targetDate;
      let finalDate: Date | undefined;
      if (targetDate) {
        if (typeof (targetDate as any)?.toDate === 'function') {
            finalDate = (targetDate as Timestamp).toDate();
        } else if (targetDate instanceof Date) {
            finalDate = targetDate;
        }
      }

      form.reset({
        calorieGoal: userProfile.calorieGoal ?? 2000,
        proteinGoal: userProfile.proteinGoal ?? 140,
        waterGoal: userProfile.waterGoal ?? 2000,
        age: userProfile.age ?? NaN,
        weight: userProfile.weight ?? NaN,
        targetWeight: userProfile.targetWeight ?? NaN,
        targetDate: finalDate,
        whatsappPhoneNumber: userProfile.whatsappPhoneNumber ?? '',
      });
      setActiveTab('settings'); // Reset to default tab on open
    }
  }, [userProfile, form, isOpen]);
  
    const watchedCalorieGoal = form.watch('calorieGoal');

    useEffect(() => {
        if (watchedCalorieGoal > 0) {
            const newProteinGoal = Math.round((watchedCalorieGoal * 0.35) / 4);
            form.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
        }
    }, [watchedCalorieGoal, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    if (!firestore) {
        toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao banco de dados.' });
        return;
    }

    if (!isDirty) {
        onOpenChange(false);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', userId);
            const updatedProfile: Partial<UserProfile> = {};
            const dirtyFields = form.formState.dirtyFields;

            if (dirtyFields.calorieGoal) updatedProfile.calorieGoal = data.calorieGoal;
            if (dirtyFields.proteinGoal) updatedProfile.proteinGoal = data.proteinGoal;
            if (dirtyFields.waterGoal) updatedProfile.waterGoal = data.waterGoal;
            if (dirtyFields.age && data.age && !isNaN(data.age)) updatedProfile.age = data.age;
            if (dirtyFields.weight && data.weight && !isNaN(data.weight)) updatedProfile.weight = data.weight;
            if (dirtyFields.targetWeight && data.targetWeight && !isNaN(data.targetWeight)) updatedProfile.targetWeight = data.targetWeight;
            if (dirtyFields.targetDate && data.targetDate) updatedProfile.targetDate = Timestamp.fromDate(data.targetDate);
            if (dirtyFields.whatsappPhoneNumber) updatedProfile.whatsappPhoneNumber = data.whatsappPhoneNumber;


            // 1. Update the user's profile
            transaction.update(userRef, updatedProfile);

            // 2. If weight was changed, create a new weight log
            if (dirtyFields.weight && updatedProfile.weight) {
                const weightLogRef = doc(collection(firestore, 'weight_logs'));
                const newLog = {
                    userId: userId,
                    weight: updatedProfile.weight,
                    date: getLocalDateString(new Date()),
                    createdAt: serverTimestamp(),
                };
                transaction.set(weightLogRef, newLog);
            }

            // 3. If the user is in a room, update the patientInfo in the room document
            if (userProfile.patientRoomId && (dirtyFields.age || dirtyFields.weight)) {
                const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
                const updatedPatientInfo: { [key: string]: any } = {};
                if (dirtyFields.age && updatedProfile.age) {
                    updatedPatientInfo['patientInfo.age'] = updatedProfile.age;
                }
                if (dirtyFields.weight && updatedProfile.weight) {
                    updatedPatientInfo['patientInfo.weight'] = updatedProfile.weight;
                }
                
                if (Object.keys(updatedPatientInfo).length > 0) {
                    transaction.update(roomRef, updatedPatientInfo);
                }
            }

            return updatedProfile;
        });
        
        const locallyUpdatedProfile = {...userProfile, ...data};
        onProfileUpdate(locallyUpdatedProfile);

        toast({
            title: 'Configurações Salvas',
            description: 'Suas informações foram atualizadas com sucesso.',
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        toast({
            title: 'Erro ao Salvar',
            description: 'Não foi possível atualizar suas configurações.',
            variant: 'destructive',
        });
    } finally {
        onOpenChange(false);
    }
};
  
  const handleCopyShareCode = () => {
    if (!userProfile.dashboardShareCode) return;
    navigator.clipboard.writeText(userProfile.dashboardShareCode);
    toast({
      title: 'Código Copiado!',
      description: 'Seu código de compartilhamento foi copiado para a área de transferência.',
    });
  };
  
  const { statusLabel, isTrialActive, trialTimeLeft } = useMemo(() => {
    const status = userProfile.subscriptionStatus;
    const trialEndDate = userProfile.trialEndsAt?.toDate();
    let statusLabel = "Gratuito";
    let isTrialActive = false;
    let trialTimeLeft = "";

    if (userProfile.patientRoomId) {
        statusLabel = "Vinculado a Profissional";
    } else if (status === 'active') {
        statusLabel = "Premium";
    } else if (status === 'trial' && trialEndDate && trialEndDate > new Date()) {
        statusLabel = "Plano Teste";
        isTrialActive = true;
        trialTimeLeft = formatDistanceToNow(trialEndDate, { addSuffix: true, locale: ptBR });
    } else if (status === 'trial') {
        statusLabel = "Teste Expirado";
    }

    return { statusLabel, isTrialActive, trialTimeLeft };
  }, [userProfile]);

  const showShareTab = userProfile?.profileType === 'patient';
  const showSubscriptionTab = userProfile?.profileType === 'patient';

  const navItems = [
    { id: 'settings', label: 'Metas', icon: UserCog, visible: true },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard, visible: showSubscriptionTab },
    { id: 'share', label: 'Compartilhar', icon: Share2, visible: showShareTab }
  ].filter(item => item.visible);

  const renderContent = () => {
    switch (activeTab) {
      case 'subscription':
        return (
             <div className="p-6 h-full flex flex-col">
                <div className="mb-6">
                    <h3 className="text-xl font-bold">Gerenciar Assinatura</h3>
                    <p className="text-sm text-muted-foreground">Verifique o status do seu plano e gerencie sua assinatura.</p>
                </div>
                <div className="space-y-4 flex-grow">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <p className="font-medium">Status do Plano</p>
                        <Badge variant={isTrialActive || statusLabel === 'Premium' ? 'default' : 'secondary'}>{statusLabel}</Badge>
                    </div>
                     {isTrialActive && (
                        <div className="flex items-center justify-between rounded-lg border p-4 bg-secondary/30">
                            <p className="font-medium">Seu teste termina</p>
                            <p className="font-semibold text-primary">{trialTimeLeft}</p>
                        </div>
                    )}
                </div>
                 <div className="p-6 border-t bg-background flex justify-end gap-2 -mx-6 -mb-6 mt-6">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
                    <Link href="/pricing" onClick={() => onOpenChange(false)}>
                        <Button>
                            {statusLabel === 'Premium' ? 'Gerenciar Assinatura' : 'Ver Planos'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
      case 'share':
        return (
            <div className="p-6 h-full flex flex-col">
                <div className="mb-6">
                    <h3 className="text-xl font-bold">Compartilhar com Nutricionista</h3>
                     {userProfile.patientRoomId ? (
                         <p className="text-sm text-muted-foreground">Você já está conectado a um nutricionista. Este é o seu código de compartilhamento para referência.</p>
                     ) : (
                         <p className="text-sm text-muted-foreground">Envie o código abaixo para o seu nutricionista para que ele possa acompanhar seu progresso.</p>
                     )}
                </div>
                <div className="flex-grow flex items-center">
                    <div className="flex items-center gap-4 py-4 w-full">
                        <div className="flex-1 rounded-md border border-dashed p-4 text-center bg-secondary/30">
                            <span className="text-3xl font-bold tracking-widest text-primary">{userProfile.dashboardShareCode}</span>
                        </div>
                        <Button onClick={handleCopyShareCode} size="icon" className="h-14 w-14 shrink-0">
                            <Copy className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
                 <div className="p-6 border-t bg-background flex justify-end gap-2 -mx-6 -mb-6 mt-6">
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button>
                </div>
            </div>
        );
      case 'settings':
      default:
        return (
            <div className="p-6 flex flex-col h-full">
                <div className="mb-6">
                    <h3 className="text-xl font-bold">Configurações e Metas</h3>
                    <p className="text-sm text-muted-foreground">Personalize suas metas e dados pessoais.</p>
                </div>
                 <ScrollArea className="flex-1 -mx-6 px-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-4">
                                <h4 className='font-semibold text-foreground'>Dados Pessoais</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="age" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Idade</FormLabel>
                                            <FormControl><Input type="number" placeholder="Sua idade" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="weight" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Peso (kg)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" placeholder="Seu peso" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <FormField control={form.control} name="whatsappPhoneNumber" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4" /> WhatsApp (Integração)</FormLabel>
                                        <FormControl><Input placeholder="Ex: +5511999998888" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Separator className="my-6" />
                                <h4 className='font-semibold text-foreground'>Metas de Saúde</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="targetWeight" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Peso Meta (kg)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" placeholder="Ex: 75" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="targetDate" render={({ field }) => (
                                        <FormItem className='flex flex-col'>
                                            <FormLabel>Data Meta</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                        "pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                        format(field.value, "PPP", { locale: ptBR })
                                                        ) : (
                                                        <span>Escolha uma data</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date() || date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <Separator className="my-6" />
                                <h4 className='font-semibold text-foreground'>Metas Diárias</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="calorieGoal" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Calorias (kcal)</FormLabel>
                                            <FormControl><Input type="number" placeholder="Ex: 2200" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="proteinGoal" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Proteínas (g)</FormLabel>
                                            <FormControl><Input type="number" placeholder="Ex: 150" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="waterGoal" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Água (ml)</FormLabel>
                                            <FormControl><Input type="number" placeholder="Ex: 2000" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                        </form>
                    </Form>
                 </ScrollArea>
                <div className="p-6 border-t bg-background flex justify-end gap-2 -mx-6 -mb-6 mt-6">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar
                    </Button>
                </div>
            </div>
        );
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] sm:h-[70vh] p-0 flex flex-col md:flex-row shadow-2xl">
         <DialogHeader className="p-6 border-b md:border-b-0 md:border-r md:p-4">
             <DialogTitle className="text-lg font-semibold px-2 pb-4">Configurações</DialogTitle>
             {/* Desktop Nav */}
              <nav className="flex-col gap-1 hidden md:flex">
                    {navItems.map(item => (
                        <Button
                            key={item.id}
                            variant={activeTab === item.id ? 'primary' : 'ghost'}
                            className={cn(
                                "justify-start gap-3 px-3",
                                activeTab !== item.id && "border border-transparent hover:border-primary/50 hover:bg-transparent hover:text-primary"
                            )}
                            onClick={() => setActiveTab(item.id as NavItem)}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Button>
                    ))}
              </nav>
              {/* Mobile Nav */}
                <div className="md:hidden">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NavItem)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            {navItems.map(item => (
                                <TabsTrigger key={item.id} value={item.id} className="gap-2">
                                     <item.icon className="h-4 w-4" /> 
                                     <span className="hidden sm:inline">{item.label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
         </DialogHeader>
         <div className="flex-1 flex flex-col overflow-y-auto">
             {renderContent()}
         </div>
      </DialogContent>
    </Dialog>
  );
}
