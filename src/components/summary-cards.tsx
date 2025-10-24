// src/components/summary-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Rocket } from 'lucide-react';
import { FaHamburger } from 'react-icons/fa';
import { Flame, Droplet, Donut } from 'lucide-react';

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
  isAnalysisPage?: boolean;
}

const SummaryCard = ({ title, value, unit, icon: Icon, color, goal }: { title: string, value: string, unit: string, icon: React.ElementType, color: string, goal?: number | null }) => {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl bg-card">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-3 rounded-lg", color)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div className='flex-1'>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-sm text-muted-foreground">{unit}</p>
                    </div>
                     {goal != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3"/> Meta: {goal.toLocaleString('pt-BR')} {unit}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


export default function SummaryCards({ totalNutrients, nutrientGoals, isAnalysisPage = false }: SummaryCardsProps) {
  
  const titlePrefix = isAnalysisPage ? 'Média ' : '';

  const summaryCardsData = [
    {
      title: `${titlePrefix}de Calorias`,
      value: `${Math.round(totalNutrients.calorias).toLocaleString('pt-BR')}`,
      unit: 'kcal',
      icon: Flame,
      color: 'bg-orange-400',
      goal: nutrientGoals?.calories,
    },
    {
      title: `${titlePrefix}de Proteínas`,
      value: `${(totalNutrients.proteinas || 0).toFixed(0)}`,
      unit: 'g',
      icon: Rocket,
      color: 'bg-blue-400',
      goal: nutrientGoals?.protein
    },
    {
      title: `${titlePrefix}de Carboidratos`,
      value: `${(totalNutrients.carboidratos || 0).toFixed(0)}`,
      unit: 'g',
      icon: FaHamburger,
      color: 'bg-yellow-400',
    },
    {
      title: `${titlePrefix}de Gorduras`,
      value: `${(totalNutrients.gorduras || 0).toFixed(0)}`,
      unit: 'g',
      icon: Donut,
      color: 'bg-pink-400',
    }
  ];

  return (
    <div className={cn("grid gap-4", isAnalysisPage ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2")}>
      {summaryCardsData.map((card, index) => (
        <div key={card.title} className="animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
            <SummaryCard {...card} />
        </div>
      ))}
    </div>
  );
}
