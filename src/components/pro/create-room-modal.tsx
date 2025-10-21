// src/components/pro/create-room-modal.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, runTransaction, arrayUnion } from 'firebase/firestore';
import type { Room, PatientInfo } from '@/types/room';

const formSchema = z.object({
  roomName: z.string().min(3, 'O nome da sala deve ter pelo menos 3 caracteres.'),
  shareCode: z.string().length(8, 'O código de compartilhamento deve ter 8 caracteres.'),
});

type CreateRoomFormValues = z.infer<typeof formSchema>;

interface CreateRoomModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  professionalId: string;
}

export default function CreateRoomModal({ isOpen, onOpenChange, professionalId }: CreateRoomModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomName: '',
      shareCode: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: CreateRoomFormValues) => {
    if (!firestore) {
        toast({ title: 'Erro', description: 'Serviço de banco de dados não disponível.' });
        return;
    }
    try {
      await runTransaction(firestore, async (transaction) => {
        const usersRef = collection(firestore, 'users');
        const patientQuery = query(usersRef, where('dashboardShareCode', '==', data.shareCode));
        const patientSnapshot = await getDocs(patientQuery);

        if (patientSnapshot.empty) {
          throw new Error('Código de compartilhamento inválido ou não encontrado.');
        }

        const patientDoc = patientSnapshot.docs[0];
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();

        if (patientData.patientRoomId) {
          throw new Error('Este paciente já está sendo acompanhado por um profissional.');
        }
        
        const patientInfo: PatientInfo = {
            name: patientData.fullName,
            email: patientData.email,
        };

        if (patientData.age) {
          patientInfo.age = patientData.age;
        }
        if (patientData.weight) {
          patientInfo.weight = patientData.weight;
        }
        
        const newRoomData: Omit<Room, 'id'> = {
          roomName: data.roomName,
          professionalId: professionalId,
          patientId,
          tenantId: patientData.tenantId, // Store tenantId in the room
          patientInfo,
          activePlan: {
            calorieGoal: patientData.calorieGoal || 2000,
            hydrationGoal: patientData.waterGoal || 2000,
            meals: [],
            createdAt: serverTimestamp() as any, // Cast to any to avoid type issue
          },
          planHistory: [],
          createdAt: serverTimestamp() as any, // Cast to any to avoid type issue
        };

        const newRoomRef = doc(collection(firestore, 'rooms'));
        
        // 1. Create the new room
        transaction.set(newRoomRef, newRoomData);

        // 2. Update the professional's user document
        const professionalRef = doc(firestore, 'users', professionalId);
        transaction.update(professionalRef, {
          professionalRoomIds: arrayUnion(newRoomRef.id),
        });

        // 3. Update the patient's user document
        const patientRef = doc(firestore, 'users', patientId);
        transaction.update(patientRef, {
          patientRoomId: newRoomRef.id,
        });
      });

      toast({
        title: "Sala Criada com Sucesso!",
        description: `Você agora está conectado ao paciente. A página será atualizada.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create room:", error);
      toast({
        title: "Erro ao Criar Sala",
        description: error.message || "Verifique o código e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Adicionar Paciente</DialogTitle>
          <DialogDescription>
            Insira o nome da sala e o código de compartilhamento do paciente para criar uma conexão.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField control={form.control} name="roomName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Nome da Sala *</FormLabel>
                    <FormControl><Input placeholder="Ex: Acompanhamento de Juliana" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="shareCode" render={({ field }) => (
                <FormItem>
                    <FormLabel>Código de Compartilhamento do Paciente *</FormLabel>
                    <FormControl><Input placeholder="ABC123XYZ" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="!mt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Sala
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
