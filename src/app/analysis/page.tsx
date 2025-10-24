
// src/app/analysis/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, TrendingUp, GlassWater, Weight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { subDays, eachDayOfInterval, format, startOfDay } from 'date-fns';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getLocalDateString } from '@/lib/date-utils';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Unsubscribe, query, collection, where, updateDoc } from 'firebase/firestore';
import SummaryCards from '@/components/summary-cards';
import ChartsView from '@/components/analysis/charts-view';

type Period = 7 | 15 | 30;

export default function AnalysisPage() {
  const { user, isUserLoading, userProfile, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);

   useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(!userProfile); // Start loading if profile isn't ready

    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;
    let unsubWeight: Unsubscribe | undefined;

    if (firestore) {
      const baseQuery = (collectionName: string) => query(collection(firestore, collectionName), where('userId', '==', user.uid));

      unsubMeals = onSnapshot(baseQuery('meal_entries'), (snapshot) => {
        setMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
        setLoading(false);
      }, () => setLoading(false));

      unsubHydration = onSnapshot(baseQuery('hydration_entries'), (snapshot) => {
        setHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
      });
      
      unsubWeight = onSnapshot(baseQuery('weight_logs'), (snapshot) => {
        setWeightLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog)));
      });
    }

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
      if (unsubWeight) unsubWeight();
    };

  }, [user, isUserLoading, router, firestore, userProfile]);

  
  const getDateFilteredData = useCallback((entries: {date: string}[], period: number) => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, period - 1);
    const dateIntervalStrings = eachDayOfInterval({ start: startDate, end: today }).map(getLocalDateString);
    const dateSet = new Set(dateIntervalStrings);
    return entries.filter(entry => dateSet.has(entry.date));
  }, []);

  const periodMeals = useMemo(() => getDateFilteredData(mealEntries, period), [mealEntries, period, getDateFilteredData]);
  const periodHydration = useMemo(() => getDateFilteredData(hydrationEntries, period), [hydrationEntries, period, getDateFilteredData]);
  const periodWeight = useMemo(() => getDateFilteredData(weightLogs, period), [weightLogs, period, getDateFilteredData]);
    
   const totalNutrients = useMemo(() => {
     if (periodMeals.length === 0) {
        return { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 };
     }
     const totals = periodMeals.reduce(
        (acc, meal) => {
            acc.calorias += meal.mealData.totais.calorias;
            acc.proteinas += meal.mealData.totais.proteinas;
            acc.carboidratos += meal.mealData.totais.carboidratos;
            acc.gorduras += meal.mealData.totais.gorduras;
            return acc;
        },
        { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
     );
     
     // Get unique days to calculate the average correctly
     const uniqueDays = new Set(periodMeals.map(meal => meal.date)).size;

     return {
        calorias: totals.calorias / uniqueDays,
        proteinas: totals.proteinas / uniqueDays,
        carboidratos: totals.carboidratos / uniqueDays,
        gorduras: totals.gorduras / uniqueDays,
     };

   }, [periodMeals]);


  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const dateInterval = eachDayOfInterval({ start: subDays(today, period - 1), end: today });
    
    return dateInterval.map(day => {
        const dateStr = getLocalDateString(day);
        const dayMeals = mealEntries.filter(entry => entry.date === dateStr);
        const dayCalories = dayMeals.reduce((sum, entry) => sum + entry.mealData.totais.calorias, 0);

        const dayHydration = hydrationEntries.find(entry => entry.date === dateStr);
        const dayIntake = dayHydration?.intake || 0;
        
        const relevantLogs = weightLogs
            .filter(log => log.date <= dateStr)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const dayWeight = relevantLogs[0]?.weight || null;

        return {
            day: format(day, 'dd/MM'),
            calories: Math.round(dayCalories),
            intake: dayIntake,
            weight: dayWeight,
        };
    }).reverse();
  }, [mealEntries, hydrationEntries, weightLogs, period]);

  const weightChartData = useMemo(() => {
      let lastKnownWeight: number | null = userProfile?.weight || null;
      const filledData = [...chartData].reverse().map(dataPoint => {
          if (dataPoint.weight !== null) {
              lastKnownWeight = dataPoint.weight;
          }
          return { ...dataPoint, weight: lastKnownWeight };
      });
      return filledData.reverse();
  }, [chartData, userProfile?.weight]);


  const mainContent = () => {
    if (loading || isUserLoading) {
      return (
        <div className="flex min-h-[50vh] w-full flex-col bg-background items-center justify-center">
           <Loader2 className="h-16 w-16 animate-spin text-primary" />
           <p className="mt-4 text-muted-foreground">Carregando suas análises...</p>
        </div>
      );
    }
    
    return (
        <div className="w-full space-y-8">
             <SummaryCards
                totalNutrients={totalNutrients}
                nutrientGoals={userProfile ? { calories: userProfile.calorieGoal || 2000, protein: userProfile.proteinGoal || 140 } : undefined}
                isAnalysisPage={true}
            />
             <p className="text-xs text-muted-foreground text-center -mt-4">
                Médias calculadas para o período de {period} dias.
            </p>
            <ChartsView
                caloriesData={chartData}
                hydrationData={chartData}
                weightData={weightChartData}
            />
        </div>
    );
  }
  
  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
        <div className="flex flex-col gap-8 print-container">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
                <div className="animate-fade-in flex-1 text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-foreground font-heading">Análise de Desempenho</h2>
                    <p className="text-muted-foreground mt-1">Seu progresso e tendências ao longo do tempo.</p>
                </div>
                 <div className='flex items-center gap-2'>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
                        {( [7, 15, 30] as Period[]).map(p => (
                            <Button 
                                key={p} 
                                onClick={() => setPeriod(p)}
                                variant={period === p ? 'primary' : 'ghost'}
                                size="sm"
                                className={cn("rounded-md", period === p && 'bg-background text-foreground shadow-sm hover:bg-background/90')}
                            >
                                {p}D
                            </Button>
                        ))}
                    </div>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>
            
            {mainContent()}
        </div>
    </AppLayout>
  );
}
