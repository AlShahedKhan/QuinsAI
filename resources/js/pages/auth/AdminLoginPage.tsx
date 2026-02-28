import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AuthPanel } from '../../components/ui/AuthPanel';
import { AuthTextField } from '../../components/ui/AuthTextField';
import { FormNotice } from '../../components/ui/FormNotice';

export function AdminLoginPage() {
    const navigate = useNavigate();
    const { loginAdmin } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await loginAdmin({ email, password });
            navigate('/videos/generate', { replace: true });
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Admin login failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthPanel mode="login">
            <form onSubmit={handleSubmit} className="chat-auth-form">
                <FormNotice tone="info">Admin access only. Use seeded administrator credentials.</FormNotice>

                <AuthTextField
                    id="admin-login-email"
                    label="Admin Email"
                    type="email"
                    value={email}
                    placeholder="Enter admin email"
                    autoComplete="email"
                    icon="mail"
                    onChange={setEmail}
                />

                <AuthTextField
                    id="admin-login-password"
                    label="Admin Password"
                    type="password"
                    value={password}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    icon="lock"
                    onChange={setPassword}
                />

                <button type="submit" disabled={loading} className="chat-auth-submit">
                    {loading ? 'Signing in...' : 'Admin Sign In'}
                </button>

                {error && <FormNotice tone="error">{error}</FormNotice>}

                <div className="chat-auth-link-row">
                    <Link to="/login" className="chat-auth-link">Back to user login</Link>
                </div>
            </form>
        </AuthPanel>
    );
}

