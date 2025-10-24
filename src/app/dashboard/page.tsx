
// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import type { Room } from '@/types/room';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Share2, Donut } from 'lucide-react';
import { collection, query, where, onSnapshot, deleteDoc, updateDoc, setDoc, Unsubscribe, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { getLocalDateString } from '@/lib/date-utils';
import { useUser, useFirestore } from '@/firebase';

import AppLayout from '@/components/app-layout';
import EditMealModal from '@/components/edit-meal-modal';
import { Button } from '@/components/ui/button';
import WaterTrackerCard from '@/components/water-tracker-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SummaryCards from '@/components/summary-cards';
import ConsumedFoodsList from '@/components/consumed-foods-list';
import AddMealModal from '@/app/add-meal-modal';
import WaterTrackerModal from '@/components/water-tracker-modal';


export default function DashboardPage() {
  const db = useFirestore();
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();

  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const { toast } = useToast();
  
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [isAddMealModalOpen, setAddMealModalOpen] = useState(false);
  const [isWaterModalOpen, setWaterModalOpen] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    // We can show the page as soon as the userProfile is available
    if (userProfile !== undefined) {
      setLoading(false);
    }

    let unsubRoom: Unsubscribe | undefined;
    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;

    if (db) {
      // The userProfile is now coming from the useUser hook, so no need for a separate listener here.
      if (userProfile?.patientRoomId) {
          const roomRef = doc(db, 'rooms', userProfile.patientRoomId);
          unsubRoom = onSnapshot(roomRef, (roomDoc) => {
            if (roomDoc.exists()) {
              setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
            } else {
              setRoom(null);
            }
          });
      } else {
          setRoom(null);
      }

      const mealsQuery = query(collection(db, 'meal_entries'), where('userId', '==', user.uid));
      unsubMeals = onSnapshot(mealsQuery, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry));
        setMealEntries(entries);
      });

      const hydrationQuery = query(collection(db, 'hydration_entries'), where('userId', '==', user.uid));
      unsubHydration = onSnapshot(hydrationQuery, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry));
        setHydrationEntries(entries);
      });
    }

    return () => {
      if (unsubRoom) unsubRoom();
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
    };

  }, [user, userProfile, isUserLoading, router, db]);

  const handleMealDeleted = useCallback(async (entryId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'meal_entries', entryId));
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
  }, [db, toast]);

  const handleMealUpdate = useCallback(async (updatedMeal: MealEntry) => {
    if (!db || !updatedMeal.id) return;
    try {
        const mealRef = doc(db, 'meal_entries', updatedMeal.id);
        await updateDoc(mealRef, {
            mealData: updatedMeal.mealData
        });
        toast({
            title: "Refeição Atualizada",
            description: "Os valores da sua refeição foram atualizados.",
        });
        setEditingMeal(null);
    } catch(e) {
        console.error("Error updating meal:", e);
        toast({ title: "Erro", description: "Não foi possível atualizar a refeição.", variant: "destructive" });
    }
  }, [db, toast]);

  const handleProfileUpdateWithToast = useCallback(async (updatedProfile: Partial<UserProfile>) => {
    try {
        await onProfileUpdate(updatedProfile);
        toast({
          title: "Perfil Atualizado!",
          description: "Suas informações foram salvas.",
        });
    } catch(e) {
        console.error(e);
        toast({ title: "Erro", description: "Falha ao atualizar o perfil." });
    }
  }, [onProfileUpdate, toast]);
  
  const waterGoal = useMemo(() => room?.activePlan?.hydrationGoal || userProfile?.waterGoal || 2000, [room, userProfile]);

  const handleWaterUpdate = useCallback(async (newIntake: number) => {
     if (!user || !db) return;
     const dateStr = getLocalDateString();
     const hydrationRef = doc(db, 'hydration_entries', `${user.uid}_${dateStr}`);
     const data = {
        userId: user.uid,
        date: dateStr,
        intake: newIntake,
        goal: waterGoal
     };
     setDoc(hydrationRef, data, { merge: true });
  }, [user, db, waterGoal]);
  
  const todayStr = getLocalDateString(new Date());
  const todayMeals = mealEntries.filter(entry => entry.date === todayStr);
  const todayHydration = hydrationEntries.find(entry => entry.date === todayStr) || null;

  const totalNutrients = useMemo(() => todayMeals.reduce(
    (acc, meal) => {
        acc.calorias += meal.mealData.totais.calorias;
        acc.proteinas += meal.mealData.totais.proteinas;
        acc.carboidratos += meal.mealData.totais.carboidratos || 0;
        acc.gorduras += meal.mealData.totais.gorduras || 0;
        return acc;
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  ), [todayMeals]);

  const nutrientGoals = useMemo(() => ({
    calories: room?.activePlan?.calorieGoal || userProfile?.calorieGoal || 2000,
    protein: room?.activePlan?.proteinGoal || userProfile?.proteinGoal || 140,
  }), [room, userProfile]);

  if (loading || isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Carregando seu diário...</p>
      </div>
    );
  }
  
  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={handleProfileUpdateWithToast}
    >
        <div className="flex flex-col gap-8">
            <div className='flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left animate-fade-in'>
                <div className='flex-1'>
                    <h2 className='text-3xl font-bold text-foreground font-heading'>Diário de Bordo</h2>
                    <p className='text-muted-foreground'>Registre suas refeições e consumo de água para hoje.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div id="summary-cards" className="lg:col-span-1 space-y-8 order-2 lg:order-1">
                     <SummaryCards
                        totalNutrients={totalNutrients}
                        nutrientGoals={nutrientGoals}
                    />
                    <div id="water-tracker-card">
                      <WaterTrackerCard
                          waterIntake={todayHydration?.intake || 0}
                          waterGoal={waterGoal}
                          onAddWaterClick={() => setWaterModalOpen(true)}
                      />
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-8 order-1 lg:order-2">
                    <Card className="shadow-sm rounded-2xl w-full">
                       <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className='flex-1'>
                                <CardTitle>Refeições de Hoje</CardTitle>
                            </div>
                            <Button id="add-meal-button" onClick={() => setAddMealModalOpen(true)} size="sm" className="w-full sm:w-auto">
                                <Plus className="mr-2 h-4 w-4" /> Adicionar Refeição
                            </Button>
                       </CardHeader>
                       <CardContent>
                           <ConsumedFoodsList 
                              mealEntries={todayMeals} 
                              onMealDeleted={handleMealDeleted}
                              onMealEdit={(meal) => setEditingMeal(meal)}
                            />
                       </CardContent>
                    </Card>
                </div>
            </div>
        </div>
         {editingMeal && (
            <EditMealModal
                isOpen={!!editingMeal}
                onOpenChange={() => setEditingMeal(null)}
                mealEntry={editingMeal}
                onMealUpdate={handleMealUpdate}
            />
        )}
        {user && 
          <AddMealModal 
              isOpen={isAddMealModalOpen} 
              onOpenChange={setAddMealModalOpen}
              userId={user.uid} 
          />
        }
        <WaterTrackerModal
            isOpen={isWaterModalOpen}
            onOpenChange={setWaterModalOpen}
            waterIntake={todayHydration?.intake || 0}
            waterGoal={waterGoal}
            onWaterUpdate={handleWaterUpdate}
        />
    </AppLayout>
  );
}
