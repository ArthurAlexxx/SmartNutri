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

const TUTORIAL_STORAGE_KEY = 'nutrismart_tutorial_step';

export default function TutorialGuide({ isNewUser, onComplete }: TutorialGuideProps) {
  const [globalStepIndex, setGlobalStepIndex] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const savedStep = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      const initialStep = savedStep ? parseInt(savedStep, 10) : 0;
      if (initialStep < tutorialSteps.length) {
        setGlobalStepIndex(initialStep);
      } else {
        // Tutorial was already completed
        handleComplete(true); // silent complete
      }
    } catch (error) {
      // If localStorage is unavailable, just start from the beginning
      setGlobalStepIndex(0);
    }
  }, []);

  const currentPageSteps = tutorialSteps.filter(step => step.path === pathname);
  const currentStep = tutorialSteps[globalStepIndex];
  
  const findElement = useCallback(() => {
    if (currentStep && currentStep.path === pathname) {
      const element = document.getElementById(currentStep.elementId);
      setTargetElement(element);
    } else {
      setTargetElement(null);
    }
  }, [currentStep, pathname]);

  useEffect(() => {
    const timeoutId = setTimeout(findElement, 150);
    return () => clearTimeout(timeoutId);
  }, [globalStepIndex, pathname, findElement]);

  const handleNext = () => {
    const nextIndex = globalStepIndex + 1;
    if (nextIndex >= tutorialSteps.length) {
      handleComplete();
    } else {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, String(nextIndex));
      setGlobalStepIndex(nextIndex);

      const nextStepInfo = tutorialSteps[nextIndex];
      if (nextStepInfo.path && pathname !== nextStepInfo.path) {
        router.push(nextStepInfo.path);
      }
    }
  };

  const handleComplete = (silently = false) => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialSteps.length));
    } catch (error) {}
    
    setTargetElement(null);
    setGlobalStepIndex(tutorialSteps.length);
    if (!silently) {
      onComplete();
    }
  };

  if (!isNewUser || !currentStep || !targetElement) {
    return null;
  }

  const isLastStep = globalStepIndex === tutorialSteps.length - 1;

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
            <Button variant="ghost" size="sm" onClick={() => handleComplete()}>
              <X className="mr-1 h-4 w-4" />
              Pular
            </Button>
             <div className='text-xs text-muted-foreground'>
                {globalStepIndex + 1} / {tutorialSteps.length}
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