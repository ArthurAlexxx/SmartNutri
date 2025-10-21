// src/components/share-code-modal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

interface ShareCodeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shareCode: string;
}

export default function ShareCodeModal({ isOpen, onOpenChange, shareCode }: ShareCodeModalProps) {
  const { toast } = useToast();

  const handleCopyShareCode = () => {
    navigator.clipboard.writeText(shareCode);
    toast({
      title: 'Código Copiado!',
      description: 'Seu código de compartilhamento foi copiado para a área de transferência.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Compartilhar com Nutricionista</DialogTitle>
          <DialogDescription>
            Envie o código abaixo para o seu nutricionista para que ele possa acompanhar seu progresso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4 py-4">
            <div className="flex-1 rounded-md border border-dashed p-4 text-center bg-secondary/30">
                <span className="text-3xl font-bold tracking-widest text-primary">{shareCode}</span>
            </div>
            <Button onClick={handleCopyShareCode} size="icon" className="h-12 w-12 shrink-0">
                <Copy className="h-6 w-6" />
            </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
