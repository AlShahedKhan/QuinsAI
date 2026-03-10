import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAdminLandingPath, useAuth } from '../../auth/AuthContext';
import { AuthShell } from '../../components/ui/AuthShell';
import { AuthTextField } from '../../components/ui/AuthTextField';
import { FormNotice } from '../../components/ui/FormNotice';

export function AdminLoginPage() {
    const navigate = useNavigate();
    const { loginAdmin } = useAuth();

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
            const user = await loginAdmin({ email, password });
            navigate(getAdminLandingPath(user) ?? '/admin/avatar-catalog', { replace: true });
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Admin login failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            title="Admin Console Access"
            subtitle="Restricted sign-in for administrators and privileged operators only."
            eyebrow="Admin Login"
            footer={(
                <p>
                    Need the user workspace instead? <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">Back to user login</Link>
                </p>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <FormNotice tone="info">Admin access only. Use seeded administrator credentials or a role with admin access.</FormNotice>

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

                <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
                    {loading ? 'Signing in...' : 'Admin Sign In'}
                </button>

                {error ? <FormNotice tone="error">{error}</FormNotice> : null}
            </form>
        </AuthShell>
    );
}
