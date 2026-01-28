/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CONVEX_URL: string
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string
    readonly VITE_ADMIN_PASSWORD?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
