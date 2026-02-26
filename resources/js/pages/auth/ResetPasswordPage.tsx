import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AuthShell } from '../../components/ui/AuthShell';
import { FormNotice } from '../../components/ui/FormNotice';

export function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token) {
            setError('Reset token is missing.');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await resetPassword({
                token,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            setMessage(response);
            setTimeout(() => navigate('/login', { replace: true }), 1000);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Unable to reset password.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            title="Set a New Password"
            subtitle="Choose a strong password to secure your account and continue where you left off."
            eyebrow="Password Reset"
            footer={(
                <p>
                    Back to <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">login</Link>
                </p>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="field-label" htmlFor="reset-email">Email</label>
                    <input
                        id="reset-email"
                        type="email"
                        className="text-field"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className="field-label" htmlFor="reset-password">New Password</label>
                        <input
                            id="reset-password"
                            type="password"
                            className="text-field"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <div>
                        <label className="field-label" htmlFor="reset-password-confirmation">Confirm Password</label>
                        <input
                            id="reset-password-confirmation"
                            type="password"
                            className="text-field"
                            value={passwordConfirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Saving...' : 'Save New Password'}
                </button>

                {message && <FormNotice tone="success">{message}</FormNotice>}
                {error && <FormNotice tone="error">{error}</FormNotice>}
            </form>
        </AuthShell>
    );
}
