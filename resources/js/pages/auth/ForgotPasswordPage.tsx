import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function ForgotPasswordPage() {
    const { forgotPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await forgotPassword(email);
            setMessage(response);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Unable to request password reset.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 px-6 py-8">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="mb-4 text-2xl font-semibold text-slate-900">Forgot Password</h1>

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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Send Reset Link'}
                    </button>
                </form>

                {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
                {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}

                <p className="mt-4 text-sm">
                    Back to <Link to="/login" className="text-blue-700 underline">login</Link>
                </p>
            </section>
        </main>
    );
}
