
import React, { useState, useEffect } from 'react';
import { X, Mail, Check } from 'lucide-react';
import { useNewsletter } from '../contexts/NewsletterContext';

export const NewsletterPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const { addSubscriber } = useNewsletter();

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('lm_newsletter_dismissed');
    if (dismissed) return;

    // Show after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('lm_newsletter_dismissed', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    const success = await addSubscriber(email);
    
    if (success) {
      setStatus('success');
      setTimeout(() => {
        handleDismiss();
      }, 3000);
    } else {
      setStatus('idle'); // Or error state if duplicated
      alert("You're already on the list!");
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="relative bg-[#F9F7F2] w-full max-w-3xl h-auto md:h-[500px] rounded-sm shadow-2xl flex flex-col md:flex-row overflow-hidden border border-earth/5">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 text-earth/40 hover:text-earth transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Image Side */}
        <div className="w-full md:w-1/2 h-48 md:h-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-10"></div>
          <img 
            src="/images/brand/mae-collective-home.png" 
            alt="LouieMae — Curated living, designed with intention" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-6 left-6 z-20 text-white">
             <p className="font-serif italic text-2xl">"Where home meets heritage."</p>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center text-center md:text-left relative">
           {status === 'success' ? (
             <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
                <div className="w-16 h-16 rounded-full bg-earth text-cream flex items-center justify-center mb-6">
                   <Check className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-3xl text-earth mb-2">You're In.</h3>
                <p className="font-sans text-earth/60 text-sm">Welcome to the collective — check your inbox for something special.</p>
             </div>
           ) : (
             <>
               <span className="text-bronze text-xs uppercase tracking-[0.3em] mb-4 block">The Mae Letter</span>
               <h2 className="font-serif text-4xl md:text-5xl text-earth mb-4 leading-tight">
                 Be First to Know
               </h2>
               <p className="font-sans text-earth/70 text-sm leading-relaxed mb-8">
                 New drops, restocks, and behind-the-scenes stories — delivered before anyone else sees them. No spam, just thoughtfully curated finds for your home and closet.
               </p>

               <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="relative">
                   <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/30" />
                   <input 
                     type="email" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="Your email address" 
                     className="w-full bg-transparent border-b border-earth/20 py-3 pl-8 text-earth placeholder:text-earth/30 focus:outline-none focus:border-bronze transition-colors font-sans"
                     required
                   />
                 </div>
                 <button 
                   type="submit" 
                   disabled={status === 'loading'}
                   className="w-full bg-earth text-cream px-8 py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors disabled:opacity-70 mt-4"
                 >
                   {status === 'loading' ? 'Joining...' : 'Join the List'}
                 </button>
               </form>
               <p className="text-[9px] text-earth/30 mt-6 text-center md:text-left">
                 By signing up, you agree to our Privacy Policy. Unsubscribe anytime.
               </p>
             </>
           )}
        </div>
      </div>
    </div>
  );
};
