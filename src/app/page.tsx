// src/app/page.tsx
'use client';

import React, { useContext } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import * as icons from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Link from 'next/link';

import { type SiteConfig, titleFontSizes } from '@/lib/site-config-schema';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteConfigContext } from '@/context/site-config-context';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock } from 'lucide-react';


const LoadingSkeleton = () => (
   <div className="flex min-h-dvh flex-col bg-background font-sans overflow-x-hidden">
    <header className="sticky top-0 z-50 w-full border-b bg-background h-20 flex items-center container">
      <Skeleton className="h-8 w-32" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </header>
     <main className="flex-1 container py-12">
        <Skeleton className="h-[500px] w-full" />
        <div className="mt-12 space-y-8">
          <Skeleton className="h-16 w-1/2 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
     </main>
     <footer className="w-full border-t bg-secondary/30 py-12 container">
        <Skeleton className="h-8 w-48" />
     </footer>
   </div>
);


export default function Home() {
  const config = useContext(SiteConfigContext);

  const DynamicIcon = ({ name }: { name: string }) => {
    const IconComponent = (icons as any)[name] as React.ElementType;
    if (!IconComponent) return <icons.HelpCircle className="w-8 h-8" />;
    return <IconComponent className="w-8 h-8" />;
  };

  if (!config) {
     return <LoadingSkeleton />;
  }

  const isProfessionalSite = config.siteName !== "NutriSmart";

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans overflow-x-hidden">
      <Header siteConfig={config} />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex items-center min-h-[calc(80vh-80px)] md:min-h-[calc(100vh-80px)] py-16 md:py-24 bg-background">
          <div className="container z-10 px-4 md:px-6">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col justify-center space-y-8 text-center lg:text-left">
                <h1
                    className={cn(
                        "font-extrabold tracking-tight text-foreground text-balance text-4xl sm:text-5xl",
                        // titleFontSizes[config.theme.titleFontSize] || titleFontSizes['Médio']
                    )}
                    dangerouslySetInnerHTML={{ __html: config.heroSection.title }}
                />
                <p className="mx-auto max-w-[600px] text-lg text-muted-foreground md:text-xl lg:mx-0 mt-6">
                  {config.heroSection.subtitle}
                </p>
                <div className="flex flex-col gap-4 min-[400px]:flex-row mx-auto lg:mx-0 justify-center lg:justify-start">
                   <Button asChild size="lg" className="h-14 px-12 text-xl transition-all duration-300 transform shadow-lg rounded-full shadow-primary/30 hover:scale-105">
                     <Link href="/register">
                        {config.heroSection.cta}
                        <ArrowRight className="ml-2 h-5 w-5" />
                     </Link>
                   </Button>
                </div>
              </div>
               <div className="hidden lg:block relative h-[500px] w-full animate-fade-in" style={{animationDelay: '150ms'}}>
                    {config.heroSection.imageUrl && (
                      <Image
                        src={config.heroSection.imageUrl}
                        alt={config.heroSection.title}
                        fill
                        className="object-cover rounded-3xl"
                      />
                    )}
              </div>
            </div>
          </div>
        </section>

        {isProfessionalSite ? (
           <section id="about-pro" className="w-full py-20 lg:py-24 bg-secondary border-y">
                <div className="container px-4 md:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 items-center">
                        <div className="md:col-span-1 animate-fade-in text-center md:text-left">
                            {config.professionalProfileSection.imageUrl && (
                                <Image
                                    src={config.professionalProfileSection.imageUrl}
                                    alt={config.professionalProfileSection.title}
                                    width={400}
                                    height={400}
                                    className="object-cover rounded-3xl aspect-square w-full max-w-sm mx-auto"
                                />
                            )}
                        </div>
                        <div className="md:col-span-2 space-y-6 animate-fade-in text-center md:text-left" style={{animationDelay: '150ms'}}>
                                <h2 className="text-3xl font-bold tracking-tighter text-foreground text-balance sm:text-4xl">
                                {config.professionalProfileSection.title}
                            </h2>
                            <p className="text-lg text-muted-foreground whitespace-pre-line">
                                {config.professionalProfileSection.aboutMe}
                            </p>
                            <div className='flex flex-col sm:flex-row gap-4 sm:gap-8 pt-4 justify-center md:justify-start'>
                                {config.professionalProfileSection.location && (
                                    <div className='flex items-center gap-3'>
                                        <MapPin className='h-5 w-5 text-primary'/>
                                        <span className='font-medium text-foreground'>{config.professionalProfileSection.location}</span>
                                    </div>
                                )}
                                {config.professionalProfileSection.hours && (
                                    <div className='flex items-center gap-3'>
                                        <Clock className='h-5 w-5 text-primary'/>
                                        <span className='font-medium text-foreground'>{config.professionalProfileSection.hours}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        ) : (
            <section id="platform" className="w-full py-20 lg:py-24 bg-secondary border-y">
                <div className="container px-4 md:px-6">
                    <div className="grid gap-10 lg:grid-cols-2 items-center">
                        <div className="space-y-4 animate-fade-in text-center lg:text-left">
                            <h2 className="text-3xl font-bold tracking-tighter text-foreground text-balance sm:text-4xl"
                                dangerouslySetInnerHTML={{ __html: config.ctaSection.title }}
                            ></h2>
                            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mx-auto lg:mx-0">
                            {config.ctaSection.subtitle}
                            </p>
                            <div className='flex justify-center lg:justify-start'>
                                <Button asChild size="lg" disabled>
                                    <Link href="#">
                                        {config.ctaSection.cta} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                            {config.ctaSection.imageUrl && (
                                <Image
                                    src={config.ctaSection.imageUrl}
                                    alt="Dashboard"
                                    width={1200}
                                    height={800}
                                    className="mx-auto aspect-[3/2] overflow-hidden rounded-xl object-cover"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>
        )}
        
        {/* Features Section - For Everyone now */}
        <section id="features" className="w-full py-20 lg:py-24 bg-background">
            <div className="container px-4 md:px-6">
                <div className="mb-12 md:mb-16 text-center animate-fade-in">
                <h2
                    className="text-3xl font-bold tracking-tighter text-foreground text-balance sm:text-4xl md:text-5xl"
                    dangerouslySetInnerHTML={{ __html: config.featuresSection.title }}
                />
                <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground md:text-xl">
                    {config.featuresSection.subtitle}
                </p>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                {config.featuresSection.features.map((item, index) => (
                    <Card key={item.title} className="flex flex-col items-center p-6 text-center animate-fade-in shadow-lg hover:shadow-primary/20 hover:-translate-y-2 transition-all duration-300 border-primary/10" style={{ animationDelay: `${100 * index}ms` }}>
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <DynamicIcon name={item.icon} />
                    </div>
                    <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
                    <CardContent className="mt-2 p-0 text-muted-foreground">
                        <p>{item.description}</p>
                    </CardContent>
                    </Card>
                ))}
                </div>
            </div>
        </section>
        
        {/* Testimonials */}
        <section id="testimonials" className="flex flex-col items-center justify-center w-full py-20 lg:py-24 bg-secondary border-y">
            <div className="container px-4 md:px-6">
                <div className="mb-12 md:mb-16 text-center relative">
                     <h2 className="text-6xl sm:text-8xl font-black text-gray-200/50 dark:text-gray-800/50 absolute inset-x-0 -top-4 w-full text-center select-none -z-10 opacity-50">
                       RESULTADOS
                    </h2>
                     <h3 className="text-3xl font-bold tracking-tighter text-foreground text-balance sm:text-4xl md:text-5xl relative">
                       {config.testimonialsSection.title}
                    </h3>
                </div>
                <Carousel opts={{ align: 'start', loop: true }} className="w-full">
                    <CarouselContent className="-ml-4">
                    {config.testimonialsSection.testimonials.map((testimonial, index) => {
                        return (
                        <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                           <div className="p-1 h-full">
                                <Card className="shadow-lg rounded-2xl flex flex-col h-full bg-background">
                                    <CardContent className="p-6 flex flex-col flex-grow">
                                      <div className="flex-grow">
                                        <blockquote className="text-base text-muted-foreground mb-6">"{testimonial.quote}"</blockquote>
                                      </div>
                                      <div className='flex items-center gap-4 mt-auto'>
                                            <Avatar className="h-12 w-12 border-2 border-primary">
                                                {testimonial.imageUrl && <AvatarImage src={testimonial.imageUrl} alt={testimonial.name} />}
                                                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                          <p className="font-bold text-foreground">{testimonial.name}</p>
                                      </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CarouselItem>
                        );
                    })}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:inline-flex" />
                    <CarouselNext className="hidden sm:inline-flex" />
                </Carousel>
            </div>
        </section>
        
        {/* Final CTA */}
        <section className="w-full py-20 lg:py-24 bg-background">
          <div className="container text-center animate-fade-in px-4 md:px-6">
              <div className="max-w-2xl mx-auto space-y-6">
                  <h2 className="text-3xl font-bold tracking-tighter text-balance sm:text-4xl md:text-5xl"
                    dangerouslySetInnerHTML={{ __html: config.finalCtaSection.title }}
                  >
                  </h2>
                  <p className="text-lg text-muted-foreground md:text-xl">
                      {config.finalCtaSection.subtitle}
                  </p>
                  <div className='flex justify-center'>
                    <Button asChild size="lg" className="h-14 px-12 text-lg transition-transform duration-300 transform rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105">
                        <Link href="/register">
                            {config.finalCtaSection.cta}
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                  </div>
              </div>
          </div>
        </section>

      </main>
      <Footer siteConfig={config} />
    </div>
  );
}
