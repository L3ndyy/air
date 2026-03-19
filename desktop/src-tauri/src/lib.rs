#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct NotifyPayload {
    title: Option<String>,
    body: Option<String>,
}

#[tauri::command]
fn show_notification(payload: NotifyPayload) -> Result<(), String> {
    let title = payload.title.as_deref().unwrap_or("Air");
    let body = payload.body.as_deref().unwrap_or("");
    let result = notify_rust::Notification::new()
        .summary(title)
        .body(body)
        .appname("Air")
        .show();
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![show_notification])
        .run(tauri::generate_context!())
        .expect("error while running Air desktop application");
}
