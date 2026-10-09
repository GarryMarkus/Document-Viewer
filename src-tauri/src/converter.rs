use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter};
use serde::Serialize;
use std::time::SystemTime;

#[derive(Clone, Serialize)]
pub struct ProgressEvent {
    pub status: String,
    pub percent: u8,
}

pub fn get_cache_dir() -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push("docs_viewer_cache");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

fn hash_file(path: &Path) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let size = metadata.len();
    let mod_time = metadata
        .modified()
        .unwrap_or(SystemTime::now())
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let clean_stem = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace(|c: char| !c.is_alphanumeric(), "_");
        
    Ok(format!("{}_{}_{}", clean_stem, size, mod_time))
}

pub fn clean_cache() {
    let cache_dir = get_cache_dir();
    // Clean files older than 7 days
    if let Ok(entries) = fs::read_dir(cache_dir) {
        let now = SystemTime::now();
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if let Ok(mod_time) = meta.modified() {
                    if let Ok(age) = now.duration_since(mod_time) {
                        if age.as_secs() > 7 * 24 * 3600 {
                            let _ = fs::remove_file(entry.path());
                        }
                    }
                }
            }
        }
    }
}

pub fn convert_office_to_pdf_task(app: AppHandle, path: String) -> Result<String, String> {
    let input_path = Path::new(&path);
    if !input_path.exists() {
        return Err(format!("Input file does not exist: {}", path));
    }

    let hash = hash_file(input_path)?;
    let mut out_path = get_cache_dir();
    out_path.push(format!("{}.pdf", hash));
    
    if out_path.exists() && fs::metadata(&out_path).map(|m| m.len() > 0).unwrap_or(false) {
        let _ = app.emit("conversion-progress", ProgressEvent { status: "Found in cache".into(), percent: 100 });
        return Ok(out_path.to_string_lossy().to_string());
    }

    clean_cache();

    let ext = input_path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
    let _ = app.emit("conversion-progress", ProgressEvent { status: "Initializing conversion...".into(), percent: 15 });

    let input_str = input_path.to_string_lossy().replace('\'', "''");
    let out_str = out_path.to_string_lossy().replace('\'', "''");

    let ps_script = match ext.as_str() {
        "docx" | "doc" => format!(r#"
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
"#, input_str, out_str),
        "pptx" | "ppt" => format!(r#"
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
"#, input_str, out_str),
        "xlsx" | "xls" | "csv" => format!(r#"
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
"#, input_str, out_str),
        _ => return Err(format!("Unsupported format: {}", ext))
    };

    let _ = app.emit("conversion-progress", ProgressEvent { status: "Converting via MS Office...".into(), percent: 40 });

    let timestamp = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_millis();
    let script_file = get_cache_dir().join(format!("conv_{}_{}.ps1", std::process::id(), timestamp));
    fs::write(&script_file, &ps_script).map_err(|e| e.to_string())?;

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            script_file.to_str().unwrap()
        ])
        .output();

    let _ = fs::remove_file(&script_file);

    if let Ok(out) = output {
        if out.status.success() && out_path.exists() && fs::metadata(&out_path).map(|m| m.len() > 0).unwrap_or(false) {
            let _ = app.emit("conversion-progress", ProgressEvent { status: "Done".into(), percent: 100 });
            return Ok(out_path.to_string_lossy().to_string());
        } else {
            eprintln!("MS Office conversion failed: status={:?}, stderr={}", out.status, String::from_utf8_lossy(&out.stderr));
        }
    }

    let _ = app.emit("conversion-progress", ProgressEvent { status: "MS Office failed. Trying LibreOffice...".into(), percent: 60 });
    
    // Fallback to LibreOffice
    let soffice_paths = [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        "soffice.exe",
        "soffice"
    ];

    let mut lo_success = false;
    for lo_path in soffice_paths {
        let lo_output = Command::new(lo_path)
            .args([
                "--headless", 
                "--convert-to", "pdf", 
                &path, 
                "--outdir", &get_cache_dir().to_string_lossy()
            ])
            .output();

        if let Ok(lo_out) = lo_output {
            if lo_out.status.success() {
                let original_name = input_path.file_stem().unwrap().to_string_lossy();
                let lo_out_path = get_cache_dir().join(format!("{}.pdf", original_name));
                
                if lo_out_path.exists() {
                    let _ = fs::rename(&lo_out_path, &out_path);
                    lo_success = true;
                    break;
                }
            }
        }
    }

    if lo_success && out_path.exists() && fs::metadata(&out_path).map(|m| m.len() > 0).unwrap_or(false) {
        let _ = app.emit("conversion-progress", ProgressEvent { status: "Done via LibreOffice".into(), percent: 100 });
        Ok(out_path.to_string_lossy().to_string())
    } else {
        Err("Both MS Office and LibreOffice conversions failed".into())
    }
}

pub fn convert_office_bytes_to_pdf_task(app: AppHandle, bytes: Vec<u8>, filename: String) -> Result<String, String> {
    let ext = Path::new(&filename)
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();
    let clean_stem = Path::new(&filename)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace(|c: char| !c.is_alphanumeric(), "_");
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let temp_name = format!("temp_{}_{}.{}", timestamp, clean_stem, ext);
    let temp_in_path = get_cache_dir().join(&temp_name);
    
    fs::write(&temp_in_path, bytes).map_err(|e| e.to_string())?;
    
    let result = convert_office_to_pdf_task(app, temp_in_path.to_string_lossy().to_string());
    
    let _ = fs::remove_file(&temp_in_path);
    result
}
