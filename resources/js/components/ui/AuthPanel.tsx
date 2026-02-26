import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = {
    mode: 'login' | 'register';
    children: ReactNode;
};

export function AuthPanel({ mode, children }: Props) {
    return (
        <main className="chat-auth-page">
            <section className="chat-auth-card page-enter" aria-label="Authentication panel">
                <div className="chat-auth-logo" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.875 4C7.526 4 4 7.054 4 10.821c0 2.067 1.062 3.918 2.74 5.179v3.5a.5.5 0 0 0 .833.372l2.313-2.123a8.65 8.65 0 0 0 1.99.228c4.349 0 7.875-3.054 7.875-6.821S16.224 4 11.875 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>

                <h1 className="chat-auth-title">Welcome to QuinsAI</h1>
                <p className="chat-auth-subtitle">Connect with your team and launch avatar workflows in real-time</p>

                <nav className="chat-auth-tabs" aria-label="Authentication tabs">
                    <Link to="/login" className={`chat-auth-tab ${mode === 'login' ? 'chat-auth-tab-active' : ''}`}>
                        Login
                    </Link>
                    <Link to="/register" className={`chat-auth-tab ${mode === 'register' ? 'chat-auth-tab-active' : ''}`}>
                        Sign Up
                    </Link>
                </nav>

                {children}
            </section>
        </main>
    );
}
