
// src/components/water-tracker-modal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Minus, Plus, GlassWater } from 'lucide-react';

interface WaterTrackerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  waterIntake: number;
  waterGoal: number;
  onWaterUpdate: (newIntake: number) => Promise<void>;
}

const CUP_SIZE = 250; // ml

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

export default function WaterTrackerModal({ isOpen, onOpenChange, waterIntake, waterGoal, onWaterUpdate }: WaterTrackerModalProps) {
  const [localIntake, setLocalIntake] = useState(waterIntake);

  useEffect(() => {
    if (isOpen) {
      setLocalIntake(waterIntake);
    }
  }, [waterIntake, isOpen]);

  const debouncedUpdate = useCallback(debounce(onWaterUpdate, 500), [onWaterUpdate]);

  const handleIntakeChange = (newIntake: number) => {
    const clampedIntake = Math.max(0, newIntake);
    setLocalIntake(clampedIntake);
    debouncedUpdate(clampedIntake);
  };

  const handleAddWater = () => handleIntakeChange(localIntake + CUP_SIZE);
  const handleRemoveWater = () => handleIntakeChange(localIntake - CUP_SIZE);

  const progress = waterGoal > 0 ? Math.min((localIntake / waterGoal) * 100, 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <GlassWater className="h-6 w-6 text-primary" />
            Registrar Hidratação
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova copos de água (250ml) para acompanhar sua meta diária.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
            <div 
            className="relative w-24 h-40 mb-4 flex flex-col-reverse rounded-t-xl border-b-4 border-gray-300"
            style={{ background: `linear-gradient(to top, hsl(var(--chart-2)) ${progress}%, hsl(var(--muted)) ${progress}%)` } as React.CSSProperties}
            >
            <div className="flex items-center justify-center h-full">
                <GlassWater className="w-10 h-10 text-white/50" />
            </div>
            </div>

            <p className="text-4xl font-bold text-foreground">
            {localIntake / 1000}
            <span className="text-2xl text-muted-foreground">L</span>
            </p>
            <p className="text-sm text-muted-foreground -mt-2">Meta: {waterGoal / 1000}L</p>
            
            <div className="flex items-center justify-center gap-4 mt-4">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={handleRemoveWater} disabled={localIntake <= 0}>
                <Minus className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={handleAddWater}>
                <Plus className="h-6 w-6" />
            </Button>
            </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)} className='w-full'>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
