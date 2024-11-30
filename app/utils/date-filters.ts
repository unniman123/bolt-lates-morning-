export function timeOnly(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dateOnly(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString();
}

export function formatDateTime(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    return `${dateOnly(value)} ${timeOnly(value)}`;
}