
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
import AddMealModal from '@/components/add-meal-modal';


export default function DashboardPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const { toast } = useToast();
  
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [isAddMealModalOpen, setAddMealModalOpen] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    let unsubProfile: Unsubscribe | undefined;
    let unsubRoom: Unsubscribe | undefined;
    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;

    if (db) {
      const userRef = doc(db, 'users', user.uid);
      unsubProfile = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const profileData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
          setUserProfile(profileData);
          setLoading(false);
          
          if (profileData.patientRoomId) {
            const roomRef = doc(db, 'rooms', profileData.patientRoomId);
            unsubRoom = onSnapshot(roomRef, (roomDoc) => {
              if (roomDoc.exists()) {
                setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
              } else {
                setRoom(null);
              }
            });
          } else {
             setRoom(null);
             if (unsubRoom) unsubRoom();
          }

        } else {
          setLoading(false);
          console.error("User profile not found in Firestore.");
        }
      });

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
      if (unsubProfile) unsubProfile();
      if (unsubRoom) unsubRoom();
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
    };

  }, [user, isUserLoading, router, db]);

  const handleMealAdded = useCallback((newMeal: MealEntry) => {
    setMealEntries(prev => [...prev, newMeal]);
    toast({
        title: 'Refeição Adicionada! ✅',
        description: 'Sua refeição foi registrada com sucesso.',
    });
  }, [toast]);

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
    if (!db) return;
     toast({ title: "Funcionalidade desativada", description: "A edição de refeições está temporariamente desativada.", variant: "destructive" });
  }, [db, toast]);

  const handleProfileUpdate = useCallback((updatedProfile: Partial<UserProfile>) => {
    if (!user || !db) return;
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, updatedProfile).then(() => {
      toast({
        title: "Perfil Atualizado!",
        description: "Suas informações foram salvas.",
      });
    }).catch(error => {
       toast({
        title: "Erro ao Atualizar",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
    });
  }, [user, db, toast]);
  
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
        acc.carboidratos += meal.mealData.totais.carboidratos;
        acc.gorduras += meal.mealData.totais.gorduras;
        return acc;
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  ), [todayMeals]);

  const nutrientGoals = useMemo(() => ({
    calories: room?.activePlan?.calorieGoal || userProfile?.calorieGoal || 2000,
    protein: room?.activePlan?.calorieGoal ? (room.activePlan.calorieGoal * 0.35) / 4 : userProfile?.proteinGoal || 140,
  }), [room, userProfile]);

  if (loading || isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }
  
  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onMealAdded={handleMealAdded}
        onProfileUpdate={handleProfileUpdate}
    >
        <div className="flex flex-col gap-8">
            <div className='flex flex-col items-center justify-center gap-4 text-center animate-fade-in'>
                <div>
                    <h2 className='text-3xl font-bold text-foreground font-heading'>Diário de Bordo</h2>
                    <p className='text-muted-foreground'>Registre suas refeições e consumo de água para hoje.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-8 order-2 lg:order-1">
                     <SummaryCards
                        totalNutrients={totalNutrients}
                        nutrientGoals={nutrientGoals}
                    />
                    <WaterTrackerCard
                        waterIntake={todayHydration?.intake || 0}
                        waterGoal={waterGoal}
                        onWaterUpdate={handleWaterUpdate}
                    />
                </div>
                <div className="lg:col-span-2 space-y-8 order-1 lg:order-2">
                    <Card className="shadow-sm rounded-2xl w-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Refeições de Hoje</CardTitle>
                            <Button onClick={() => setAddMealModalOpen(true)} size="sm">
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
              onMealAdded={handleMealAdded} 
              userId={user.uid} 
          />
        }
    </AppLayout>
  );
}
