// src/components/checkout-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Copy, Sparkles, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user';
import { generatePixPayment } from '@/app/actions/checkout-actions';
import Image from 'next/image';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido. Digite apenas os números.'),
});

type CheckoutFormValues = z.infer<typeof formSchema>;

interface CheckoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
}

export default function CheckoutModal({ isOpen, onOpenChange, userProfile }: CheckoutModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{ qrCode: string; pixCode: string } | null>(null);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName || '',
      email: userProfile.email || '',
      phone: userProfile.whatsappPhoneNumber || '',
      cpf: '',
    },
  });
  
  useEffect(() => {
    if (!isOpen) {
        // Reset state when modal closes
        setIsLoading(false);
        setPaymentData(null);
        form.reset({
            fullName: userProfile.fullName || '',
            email: userProfile.email || '',
            phone: userProfile.whatsappPhoneNumber || '',
            cpf: '',
        });
    }
  }, [isOpen, form, userProfile]);

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsLoading(true);
    const result = await generatePixPayment({
        userId: userProfile.id,
        userName: data.fullName,
        userEmail: data.email,
        userPhone: data.phone,
        userDocument: data.cpf,
        amount: 9.99,
    });
    setIsLoading(false);

    if (result.error || !result.qrCode) {
      toast({
        title: "Erro ao Gerar Pagamento",
        description: result.error || "Não foi possível gerar o QR Code do Pix. Tente novamente.",
        variant: "destructive",
      });
    } else {
      setPaymentData({
        qrCode: result.qrCode,
        pixCode: result.pixCode || 'Não foi possível gerar o código copia e cola.',
      });
    }
  };
  
  const handleCopyPixCode = () => {
    if (!paymentData) return;
    navigator.clipboard.writeText(paymentData.pixCode);
    toast({
      title: 'Código Pix Copiado!',
      description: 'O código foi copiado para a área de transferência.',
    });
  };

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>E-mail *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Telefone *</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="cpf" render={({ field }) => (
            <FormItem><FormLabel>CPF *</FormLabel><FormControl><Input placeholder="Apenas números" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <DialogFooter className="!mt-8 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Gerar Pagamento Pix
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const renderPayment = () => (
    <div className="flex flex-col items-center justify-center text-center pt-4">
        <p className='text-muted-foreground mb-4'>Escaneie o QR Code abaixo com o app do seu banco ou use o "Copia e Cola".</p>
        <div className="p-4 bg-white rounded-lg border-4 border-primary shadow-lg">
             {paymentData?.qrCode && <Image src={paymentData.qrCode} alt="PIX QR Code" width={256} height={256} />}
        </div>
        <Button onClick={handleCopyPixCode} className='mt-6 w-full'>
            <Copy className="mr-2 h-4 w-4" />
            Pix Copia e Cola
        </Button>
         <DialogFooter className="!mt-8 gap-2 w-full">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className='w-full'>Fechar</Button>
        </DialogFooter>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg shadow-2xl">
        <DialogHeader>
            <div className='flex items-center gap-3'>
                <div className='p-3 bg-primary/10 rounded-full text-primary'>
                    <QrCode className='h-6 w-6' />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">Assinatura Premium</DialogTitle>
                  <DialogDescription>
                    {paymentData ? "Pagamento via Pix" : "Preencha seus dados para finalizar a assinatura."}
                  </DialogDescription>
                </div>
            </div>
        </DialogHeader>
        {paymentData ? renderPayment() : renderForm()}
      </DialogContent>
    </Dialog>
  );
}
