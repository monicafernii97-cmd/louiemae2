
import React from 'react';
import { FadeIn } from './FadeIn';
import { useSite } from '../contexts/BlogContext';
import { DynamicSectionRenderer } from './DynamicPage';

export const StoryPage: React.FC = () => {
   const { siteContent } = useSite();
   const { story } = siteContent;

   return (
      <div className="bg-cream min-h-screen w-full overflow-hidden pt-32 pb-32">
         {/* Hero Section */}
         <section className="px-6 md:px-12 mb-20 md:mb-32">
            <div className="container mx-auto max-w-5xl">
               <FadeIn className="text-center mb-12 md:mb-20">
                  <span className="text-bronze text-xs md:text-sm font-sans uppercase tracking-[0.4em] block mb-6 opacity-80">The Origins</span>
                  {/* Title on one line */}
                  <h1 className="font-serif text-3xl md:text-6xl lg:text-7xl text-earth leading-none tracking-tight whitespace-nowrap">
                     {story.hero.title} <span className="italic font-light opacity-90">{story.hero.subtitle}</span>
                  </h1>
               </FadeIn>

               <FadeIn delay={200} className="relative w-full aspect-[3/4] md:aspect-[4/3] overflow-hidden rounded-sm mb-16 shadow-sm mx-auto max-w-3xl">
                  <div className="absolute inset-0 bg-black/5 z-10"></div>
                  <img
                     src={story.hero.image}
                     alt="Our Journey"
                     className="w-full h-full object-cover object-center grayscale-[20%] scale-105 hover:scale-100 transition-transform duration-[3s] ease-out"
                  />
               </FadeIn>
            </div>
         </section>

         {/* Narrative Container */}
         <div className="container mx-auto px-6 md:px-12 max-w-3xl relative">

            {/* Prologue */}
            <FadeIn className="mb-24 md:mb-32 text-center relative z-10 bg-cream">
               <p className="font-serif text-2xl md:text-4xl lg:text-5xl text-earth leading-tight italic mb-8 mx-auto">
                  {story.prologue.quote}
               </p>
               <p className="font-sans text-earth/70 text-[10px] md:text-xs leading-loose tracking-[0.25em] uppercase mx-auto">
                  {story.prologue.subtext}
               </p>
            </FadeIn>

            {/* Chapters Container */}
            <div className="space-y-24 md:space-y-36">

               {/* Chapter 1 */}
               <FadeIn delay={100} className="relative z-10">
                  <div className="text-center mb-10">
                     <span className="text-bronze font-serif italic text-xl mb-3 block">Chapter I</span>
                     <h2 className="font-serif text-3xl md:text-5xl text-earth mb-6">{story.chapters.oneTitle}</h2>
                  </div>

                  <div className="font-sans text-earth/80 text-base leading-[2.2] space-y-8 max-w-2xl mx-auto text-center">
                     <p>{story.chapters.oneText}</p>
                  </div>
               </FadeIn>

               {/* Chapter 2 */}
               <FadeIn delay={200} className="relative z-10">
                  <div className="text-center mb-10">
                     <span className="text-bronze font-serif italic text-xl mb-3 block">Chapter II</span>
                     <h2 className="font-serif text-3xl md:text-5xl text-earth mb-6">{story.chapters.twoTitle}</h2>
                  </div>

                  <div className="font-sans text-earth/80 text-base leading-[2.2] space-y-8 max-w-2xl mx-auto text-center">
                     <p>{story.chapters.twoText}</p>
                  </div>
               </FadeIn>

               {/* Chapter 3 */}
               <FadeIn delay={300} className="relative z-10">
                  <div className="text-center mb-10">
                     <span className="text-bronze font-serif italic text-xl mb-3 block">Chapter III</span>
                     <h2 className="font-serif text-3xl md:text-5xl text-earth mb-6">{story.chapters.threeTitle}</h2>
                  </div>

                  <div className="font-sans text-earth/80 text-base leading-[2.2] space-y-8 max-w-2xl mx-auto text-center">
                     <p>{story.chapters.threeText}</p>
                  </div>
               </FadeIn>

               {/* Chapter 4 */}
               <FadeIn delay={400} className="relative z-10">
                  <div className="text-center mb-10">
                     <span className="text-bronze font-serif italic text-xl mb-3 block">Chapter IV</span>
                     <h2 className="font-serif text-3xl md:text-5xl text-earth mb-6">{story.chapters.fourTitle}</h2>
                  </div>

                  <div className="font-sans text-earth/80 text-base leading-[2.2] space-y-8 max-w-2xl mx-auto text-center">
                     <p>{story.chapters.fourText}</p>
                  </div>

                  {/* Manifesto Box */}
                  <div className="my-20 p-10 md:p-14 bg-earth text-cream text-center rounded-sm relative shadow-xl max-w-2xl mx-auto">
                     <div className="absolute top-3 left-3 right-3 bottom-3 border border-white/10"></div>
                     <p className="font-serif text-3xl md:text-4xl italic mb-6 leading-tight">
                        "We're more than a brand—<br />we're a story."
                     </p>
                     <p className="font-sans text-xs md:text-sm opacity-80 max-w-md mx-auto leading-loose tracking-wider mb-6">
                        WHETHER YOU'RE SHOPPING FOR YOUR HOME, YOUR LITTLES, OR SOMETHING THAT INSPIRES YOUR EVERYDAY—WE PRAY YOU FEEL THE HEART BEHIND EVERY DETAIL.
                     </p>
                     <p className="font-serif italic text-lg opacity-90 text-bronze">
                        It's our joy to serve you, inspire you, and walk this creative path together.
                     </p>
                  </div>
               </FadeIn>

               {/* Sign off */}
               <FadeIn delay={500} className="mt-16 pt-12 flex flex-col items-center text-center gap-6 relative z-10">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-bronze">With deep gratitude</p>
                  <div className="flex flex-col items-center">
                     <h3 className="font-serif text-3xl md:text-4xl font-medium text-earth mb-2 tracking-tight">Monica Alexandra Estimon</h3>
                     <p className="text-[10px] uppercase tracking-[0.3em] text-earth/60">Founder, Louie Mae</p>
                  </div>
                  <div className="w-px h-12 bg-bronze/30 mt-2"></div>
                  <p className="font-serif italic text-lg text-earth/50">Est. 2021</p>
               </FadeIn>

            </div>
         </div>

         {/* DYNAMIC SECTIONS */}
         {story.sections && story.sections.length > 0 && (
            <div className="pb-24">
               {story.sections.map((section, idx) => (
                  <DynamicSectionRenderer key={section.id} section={section} index={idx} />
               ))}
            </div>
         )}
      </div>
   );
};
