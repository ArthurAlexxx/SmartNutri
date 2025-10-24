// src/components/tutorial-guide.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from './ui/button';
import { ArrowRight, Check, X } from 'lucide-react';
import { tutorialSteps, type TutorialStep } from '@/lib/tutorial-steps';
import { usePathname } from 'next/navigation';

interface TutorialGuideProps {
  isNewUser: boolean;
  onComplete: () => void;
}

const VIEWED_STEPS_KEY = 'nutrismart_viewed_tutorial_steps';

export default function TutorialGuide({ isNewUser, onComplete }: TutorialGuideProps) {
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [viewedSteps, setViewedSteps] = useState<Set<string>>(new Set());
  const pathname = usePathname();

  // Load viewed steps from localStorage on initial mount
  useEffect(() => {
    // For testing, we are disabling localStorage to always show the tutorial.
    // try {
    //   const savedSteps = localStorage.getItem(VIEWED_STEPS_KEY);
    //   if (savedSteps) {
    //     setViewedSteps(new Set(JSON.parse(savedSteps)));
    //   }
    // } catch (error) {
    //   console.error("Failed to load tutorial progress:", error);
    // }
  }, []);

  // Effect to find the current step and target element whenever the page or progress changes
  useEffect(() => {
    // Find the first step on the current page that has NOT been viewed yet
    const nextStepOnPage = tutorialSteps.find(step => 
      step.path === pathname && !viewedSteps.has(step.elementId)
    );
    
    if (nextStepOnPage) {
      setCurrentStep(nextStepOnPage);
      // Attempt to find the element for the current step
      const element = document.getElementById(nextStepOnPage.elementId);
      setTargetElement(element);
    } else {
      // No more steps for this page, or no steps at all
      setCurrentStep(null);
      setTargetElement(null);
    }
  }, [pathname, viewedSteps]);

  // Function to mark a step as viewed and move to the next
  const handleNext = () => {
    if (!currentStep) return;

    // Mark current step as viewed
    const newViewedSteps = new Set(viewedSteps).add(currentStep.elementId);
    
    // For testing, we are disabling localStorage to always show the tutorial.
    // try {
    //     localStorage.setItem(VIEWED_STEPS_KEY, JSON.stringify(Array.from(newViewedSteps)));
    // } catch (error) {
    //     console.error("Failed to save tutorial progress:", error);
    // }
    
    setViewedSteps(newViewedSteps);
    // The useEffect will then automatically find the next available step on the page
  };

  // Function to skip the entire tutorial
  const handleSkip = () => {
    const allStepIds = new Set(tutorialSteps.map(step => step.elementId));
    // For testing, we are disabling localStorage to always show the tutorial.
    //  try {
    //     localStorage.setItem(VIEWED_STEPS_KEY, JSON.stringify(Array.from(allStepIds)));
    // } catch (error) {
    //     console.error("Failed to save tutorial progress:", error);
    // }
    setViewedSteps(allStepIds);
    setCurrentStep(null);
    setTargetElement(null);
    onComplete();
  };
  
  const allStepsOnPage = tutorialSteps.filter(step => step.path === pathname);
  const currentStepIndexOnPage = allStepsOnPage.findIndex(step => step.elementId === currentStep?.elementId);
  const isLastStepOnPage = currentStepIndexOnPage === allStepsOnPage.length - 1;


  if (!isNewUser || !currentStep || !targetElement) {
    return null;
  }
  
  const rect = targetElement.getBoundingClientRect();

  return (
    <Popover open={true}>
      <PopoverAnchor asChild>
        <div
          style={{
            position: 'fixed',
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
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
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="mr-1 h-4 w-4" />
              Pular
            </Button>
             <div className='text-xs text-muted-foreground'>
                {currentStepIndexOnPage + 1} / {allStepsOnPage.length}
            </div>
            <Button size="sm" onClick={handleNext}>
              {isLastStepOnPage ? 'Finalizar' : 'Próximo'}
              {isLastStepOnPage ? <Check className="ml-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
