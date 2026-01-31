
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
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

// Initial Mock Data for seeding
const INITIAL_SUBSCRIBERS = [
  { email: 'sarah@example.com', firstName: 'Sarah', dateSubscribed: '2023-10-15', status: 'active' as const, tags: ['vip'], openRate: 85 },
  { email: 'mike@design.co', firstName: 'Mike', dateSubscribed: '2023-11-02', status: 'active' as const, tags: ['welcome-series'], openRate: 45 },
  { email: 'jessica@home.com', firstName: 'Jessica', dateSubscribed: '2023-12-10', status: 'unsubscribed' as const, tags: [], openRate: 10 },
  { email: 'hello@louiemae.com', firstName: 'Admin', dateSubscribed: '2021-01-01', status: 'active' as const, tags: ['admin'], openRate: 100 },
];

const INITIAL_CAMPAIGNS = [
  {
    subject: 'A Story of Slow Living',
    previewText: 'Discover the art of rest.',
    content: '<p>Dear Friend,</p><p>Rest is not idleness...</p>',
    status: 'sent' as const,
    sentDate: '2023-12-01',
    type: 'newsletter' as const,
    stats: { sent: 1250, opened: 850, clicked: 320 }
  },
  {
    subject: 'New Arrivals: The Linen Collection',
    previewText: 'Soft, breathable, timeless.',
    content: '<p>Introducing our newest texture...</p>',
    status: 'sent' as const,
    sentDate: '2024-01-15',
    type: 'promotion' as const,
    stats: { sent: 1340, opened: 600, clicked: 150 }
  },
];

export const NewsletterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Convex Queries ---
  const convexSubscribers = useQuery(api.subscribers.list);
  const convexCampaigns = useQuery(api.campaigns.list);

  // --- Convex Mutations ---
  const createSubscriber = useMutation(api.subscribers.create);
  const removeSubscriber = useMutation(api.subscribers.remove);
  const seedSubscribers = useMutation(api.subscribers.seed);

  const createCampaignMutation = useMutation(api.campaigns.create);
  const updateCampaignMutation = useMutation(api.campaigns.update);
  const sendCampaignMutation = useMutation(api.campaigns.send);
  const removeCampaign = useMutation(api.campaigns.remove);
  const seedCampaigns = useMutation(api.campaigns.seed);

  // --- Seed initial data if Convex is empty ---
  useEffect(() => {
    if (convexSubscribers !== undefined && convexSubscribers.length === 0) {
      seedSubscribers({ subscribers: INITIAL_SUBSCRIBERS });
    }
  }, [convexSubscribers, seedSubscribers]);

  useEffect(() => {
    if (convexCampaigns !== undefined && convexCampaigns.length === 0) {
      seedCampaigns({ campaigns: INITIAL_CAMPAIGNS });
    }
  }, [convexCampaigns, seedCampaigns]);

  // --- Transform Convex data to match existing types ---
  const subscribers: Subscriber[] = (convexSubscribers ?? []).map(s => ({
    ...s,
    id: s._id,
  }));

  const campaigns: EmailCampaign[] = (convexCampaigns ?? []).map(c => ({
    ...c,
    id: c._id,
  }));

  // --- Actions ---
  const addSubscriber = async (email: string, firstName?: string): Promise<boolean> => {
    const result = await createSubscriber({ email, firstName });
    if (result === null) return false; // Already exists
    return true;
  };

  const deleteSubscriber = (id: string) => {
    removeSubscriber({ id: id as Id<"subscribers"> });
  };

  const createCampaign = (campaignData: Omit<EmailCampaign, 'id' | 'stats' | 'status'>) => {
    createCampaignMutation(campaignData);
  };

  const updateCampaign = (id: string, updates: Partial<EmailCampaign>) => {
    const { id: _, ...rest } = updates as any;
    updateCampaignMutation({ id: id as Id<"campaigns">, ...rest });
  };

  const sendCampaign = async (id: string) => {
    await sendCampaignMutation({ id: id as Id<"campaigns"> });
  };

  const deleteCampaign = (id: string) => {
    removeCampaign({ id: id as Id<"campaigns"> });
  };

  // --- Derived Stats ---
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
