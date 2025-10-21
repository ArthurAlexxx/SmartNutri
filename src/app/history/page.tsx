
// src/app/history/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, getDocs, Timestamp, deleteDoc, Unsubscribe } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import ConsumedFoodsList from '@/components/consumed-foods-list';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import SummaryCards from '@/components/summary-cards';
import AppLayout from '@/components/app-layout';
import WaterIntakeSummary from '@/components/water-intake-summary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonthPicker } from '@/components/ui/month-picker';

import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import { getLocalDateString } from '@/lib/date-utils';
import { useAuth, useUser, useFirestore } from '@/firebase';


export default function HistoryPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [allMealEntries, setAllMealEntries] = useState<MealEntry[]>([]);
  const [allHydrationEntries, setAllHydrationEntries] = useState<HydrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    let unsubProfile: Unsubscribe | undefined;
    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;

    if (firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      unsubProfile = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserProfile({ id: doc.id, ...doc.data() } as UserProfile);
        }
        setLoading(false);
      });

      const mealsQuery = query(collection(firestore, 'meal_entries'), where('userId', '==', user.uid));
      unsubMeals = onSnapshot(mealsQuery, (snapshot) => {
        setAllMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
      });

      const hydrationQuery = query(collection(firestore, 'hydration_entries'), where('userId', '==', user.uid));
      unsubHydration = onSnapshot(hydrationQuery, (snapshot) => {
        setAllHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
      });
    }

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
    };

  }, [user, isUserLoading, router, firestore]);
  
  const { mealEntries, hydrationEntries } = useMemo(() => {
    if (viewMode === 'day' && selectedDate) {
      const dateStr = getLocalDateString(selectedDate);
      return {
        mealEntries: allMealEntries.filter(e => e.date === dateStr),
        hydrationEntries: allHydrationEntries.filter(e => e.date === dateStr),
      };
    }
    if (viewMode === 'month') {
      const monthStr = format(selectedMonth, 'yyyy-MM');
      return {
        mealEntries: allMealEntries.filter(e => e.date.startsWith(monthStr)),
        hydrationEntries: allHydrationEntries.filter(e => e.date.startsWith(monthStr)),
      };
    }
    return { mealEntries: [], hydrationEntries: [] };
  }, [viewMode, selectedDate, selectedMonth, allMealEntries, allHydrationEntries]);


  const handleProfileUpdate = useCallback((updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prevProfile => {
        if (!prevProfile) return null;
        return { ...prevProfile, ...updatedProfile };
    });
  }, []);

  const handleMealDeleted = useCallback(async (entryId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'meal_entries', entryId));
        toast({
            title: "Refeição Removida",
            description: "A refeição foi removida do seu histórico.",
        });
    } catch (error) {
        console.error("Error deleting meal:", error);
        toast({
            title: "Erro ao Remover",
            description: "Não foi possível remover a refeição. Tente novamente.",
            variant: "destructive",
        });
    }
  }, [firestore, toast]);

  const { dailyTotals, monthlyTotals } = useMemo(() => {
    const totals = mealEntries.reduce(
        (acc, entry) => {
            acc.calorias += entry.mealData.totais.calorias;
            acc.proteinas += entry.mealData.totais.proteinas;
            acc.carboidratos += entry.mealData.totais.carboidratos;
            acc.gorduras += entry.mealData.totais.gorduras;
            return acc;
        },
        { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
    );
    return { dailyTotals: totals, monthlyTotals: totals }; // Both are same now based on filtered entries
  }, [mealEntries]);

  const dailyHydration = hydrationEntries.length > 0 ? hydrationEntries[0] : null;
  
  const monthlyHydrationTotal = useMemo(() => {
    return hydrationEntries.reduce((acc, entry) => acc + entry.intake, 0);
  }, [hydrationEntries]);


  if (loading || isUserLoading) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-gray-50 items-center justify-center">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onMealAdded={() => {}}
        onProfileUpdate={handleProfileUpdate}
    >
        <div className="flex flex-col gap-8">
            <div className="mb-6 animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-foreground font-heading">Histórico Nutricional</h2>
                <p className="text-muted-foreground">Selecione uma data para ver o detalhe de suas refeições e o resumo nutricional do dia.</p>
            </div>

            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'month')} className="w-full mb-8">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="day">Diário</TabsTrigger>
                    <TabsTrigger value="month">Mensal</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="shadow-sm rounded-2xl">
                        <CardContent className="p-2">
                             {viewMode === 'day' ? (
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    className="w-full"
                                    locale={ptBR}
                                    disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                                />
                            ) : (
                               <MonthPicker
                                    month={selectedMonth}
                                    setMonth={setSelectedMonth}
                               />
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-8">
                {(loading || isUserLoading) && allMealEntries.length === 0 ? (
                    <div className="flex items-center justify-center h-64 rounded-xl bg-secondary/30">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="md:col-span-2">
                                <SummaryCards
                                    totalNutrients={viewMode === 'day' ? dailyTotals : monthlyTotals}
                                />
                           </div>
                           <div className="md:col-span-2">
                                <WaterIntakeSummary 
                                    hydrationEntry={viewMode === 'day' ? dailyHydration : null}
                                    monthlyTotal={viewMode === 'month' ? monthlyHydrationTotal : undefined}
                                    monthlyGoal={viewMode === 'month' && userProfile?.waterGoal ? (userProfile.waterGoal * 30) : undefined}
                                />
                           </div>
                        </div>
                        {viewMode === 'day' && (
                             <Card className="shadow-sm rounded-2xl">
                                <CardContent className="p-4">
                                     <ConsumedFoodsList 
                                        mealEntries={mealEntries} 
                                        onMealDeleted={handleMealDeleted}
                                        onMealEdit={() => {}}
                                    />
                                </CardContent>
                             </Card>
                        )}
                         {(mealEntries.length === 0 && hydrationEntries.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-40 text-center rounded-xl bg-secondary/50">
                                <p className="text-base font-medium text-muted-foreground">Nenhum dado encontrado para {viewMode === 'day' ? 'este dia' : 'este mês'}.</p>
                            </div>
                         )}
                    </>
                )}
                </div>
            </div>
        </div>
    </AppLayout>
  );
}
