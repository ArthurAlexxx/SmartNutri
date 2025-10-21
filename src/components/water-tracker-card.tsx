// src/components/water-tracker-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Minus, Plus, GlassWater } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface WaterTrackerCardProps {
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

export default function WaterTrackerCard({ waterIntake, waterGoal, onWaterUpdate }: WaterTrackerCardProps) {
  const [localIntake, setLocalIntake] = useState(waterIntake);

  useEffect(() => {
    setLocalIntake(waterIntake);
  }, [waterIntake]);

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
    <Card className="shadow-sm rounded-2xl flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold text-lg">
          <GlassWater className="h-6 w-6 text-primary" />
          Hidratação Diária
        </CardTitle>
        <CardDescription>Adicione ou remova água (250ml).</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
        <div 
          className="relative w-24 h-40 mb-4 flex flex-col-reverse rounded-t-xl border-b-4 border-gray-300"
          style={{ background: `linear-gradient(to top, hsl(var(--chart-2)) ${progress}%, hsl(var(--muted)) ${progress}%)` } as React.CSSProperties}
        >
          <div className="flex items-center justify-center h-full">
             <GlassWater className="w-10 h-10 text-white/50" />
          </div>
        </div>

        <p className="text-3xl font-bold text-foreground">
          {localIntake / 1000}
          <span className="text-xl text-muted-foreground">L</span>
        </p>
        <p className="text-sm text-muted-foreground">Meta: {waterGoal / 1000}L</p>
        
        <div className="flex items-center justify-center gap-4 my-6">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={handleRemoveWater} disabled={localIntake <= 0}>
            <Minus className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={handleAddWater}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
