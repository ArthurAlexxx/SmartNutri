// src/components/tutorial-guide.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from './ui/button';
import { ArrowRight, Check, X } from 'lucide-react';
import { tutorialSteps, type TutorialStep } from '@/lib/tutorial-steps';
import { usePathname, useRouter } from 'next/navigation';

interface TutorialGuideProps {
  isNewUser: boolean;
  onComplete: () => void;
}

export default function TutorialGuide({ isNewUser, onComplete }: TutorialGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const currentStep = tutorialSteps[currentStepIndex];

  const findElement = useCallback(() => {
    if (currentStep) {
      const element = document.getElementById(currentStep.elementId);
      setTargetElement(element);
    } else {
      setTargetElement(null);
    }
  }, [currentStep]);

  useEffect(() => {
    // A slight delay to ensure the DOM is fully rendered, especially on navigation.
    const timeoutId = setTimeout(findElement, 100);
    return () => clearTimeout(timeoutId);
  }, [currentStepIndex, pathname, findElement]);

  if (!isNewUser || !currentStep || !targetElement) {
    return null;
  }
  
  const isLastStep = currentStepIndex === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextStep = tutorialSteps[currentStepIndex + 1];
      if (nextStep.path && pathname !== nextStep.path) {
        router.push(nextStep.path);
      }
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    setTargetElement(null);
  };

  return (
    <Popover open={true}>
      <PopoverAnchor asChild>
        <div
          style={{
            position: 'absolute',
            top: `${targetElement.offsetTop}px`,
            left: `${targetElement.offsetLeft}px`,
            width: `${targetElement.offsetWidth}px`,
            height: `${targetElement.offsetHeight}px`,
            pointerEvents: 'none',
            zIndex: 100,
          }}
          className='rounded-md ring-4 ring-primary/50 ring-offset-4 ring-offset-background animate-pulse duration-1000'
        />
      </PopoverAnchor>
      <PopoverContent
        side={currentStep.side}
        align="center"
        sideOffset={15}
        className="w-72 shadow-2xl animate-in fade-in-0 zoom-in-95 z-[101]"
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-semibold leading-none">{currentStep.title}</h4>
            <p className="text-sm text-muted-foreground">{currentStep.description}</p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleComplete}>
              <X className="mr-1 h-4 w-4" />
              Pular
            </Button>
             <div className='text-xs text-muted-foreground'>
                {currentStepIndex + 1} / {tutorialSteps.length}
            </div>
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? 'Finalizar' : 'Próximo'}
              {isLastStep ? <Check className="ml-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
