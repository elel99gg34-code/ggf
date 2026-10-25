//! 화면 캡처와 클립보드 감시.

use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager};

/// 주 모니터를 캡처해 임시 폴더에 PNG로 저장하고 경로를 돌려준다.
/// 우리 창이 찍히지 않도록 잠깐 숨겼다가 다시 띄운다.
pub fn capture_primary(app: &AppHandle) -> Result<String, String> {
    let window = app.get_webview_window("main");
    if let Some(w) = &window {
        let _ = w.hide();
    }
    std::thread::sleep(Duration::from_millis(250));
    let result = (|| {
        let monitors = xcap::Monitor::all().map_err(|e| format!("화면을 찾지 못했어요: {e}"))?;
        let monitor = monitors
            .iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .or_else(|| monitors.first())
            .ok_or("화면을 찾지 못했어요.")?;
        let image = monitor.capture_image().map_err(|e| format!("화면을 캡처하지 못했어요: {e}"))?;
        let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
        let path: PathBuf = std::env::temp_dir().join(format!("localbiseo-capture-{stamp}.png"));
        image.save(&path).map_err(|e| format!("캡처를 저장하지 못했어요: {e}"))?;
        Ok(path.to_string_lossy().into_owned())
    })();
    if let Some(w) = &window {
        let _ = w.show();
        let _ = w.set_focus();
    }
    result
}

/// 클립보드 글자가 바뀌면 화면에 `clipboard-text` 이벤트로 알린다.
/// 저장할지 말지(설정, 민감정보 처리)는 엔진이 정한다.
pub fn watch_clipboard(app: AppHandle) {
    std::thread::spawn(move || {
        let mut board = match arboard::Clipboard::new() {
            Ok(b) => b,
            Err(_) => return, // 클립보드를 쓸 수 없는 환경
        };
        let mut last = board.get_text().unwrap_or_default();
        loop {
            std::thread::sleep(Duration::from_millis(800));
            if let Ok(text) = board.get_text() {
                if text != last {
                    last = text.clone();
                    if !text.trim().is_empty() {
                        let _ = app.emit("clipboard-text", text);
                    }
                }
            }
        }
    });
}
