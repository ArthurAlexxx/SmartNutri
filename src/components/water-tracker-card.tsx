
// src/components/water-tracker-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { GlassWater, Plus } from 'lucide-react';
import { Progress } from './ui/progress';

interface WaterTrackerCardProps {
  waterIntake: number;
  waterGoal: number;
  onAddWaterClick: () => void;
}

export default function WaterTrackerCard({ waterIntake, waterGoal, onAddWaterClick }: WaterTrackerCardProps) {
  const progress = waterGoal > 0 ? Math.min((waterIntake / waterGoal) * 100, 100) : 0;

  return (
    <Card className="shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className='flex-1'>
            <CardTitle className="flex items-center gap-2 font-semibold text-lg">
              <GlassWater className="h-5 w-5 text-primary" />
              Hidratação
            </CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddWaterClick}>
            <Plus className="mr-2 h-4 w-4" /> Registrar
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
         <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {(waterIntake / 1000).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">/ {(waterGoal / 1000).toFixed(2)} L</p>
        </div>
        <Progress value={progress} className="mt-2 h-2" />
      </CardContent>
    </Card>
  );
}
