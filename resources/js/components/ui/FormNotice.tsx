import type { ReactNode } from 'react';

type Props = {
    tone: 'success' | 'error' | 'info';
    children: ReactNode;
};

const toneClass: Record<Props['tone'], string> = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
};

export function FormNotice({ tone, children }: Props) {
    return <p className={`alert ${toneClass[tone]}`}>{children}</p>;
}
