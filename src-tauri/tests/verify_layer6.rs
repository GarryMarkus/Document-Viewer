use docs_reader_lib::converter::{compute_bytes_cache_key, compute_file_cache_key};
use docs_reader_lib::process_utils::run_cancellable_process;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

#[test]
fn test_timing_first_open_vs_cached_reopen() {
    let temp_dir = std::env::temp_dir().join("test_verify_layer6_timings");
    let _ = fs::create_dir_all(&temp_dir);
    let sample_file = temp_dir.join("timing_sample.docx");
    fs::write(&sample_file, b"Sample DOCX file content for timing measurements").unwrap();

    // 1. Initial key computation (simulating first open)
    let t0 = Instant::now();
    let key1 = compute_file_cache_key(&sample_file).unwrap();
    let first_open_key_time = t0.elapsed();

    // Simulate converted PDF cached on disk
    let cached_pdf = temp_dir.join(format!("{}.pdf", key1));
    fs::write(&cached_pdf, b"%PDF-1.7 sample converted output bytes").unwrap();

    // 2. Cached reopen check
    let t1 = Instant::now();
    let key2 = compute_file_cache_key(&sample_file).unwrap();
    let is_cached = cached_pdf.exists();
    let cached_reopen_time = t1.elapsed();

    assert_eq!(key1, key2);
    assert!(is_cached);

    println!(
        "\n--- LAYER 6 TIMING REPORT ---\nFirst open check: {:?}\nCached reopen check: {:?}\nSpeedup factor: {:.1}x\n-----------------------------",
        first_open_key_time,
        cached_reopen_time,
        (first_open_key_time.as_nanos() as f64) / (cached_reopen_time.as_nanos().max(1) as f64)
    );

    let _ = fs::remove_file(&sample_file);
    let _ = fs::remove_file(&cached_pdf);
    let _ = fs::remove_dir(&temp_dir);
}

#[test]
fn test_source_file_edited_and_reopened_invalidation() {
    let temp_dir = std::env::temp_dir().join("test_verify_layer6_edit");
    let _ = fs::create_dir_all(&temp_dir);
    let file_path = temp_dir.join("live_edited.xlsx");
    fs::write(&file_path, b"Version 1 spreadsheet data").unwrap();

    let key_v1 = compute_file_cache_key(&file_path).unwrap();

    // Simulate user editing the file
    std::thread::sleep(std::time::Duration::from_millis(50));
    fs::write(&file_path, b"Version 2 updated financial model data").unwrap();

    let key_v2 = compute_file_cache_key(&file_path).unwrap();
    assert_ne!(key_v1, key_v2, "Edited source file must invalidate old cache key");

    let _ = fs::remove_file(&file_path);
    let _ = fs::remove_dir(&temp_dir);
}

#[test]
fn test_cancellation_mid_process() {
    let cancelled = Arc::new(AtomicBool::new(false));
    let c_clone = cancelled.clone();

    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(60));
        c_clone.store(true, Ordering::SeqCst);
    });

    let t0 = Instant::now();
    #[cfg(target_os = "windows")]
    let res = run_cancellable_process("powershell", ["-NoProfile", "-Command", "Start-Sleep -Seconds 5"], &cancelled);
    #[cfg(not(target_os = "windows"))]
    let res = run_cancellable_process("sleep", ["5"], &cancelled);

    let duration = t0.elapsed();
    assert!(res.is_err(), "Job must be interrupted upon cancellation");
    assert!(duration.as_millis() < 500, "Cancellation must kill process in under 500ms");
}

#[test]
fn test_all_supported_format_keys() {
    let formats = ["doc.docx", "sheet.xlsx", "deck.pptx", "document.pdf"];
    for name in formats {
        let dummy_bytes = format!("content for {}", name).into_bytes();
        let key = compute_bytes_cache_key(&dummy_bytes, name);
        assert!(!key.is_empty());
        assert!(key.contains("byte_"));
    }
}
