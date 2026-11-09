"""패턴 클릭 도우미 (Windows, tkinter + pynput).

패턴 추가 → 5초 카운트다운 → 마우스 클릭(길게 누르기 포함)·가만히 있는 시간까지 녹화
→ 종료(F7)로 저장 → 반복 시작(F6)으로 그대로 반복 재생.
"""
from __future__ import annotations

import queue
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk

from pynput import keyboard, mouse

from engine import Pattern, Recorder, load_patterns, play, save_patterns

try:  # 고DPI 화면에서 pynput 좌표와 창 좌표를 같은 단위로 맞춤
    import ctypes
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:  # noqa: BLE001
    pass

BTN = {"left": mouse.Button.left, "right": mouse.Button.right, "middle": mouse.Button.middle}
BTN_KO = {"left": "왼쪽", "right": "오른쪽", "middle": "가운데"}
COUNTDOWN = 5


def fmt(ms: int) -> str:
    return f"{ms // 60000}:{ms % 60000 / 1000:05.2f}"


class PynputBackend:
    def __init__(self) -> None:
        self.m = mouse.Controller()

    def down(self, x: int, y: int, button: str) -> None:
        self.m.position = (x, y)
        self.m.press(BTN[button])

    def up(self, x: int, y: int, button: str) -> None:
        self.m.position = (x, y)
        self.m.release(BTN[button])


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("패턴 클릭 도우미")
        self.geometry("560x640")
        self.patterns: list[Pattern] = []
        self.state = "idle"            # idle | countdown | recording | playing
        self.stop_ev = threading.Event()
        self.rec: Recorder | None = None
        self.listener: mouse.Listener | None = None
        self.bounds = (0, 0, 0, 0)     # 앱 창 영역: 녹화 때 이 안의 클릭은 무시
        self.q: queue.Queue = queue.Queue()   # 다른 스레드 → UI 스레드 전달용
        self._build()
        self.bind("<Configure>", self._on_configure)
        self.hk = keyboard.GlobalHotKeys({
            "<f6>": lambda: self.q.put(self.start_play),
            "<f7>": lambda: self.q.put(self.stop),
        })
        self.hk.start()
        self._pump()
        self.protocol("WM_DELETE_WINDOW", self._close)

    def _pump(self) -> None:
        """다른 스레드(핫키/재생)가 넣어둔 작업을 UI 스레드에서 실행."""
        try:
            while True:
                self.q.get_nowait()()
        except queue.Empty:
            pass
        self.after(50, self._pump)

    # ---------- UI ----------
    def _build(self) -> None:
        pad = {"padx": 8, "pady": 4}
        ttk.Label(self, foreground="#555", text=(
            "① [패턴 추가] → 5초 카운트다운 뒤 녹화 시작 (클릭·길게 누르기·멈춰 있는 시간까지 저장)\n"
            "② [종료(F7)]로 저장   ③ 패턴 선택 후 [반복 시작(F6)]")).pack(anchor="w", **pad)

        top = ttk.Frame(self); top.pack(fill="x", **pad)
        self.btn_add = ttk.Button(top, text="＋ 패턴 추가(녹화)", command=self.start_record)
        self.btn_add.pack(side="left")
        ttk.Button(top, text="■ 종료/정지 (F7)", command=self.stop).pack(side="left", padx=6)
        ttk.Button(top, text="패턴 삭제", command=self.delete_pattern).pack(side="right")
        ttk.Button(top, text="이름 변경", command=self.rename_pattern).pack(side="right", padx=4)

        self.pl = tk.Listbox(self, height=5, exportselection=False)
        self.pl.pack(fill="x", **pad)
        self.pl.bind("<<ListboxSelect>>", lambda e: self.show_timeline())

        self.summary = tk.StringVar(value="패턴을 추가하거나 불러와줘")
        ttk.Label(self, textvariable=self.summary, font=("", 10, "bold")).pack(anchor="w", **pad)

        self.canvas = tk.Canvas(self, height=46, bg="#f4f4f4", highlightthickness=1,
                                highlightbackground="#bbb")
        self.canvas.pack(fill="x", **pad)
        self.canvas.bind("<Configure>", lambda e: self.show_timeline())

        cols = ("n", "t", "pos", "btn", "hold")
        self.tv = ttk.Treeview(self, columns=cols, show="headings", height=10)
        for c, t, w in [("n", "#", 36), ("t", "시작 시점", 90), ("pos", "위치 (x, y)", 120),
                        ("btn", "버튼", 70), ("hold", "누른 시간", 90)]:
            self.tv.heading(c, text=t)
            self.tv.column(c, width=w, anchor="center")
        self.tv.pack(fill="both", expand=True, **pad)

        o = ttk.LabelFrame(self, text="반복 재생 옵션"); o.pack(fill="x", **pad)
        self.loops = tk.IntVar(value=0)
        self.gap = tk.DoubleVar(value=0.0)
        self.pre = tk.IntVar(value=3)
        for i, (t, v) in enumerate([("반복 횟수(0=무한)", self.loops), ("반복 사이 대기(초)", self.gap),
                                    ("시작 전 대기(초)", self.pre)]):
            ttk.Label(o, text=t).grid(row=0, column=i * 2, **pad)
            ttk.Entry(o, textvariable=v, width=6).grid(row=0, column=i * 2 + 1, **pad)

        b = ttk.Frame(self); b.pack(fill="x", **pad)
        ttk.Button(b, text="▶ 반복 시작 (F6)", command=self.start_play).pack(side="left")
        ttk.Button(b, text="저장", command=self.save).pack(side="right")
        ttk.Button(b, text="불러오기", command=self.load).pack(side="right", padx=4)

        self.status = tk.StringVar(value="대기 중")
        ttk.Label(self, textvariable=self.status, relief="sunken", anchor="w").pack(fill="x")

    def _on_configure(self, e) -> None:
        if e.widget is self:
            self.bounds = (self.winfo_rootx(), self.winfo_rooty(),
                           self.winfo_rootx() + self.winfo_width(),
                           self.winfo_rooty() + self.winfo_height())

    def _inside(self, x: int, y: int) -> bool:
        l, t, r, b = self.bounds
        return l <= x <= r and t <= y <= b

    # ---------- 패턴 목록/타임라인 ----------
    def selected(self) -> Pattern | None:
        s = self.pl.curselection()
        return self.patterns[s[0]] if s else None

    def refresh_list(self, select: int | None = None) -> None:
        self.pl.delete(0, "end")
        for p in self.patterns:
            self.pl.insert("end", f"{p.name}  —  클릭 {p.click_count}회 / 길이 {fmt(p.duration_ms)}")
        if select is not None and 0 <= select < len(self.patterns):
            self.pl.selection_set(select)
        self.show_timeline()

    def show_timeline(self) -> None:
        p = self.selected()
        self.tv.delete(*self.tv.get_children())
        self.canvas.delete("all")
        if not p:
            self.summary.set("패턴을 추가하거나 불러와줘")
            return
        clicks = p.clicks()
        self.summary.set(f"{p.name}: 클릭 {len(clicks)}회 · 전체 {fmt(p.duration_ms)}")
        for i, c in enumerate(clicks, 1):
            self.tv.insert("", "end", values=(i, fmt(c.start), f"({c.x}, {c.y})",
                                              BTN_KO.get(c.button, c.button), f"{c.hold / 1000:.2f}초"))
        w = max(self.canvas.winfo_width(), 100) - 20
        total = max(p.duration_ms, 1)
        self.canvas.create_line(10, 30, 10 + w, 30, fill="#999")
        for i, c in enumerate(clicks, 1):
            x0 = 10 + w * c.start / total
            x1 = max(10 + w * (c.start + c.hold) / total, x0 + 3)
            color = {"left": "#2b7de9", "right": "#e0572f", "middle": "#2a9d5c"}.get(c.button, "#2b7de9")
            self.canvas.create_rectangle(x0, 20, x1, 40, fill=color, outline="")
            if len(clicks) <= 40:
                self.canvas.create_text(x0, 10, text=str(i), font=("", 8))
        self.canvas.create_text(10, 44, anchor="w", text="0:00", font=("", 7), fill="#666")
        self.canvas.create_text(10 + w, 44, anchor="e", text=fmt(p.duration_ms), font=("", 7), fill="#666")

    def delete_pattern(self) -> None:
        s = self.pl.curselection()
        if s and self.state == "idle":
            del self.patterns[s[0]]
            self.refresh_list(min(s[0], len(self.patterns) - 1))

    def rename_pattern(self) -> None:
        p = self.selected()
        if p:
            n = simpledialog.askstring("이름 변경", "패턴 이름", initialvalue=p.name, parent=self)
            if n:
                p.name = n
                self.refresh_list(self.pl.curselection()[0])

    # ---------- 녹화 ----------
    def start_record(self) -> None:
        if self.state != "idle":
            return
        self.stop_ev.clear()
        self.state = "countdown"
        self._countdown(COUNTDOWN)

    def _countdown(self, n: int) -> None:
        if self.state != "countdown":
            return
        if n > 0:
            self.status.set(f"녹화 시작까지 {n}초... (F7 취소)")
            self.after(1000, self._countdown, n - 1)
            return
        self.rec = Recorder(ignore=self._inside)
        self.rec.begin()
        self.listener = mouse.Listener(
            on_click=lambda x, y, b, pressed: self.rec.on_click(int(x), int(y), b.name, pressed))
        self.listener.start()
        self.state = "recording"
        self._tick_record()

    def _tick_record(self) -> None:
        if self.state != "recording" or not self.rec:
            return
        self.status.set(f"● 녹화 중  {fmt(self.rec.elapsed_ms())}  ·  클릭 {self.rec.click_count}회  (F7 또는 [종료])")
        self.after(200, self._tick_record)

    def _finish_record(self) -> None:
        if self.listener:
            self.listener.stop()
            self.listener = None
        rec, self.rec = self.rec, None
        self.state = "idle"
        if not rec:
            return
        name = f"패턴 {len(self.patterns) + 1}"
        p = rec.finish(name)
        if not p.events:
            self.status.set("클릭이 없어서 저장하지 않았어")
            return
        n = simpledialog.askstring("패턴 저장", "패턴 이름", initialvalue=name, parent=self)
        p.name = n or name
        self.patterns.append(p)
        self.refresh_list(len(self.patterns) - 1)
        self.status.set(f"저장됨: {p.name} (클릭 {p.click_count}회, {fmt(p.duration_ms)})")

    # ---------- 재생 ----------
    def start_play(self) -> None:
        if self.state != "idle":
            return
        p = self.selected()
        if not p:
            self.status.set("재생할 패턴을 먼저 선택해줘")
            return
        try:
            loops, gap, pre = int(self.loops.get()), float(self.gap.get()), int(self.pre.get())
        except (tk.TclError, ValueError):
            self.status.set("옵션 값이 숫자가 아니야")
            return
        self.stop_ev.clear()
        self.state = "playing"
        threading.Thread(target=self._play, args=(p, loops, int(gap * 1000), pre), daemon=True).start()

    def _play(self, p: Pattern, loops: int, gap_ms: int, pre: int) -> None:
        ui = lambda s: self.q.put(lambda: self.status.set(s))  # noqa: E731
        for s in range(pre, 0, -1):
            ui(f"{s}초 후 반복 시작... (F7 정지)")
            if self.stop_ev.wait(1):
                break
        n = 0
        if not self.stop_ev.is_set():
            n = play(p, PynputBackend(), self.stop_ev, loops, gap_ms,
                     on_loop=lambda i: ui(f"▶ 반복 중: {i + 1}회차  (F7 정지)"))
        ui(f"정지 (완료 {n}회)")
        self.q.put(lambda: setattr(self, "state", "idle"))

    # ---------- 공통 ----------
    def stop(self) -> None:
        if self.state in ("countdown", "recording"):
            was = self.state
            self.state = "idle" if was == "countdown" else self.state
            if was == "countdown":
                self.status.set("녹화 취소")
            else:
                self._finish_record()
        elif self.state == "playing":
            self.stop_ev.set()

    def save(self) -> None:
        if not self.patterns:
            return
        p = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("패턴 묶음", "*.json")])
        if p:
            save_patterns(p, self.patterns)

    def load(self) -> None:
        p = filedialog.askopenfilename(filetypes=[("패턴 묶음", "*.json")])
        if p:
            try:
                self.patterns = load_patterns(p)
            except Exception as e:  # noqa: BLE001
                messagebox.showerror("오류", f"불러오기 실패: {e}")
                return
            self.refresh_list(0 if self.patterns else None)

    def _close(self) -> None:
        self.stop_ev.set()
        if self.listener:
            self.listener.stop()
        self.hk.stop()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()
