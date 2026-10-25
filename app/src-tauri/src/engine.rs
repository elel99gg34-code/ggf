//! Python 엔진을 자식 프로세스로 띄우고 주소·토큰을 화면에 알려준다.
//!
//! 엔진은 준비되면 표준출력에 `LOCALBISEO_READY <port>`를 찍는다.
//! 표준입력을 열어 둔 채로 두면, 앱이 죽어도 파이프가 닫혀 엔진이 같이 끝난다.

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Arc, Condvar, Mutex};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize)]
pub struct EngineInfo {
    pub url: String,
    pub token: String,
}

#[derive(Default)]
pub struct EngineState {
    ready: Mutex<Option<Result<EngineInfo, String>>>,
    signal: Condvar,
    child: Mutex<Option<Child>>,
}

pub type SharedEngine = Arc<EngineState>;

impl EngineState {
    pub fn wait(&self, timeout: Duration) -> Result<EngineInfo, String> {
        let guard = self.ready.lock().unwrap();
        let (guard, _) = self
            .signal
            .wait_timeout_while(guard, timeout, |r| r.is_none())
            .unwrap();
        guard
            .clone()
            .unwrap_or_else(|| Err("엔진이 시간 안에 준비되지 않았어요.".into()))
    }

    fn finish(&self, result: Result<EngineInfo, String>) {
        *self.ready.lock().unwrap() = Some(result);
        self.signal.notify_all();
    }

    pub fn kill(&self) {
        if let Some(mut child) = self.child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

/// 엔진 실행 명령. 배포판은 리소스의 `engine/localbiseo-engine`, 개발 중에는 `python -m localbiseo`.
fn engine_command(app: &AppHandle) -> Command {
    let exe_name = if cfg!(windows) { "localbiseo-engine.exe" } else { "localbiseo-engine" };
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(res) = app.path().resource_dir() {
        candidates.push(res.join("engine").join(exe_name));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join(exe_name));
        }
    }
    if let Some(bin) = candidates.into_iter().find(|p| p.exists()) {
        return Command::new(bin);
    }
    // 개발 모드: 저장소의 engine 폴더에서 파이썬으로 실행
    let python = std::env::var("LOCALBISEO_PYTHON").unwrap_or_else(|_| {
        if cfg!(windows) { "python".into() } else { "python3".into() }
    });
    let engine_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../engine");
    let mut cmd = Command::new(python);
    cmd.current_dir(engine_dir).args(["-m", "localbiseo"]);
    cmd
}

pub fn start(app: &AppHandle, state: SharedEngine) {
    let token = uuid::Uuid::new_v4().simple().to_string();
    let mut cmd = engine_command(app);
    // 배포판에 같이 넣은 ffmpeg·tesseract 위치 (tauri.release.conf.json의 resources)
    if let Ok(res) = app.path().resource_dir() {
        cmd.env("LOCALBISEO_RESOURCES", res.join("tools"));
    }
    cmd.args(["--port", "0", "--token", &token, "--watch-stdin"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            state.finish(Err(format!("엔진을 실행하지 못했어요: {e}")));
            return;
        }
    };
    let stdout = child.stdout.take();
    *state.child.lock().unwrap() = Some(child);

    let (tx, rx) = mpsc::channel::<u16>();
    if let Some(out) = stdout {
        std::thread::spawn(move || {
            let mut sent = false;
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                if !sent {
                    if let Some(port) = line.strip_prefix("LOCALBISEO_READY ") {
                        if let Ok(p) = port.trim().parse() {
                            let _ = tx.send(p);
                            sent = true;
                        }
                    }
                }
                // 이후 출력은 그냥 흘려보낸다 (파이프가 차서 엔진이 멈추지 않도록).
            }
        });
    }
    std::thread::spawn(move || {
        // 처음 실행할 때는 백신 검사 등으로 느릴 수 있어 넉넉히 기다린다.
        let result = match rx.recv_timeout(Duration::from_secs(90)) {
            Ok(port) => Ok(EngineInfo { url: format!("http://127.0.0.1:{port}"), token }),
            Err(_) => Err("엔진이 시작되지 않았어요. 앱을 다시 실행해 주세요.".into()),
        };
        state.finish(result);
    });
}
