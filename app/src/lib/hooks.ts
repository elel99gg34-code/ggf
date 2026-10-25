import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorText, type Job, type JobRef } from "./api";

/** 긴 작업(job)을 시작하고 끝날 때까지 상태를 따라간다. */
export function useJob<R = any>() {
  const [job, setJob] = useState<Job<R> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const poll = useCallback((id: string, resolve: (j: Job<R>) => void) => {
    const tick = async () => {
      try {
        const j = await api.get<Job<R>>(`/jobs/${id}`);
        if (!alive.current) return;
        setJob(j);
        if (j.status === "done" || j.status === "error" || j.status === "cancelled") {
          if (j.status === "error") setError(j.error);
          resolve(j);
          return;
        }
      } catch (e) {
        setError(errorText(e));
        return;
      }
      timer.current = window.setTimeout(tick, 400);
    };
    tick();
  }, []);

  const start = useCallback(
    (run: () => Promise<JobRef>) =>
      new Promise<Job<R> | null>(async (resolve) => {
        setError(null);
        setJob(null);
        try {
          const ref = await run();
          setJob(ref.job as Job<R>);
          poll(ref.job_id, resolve);
        } catch (e) {
          setError(errorText(e));
          resolve(null);
        }
      }),
    [poll],
  );

  const cancel = useCallback(async () => {
    if (job) await api.post(`/jobs/${job.id}/cancel`);
  }, [job]);

  const running = !!job && (job.status === "queued" || job.status === "running");
  return { job, error, running, start, cancel, reset: () => (setJob(null), setError(null)) };
}

/** 한 번 불러오고 reload()로 다시 불러오는 데이터. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/** 비동기 버튼 동작: 실행 중 표시와 오류 메시지. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}
