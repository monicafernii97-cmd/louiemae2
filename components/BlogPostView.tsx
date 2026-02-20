
import React from 'react';
import { FadeIn } from './FadeIn';
import { useSite } from '../contexts/BlogContext';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

interface BlogPostViewProps {
    postId: string;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ postId }) => {
    const { posts } = useSite();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <FadeIn>
                    <h1 className="font-serif text-4xl text-earth opacity-50">Post not found...</h1>
                    <button
                        onClick={() => { window.location.hash = '#blog'; }}
                        className="mt-6 mx-auto block text-xs uppercase tracking-[0.2em] text-earth/50 hover:text-bronze transition-colors"
                    >
                        ← Back to Blog
                    </button>
                </FadeIn>
            </div>
        );
    }

    // Estimate reading time (roughly 200 words per minute)
    const wordCount = post.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
        <div className="bg-cream min-h-screen pb-20 w-full overflow-hidden">
            {/* Hero Image */}
            {post.image && (
                <div className="w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-cream z-10" />
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* Back Button */}
            <div className="max-w-3xl mx-auto px-6 md:px-8 pt-10">
                <FadeIn>
                    <button
                        onClick={() => { window.location.hash = '#blog'; }}
                        className="group flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-earth/40 hover:text-bronze transition-colors mb-12"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Blog
                    </button>
                </FadeIn>
            </div>

            {/* Post Header */}
            <article className="max-w-3xl mx-auto px-6 md:px-8">
                <FadeIn delay={100}>
                    <div className="text-center mb-12">
                        {/* Category & Meta */}
                        <div className="flex items-center justify-center gap-4 mb-6 text-bronze/80 text-[10px] uppercase tracking-widest font-sans">
                            <span>{post.category}</span>
                            <span className="w-1 h-1 rounded-full bg-bronze/40" />
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {post.date}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-bronze/40" />
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {readingTime} min read
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="font-serif text-4xl md:text-6xl text-earth mb-6 leading-tight">
                            {post.title}
                        </h1>

                        {/* Excerpt */}
                        {post.excerpt && (
                            <p className="font-serif text-earth/60 text-xl italic leading-relaxed max-w-2xl mx-auto">
                                {post.excerpt}
                            </p>
                        )}

                        {/* Decorative divider */}
                        <div className="flex items-center justify-center gap-3 mt-10">
                            <div className="h-px w-16 bg-earth/10" />
                            <div className="w-1.5 h-1.5 rounded-full bg-bronze/30" />
                            <div className="h-px w-16 bg-earth/10" />
                        </div>
                    </div>
                </FadeIn>

                {/* Post Content — rendered as rich HTML */}
                <FadeIn delay={200}>
                    <div
                        className="prose-blog font-serif text-lg text-earth leading-relaxed mb-16"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </FadeIn>

                {/* Footer */}
                <FadeIn delay={300}>
                    <div className="border-t border-earth/10 pt-10 mt-10">
                        <div className="flex flex-col items-center gap-4">
                            <span className="text-[9px] uppercase tracking-[0.3em] text-earth/30">Share this story</span>
                            <div className="flex items-center justify-center gap-6">
                                <button
                                    onClick={() => { window.location.hash = '#blog'; }}
                                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-earth/50 hover:text-bronze transition-colors border-b border-earth/10 pb-1 hover:border-bronze"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    All Stories
                                </button>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </article>
        </div>
    );
};
