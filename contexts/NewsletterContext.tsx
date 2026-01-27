
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Subscriber, EmailCampaign } from '../types';

interface NewsletterContextType {
  subscribers: Subscriber[];
  campaigns: EmailCampaign[];
  addSubscriber: (email: string, firstName?: string) => Promise<boolean>;
  deleteSubscriber: (id: string) => void;
  createCampaign: (campaign: Omit<EmailCampaign, 'id' | 'stats' | 'status'>) => void;
  updateCampaign: (id: string, updates: Partial<EmailCampaign>) => void;
  sendCampaign: (id: string) => Promise<void>;
  deleteCampaign: (id: string) => void;
  stats: {
    totalSubscribers: number;
    avgOpenRate: number;
    totalEmailsSent: number;
  };
}

const NewsletterContext = createContext<NewsletterContextType | undefined>(undefined);

// Initial Mock Data
const INITIAL_SUBSCRIBERS: Subscriber[] = [
  { id: '1', email: 'sarah@example.com', firstName: 'Sarah', dateSubscribed: '2023-10-15', status: 'active', tags: ['vip'], openRate: 85 },
  { id: '2', email: 'mike@design.co', firstName: 'Mike', dateSubscribed: '2023-11-02', status: 'active', tags: ['welcome-series'], openRate: 45 },
  { id: '3', email: 'jessica@home.com', firstName: 'Jessica', dateSubscribed: '2023-12-10', status: 'unsubscribed', tags: [], openRate: 10 },
  { id: '4', email: 'hello@louiemae.com', firstName: 'Admin', dateSubscribed: '2021-01-01', status: 'active', tags: ['admin'], openRate: 100 },
];

const INITIAL_CAMPAIGNS: EmailCampaign[] = [
  { 
    id: '1', 
    subject: 'A Story of Slow Living', 
    previewText: 'Discover the art of rest.', 
    content: '<p>Dear Friend,</p><p>Rest is not idleness...</p>', 
    status: 'sent', 
    sentDate: '2023-12-01', 
    type: 'newsletter',
    stats: { sent: 1250, opened: 850, clicked: 320 }
  },
  { 
    id: '2', 
    subject: 'New Arrivals: The Linen Collection', 
    previewText: 'Soft, breathable, timeless.', 
    content: '<p>Introducing our newest texture...</p>', 
    status: 'sent', 
    sentDate: '2024-01-15', 
    type: 'promotion',
    stats: { sent: 1340, opened: 600, clicked: 150 }
  },
];

export const NewsletterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    const saved = localStorage.getItem('lm_subscribers');
    return saved ? JSON.parse(saved) : INITIAL_SUBSCRIBERS;
  });

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(() => {
    const saved = localStorage.getItem('lm_campaigns');
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  useEffect(() => {
    localStorage.setItem('lm_subscribers', JSON.stringify(subscribers));
  }, [subscribers]);

  useEffect(() => {
    localStorage.setItem('lm_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  // Actions
  const addSubscriber = async (email: string, firstName?: string): Promise<boolean> => {
    // Check duplicates
    if (subscribers.some(s => s.email === email)) return false;

    const newSub: Subscriber = {
      id: Date.now().toString(),
      email,
      firstName,
      dateSubscribed: new Date().toISOString().split('T')[0],
      status: 'active',
      tags: ['new'],
      openRate: 0
    };

    setSubscribers(prev => [newSub, ...prev]);
    
    // Simulate Welcome Automation
    setTimeout(() => {
        // In a real app, this would trigger an API call to SendGrid/Resend
        console.log(`[Automation] Sending Welcome Email to ${email}`);
    }, 2000);

    return true;
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
  };

  const createCampaign = (campaignData: Omit<EmailCampaign, 'id' | 'stats' | 'status'>) => {
    const newCampaign: EmailCampaign = {
      ...campaignData,
      id: Date.now().toString(),
      status: 'draft',
      stats: { sent: 0, opened: 0, clicked: 0 }
    };
    setCampaigns(prev => [newCampaign, ...prev]);
  };

  const updateCampaign = (id: string, updates: Partial<EmailCampaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const sendCampaign = async (id: string) => {
    // Mock sending process
    updateCampaign(id, { status: 'sent', sentDate: new Date().toISOString().split('T')[0] });
    
    // Simulate updating stats later
    setTimeout(() => {
        updateCampaign(id, { 
            stats: { 
                sent: subscribers.filter(s => s.status === 'active').length, 
                opened: 0, 
                clicked: 0 
            } 
        });
    }, 1000);
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  // Derived Stats
  const stats = {
    totalSubscribers: subscribers.length,
    avgOpenRate: Math.round(subscribers.reduce((acc, curr) => acc + curr.openRate, 0) / (subscribers.length || 1)),
    totalEmailsSent: campaigns.reduce((acc, curr) => acc + curr.stats.sent, 0)
  };

  return (
    <NewsletterContext.Provider value={{
      subscribers,
      campaigns,
      addSubscriber,
      deleteSubscriber,
      createCampaign,
      updateCampaign,
      sendCampaign,
      deleteCampaign,
      stats
    }}>
      {children}
    </NewsletterContext.Provider>
  );
};

export const useNewsletter = () => {
  const context = useContext(NewsletterContext);
  if (context === undefined) {
    throw new Error('useNewsletter must be used within a NewsletterProvider');
  }
  return context;
};
