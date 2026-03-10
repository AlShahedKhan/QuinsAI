import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserLandingPath, useAuth } from '../../auth/AuthContext';
import { AuthShell } from '../../components/ui/AuthShell';
import { AuthTextField } from '../../components/ui/AuthTextField';
import { FormNotice } from '../../components/ui/FormNotice';

function AuthTabs() {
    return (
        <nav className="auth-tabs" aria-label="Authentication tabs">
            <Link to="/login" className="auth-tab auth-tab-active">
                Login
            </Link>
            <Link to="/register" className="auth-tab">
                Sign Up
            </Link>
        </nav>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = useMemo(
        () => !loading && email.trim() !== '' && password !== '',
        [email, loading, password],
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const user = await login({ email, password });
            navigate(getUserLandingPath(user), { replace: true });
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Login failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            title="Welcome to QuinsAI"
            subtitle="Connect with your team and launch avatar workflows in real-time."
            eyebrow="User Access"
            tabs={<AuthTabs />}
            footer={(
                <p>
                    Need admin access? Go directly to <Link to="/admin/login" className="font-semibold text-sky-700 hover:text-sky-800">/admin/login</Link>
                </p>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <AuthTextField
                    id="login-email"
                    label="Email"
                    type="email"
                    value={email}
                    placeholder="Enter your email"
                    autoComplete="email"
                    icon="mail"
                    onChange={setEmail}
                />

                <AuthTextField
                    id="login-password"
                    label="Password"
                    type="password"
                    value={password}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    icon="lock"
                    onChange={setPassword}
                />

                <div className="flex justify-end">
                    <Link to="/forgot-password" className="font-semibold text-sky-700 hover:text-sky-800">
                        Forgot password?
                    </Link>
                </div>

                <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {error ? <FormNotice tone="error">{error}</FormNotice> : null}
            </form>
        </AuthShell>
    );
}
