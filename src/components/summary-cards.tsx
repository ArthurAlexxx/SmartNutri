// src/components/summary-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Flame, Droplet, TrendingUp, Target, Users, BookCheck, Donut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Rocket } from 'lucide-react';
import { FaHamburger } from 'react-icons/fa';


interface SummaryCardsProps {
  totalNutrients: {
    calorias: number;
    proteinas: number;
    carboidratos?: number;
    gorduras?: number;
  };
   nutrientGoals?: {
    calories: number;
    protein: number;
  };
  isProfessional?: boolean;
  isAnalysisPage?: boolean;
}

const SummaryCard = ({ title, value, unit, icon: Icon, color, goal }: { title: string, value: string, unit: string, icon: React.ElementType, color: string, goal?: number | null }) => {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl bg-card">
            <CardHeader className="pb-2">
                 <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </CardHeader>
            <CardContent>
                 <div className={cn("p-2 rounded-lg mb-2 w-fit", color)}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="text-base text-muted-foreground">{unit}</p>
                </div>
                {goal != null && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3"/> Meta: {goal.toLocaleString('pt-BR')} {unit}</p>
                )}
            </CardContent>
        </Card>
    );
};


export default function SummaryCards({ totalNutrients, nutrientGoals, isProfessional = false, isAnalysisPage = false }: SummaryCardsProps) {
  
  if (isProfessional) {
     const professionalCardsData = [
        {
            title: 'Total de Pacientes',
            value: `${totalNutrients.calorias}`, // Reusing 'calorias' for total patients
            unit: 'pacientes',
            icon: Users,
            color: 'bg-blue-400',
        },
        {
            title: 'Planos Ativos',
            value: `${totalNutrients.proteinas}`, // Reusing 'proteinas' for active plans
            unit: 'planos',
            icon: BookCheck,
            color: 'bg-green-400',
        },
     ];
     return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {professionalCardsData.map((card, index) => (
            <div key={card.title} className="animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
                <SummaryCard {...card} />
            </div>
          ))}
        </div>
      );
  }

  const titlePrefix = isAnalysisPage ? 'Média ' : '';

  const summaryCardsData = [
    {
      title: `${titlePrefix}Calorias`,
      value: `${Math.round(totalNutrients.calorias).toLocaleString('pt-BR')}`,
      unit: 'kcal',
      icon: Flame,
      color: 'bg-orange-400',
      goal: nutrientGoals?.calories,
    },
    {
      title: `${titlePrefix}Proteínas`,
      value: `${(totalNutrients.proteinas || 0).toFixed(0)}`,
      unit: 'g',
      icon: Rocket,
      color: 'bg-blue-400',
      goal: nutrientGoals?.protein
    },
    {
      title: `${titlePrefix}Carboidratos`,
      value: `${(totalNutrients.carboidratos || 0).toFixed(0)}`,
      unit: 'g',
      icon: FaHamburger,
      color: 'bg-yellow-400',
    },
    {
      title: `${titlePrefix}Gorduras`,
      value: `${(totalNutrients.gorduras || 0).toFixed(0)}`,
      unit: 'g',
      icon: Donut,
      color: 'bg-pink-400',
    }
  ];

  return (
    <div className={cn("grid gap-4", isAnalysisPage ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2")}>
      {summaryCardsData.map((card, index) => (
        <div key={card.title} className="animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
            <SummaryCard {...card} />
        </div>
      ))}
    </div>
  );
}
