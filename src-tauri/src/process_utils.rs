use std::ffi::OsStr;
use std::io::Result;
use std::process::{Child, Command, Output, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Spawns every external process with Windows CREATE_NO_WINDOW (0x08000000),
/// nulls stdin, and captures stdout/stderr instead of inheriting them.
pub fn spawn_process<P, I, S>(program: P, args: I) -> Result<Child>
where
    P: AsRef<OsStr>,
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .args(args);

    cmd.spawn()
}

/// Runs an external process to completion using `spawn_process` and captures output.
pub fn run_process<P, I, S>(program: P, args: I) -> Result<Output>
where
    P: AsRef<OsStr>,
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    spawn_process(program, args)?.wait_with_output()
}

/// Runs a process with periodic cancellation checks, killing the process if cancelled.
pub fn run_cancellable_process<P, I, S>(
    program: P,
    args: I,
    cancelled: &AtomicBool,
) -> Result<Output>
where
    P: AsRef<OsStr>,
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    if cancelled.load(Ordering::SeqCst) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Interrupted,
            "Process cancelled before execution",
        ));
    }

    let mut child = spawn_process(program, args)?;

    loop {
        if cancelled.load(Ordering::SeqCst) {
            let _ = child.kill();
            return Err(std::io::Error::new(
                std::io::ErrorKind::Interrupted,
                "Process cancelled and killed",
            ));
        }

        match child.try_wait()? {
            Some(_status) => {
                return child.wait_with_output();
            }
            None => {
                std::thread::sleep(std::time::Duration::from_millis(40));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hidden_process_execution() {
        #[cfg(target_os = "windows")]
        let out = run_process("powershell", ["-NoProfile", "-Command", "Write-Output 'NO_WINDOW_TEST'"]).expect("process should run");
        #[cfg(not(target_os = "windows"))]
        let out = run_process("echo", ["NO_WINDOW_TEST"]).expect("process should run");

        assert!(out.status.success());
        let stdout = String::from_utf8_lossy(&out.stdout);
        assert!(stdout.contains("NO_WINDOW_TEST"));
    }

    #[test]
    fn test_cancellable_process() {
        let cancelled = std::sync::Arc::new(AtomicBool::new(false));
        let c_clone = cancelled.clone();

        // Spawn a thread that cancels after 100ms
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(100));
            c_clone.store(true, Ordering::SeqCst);
        });

        // Run a powershell command that would normally sleep 2 seconds
        #[cfg(target_os = "windows")]
        let res = run_cancellable_process("powershell", ["-NoProfile", "-Command", "Start-Sleep -Seconds 2"], &cancelled);
        #[cfg(not(target_os = "windows"))]
        let res = run_cancellable_process("sleep", ["2"], &cancelled);

        assert!(res.is_err(), "Cancellable process must be interrupted");
    }
}
