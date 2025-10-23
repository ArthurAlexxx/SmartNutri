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
import { Loader2, Copy, Sparkles, QrCode, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user';
import { generatePixPayment, checkPixPaymentStatus } from '@/app/actions/checkout-actions';
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

type ModalState = 'form' | 'payment' | 'checking' | 'success';

export default function CheckoutModal({ isOpen, onOpenChange, userProfile }: CheckoutModalProps) {
  const { toast } = useToast();
  const [modalState, setModalState] = useState<ModalState>('form');
  const [paymentData, setPaymentData] = useState<{ paymentId: string; qrCode: string; pixCode: string } | null>(null);

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
        setTimeout(() => {
            setModalState('form');
            setPaymentData(null);
            form.reset({
                fullName: userProfile.fullName || '',
                email: userProfile.email || '',
                phone: userProfile.whatsappPhoneNumber || '',
                cpf: '',
            });
        }, 300); // Aguarda o fechamento da animação
    }
  }, [isOpen, form, userProfile]);

  const onSubmit = async (data: CheckoutFormValues) => {
    setModalState('checking');
    const result = await generatePixPayment({
        userId: userProfile.id,
        userName: data.fullName,
        userEmail: data.email,
        userPhone: data.phone,
        userDocument: data.cpf,
        amount: 9.99,
    });

    if (result.error || !result.qrCode || !result.paymentId || !result.pixCode) {
      toast({
        title: "Erro ao Gerar Pagamento",
        description: result.error || "Não foi possível gerar o QR Code do Pix. Tente novamente.",
        variant: "destructive",
      });
      setModalState('form');
    } else {
      setPaymentData({
        paymentId: result.paymentId,
        qrCode: result.qrCode,
        pixCode: result.pixCode,
      });
      setModalState('payment');
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

  const handleCheckPayment = async () => {
    if (!paymentData) return;
    setModalState('checking');

    const result = await checkPixPaymentStatus(paymentData.paymentId, userProfile.id);

    if (result.status === 'PAID') {
        setModalState('success');
    } else if (result.status === 'PENDING') {
        toast({
            title: "Pagamento Pendente",
            description: "Ainda não recebemos a confirmação do seu pagamento. Por favor, tente novamente em alguns segundos.",
        });
        setModalState('payment'); // Volta para a tela do QR Code
    } else {
        toast({
            title: "Erro na Verificação",
            description: result.error || "Não foi possível verificar o pagamento no momento.",
            variant: "destructive",
        });
        setModalState('payment');
    }
  }

  const renderContent = () => {
    switch (modalState) {
        case 'form':
            return (
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
                        <Button type="submit">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Gerar Pagamento Pix
                        </Button>
                        </DialogFooter>
                    </form>
                </Form>
            );
        case 'checking':
            return (
                <div className="flex flex-col items-center justify-center text-center pt-8 pb-4 h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Processando...</p>
                </div>
            );
        case 'payment':
            return (
                <div className="flex flex-col items-center justify-center text-center pt-4">
                    <p className='text-muted-foreground mb-4'>Escaneie o QR Code abaixo com o app do seu banco ou use o "Copia e Cola".</p>
                    <div className="p-4 bg-white rounded-lg border-4 border-primary shadow-lg">
                        {paymentData?.qrCode && <Image src={paymentData.qrCode} alt="PIX QR Code" width={256} height={256} />}
                    </div>
                    <Button onClick={handleCopyPixCode} variant="outline" className='mt-6 w-full'>
                        <Copy className="mr-2 h-4 w-4" />
                        Pix Copia e Cola
                    </Button>
                    <Button onClick={handleCheckPayment} className='mt-2 w-full'>
                        Já paguei, verificar
                    </Button>
                </div>
            );
        case 'success':
            return (
                <div className="flex flex-col items-center justify-center text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold">Pagamento Confirmado!</h3>
                    <p className="text-muted-foreground mt-2">Sua assinatura Premium está ativa. Aproveite todos os recursos!</p>
                     <Button onClick={() => onOpenChange(false)} className='mt-6 w-full'>
                        Começar a usar
                    </Button>
                </div>
            );
        default:
            return null;
    }
  }
  
   const getTitle = () => {
    switch (modalState) {
      case 'form': return 'Assinatura Premium';
      case 'payment': return 'Pagamento via Pix';
      case 'checking': return 'Verificando Pagamento';
      case 'success': return 'Sucesso!';
      default: return '';
    }
  };

  const getDescription = () => {
    switch (modalState) {
      case 'form': return 'Preencha seus dados para finalizar a assinatura.';
      case 'payment': return 'Após o pagamento, clique no botão para confirmar.';
      case 'checking': return 'Aguarde um momento...';
      case 'success': return 'Sua jornada premium começa agora.';
      default: return '';
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg shadow-2xl">
        <DialogHeader>
            <div className='flex items-center gap-3'>
                <div className='p-3 bg-primary/10 rounded-full text-primary'>
                    {modalState === 'success' ? <CheckCircle2 className='h-6 w-6' /> : <QrCode className='h-6 w-6' />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">{getTitle()}</DialogTitle>
                  <DialogDescription>{getDescription()}</DialogDescription>
                </div>
            </div>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
