import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
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
            setTimeout(() => navigate('/login', { replace: true }), 900);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Registration failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 px-6 py-8">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="mb-4 text-2xl font-semibold text-slate-900">Create Account</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                        />
                    </div>

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

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
                        <input
                            type="password"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            value={passwordConfirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading ? 'Creating account...' : 'Register'}
                    </button>
                </form>

                {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
                {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}

                <p className="mt-4 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-700 underline">Login</Link>
                </p>
            </section>
        </main>
    );
}
