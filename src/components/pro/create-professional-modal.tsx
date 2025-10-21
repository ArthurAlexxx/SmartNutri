// src/components/pro/create-professional-modal.tsx
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
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, writeBatch, arrayUnion } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { UserProfile } from '@/types/user';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type CreateProfessionalFormValues = z.infer<typeof formSchema>;

interface CreateProfessionalModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenantId: string;
}

export default function CreateProfessionalModal({ isOpen, onOpenChange, tenantId }: CreateProfessionalModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  
  const form = useForm<CreateProfessionalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: CreateProfessionalFormValues) => {
    if (!firestore || !auth || !tenantId) {
        toast({ title: 'Erro', description: 'Serviço de banco de dados, autenticação ou identificador da clínica não disponível.' });
        return;
    }
    try {
      // We create a temporary user on the client to get a UID.
      // This is a simplified approach. A production app would use a secure Cloud Function.
      const tempUserCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newProfessionalUser = tempUserCredential.user;

      const batch = writeBatch(firestore);

      // 1. Create the professional's profile document
      const professionalProfileRef = doc(firestore, 'users', newProfessionalUser.uid);
      const professionalProfile: Omit<UserProfile, 'id'> = {
        tenantId: tenantId,
        fullName: data.fullName,
        email: data.email,
        profileType: 'professional',
        role: 'professional',
        createdAt: serverTimestamp() as any,
        professionalRoomIds: [],
      };
      batch.set(professionalProfileRef, professionalProfile);
      
      // 2. Add the professional's ID to the tenant's list of professionals
      const tenantRef = doc(firestore, 'tenants', tenantId);
      batch.update(tenantRef, {
        professionalIds: arrayUnion(newProfessionalUser.uid)
      });
      
      // Commit the transaction
      await batch.commit();

      toast({
        title: "Profissional Adicionado!",
        description: `${data.fullName} foi adicionado à sua clínica com sucesso.`,
      });
      form.reset();
      onOpenChange(false);

    } catch (error: any) {
      let friendlyMessage = 'Ocorreu um erro desconhecido.';
      if (error.code) {
          switch (error.code) {
              case 'auth/email-already-in-use':
                  friendlyMessage = 'Este e-mail já está em uso.';
                  break;
              case 'auth/weak-password':
                  friendlyMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                  break;
              default:
                  friendlyMessage = `Erro de autenticação: ${error.message}`;
          }
      }
      toast({
        title: "Erro ao Adicionar Profissional",
        description: friendlyMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Novo Profissional</DialogTitle>
          <DialogDescription>
            Insira os dados do novo profissional para adicioná-lo à sua clínica.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl><Input placeholder="Nome do profissional" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl><Input type="email" placeholder="email@profissional.com" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Senha Provisória *</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="!mt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
