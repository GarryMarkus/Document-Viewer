use std::fs;
use std::path::Path;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn check_startup_file() -> Option<String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    for arg in args {
        if arg.starts_with("--") {
            continue;
        }
        let path = Path::new(&arg);
        if path.exists() && path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == "pdf" {
                    return Some(arg);
                }
            }
        }
    }
    None
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_startup_file,
            read_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
