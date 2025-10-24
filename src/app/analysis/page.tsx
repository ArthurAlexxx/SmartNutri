
// src/app/analysis/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Lightbulb, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { subDays, eachDayOfInterval, format, startOfDay } from 'date-fns';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLocalDateString } from '@/lib/date-utils';
import { useUser, useFirestore } from '@/firebase';
import { query, collection, where, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore';
import SummaryCards from '@/components/summary-cards';
import ChartsView from '@/components/analysis/charts-view';
import { generateAnalysisInsights } from '@/ai/flows/analysis-flow';
import InsightsCard from '@/components/analysis/insights-card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


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

  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);


  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error fetching ${context}:`, error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(!userProfile);

    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;
    let unsubWeight: Unsubscribe | undefined;

    if (firestore) {
      const baseQuery = (collectionName: string) => query(collection(firestore, collectionName), where('userId', '==', user.uid));

      unsubMeals = onSnapshot(baseQuery('meal_entries'), (snapshot) => {
        setMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
        setLoading(false);
      }, (error) => handleError(error, 'meals'));

      unsubHydration = onSnapshot(baseQuery('hydration_entries'), (snapshot) => {
        setHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
      }, (error) => handleError(error, 'hydration'));
      
      unsubWeight = onSnapshot(baseQuery('weight_logs'), (snapshot) => {
        setWeightLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog)));
      }, (error) => handleError(error, 'weight'));
    }

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
      if (unsubWeight) unsubWeight();
    };
  }, [user, isUserLoading, router, firestore, userProfile, handleError]);

  
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
     
     const uniqueDays = new Set(periodMeals.map(meal => meal.date)).size;

     return {
        calorias: totals.calorias / uniqueDays,
        proteinas: totals.proteinas / uniqueDays,
        carboidratos: totals.carboidratos / uniqueDays,
        gorduras: totals.gorduras / uniqueDays,
     };

   }, [periodMeals]);

  useEffect(() => {
    if (periodMeals.length > 0 && userProfile) {
        setLoadingInsights(true);

        // Sanitize data before sending to server action
        const sanitizedProfile = {
            calorieGoal: userProfile.calorieGoal,
            proteinGoal: userProfile.proteinGoal,
            waterGoal: userProfile.waterGoal,
            weight: userProfile.weight,
            targetWeight: userProfile.targetWeight,
            targetDate: userProfile.targetDate ? (userProfile.targetDate as Timestamp).toDate().toISOString() : undefined,
        };

        const sanitizedMealEntries = periodMeals.map((e: MealEntry) => ({ 
            date: e.date, 
            totals: e.mealData.totais 
        }));

        const sanitizedHydrationEntries = periodHydration.map((e: HydrationEntry) => ({ 
            date: e.date, 
            intake: e.intake 
        }));

        const sanitizedWeightLogs = periodWeight.map((e: WeightLog) => ({ 
            date: e.date, 
            weight: e.weight 
        }));

        generateAnalysisInsights({
            profile: sanitizedProfile,
            mealEntries: sanitizedMealEntries,
            hydrationEntries: sanitizedHydrationEntries,
            weightLogs: sanitizedWeightLogs,
        })
        .then(result => {
            setInsights(result.insights);
        })
        .catch(error => {
            console.error("Failed to generate insights:", error);
            setInsights([]);
        })
        .finally(() => {
            setLoadingInsights(false);
        });
    }
  }, [periodMeals, periodHydration, periodWeight, userProfile]);


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
            .filter(log => new Date(log.date) <= day)
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
            <Collapsible open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
                <CollapsibleTrigger asChild>
                     <Button
                        variant="outline"
                        className="w-full justify-between text-lg font-semibold h-14 px-6 border-primary/20 bg-primary/5 hover:bg-primary/10"
                    >
                        <div className='flex items-center gap-3'>
                            <Lightbulb className="h-6 w-6 text-primary" />
                             Análise da IA
                        </div>
                        <ChevronDown className={cn("h-6 w-6 text-primary transition-transform", isInsightsOpen && "rotate-180")} />
                    </Button>
                </CollapsibleTrigger>
                 <CollapsibleContent className="py-4">
                    <InsightsCard insights={insights} isLoading={loadingInsights} />
                </CollapsibleContent>
            </Collapsible>

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
                    <p className="text-muted-foreground mt-1">Seu progresso, tendências e insights gerados por IA.</p>
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

    