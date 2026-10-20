use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use tauri::{AppHandle, Emitter};
use serde::Serialize;
use crate::converter;

#[derive(Clone, Serialize, Debug)]
pub struct JobProgressEvent {
    pub tab_id: String,
    pub stage: String,
    pub percent: u8,
}

pub struct JobItem {
    pub tab_id: String,
    pub path: Option<String>,
    pub filename: String,
    pub bytes: Option<Vec<u8>>,
    pub cancelled: Arc<AtomicBool>,
    pub sender: std::sync::mpsc::Sender<Result<String, String>>,
}

struct QueueState {
    queue: VecDeque<JobItem>,
    running: usize,
    active_tokens: HashMap<String, Arc<AtomicBool>>,
}

static QUEUE_STATE: LazyLock<Mutex<QueueState>> = LazyLock::new(|| {
    Mutex::new(QueueState {
        queue: VecDeque::new(),
        running: 0,
        active_tokens: HashMap::new(),
    })
});

const MAX_CONCURRENT_CONVERSIONS: usize = 2;

pub fn emit_job_progress(app: &AppHandle, tab_id: &str, stage: &str, percent: u8) {
    let _ = app.emit(
        "conversion-job-progress",
        JobProgressEvent {
            tab_id: tab_id.to_string(),
            stage: stage.to_string(),
            percent,
        },
    );
}

pub fn cancel_job(tab_id: &str) {
    let mut state = QUEUE_STATE.lock().unwrap();

    // Signal running task
    if let Some(token) = state.active_tokens.get(tab_id) {
        token.store(true, Ordering::SeqCst);
    }

    // Remove from pending queue
    state.queue.retain(|j| {
        if j.tab_id == tab_id {
            j.cancelled.store(true, Ordering::SeqCst);
            let _ = j.sender.send(Err("Cancelled".to_string()));
            false
        } else {
            true
        }
    });
}

pub fn submit_job(
    app: AppHandle,
    tab_id: String,
    path: Option<String>,
    filename: String,
    bytes: Option<Vec<u8>>,
) -> Result<String, String> {
    // 1. Check if already present in disk cache
    let cache_dir = converter::get_cache_dir(&app);
    let cache_key = if let Some(ref p) = path {
        let input_path = PathBuf::from(p);
        if !input_path.exists() {
            return Err(format!("Input file does not exist: {}", p));
        }
        converter::compute_file_cache_key(&input_path)?
    } else if let Some(ref b) = bytes {
        converter::compute_bytes_cache_key(b, &filename)
    } else {
        return Err("No path or bytes provided for conversion".into());
    };

    let out_path = cache_dir.join(format!("{}.pdf", cache_key));
    if out_path.exists() && std::fs::metadata(&out_path).map(|m| m.len() > 0).unwrap_or(false) {
        emit_job_progress(&app, &tab_id, "Ready", 100);
        return Ok(out_path.to_string_lossy().to_string());
    }

    // 2. Submit to background job queue
    let cancelled = Arc::new(AtomicBool::new(false));
    let (tx, rx) = std::sync::mpsc::channel();

    let job = JobItem {
        tab_id: tab_id.clone(),
        path,
        filename,
        bytes,
        cancelled: cancelled.clone(),
        sender: tx,
    };

    let mut state = QUEUE_STATE.lock().unwrap();
    state.active_tokens.insert(tab_id.clone(), cancelled);

    if state.running < MAX_CONCURRENT_CONVERSIONS {
        state.running += 1;
        drop(state);
        let app_clone = app.clone();
        std::thread::spawn(move || {
            execute_job(app_clone, job, cache_key);
        });
    } else {
        emit_job_progress(&app, &tab_id, "Queued", 5);
        state.queue.push_back(job);
        drop(state);
    }

    // Wait for the job result
    match rx.recv() {
        Ok(result) => result,
        Err(_) => Err("Conversion job channel closed unexpectedly".into()),
    }
}

fn execute_job(app: AppHandle, job: JobItem, cache_key: String) {
    if job.cancelled.load(Ordering::SeqCst) {
        let _ = job.sender.send(Err("Cancelled".to_string()));
        finish_job(&app, &job.tab_id);
        return;
    }

    emit_job_progress(&app, &job.tab_id, "Opening file", 20);

    let cache_dir = converter::get_cache_dir(&app);
    let out_path = cache_dir.join(format!("{}.pdf", cache_key));

    converter::clean_cache(&cache_dir);

    let result = if let Some(ref p) = job.path {
        let input_path = PathBuf::from(p);
        converter::perform_office_conversion_cancellable(
            &app,
            &job.tab_id,
            &cache_dir,
            &input_path,
            &out_path,
            &job.cancelled,
        )
    } else if let Some(ref b) = job.bytes {
        let ext = Path::new(&job.filename)
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        let temp_in_path = cache_dir.join(format!("{}.{}", cache_key, ext));
        let write_res = std::fs::write(&temp_in_path, b);

        if let Err(e) = write_res {
            Err(e.to_string())
        } else {
            let res = converter::perform_office_conversion_cancellable(
                &app,
                &job.tab_id,
                &cache_dir,
                &temp_in_path,
                &out_path,
                &job.cancelled,
            );
            let _ = std::fs::remove_file(&temp_in_path);
            res
        }
    } else {
        Err("No path or bytes provided".to_string())
    };

    if job.cancelled.load(Ordering::SeqCst) {
        let _ = job.sender.send(Err("Cancelled".to_string()));
    } else {
        match result {
            Ok(_) => {
                emit_job_progress(&app, &job.tab_id, "Preparing pages", 90);
                emit_job_progress(&app, &job.tab_id, "Ready", 100);
                let _ = job.sender.send(Ok(out_path.to_string_lossy().to_string()));
            }
            Err(err) => {
                let _ = job.sender.send(Err(err));
            }
        }
    }

    finish_job(&app, &job.tab_id);
}

fn finish_job(app: &AppHandle, finished_tab_id: &str) {
    let next_to_run = {
        let mut state = QUEUE_STATE.lock().unwrap();
        state.active_tokens.remove(finished_tab_id);

        let mut candidate = None;
        while let Some(j) = state.queue.pop_front() {
            if j.cancelled.load(Ordering::SeqCst) {
                state.active_tokens.remove(&j.tab_id);
                let _ = j.sender.send(Err("Cancelled".to_string()));
                continue;
            }
            candidate = Some(j);
            break;
        }

        if candidate.is_none() {
            state.running = state.running.saturating_sub(1);
        }
        candidate
    };

    if let Some(next_job) = next_to_run {
        let app_clone = app.clone();
        let cache_key = if let Some(ref p) = next_job.path {
            converter::compute_file_cache_key(Path::new(p)).unwrap_or_else(|_| "temp_conv".into())
        } else if let Some(ref b) = next_job.bytes {
            converter::compute_bytes_cache_key(b, &next_job.filename)
        } else {
            "temp_conv".into()
        };

        std::thread::spawn(move || {
            execute_job(app_clone, next_job, cache_key);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cancellation_logic() {
        let tab_id = "test_cancel_tab";
        let cancelled = Arc::new(AtomicBool::new(false));
        {
            let mut state = QUEUE_STATE.lock().unwrap();
            state.active_tokens.insert(tab_id.to_string(), cancelled.clone());
        }

        assert!(!cancelled.load(Ordering::SeqCst));
        cancel_job(tab_id);
        assert!(cancelled.load(Ordering::SeqCst));
    }
}
