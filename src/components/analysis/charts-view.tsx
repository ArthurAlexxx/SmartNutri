// src/components/analysis/charts-view.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardCharts } from '@/components/dashboard-charts';
import { TrendingUp, GlassWater, Weight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ChartsViewProps {
  caloriesData: any[];
  hydrationData: any[];
  weightData: any[];
}

export default function ChartsView({ caloriesData, hydrationData, weightData }: ChartsViewProps) {
  return (
    <Accordion type="single" collapsible defaultValue="calories" className="w-full space-y-4">
      <AccordionItem value="calories" className="border rounded-2xl bg-card shadow-sm">
        <AccordionTrigger className="p-6 text-lg font-semibold hover:no-underline">
          <div className="flex items-center gap-3">
             <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/50">
                <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <span>Consumo de Calorias</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-6 pt-0">
            <p className="text-muted-foreground mb-4">Sua ingestão de calorias ao longo do período selecionado.</p>
            <DashboardCharts chartType="calories" data={caloriesData} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="weight" className="border rounded-2xl bg-card shadow-sm">
        <AccordionTrigger className="p-6 text-lg font-semibold hover:no-underline">
           <div className="flex items-center gap-3">
             <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50">
                <Weight className="h-5 w-5 text-red-500" />
            </div>
            <span>Acompanhamento de Peso</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-6 pt-0">
             <p className="text-muted-foreground mb-4">Sua evolução de peso ao longo do período selecionado.</p>
            <DashboardCharts chartType="weight" data={weightData} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="hydration" className="border rounded-2xl bg-card shadow-sm">
        <AccordionTrigger className="p-6 text-lg font-semibold hover:no-underline">
           <div className="flex items-center gap-3">
             <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50">
                <GlassWater className="h-5 w-5 text-blue-500" />
            </div>
            <span>Consumo de Água</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-6 pt-0">
             <p className="text-muted-foreground mb-4">Sua ingestão diária de água ao longo do tempo.</p>
            <DashboardCharts chartType="hydration" data={hydrationData} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
