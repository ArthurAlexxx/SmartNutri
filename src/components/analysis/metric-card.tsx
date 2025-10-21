// src/components/analysis/metric-card.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  color?: string;
  description?: string;
}

export default function MetricCard({ title, value, unit, icon: Icon, color = 'bg-primary', description }: MetricCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl bg-card animate-fade-in">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className={cn("p-2.5 rounded-lg", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-base text-muted-foreground">{unit}</p>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
