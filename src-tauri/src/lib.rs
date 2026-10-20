use std::fs;
use std::path::Path;


#[tauri::command]
fn check_startup_file() -> Option<String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let supported = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt"];
    for arg in args {
        if arg.starts_with("--") {
            continue;
        }
        let path = Path::new(&arg);
        if path.exists() && path.is_file() {
            if let Some(ext) = path.extension() {
                let ext_lower = ext.to_string_lossy().to_lowercase();
                if supported.contains(&ext_lower.as_str()) {
                    return Some(arg);
                }
            }
        }
    }
    None
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

pub mod process_utils;
pub mod converter;
pub mod job_queue;

#[tauri::command]
fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        process_utils::spawn_process("explorer", ["/select,", &path])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Ok(())
    }
}

#[tauri::command]
fn check_office_cache(app: tauri::AppHandle, path: Option<String>, filename: String) -> Option<String> {
    converter::check_cache(&app, path, filename)
}

#[tauri::command]
async fn convert_document_job(
    app: tauri::AppHandle,
    tab_id: String,
    path: Option<String>,
    filename: String,
    bytes: Option<Vec<u8>>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        job_queue::submit_job(app, tab_id, path, filename, bytes)
    }).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[tauri::command]
fn cancel_conversion_job(tab_id: String) {
    job_queue::cancel_job(&tab_id);
}

#[tauri::command]
async fn convert_office_to_pdf(app: tauri::AppHandle, path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        converter::convert_office_to_pdf_task(app, path)
    }).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[tauri::command]
async fn convert_office_bytes_to_pdf(app: tauri::AppHandle, bytes: Vec<u8>, filename: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        converter::convert_office_bytes_to_pdf_task(app, bytes, filename)
    }).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_startup_file,
            read_file_bytes,
            show_in_folder,
            check_office_cache,
            convert_document_job,
            cancel_conversion_job,
            convert_office_to_pdf,
            convert_office_bytes_to_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
