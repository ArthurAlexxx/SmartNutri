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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { getLocalDateString } from '@/lib/date-utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

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

export default function SettingsModal({ isOpen, onOpenChange, userProfile, userId, onProfileUpdate }: SettingsModalProps) {
  const { toast } = useToast();
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Configurações e Metas</DialogTitle>
          <DialogDescription>
            Personalize seus dados e metas diárias para uma experiência mais precisa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                <div className="space-y-6 pt-4">
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
            </ScrollArea>
            <DialogFooter className="!mt-8 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
