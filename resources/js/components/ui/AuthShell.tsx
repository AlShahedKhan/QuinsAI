import type { ReactNode } from 'react';

type Props = {
    title: string;
    subtitle: string;
    eyebrow?: string;
    children: ReactNode;
    footer?: ReactNode;
    tabs?: ReactNode;
};

export function AuthShell({ title, subtitle, eyebrow = 'QuinsAI Console', children, footer, tabs }: Props) {
    return (
        <main className="auth-layout">
            <section className="auth-card page-enter">
                <div className="auth-brand-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.875 4C7.526 4 4 7.054 4 10.821c0 2.067 1.062 3.918 2.74 5.179v3.5a.5.5 0 0 0 .833.372l2.313-2.123a8.65 8.65 0 0 0 1.99.228c4.349 0 7.875-3.054 7.875-6.821S16.224 4 11.875 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{eyebrow}</p>
                    <h1 className="auth-heading">{title}</h1>
                    <p className="auth-subtitle">{subtitle}</p>
                </div>

                {tabs ? <div className="mt-6">{tabs}</div> : null}

                <div className="mt-6">{children}</div>

                {footer ? <div className="mt-5 text-center text-sm text-slate-600">{footer}</div> : null}
            </section>
        </main>
    );
}
