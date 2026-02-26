import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isEmailVerified, useAuth } from '../../auth/AuthContext';

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(
        searchParams.get('verified') === '1' ? 'Email verified. You can now sign in.' : null
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const user = await login({ email, password });

            if (!isEmailVerified(user)) {
                navigate('/verify-email', { replace: true });
                return;
            }

            navigate('/videos/generate', { replace: true });
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Login failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 px-6 py-8">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="mb-4 text-2xl font-semibold text-slate-900">Login</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Login'}
                    </button>
                </form>

                {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
                {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}

                <div className="mt-4 flex items-center justify-between text-sm">
                    <Link to="/register" className="text-blue-700 underline">Create account</Link>
                    <Link to="/forgot-password" className="text-blue-700 underline">Forgot password?</Link>
                </div>
            </section>
        </main>
    );
}
