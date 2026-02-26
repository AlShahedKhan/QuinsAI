import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isEmailVerified, useAuth } from '../../auth/AuthContext';

export function VerifyEmailPage() {
    const { state, resendVerification, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (state.status === 'loading') {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
                Checking your session...
            </main>
        );
    }

    if (state.status !== 'authenticated' || state.user === null) {
        return <Navigate to="/login" replace />;
    }

    if (isEmailVerified(state.user)) {
        return <Navigate to="/videos/generate" replace />;
    }

    async function handleResend() {
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await resendVerification();
            setMessage(response);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Unable to send verification email.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await logout();
    }

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 px-6 py-8">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="mb-2 text-2xl font-semibold text-slate-900">Verify Email</h1>
                <p className="text-sm text-slate-700">
                    Your account ({state.user.email}) is logged in but not verified. Verify your email before accessing HeyGen features.
                </p>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                            void handleResend();
                        }}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            void handleLogout();
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                        Logout
                    </button>
                </div>

                {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
                {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}

                <p className="mt-4 text-sm">
                    Already verified? <Link to="/login" className="text-blue-700 underline">Sign in again</Link>
                </p>
            </section>
        </main>
    );
}
