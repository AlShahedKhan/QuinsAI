import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AuthShell } from '../../components/ui/AuthShell';
import { AuthTextField } from '../../components/ui/AuthTextField';
import { FormNotice } from '../../components/ui/FormNotice';

function AuthTabs() {
    return (
        <nav className="auth-tabs" aria-label="Authentication tabs">
            <Link to="/login" className="auth-tab">
                Login
            </Link>
            <Link to="/register" className="auth-tab auth-tab-active">
                Sign Up
            </Link>
        </nav>
    );
}

export function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const canSubmit = useMemo(
        () => !loading
            && name.trim() !== ''
            && email.trim() !== ''
            && password !== ''
            && passwordConfirmation !== '',
        [email, loading, name, password, passwordConfirmation],
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await register({
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            setMessage(response.message);
            setTimeout(() => navigate('/login', { replace: true }), 1000);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Registration failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            title="Welcome to QuinsAI"
            subtitle="Connect with your team and launch avatar workflows in real-time."
            eyebrow="Open Registration"
            tabs={<AuthTabs />}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <AuthTextField
                    id="register-name"
                    label="Full Name"
                    type="text"
                    value={name}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    icon="user"
                    onChange={setName}
                />

                <AuthTextField
                    id="register-email"
                    label="Email"
                    type="email"
                    value={email}
                    placeholder="Enter your email"
                    autoComplete="email"
                    icon="mail"
                    onChange={setEmail}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                    <AuthTextField
                        id="register-password"
                        label="Password"
                        type="password"
                        value={password}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        icon="lock"
                        onChange={setPassword}
                    />

                    <AuthTextField
                        id="register-password-confirmation"
                        label="Confirm Password"
                        type="password"
                        value={passwordConfirmation}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        icon="lock"
                        onChange={setPasswordConfirmation}
                    />
                </div>

                <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>

                {message ? <FormNotice tone="success">{message}</FormNotice> : null}
                {error ? <FormNotice tone="error">{error}</FormNotice> : null}
            </form>
        </AuthShell>
    );
}
