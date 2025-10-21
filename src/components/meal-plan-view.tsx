// src/components/meal-plan-view.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type Room } from '@/types/room';
import { Droplet, Flame, Utensils, Target, CalendarX, Info, Clock, Soup } from 'lucide-react';

const PlanMealItem = ({ meal }: { meal: Room['activePlan']['meals'][0] }) => (
    <div className="rounded-lg border p-4 space-y-4 relative bg-background shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo de Refeição</p>
                <p className="font-semibold text-foreground">{meal.name}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">Horário</p>
                <p className="font-semibold text-foreground flex items-center gap-2"><Clock className='h-4 w-4' /> {meal.time}</p>
            </div>
        </div>
        <div>
            <p className="text-sm font-medium text-muted-foreground">Itens da Refeição</p>
            <p className="text-base text-foreground whitespace-pre-line mt-1">{meal.items}</p>
        </div>
    </div>
);

const EmptyPlanState = () => (
    <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed mt-8">
        <CardHeader className="text-center p-8">
            <Soup className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Nenhum Plano Alimentar Ativo</CardTitle>
            <CardDescription className="mt-2 max-w-md mx-auto">
                No momento, você não tem um plano alimentar definido por um nutricionista. Se você está em acompanhamento, peça para que ele crie um plano para você.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0 text-center">
             <div className="bg-secondary/50 border-l-4 border-primary/50 text-left p-4 rounded-r-lg">
                <div className="flex">
                    <div className="py-1"><Info className="h-5 w-5 text-primary mr-3"/></div>
                    <div>
                        <p className="font-semibold text-foreground">Dica:</p>
                        <p className="text-sm text-muted-foreground">Você ainda pode registrar suas refeições e acompanhar suas metas pessoais no seu <a href="/dashboard" className="text-primary font-medium hover:underline">Dashboard</a>.</p>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

interface MealPlanViewProps {
  room: Room | null;
}

export default function MealPlanView({ room }: MealPlanViewProps) {
  if (!room || !room.activePlan || room.activePlan.meals.length === 0) {
    return <EmptyPlanState />;
  }
  
  const { activePlan } = room;

  return (
    <div className='animate-fade-in space-y-8 max-w-4xl mx-auto'>
        <section>
            <h2 className='text-xl font-bold text-foreground mb-2 flex items-center gap-2'><Target className='h-6 w-6 text-primary' /> Suas Metas Diárias</h2>
            <p className='text-muted-foreground mb-4'>Estas são as metas definidas pelo seu nutricionista.</p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='flex items-center gap-4 rounded-xl border p-4 bg-card shadow-sm'>
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/50">
                        <Flame className='h-6 w-6 text-orange-500' />
                    </div>
                    <div>
                        <p className='text-muted-foreground'>Meta de Calorias</p>
                        <p className='text-2xl font-bold'>{activePlan.calorieGoal} <span className='text-base font-normal'>kcal</span></p>
                    </div>
                </div>
                 <div className='flex items-center gap-4 rounded-xl border p-4 bg-card shadow-sm'>
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
                        <Droplet className='h-6 w-6 text-blue-500' />
                    </div>
                    <div>
                        <p className='text-muted-foreground'>Meta de Hidratação</p>
                        <p className='text-2xl font-bold'>{activePlan.hydrationGoal / 1000} <span className='text-base font-normal'>L</span></p>
                    </div>
                </div>
            </div>
        </section>

        <section>
            <h2 className='text-xl font-bold text-foreground mb-2 flex items-center gap-2'><Utensils className='h-6 w-6 text-primary' /> Suas Refeições</h2>
            <p className='text-muted-foreground mb-4'>Siga este guia de refeições para atingir suas metas.</p>
             <div className='space-y-4'>
                {activePlan.meals.map((meal, index) => (
                    <PlanMealItem key={index} meal={meal} />
                ))}
             </div>
        </section>
    </div>
  );
}
