use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, LazyLock, Mutex};
use std::time::SystemTime;
use tauri::{AppHandle, Manager};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct ProgressEvent {
    pub status: String,
    pub percent: u8,
}

const MAX_CACHE_AGE_SECS: u64 = 7 * 24 * 3600; // 7 days
const MAX_CACHE_BYTES: u64 = 500 * 1024 * 1024; // 500 MB
const TARGET_CACHE_BYTES: u64 = 400 * 1024 * 1024; // 400 MB

type InFlightJob = Arc<(Mutex<Option<Result<String, String>>>, Condvar)>;

static IN_FLIGHT_JOBS: LazyLock<Mutex<HashMap<String, InFlightJob>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Fast, deterministic 64-bit FNV-1a hash for content hashing.
pub fn fnv1a_hash(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &byte in bytes {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

/// Resolves the application cache directory for converted document artifacts.
pub fn get_cache_dir(app: &AppHandle) -> PathBuf {
    let base = app.path().app_cache_dir().unwrap_or_else(|_| {
        let mut p = std::env::temp_dir();
        p.push("docs_viewer_cache");
        p
    });
    let dir = base.join("conversions");
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Fallback cache directory for tests or headless environments.
#[allow(dead_code)]
pub fn get_default_cache_dir() -> PathBuf {
    let mut p = std::env::temp_dir();
    p.push("docs_viewer_cache");
    p.push("conversions");
    let _ = fs::create_dir_all(&p);
    p
}

/// Computes a cache key based on file path, modification time, size,
/// and content hash (for files <= 10MB).
pub fn compute_file_cache_key(path: &Path) -> Result<String, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let size = meta.len();
    let mtime = meta
        .modified()
        .map_err(|e| e.to_string())?
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let clean_stem = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace(|c: char| !c.is_alphanumeric(), "_");

    // Content hash for small files (<= 10MB) for extra integrity
    let content_suffix = if size <= 10 * 1024 * 1024 {
        if let Ok(bytes) = fs::read(path) {
            format!("_{:016x}", fnv1a_hash(&bytes))
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    Ok(format!("{}_{}_{}{}", clean_stem, size, mtime, content_suffix))
}

/// Computes a cache key for in-memory bytes based on filename stem, length, and content hash.
pub fn compute_bytes_cache_key(bytes: &[u8], filename: &str) -> String {
    let clean_stem = Path::new(filename)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace(|c: char| !c.is_alphanumeric(), "_");
    let hash = fnv1a_hash(bytes);
    format!("byte_{}_{}_{:016x}", clean_stem, bytes.len(), hash)
}

/// Enforces cache age limits and total cache size limits with LRU eviction.
pub fn clean_cache(cache_dir: &Path) {
    let now = SystemTime::now();
    let mut pdf_files: Vec<(PathBuf, u64, SystemTime)> = Vec::new();
    let mut total_bytes: u64 = 0;

    if let Ok(entries) = fs::read_dir(cache_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(meta) = entry.metadata() {
                let mtime = meta.modified().unwrap_or(now);
                let age = now.duration_since(mtime).unwrap_or_default().as_secs();

                // Clean temporary script files or intermediate files older than 10 minutes
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    if (ext_str == "ps1" || name.starts_with("conv_") || name.starts_with("temp_")) && age > 600 {
                        let _ = fs::remove_file(&path);
                        continue;
                    }
                }

                // Remove files older than MAX_CACHE_AGE_SECS
                if age > MAX_CACHE_AGE_SECS {
                    let _ = fs::remove_file(&path);
                    continue;
                }

                if path.extension().map(|e| e == "pdf").unwrap_or(false) {
                    let len = meta.len();
                    total_bytes += len;
                    pdf_files.push((path, len, mtime));
                }
            }
        }
    }

    // Evict oldest files if total size exceeds maximum limit
    if total_bytes > MAX_CACHE_BYTES {
        pdf_files.sort_by_key(|(_, _, mtime)| *mtime);
        for (path, len, _) in pdf_files {
            if total_bytes <= TARGET_CACHE_BYTES {
                break;
            }
            if fs::remove_file(&path).is_ok() {
                total_bytes = total_bytes.saturating_sub(len);
            }
        }
    }
}

/// Checks if a converted PDF exists in the cache and is non-empty.
pub fn check_cache(app: &AppHandle, path: Option<String>, filename: String) -> Option<String> {
    let cache_dir = get_cache_dir(app);
    let cache_key = if let Some(p) = path {
        let input_path = Path::new(&p);
        if !input_path.exists() {
            return None;
        }
        compute_file_cache_key(input_path).ok()?
    } else {
        let clean_stem = Path::new(&filename)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .replace(|c: char| !c.is_alphanumeric(), "_");
        // For byte files without path, return matching cached file if known
        format!("byte_{}", clean_stem)
    };

    let out_path = cache_dir.join(format!("{}.pdf", cache_key));
    if out_path.exists() && fs::metadata(&out_path).map(|m| m.len() > 0).unwrap_or(false) {
        Some(out_path.to_string_lossy().to_string())
    } else {
        None
    }
}

/// Executes document conversion via MS Office COM, falling back to LibreOffice headless.
pub fn perform_office_conversion_cancellable(
    app: &AppHandle,
    tab_id: &str,
    cache_dir: &Path,
    input_path: &Path,
    out_path: &Path,
    cancelled: &std::sync::atomic::AtomicBool,
) -> Result<(), String> {
    use std::sync::atomic::Ordering;
    use crate::process_utils::run_cancellable_process;
    use crate::job_queue::emit_job_progress;

    if cancelled.load(Ordering::SeqCst) {
        return Err("Cancelled".to_string());
    }

    let ext = input_path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    emit_job_progress(app, tab_id, "Converting via MS Office", 45);

    let input_str = input_path.to_string_lossy().replace('\'', "''");
    let out_str = out_path.to_string_lossy().replace('\'', "''");

    let ps_script = match ext.as_str() {
        "docx" | "doc" => format!(
            r#"
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {{
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open('{}', $false, $true, $false)
    $doc.SaveAs([ref]'{}', [ref]17)
    $doc.Close([ref]$false)
    $word.Quit([ref]$false)
    exit 0
}} catch {{
    Write-Error $_.Exception.ToString()
    exit 1
}} finally {{
    if ($doc) {{ try {{ [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null }} catch {{}} }}
    if ($word) {{ try {{ [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }} catch {{}} }}
}}
"#,
            input_str, out_str
        ),
        "pptx" | "ppt" => format!(
            r#"
$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null
try {{
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open('{}', -1, 0, 0)
    $pres.SaveAs('{}', 32)
    $pres.Close()
    $ppt.Quit()
    exit 0
}} catch {{
    Write-Error $_.Exception.ToString()
    exit 1
}} finally {{
    if ($pres) {{ try {{ [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null }} catch {{}} }}
    if ($ppt) {{ try {{ [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null }} catch {{}} }}
}}
"#,
            input_str, out_str
        ),
        "xlsx" | "xls" | "csv" => format!(
            r#"
$ErrorActionPreference = 'Stop'
$excel = $null
$wb = $null
try {{
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
    $wb = $excel.Workbooks.Open('{}', 0, $true)
    foreach ($sheet in $wb.Worksheets) {{
        $sheet.PageSetup.Zoom = $false
        $sheet.PageSetup.FitToPagesWide = 1
        $sheet.PageSetup.FitToPagesTall = $false
        $sheet.PageSetup.Orientation = 2
    }}
    $wb.ExportAsFixedFormat(0, '{}')
    $wb.Close($false)
    $excel.Quit()
    exit 0
}} catch {{
    Write-Error $_.Exception.ToString()
    exit 1
}} finally {{
    if ($wb) {{ try {{ [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }} catch {{}} }}
    if ($excel) {{ try {{ [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null }} catch {{}} }}
}}
"#,
            input_str, out_str
        ),
        _ => return Err(format!("Unsupported format: {}", ext)),
    };

    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let script_file = cache_dir.join(format!("conv_{}_{}.ps1", std::process::id(), timestamp));
    fs::write(&script_file, &ps_script).map_err(|e| e.to_string())?;

    let script_str = script_file.to_string_lossy().to_string();
    let output = run_cancellable_process(
        "powershell",
        [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script_str,
        ],
        cancelled,
    );

    let _ = fs::remove_file(&script_file);

    if cancelled.load(Ordering::SeqCst) {
        return Err("Cancelled".to_string());
    }

    if let Ok(out) = output {
        if out.status.success()
            && out_path.exists()
            && fs::metadata(out_path).map(|m| m.len() > 0).unwrap_or(false)
        {
            return Ok(());
        } else {
            eprintln!(
                "MS Office conversion failed: status={:?}, stderr={}",
                out.status,
                String::from_utf8_lossy(&out.stderr)
            );
        }
    }

    // Fallback to LibreOffice
    emit_job_progress(app, tab_id, "Trying LibreOffice fallback", 70);

    let soffice_paths = [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        "soffice.exe",
        "soffice",
    ];

    let mut lo_success = false;
    let outdir = cache_dir.to_string_lossy().to_string();
    let input_path_str = input_path.to_string_lossy().to_string();

    for lo_path in soffice_paths {
        if cancelled.load(Ordering::SeqCst) {
            return Err("Cancelled".to_string());
        }

        let lo_output = run_cancellable_process(
            lo_path,
            [
                "--headless",
                "--convert-to",
                "pdf",
                &input_path_str,
                "--outdir",
                &outdir,
            ],
            cancelled,
        );

        if let Ok(lo_out) = lo_output {
            if lo_out.status.success() {
                let original_name = input_path.file_stem().unwrap().to_string_lossy();
                let lo_out_path = cache_dir.join(format!("{}.pdf", original_name));

                if lo_out_path.exists() {
                    let _ = fs::rename(&lo_out_path, out_path);
                    lo_success = true;
                    break;
                }
            }
        }
    }

    if lo_success
        && out_path.exists()
        && fs::metadata(out_path).map(|m| m.len() > 0).unwrap_or(false)
    {
        Ok(())
    } else {
        Err("Both MS Office and LibreOffice conversions failed".into())
    }
}

fn perform_office_conversion(
    app: &AppHandle,
    cache_dir: &Path,
    input_path: &Path,
    out_path: &Path,
) -> Result<(), String> {
    let cancelled = std::sync::atomic::AtomicBool::new(false);
    perform_office_conversion_cancellable(app, "default", cache_dir, input_path, out_path, &cancelled)
}

/// Runs a conversion job with disk caching and in-flight deduplication.
fn run_deduplicated_conversion<F>(
    app: &AppHandle,
    cache_key: &str,
    convert_fn: F,
) -> Result<String, String>
where
    F: FnOnce(&Path, &Path) -> Result<(), String>,
{
    let cache_dir = get_cache_dir(app);
    let out_path = cache_dir.join(format!("{}.pdf", cache_key));

    // 1. Instant check if valid cached PDF already exists on disk
    if out_path.exists() && fs::metadata(&out_path).map(|m| m.len() > 0).unwrap_or(false) {
        return Ok(out_path.to_string_lossy().to_string());
    }

    // 2. Check / register in-flight job to deduplicate concurrent requests
    let (job_slot, is_primary) = {
        let mut jobs = IN_FLIGHT_JOBS.lock().unwrap();
        if let Some(existing) = jobs.get(cache_key) {
            (existing.clone(), false)
        } else {
            let slot = Arc::new((Mutex::new(None), Condvar::new()));
            jobs.insert(cache_key.to_string(), slot.clone());
            (slot, true)
        }
    };

    if !is_primary {
        // Wait for primary conversion worker to finish
        let (lock, cvar) = &*job_slot;
        let mut guard = lock.lock().unwrap();
        while guard.is_none() {
            guard = cvar.wait(guard).unwrap();
        }
        return guard.as_ref().unwrap().clone();
    }

    // Primary conversion worker: clean stale cache before starting
    clean_cache(&cache_dir);

    let conversion_res = convert_fn(&cache_dir, &out_path)
        .map(|_| out_path.to_string_lossy().to_string());

    // Broadcast result to any waiting callers
    {
        let (lock, cvar) = &*job_slot;
        let mut guard = lock.lock().unwrap();
        *guard = Some(conversion_res.clone());
        cvar.notify_all();
    }

    // Remove from in-flight tracker
    {
        let mut jobs = IN_FLIGHT_JOBS.lock().unwrap();
        jobs.remove(cache_key);
    }

    conversion_res
}

pub fn convert_office_to_pdf_task(app: AppHandle, path: String) -> Result<String, String> {
    let input_path = PathBuf::from(&path);
    if !input_path.exists() {
        return Err(format!("Input file does not exist: {}", path));
    }

    let cache_key = compute_file_cache_key(&input_path)?;
    let app_clone = app.clone();
    let input_clone = input_path.clone();

    run_deduplicated_conversion(&app, &cache_key, move |cache_dir, out_path| {
        perform_office_conversion(&app_clone, cache_dir, &input_clone, out_path)
    })
}

pub fn convert_office_bytes_to_pdf_task(
    app: AppHandle,
    bytes: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    let cache_key = compute_bytes_cache_key(&bytes, &filename);
    let app_clone = app.clone();

    let cache_key_for_closure = cache_key.clone();

    run_deduplicated_conversion(&app, &cache_key, move |cache_dir, out_path| {
        let ext = Path::new(&filename)
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        let temp_in_path = cache_dir.join(format!("{}.{}", cache_key_for_closure, ext));

        fs::write(&temp_in_path, bytes).map_err(|e| e.to_string())?;

        let result = perform_office_conversion(&app_clone, cache_dir, &temp_in_path, out_path);

        let _ = fs::remove_file(&temp_in_path);
        result
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_fnv1a_hash() {
        let data1 = b"Hello, World!";
        let data2 = b"Hello, World!";
        let data3 = b"Hello, Rust!";
        assert_eq!(fnv1a_hash(data1), fnv1a_hash(data2));
        assert_ne!(fnv1a_hash(data1), fnv1a_hash(data3));
    }

    #[test]
    fn test_cache_key_invalidation_on_change() {
        let temp_dir = std::env::temp_dir().join("test_docs_cache_key");
        let _ = fs::create_dir_all(&temp_dir);
        let test_file = temp_dir.join("test_doc.docx");

        {
            let mut f = fs::File::create(&test_file).unwrap();
            f.write_all(b"Original Content").unwrap();
        }

        let key1 = compute_file_cache_key(&test_file).unwrap();

        // Sleep slightly to ensure mtime or content changes
        std::thread::sleep(std::time::Duration::from_millis(50));
        {
            let mut f = fs::File::create(&test_file).unwrap();
            f.write_all(b"Modified Content Changed").unwrap();
        }

        let key2 = compute_file_cache_key(&test_file).unwrap();
        assert_ne!(key1, key2, "Cache key must change when source file changes");

        let _ = fs::remove_file(&test_file);
        let _ = fs::remove_dir(&temp_dir);
    }

    #[test]
    fn test_bytes_cache_key_deterministic() {
        let bytes = b"Presentation Slide Deck Sample Bytes";
        let key1 = compute_bytes_cache_key(bytes, "deck.pptx");
        let key2 = compute_bytes_cache_key(bytes, "deck.pptx");
        assert_eq!(key1, key2, "Bytes cache key must be 100% deterministic");
    }

    #[test]
    fn test_in_flight_deduplication() {
        use std::sync::atomic::{AtomicUsize, Ordering};

        static CALL_COUNT: AtomicUsize = AtomicUsize::new(0);

        let test_key = "test_in_flight_doc_key";
        let mut handles = Vec::new();

        for _ in 0..5 {
            let key = test_key.to_string();
            let handle = std::thread::spawn(move || {
                let (slot, is_primary) = {
                    let mut jobs = IN_FLIGHT_JOBS.lock().unwrap();
                    if let Some(existing) = jobs.get(&key) {
                        (existing.clone(), false)
                    } else {
                        let slot = Arc::new((Mutex::new(None), Condvar::new()));
                        jobs.insert(key.clone(), slot.clone());
                        (slot, true)
                    }
                };

                if is_primary {
                    CALL_COUNT.fetch_add(1, Ordering::SeqCst);
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    let res = Ok("converted.pdf".to_string());
                    {
                        let (lock, cvar) = &*slot;
                        let mut guard = lock.lock().unwrap();
                        *guard = Some(res);
                        cvar.notify_all();
                    }
                    {
                        let mut jobs = IN_FLIGHT_JOBS.lock().unwrap();
                        jobs.remove(&key);
                    }
                    "converted.pdf".to_string()
                } else {
                    let (lock, cvar) = &*slot;
                    let mut guard = lock.lock().unwrap();
                    while guard.is_none() {
                        guard = cvar.wait(guard).unwrap();
                    }
                    guard.as_ref().unwrap().as_ref().unwrap().clone()
                }
            });
            handles.push(handle);
        }

        for h in handles {
            let res = h.join().unwrap();
            assert_eq!(res, "converted.pdf");
        }

        assert_eq!(CALL_COUNT.load(Ordering::SeqCst), 1, "Conversion must run exactly once across concurrent threads");
    }
}
