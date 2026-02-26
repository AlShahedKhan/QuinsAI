export function SessionLoadingScreen() {
    return (
        <main className="session-loading">
            <section className="surface-card page-enter w-full max-w-md px-6 py-7 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                <p className="mt-4 text-sm font-semibold text-slate-700">Checking your session...</p>
                <p className="mt-1 text-xs text-slate-500">Refreshing secure token state.</p>
            </section>
        </main>
    );
}
