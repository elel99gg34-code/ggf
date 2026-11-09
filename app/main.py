"""패턴 클릭 보조 도구 (Windows, tkinter + pynput)."""
from __future__ import annotations

import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from pynput import keyboard, mouse

from engine import Step, load_steps, run_pattern, save_steps

BUTTONS = {"left": mouse.Button.left, "right": mouse.Button.right, "middle": mouse.Button.middle}
SPECIAL = {"space": keyboard.Key.space, "enter": keyboard.Key.enter, "esc": keyboard.Key.esc,
           "tab": keyboard.Key.tab}


class PynputBackend:
    def __init__(self) -> None:
        self.m = mouse.Controller()
        self.k = keyboard.Controller()

    def click(self, x: int, y: int, button: str) -> None:
        self.m.position = (x, y)
        self.m.click(BUTTONS.get(button, mouse.Button.left))

    def press(self, key: str) -> None:
        k = SPECIAL.get(key.lower(), key)
        self.k.press(k)
        self.k.release(k)


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("패턴 클릭 도우미")
        self.geometry("480x560")
        self.steps: list[Step] = []
        self.stop_ev = threading.Event()
        self.worker: threading.Thread | None = None
        self.mouse_ctl = mouse.Controller()
        self._build()
        self.hk = keyboard.GlobalHotKeys({
            "<f6>": lambda: self.after(0, self.start),
            "<f7>": lambda: self.after(0, self.stop),
            "<f8>": lambda: self.after(0, self.add_click_here),
        })
        self.hk.start()
        self.protocol("WM_DELETE_WINDOW", self._close)

    # ---------- UI ----------
    def _build(self) -> None:
        pad = {"padx": 8, "pady": 4}
        tip = ("F8: 현재 마우스 위치를 클릭 단계로 추가\n"
               "F6: 시작   F7: 정지(비상정지)")
        ttk.Label(self, text=tip, foreground="#555").pack(anchor="w", **pad)

        self.lb = tk.Listbox(self, height=12)
        self.lb.pack(fill="both", expand=True, **pad)

        row = ttk.Frame(self); row.pack(fill="x", **pad)
        ttk.Button(row, text="위 ↑", command=lambda: self.move(-1)).pack(side="left")
        ttk.Button(row, text="아래 ↓", command=lambda: self.move(1)).pack(side="left", padx=4)
        ttk.Button(row, text="삭제", command=self.delete).pack(side="left")
        ttk.Button(row, text="전체삭제", command=self.clear).pack(side="left", padx=4)

        f = ttk.LabelFrame(self, text="단계 추가"); f.pack(fill="x", **pad)
        self.delay = tk.IntVar(value=500)
        self.button = tk.StringVar(value="left")
        self.keyname = tk.StringVar(value="space")
        ttk.Label(f, text="이후 대기(ms)").grid(row=0, column=0, **pad)
        ttk.Entry(f, textvariable=self.delay, width=8).grid(row=0, column=1, **pad)
        ttk.Label(f, text="버튼").grid(row=0, column=2, **pad)
        ttk.Combobox(f, textvariable=self.button, values=list(BUTTONS), width=7,
                     state="readonly").grid(row=0, column=3, **pad)
        ttk.Button(f, text="현재위치 클릭 추가(F8)", command=self.add_click_here).grid(
            row=1, column=0, columnspan=2, **pad)
        ttk.Entry(f, textvariable=self.keyname, width=8).grid(row=1, column=2, **pad)
        ttk.Button(f, text="키 입력 추가", command=self.add_key).grid(row=1, column=3, **pad)
        ttk.Button(f, text="대기만 추가", command=self.add_wait).grid(row=2, column=0, columnspan=2, **pad)

        r = ttk.LabelFrame(self, text="실행 옵션"); r.pack(fill="x", **pad)
        self.loops = tk.IntVar(value=0)
        self.jitter = tk.IntVar(value=10)
        self.start_delay = tk.IntVar(value=3)
        for i, (t, v) in enumerate([("반복(0=무한)", self.loops), ("대기 편차 ±%", self.jitter),
                                    ("시작 전 카운트(초)", self.start_delay)]):
            ttk.Label(r, text=t).grid(row=0, column=i * 2, **pad)
            ttk.Entry(r, textvariable=v, width=6).grid(row=0, column=i * 2 + 1, **pad)

        b = ttk.Frame(self); b.pack(fill="x", **pad)
        ttk.Button(b, text="▶ 시작 (F6)", command=self.start).pack(side="left")
        ttk.Button(b, text="■ 정지 (F7)", command=self.stop).pack(side="left", padx=4)
        ttk.Button(b, text="저장", command=self.save).pack(side="right")
        ttk.Button(b, text="불러오기", command=self.load).pack(side="right", padx=4)

        self.status = tk.StringVar(value="대기 중")
        ttk.Label(self, textvariable=self.status, relief="sunken", anchor="w").pack(fill="x")

    def refresh(self) -> None:
        self.lb.delete(0, "end")
        for i, s in enumerate(self.steps, 1):
            self.lb.insert("end", f"{i}. {s.label()}")

    # ---------- 단계 편집 ----------
    def _delay(self) -> int:
        try:
            return max(int(self.delay.get()), 0)
        except (tk.TclError, ValueError):
            return 500

    def add_click_here(self) -> None:
        x, y = self.mouse_ctl.position
        self.steps.append(Step("click", int(x), int(y), self.button.get(), delay_ms=self._delay()))
        self.refresh()

    def add_key(self) -> None:
        if self.keyname.get().strip():
            self.steps.append(Step("key", key=self.keyname.get().strip(), delay_ms=self._delay()))
            self.refresh()

    def add_wait(self) -> None:
        self.steps.append(Step("wait", delay_ms=self._delay()))
        self.refresh()

    def delete(self) -> None:
        for i in reversed(self.lb.curselection()):
            del self.steps[i]
        self.refresh()

    def clear(self) -> None:
        self.steps.clear()
        self.refresh()

    def move(self, d: int) -> None:
        sel = self.lb.curselection()
        if not sel:
            return
        i, j = sel[0], sel[0] + d
        if 0 <= j < len(self.steps):
            self.steps[i], self.steps[j] = self.steps[j], self.steps[i]
            self.refresh()
            self.lb.selection_set(j)

    def save(self) -> None:
        p = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("패턴", "*.json")])
        if p:
            save_steps(p, self.steps)

    def load(self) -> None:
        p = filedialog.askopenfilename(filetypes=[("패턴", "*.json")])
        if p:
            try:
                self.steps = load_steps(p)
            except Exception as e:  # noqa: BLE001
                messagebox.showerror("오류", f"불러오기 실패: {e}")
            self.refresh()

    # ---------- 실행 ----------
    def start(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        if not self.steps:
            self.status.set("패턴이 비어있어")
            return
        self.stop_ev.clear()
        try:
            loops, jitter, cd = int(self.loops.get()), int(self.jitter.get()), int(self.start_delay.get())
        except (tk.TclError, ValueError):
            self.status.set("옵션 값이 숫자가 아니야")
            return
        steps = list(self.steps)
        self.worker = threading.Thread(target=self._run, args=(steps, loops, jitter, cd), daemon=True)
        self.worker.start()

    def _run(self, steps, loops, jitter, countdown) -> None:
        for s in range(countdown, 0, -1):
            self.after(0, self.status.set, f"{s}초 후 시작... (F7 정지)")
            if self.stop_ev.wait(1):
                self.after(0, self.status.set, "정지됨")
                return
        n = run_pattern(
            steps, PynputBackend(), self.stop_ev, loops, jitter,
            on_step=lambda r, i: self.after(0, self.status.set, f"실행 중: {r + 1}회차 / 단계 {i + 1}"),
        )
        self.after(0, self.status.set, f"종료 (완료 {n}회)")

    def stop(self) -> None:
        self.stop_ev.set()

    def _close(self) -> None:
        self.stop_ev.set()
        self.hk.stop()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()
