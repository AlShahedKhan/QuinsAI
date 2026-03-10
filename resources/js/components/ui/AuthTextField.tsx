import { useMemo, useState, type ChangeEvent } from 'react';

type IconName = 'mail' | 'lock' | 'user';

type Props = {
    id: string;
    label: string;
    type: 'text' | 'email' | 'password';
    value: string;
    placeholder: string;
    autoComplete?: string;
    icon: IconName;
    onChange: (value: string) => void;
};

function FieldIcon({ icon }: { icon: IconName }) {
    if (icon === 'mail') {
        return (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="m5 7 7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (icon === 'user') {
        return (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="M6.5 18.25a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10V8a5 5 0 1 1 10 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
    );
}

function PasswordToggleIcon({ visible }: { visible: boolean }) {
    if (visible) {
        return (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3 21 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.86c4.97 0 8.41 4.45 9 5.26a1 1 0 0 1 0 1.16 16.26 16.26 0 0 1-4.21 3.94" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.08 6.09A16.85 16.85 0 0 0 3 10.12a1 1 0 0 0 0 1.16c.59.81 4.03 5.26 9 5.26 1.23 0 2.39-.27 3.45-.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.7" />
        </svg>
    );
}

export function AuthTextField({ id, label, type, value, placeholder, autoComplete, icon, onChange }: Props) {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const inputType = useMemo(() => {
        if (type !== 'password') {
            return type;
        }

        return passwordVisible ? 'text' : 'password';
    }, [passwordVisible, type]);

    return (
        <div className="space-y-2">
            <label className="auth-field-label" htmlFor={id}>{label}</label>

            <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                    <FieldIcon icon={icon} />
                </span>

                <input
                    id={id}
                    type={inputType}
                    className="auth-input"
                    value={value}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
                    required
                />

                {type === 'password' ? (
                    <button
                        type="button"
                        className="auth-input-toggle"
                        onClick={() => setPasswordVisible((current) => !current)}
                        aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    >
                        <PasswordToggleIcon visible={passwordVisible} />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
