import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isEmailVerified, useAuth } from '../../auth/AuthContext';
import { AuthShell } from '../../components/ui/AuthShell';
import { FormNotice } from '../../components/ui/FormNotice';
import { SessionLoadingScreen } from '../../components/ui/SessionLoadingScreen';

export function VerifyEmailPage() {
    const { state, resendVerification, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (state.status === 'loading') {
        return <SessionLoadingScreen />;
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
        <AuthShell
            title="Verify Your Email"
            subtitle={`Your account (${state.user.email}) is logged in. Complete email verification to unlock gated features.`}
            eyebrow="Verification Required"
            footer={(
                <p>
                    Already verified? <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">Sign in again</Link>
                </p>
            )}
        >
            <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                            void handleResend();
                        }}
                        className="btn-primary"
                    >
                        {loading ? 'Sending...' : 'Resend Verification'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            void handleLogout();
                        }}
                        className="btn-secondary"
                    >
                        Logout
                    </button>
                </div>

                {message && <FormNotice tone="success">{message}</FormNotice>}
                {error && <FormNotice tone="error">{error}</FormNotice>}
            </div>
        </AuthShell>
    );
}
