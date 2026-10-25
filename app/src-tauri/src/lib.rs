mod desktop;
mod engine;

use std::sync::Arc;
use std::time::Duration;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, RunEvent, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use engine::{EngineInfo, EngineState, SharedEngine};

#[tauri::command]
async fn engine_info(state: tauri::State<'_, SharedEngine>) -> Result<EngineInfo, String> {
    let engine = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || engine.wait(Duration::from_secs(120)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn capture_screen(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || desktop::capture_primary(&app))
        .await
        .map_err(|e| e.to_string())?
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn setup_shortcuts(app: &AppHandle) -> tauri::Result<()> {
    let palette = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
    let ocr = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyO);
    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, shortcut, event| {
                if event.state() != ShortcutState::Pressed {
                    return;
                }
                if shortcut == &palette {
                    show_main(app);
                    let _ = app.emit("open-palette", ());
                } else if shortcut == &ocr {
                    let app = app.clone();
                    std::thread::spawn(move || {
                        if let Ok(path) = desktop::capture_primary(&app) {
                            let _ = app.emit("screen-captured", path);
                        }
                    });
                }
            })
            .build(),
    )?;
    // 다른 프로그램이 이미 쓰는 단축키면 등록이 실패할 수 있다. 앱은 그대로 동작한다.
    let _ = app.global_shortcut().register(palette);
    let _ = app.global_shortcut().register(ocr);
    Ok(())
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "로컬비서 열기", true, None::<&str>)?;
    let capture = MenuItem::with_id(app, "capture", "화면 글자 읽기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "끝내기", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &capture, &quit])?;
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("로컬비서")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "capture" => {
                let app = app.clone();
                std::thread::spawn(move || {
                    if let Ok(path) = desktop::capture_primary(&app) {
                        let _ = app.emit("screen-captured", path);
                    }
                });
            }
            "quit" => {
                app.state::<SharedEngine>().kill();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let engine: SharedEngine = Arc::new(EngineState::default());
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(engine.clone())
        .invoke_handler(tauri::generate_handler![engine_info, capture_screen])
        .setup(move |app| {
            let handle = app.handle().clone();
            engine::start(&handle, engine.clone());
            setup_shortcuts(&handle)?;
            setup_tray(&handle)?;
            desktop::watch_clipboard(handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            // 창을 닫아도 트레이에 남아 클립보드 기록과 단축키가 계속 동작한다.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("로컬비서를 시작하지 못했어요");

    app.run(|app, event| {
        if let RunEvent::Exit = event {
            app.state::<SharedEngine>().kill();
        }
    });
}
