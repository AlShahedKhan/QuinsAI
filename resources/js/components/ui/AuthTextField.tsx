import type { ChangeEvent } from 'react';

type IconName = 'mail' | 'lock' | 'user';

type Props = {
    id: string;
    label: string;
    type: string;
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
                <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.7"/>
                <path d="m5 7 7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        );
    }

    if (icon === 'user') {
        return (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M6.5 18.25a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10V8a5 5 0 1 1 10 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/>
        </svg>
    );
}

export function AuthTextField({ id, label, type, value, placeholder, autoComplete, icon, onChange }: Props) {
    return (
        <div className="chat-auth-field">
            <label className="chat-auth-label" htmlFor={id}>{label}</label>

            <div className="chat-auth-input-wrap">
                <span className="chat-auth-input-icon" aria-hidden="true">
                    <FieldIcon icon={icon} />
                </span>

                <input
                    id={id}
                    type={type}
                    className="chat-auth-input"
                    value={value}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
                    required
                />
            </div>
        </div>
    );
}
