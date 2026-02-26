import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AuthShell } from '../../components/ui/AuthShell';
import { FormNotice } from '../../components/ui/FormNotice';

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
        <AuthShell
            title="Reset Your Password"
            subtitle="Submit your account email and we will send a secure reset link."
            eyebrow="Account Recovery"
            footer={(
                <p>
                    Remembered your password? <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">Back to login</Link>
                </p>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="field-label" htmlFor="forgot-email">Email</label>
                    <input
                        id="forgot-email"
                        type="email"
                        className="text-field"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                    />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Sending link...' : 'Send Reset Link'}
                </button>

                {message && <FormNotice tone="success">{message}</FormNotice>}
                {error && <FormNotice tone="error">{error}</FormNotice>}
            </form>
        </AuthShell>
    );
}
