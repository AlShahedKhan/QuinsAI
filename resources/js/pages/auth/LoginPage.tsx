import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAdminLandingPath, useAuth } from '../../auth/AuthContext';
import { AuthPanel } from '../../components/ui/AuthPanel';
import { AuthTextField } from '../../components/ui/AuthTextField';
import { FormNotice } from '../../components/ui/FormNotice';

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const user = await login({ email, password });
            navigate(getAdminLandingPath(user) ?? '/videos/generate', { replace: true });
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Login failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthPanel mode="login">
            <form onSubmit={handleSubmit} className="chat-auth-form">
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

                <div className="chat-auth-link-row">
                    <div className="flex items-center gap-4">
                        <Link to="/forgot-password" className="chat-auth-link">Forgot password?</Link>
                        <Link to="/admin/login" className="chat-auth-link">Admin login</Link>
                    </div>
                </div>

                <button type="submit" disabled={loading} className="chat-auth-submit">
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {error && <FormNotice tone="error">{error}</FormNotice>}
            </form>
        </AuthPanel>
    );
}
