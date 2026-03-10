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
                    <span className="auth-brand-text">AI</span>
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
