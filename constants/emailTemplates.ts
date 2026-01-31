export interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail: string; // Tailwind color class or image URL
    baseContent: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'minimalist',
        name: 'The Minimalist',
        description: 'Clean, text-focused layout perfect for updates and letters.',
        thumbnail: 'bg-stone-100',
        baseContent: `
            <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: 0 auto; color: #4a4a4a;">
                <div style="text-align: center; padding: 40px 0;">
                    <h1 style="font-size: 24px; font-weight: normal; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">Louie Mae</h1>
                    <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #8c8c8c;">Curated Living</p>
                </div>
                <div style="padding: 20px; line-height: 1.8; font-size: 16px;">
                    <p>{{introduction}}</p>
                    <p>{{main_content}}</p>
                    <blockquote style="margin: 30px 0; padding-left: 20px; border-left: 2px solid #d6d3d1; font-style: italic; color: #78716c;">
                        "{{quote}}"
                    </blockquote>
                    <p>{{conclusion}}</p>
                </div>
                <div style="text-align: center; padding: 40px 0; border-top: 1px solid #e7e5e4; margin-top: 40px;">
                    <div style="margin-bottom: 20px;">
                        <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #57534e; color: white; text-decoration: none; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">Read More</a>
                    </div>
                    <p style="font-size: 10px; color: #a8a29e;">&copy; 2024 Louie Mae. All rights reserved.</p>
                </div>
            </div>
        `
    },
    {
        id: 'showcase',
        name: 'The Showcase',
        description: 'Image-heavy layout designed for new collection drops.',
        thumbnail: 'bg-stone-200',
        baseContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917;">
                <div style="text-align: center; padding: 30px 0;">
                    <span style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c;">New Collection</span>
                    <h1 style="font-family: serif; font-size: 32px; margin: 10px 0 0; font-weight: normal;">{{collection_title}}</h1>
                </div>
                <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800" alt="Hero Image" style="width: 100%; height: auto; display: block; margin-bottom: 30px;" />
                <div style="padding: 0 20px; text-align: center;">
                    <p style="font-family: serif; font-size: 18px; line-height: 1.6; color: #44403c; margin-bottom: 30px;">
                        {{description}}
                    </p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                        <div>
                            <img src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=400" style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 10px;" />
                            <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">The Coat</p>
                        </div>
                        <div>
                            <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400" style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 10px;" />
                            <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">The Silk Dress</p>
                        </div>
                    </div>
                    <a href="#" style="display: inline-block; padding: 15px 40px; border: 1px solid #1c1917; color: #1c1917; text-decoration: none; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; transition: all 0.2s;">Shop The Collection</a>
                </div>
                <div style="text-align: center; padding: 40px 0; margin-top: 40px; background-color: #fafaf9;">
                    <p style="font-family: serif; font-style: italic; color: #78716c;">"Timeless pieces for the modern woman."</p>
                </div>
            </div>
        `
    },
    {
        id: 'exclusive',
        name: 'The Exclusive',
        description: 'Bold and direct layout for sales and special promotions.',
        thumbnail: 'bg-stone-300',
        baseContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #000; background-color: #fff;">
                <div style="background-color: #1a1a1a; padding: 10px; text-align: center;">
                    <p style="color: #fff; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0;">Limited Time Offer</p>
                </div>
                <div style="padding: 60px 40px; text-align: center; border: 1px solid #e5e5e5; margin: 20px;">
                    <h1 style="font-family: serif; font-size: 64px; font-weight: normal; margin: 0; line-height: 1;">{{discount}}</h1>
                    <h2 style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; margin: 20px 0 40px; color: #404040;">{{sale_title}}</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #525252; margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        {{details}}
                    </p>
                    <a href="#" style="display: inline-block; padding: 16px 48px; background-color: #000; color: #fff; text-decoration: none; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; font-weight: bold;">Shop Access</a>
                </div>
                <div style="text-align: center; padding-bottom: 40px;">
                    <p style="font-size: 10px; color: #a3a3a3; letter-spacing: 0.05em;">Offer valid online only. Exclusions apply.</p>
                </div>
            </div>
        `
    }
];
