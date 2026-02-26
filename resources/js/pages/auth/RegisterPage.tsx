import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AuthPanel } from '../../components/ui/AuthPanel';
import { AuthTextField } from '../../components/ui/AuthTextField';
import { FormNotice } from '../../components/ui/FormNotice';

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
            setTimeout(() => navigate('/login', { replace: true }), 1000);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Registration failed.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthPanel mode="register">
            <form onSubmit={handleSubmit} className="chat-auth-form">
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

                <button type="submit" disabled={loading} className="chat-auth-submit">
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>

                {message && <FormNotice tone="success">{message}</FormNotice>}
                {error && <FormNotice tone="error">{error}</FormNotice>}
            </form>
        </AuthPanel>
    );
}
