export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-air-gradient px-4">
      <h1 className="text-center text-2xl font-semibold [color:var(--air-text)]">
        Ведётся техническое обслуживание
      </h1>
      <p className="text-center text-sm [color:var(--air-text-muted)]">
        Мы скоро вернёмся. Попробуйте зайти позже.
      </p>
    </div>
  );
}
