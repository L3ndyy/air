"use client";

import Link from "next/link";
import { Download, Monitor, ArrowLeft } from "lucide-react";

const DESKTOP_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || null;

export default function DownloadPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--air-accent)] text-white">
            <Monitor className="h-9 w-9" />
          </div>
        </div>
        <h1 className="mb-2 text-center text-xl font-semibold [color:var(--air-text)]">
          Air для Windows
        </h1>
        <p className="mb-6 text-center text-sm [color:var(--air-text-muted)]">
          Установите приложение на компьютер — уведомления, отдельное окно и
          работа без браузера.
        </p>
        {DESKTOP_DOWNLOAD_URL ? (
          <a
            href={DESKTOP_DOWNLOAD_URL}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--air-accent)] py-3.5 text-sm font-medium text-white transition hover:opacity-95 active:scale-[0.99]"
            download
          >
            <Download className="h-5 w-5" />
            Скачать установщик
          </a>
        ) : (
          <div className="rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] p-4 text-sm [color:var(--air-text-muted)]">
            <p className="mb-2 font-medium [color:var(--air-text)]">
              Сборка с сайта
            </p>
            <p>
              Ссылка на установщик настраивается через переменную{" "}
              <code className="rounded bg-black/10 px-1 py-0.5 text-xs">
                NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL
              </code>
              . Соберите проект в папке <code className="rounded bg-black/10 px-1 py-0.5 text-xs">desktop/</code> и
              загрузите .exe или установщик на свой хостинг или GitHub Releases.
            </p>
          </div>
        )}
        <Link
          href="/chat"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--air-glass-border)] py-2.5 text-sm [color:var(--air-text-muted)] transition hover:bg-[var(--air-input-bg)] hover:[color:var(--air-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад в чат
        </Link>
      </div>
    </div>
  );
}
