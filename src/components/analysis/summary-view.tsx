// src/components/analysis/summary-view.tsx
'use client';

import { useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';
import type { UserProfile } from '@/types/user';
import MetricCard from './metric-card';
import { Flame, Droplet, Weight } from 'lucide-react';
import { Rocket } from 'lucide-react';
import { FaHamburger } from 'react-icons/fa';

interface SummaryViewProps {
  period: number;
  periodMeals: MealEntry[];
  periodHydration: HydrationEntry[];
  periodWeight: WeightLog[];
  userProfile: UserProfile | null;
}

export default function SummaryView({ period, periodMeals, periodHydration, periodWeight, userProfile }: SummaryViewProps) {
  
  const totalNutrients = useMemo(() => periodMeals.reduce(
    (acc, meal) => {
        acc.calorias += meal.mealData.totais.calorias;
        acc.proteinas += meal.mealData.totais.proteinas;
        acc.carboidratos += meal.mealData.totais.carboidratos;
        acc.gorduras += meal.mealData.totais.gorduras;
        return acc;
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  ), [periodMeals]);

  const totalHydration = useMemo(() => periodHydration.reduce(
    (acc, entry) => acc + entry.intake, 0
  ), [periodHydration]);
  
  const avgCalories = period > 0 ? totalNutrients.calorias / period : 0;
  const avgProtein = period > 0 ? totalNutrients.proteinas / period : 0;
  const avgHydration = period > 0 ? totalHydration / period : 0;

  const weightChange = useMemo(() => {
    if (periodWeight.length < 2) return 0;
    const sortedWeights = [...periodWeight].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startWeight = sortedWeights[0].weight;
    const endWeight = sortedWeights[sortedWeights.length - 1].weight;
    return endWeight - startWeight;
  }, [periodWeight]);
  
  const calorieGoal = userProfile?.calorieGoal || 2000;
  const proteinGoal = userProfile?.proteinGoal || 140;
  const waterGoal = userProfile?.waterGoal || 2000;

  const summaryMetrics = [
    {
        title: 'Média de Calorias',
        value: avgCalories.toFixed(0),
        unit: 'kcal/dia',
        icon: Flame,
        color: 'bg-orange-500',
        description: `Meta: ${calorieGoal} kcal`,
    },
    {
        title: 'Média de Proteínas',
        value: avgProtein.toFixed(0),
        unit: 'g/dia',
        icon: Rocket,
        color: 'bg-blue-500',
        description: `Meta: ${proteinGoal} g`,
    },
    {
        title: 'Média de Hidratação',
        value: (avgHydration / 1000).toFixed(2),
        unit: 'L/dia',
        icon: Droplet,
        color: 'bg-sky-500',
        description: `Meta: ${(waterGoal / 1000).toFixed(2)} L`,
    },
    {
        title: 'Variação de Peso',
        value: weightChange.toFixed(1),
        unit: 'kg',
        icon: Weight,
        color: 'bg-purple-500',
        description: `Nos últimos ${period} dias`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {summaryMetrics.map((metric, index) => (
         <div key={index} style={{animationDelay: `${index * 100}ms`}}>
            <MetricCard {...metric} />
        </div>
      ))}
    </div>
  );
}
