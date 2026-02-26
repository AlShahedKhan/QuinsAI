import type { ReactNode } from 'react';

type Props = {
    title: string;
    subtitle: string;
    eyebrow?: string;
    children: ReactNode;
    footer?: ReactNode;
};

export function AuthShell({ title, subtitle, eyebrow = 'QuinsAI Console', children, footer }: Props) {
    return (
        <main className="auth-layout">
            <div className="mesh-orb mesh-orb-one" />
            <div className="mesh-orb mesh-orb-two" />
            <div className="mesh-orb mesh-orb-three" />

            <section className="relative z-10 mx-auto grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/80 shadow-[0_45px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur lg:grid-cols-[1fr_1.15fr]">
                <aside className="hidden lg:flex flex-col justify-between gap-12 bg-[linear-gradient(145deg,#0f172a_0%,#0f766e_58%,#0c4a6e_100%)] px-10 py-11 text-white">
                    <div className="space-y-4">
                        <p className="inline-flex rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                            Build Faster
                        </p>
                        <h2 className="text-3xl leading-tight">Launch production-grade avatar workflows without exposing provider keys.</h2>
                        <p className="max-w-md text-sm text-teal-50/90">
                            Secure auth, queue-driven rendering, and live session orchestration in one workspace.
                        </p>
                    </div>

                    <div className="space-y-3 text-sm text-teal-50/90">
                        <p className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Token-based API access with guarded routes.</p>
                        <p className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Webhook-first async processing with fallback polling.</p>
                        <p className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Unified dashboard for generation and live streaming.</p>
                    </div>
                </aside>

                <div className="px-6 py-8 sm:px-10 sm:py-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{eyebrow}</p>
                    <h1 className="mt-3 text-3xl text-slate-900 sm:text-4xl">{title}</h1>
                    <p className="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">{subtitle}</p>

                    <div className="mt-8">{children}</div>

                    {footer && <div className="mt-6 text-sm text-slate-600">{footer}</div>}
                </div>
            </section>
        </main>
    );
}
