#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use keyring::{Entry, Error as KeyringError};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const KEYRING_SERVICE: &str = "moke-vision-one";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileOperationResult {
    success: bool,
    file_path: Option<String>,
    canceled: Option<bool>,
    error: Option<String>,
}

#[derive(Serialize)]
struct SecureAvailabilityResult {
    available: bool,
    error: Option<String>,
}

#[derive(Serialize)]
struct SecureValueResult {
    value: Option<String>,
    error: Option<String>,
}

#[derive(Serialize)]
struct CommandResult {
    success: bool,
    error: Option<String>,
}

fn ok_file_result(path: &Path) -> FileOperationResult {
    FileOperationResult {
        success: true,
        file_path: Some(path.display().to_string()),
        canceled: None,
        error: None,
    }
}

fn err_file_result(error: impl ToString) -> FileOperationResult {
    FileOperationResult {
        success: false,
        file_path: None,
        canceled: None,
        error: Some(error.to_string()),
    }
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn decode_base64_payload(input: &str) -> Result<Vec<u8>, String> {
    let payload = input
        .split_once("base64,")
        .map(|(_, payload)| payload)
        .unwrap_or(input)
        .trim();

    STANDARD.decode(payload).map_err(|error| error.to_string())
}

fn write_bytes(file_path: PathBuf, bytes: Vec<u8>) -> FileOperationResult {
    if let Err(error) = ensure_parent_dir(&file_path) {
        return err_file_result(error);
    }

    match fs::write(&file_path, bytes) {
        Ok(_) => ok_file_result(&file_path),
        Err(error) => err_file_result(error),
    }
}

fn keyring_entry(key: &str) -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, key).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_base64_file(folder_path: String, file_name: String, base64_data: String) -> FileOperationResult {
    let file_path = PathBuf::from(folder_path).join(file_name);
    match decode_base64_payload(&base64_data) {
        Ok(bytes) => write_bytes(file_path, bytes),
        Err(error) => err_file_result(error),
    }
}

#[tauri::command]
fn save_text_file(folder_path: String, file_name: String, content: String) -> FileOperationResult {
    let file_path = PathBuf::from(folder_path).join(file_name);
    write_bytes(file_path, content.into_bytes())
}

#[tauri::command]
fn write_base64_file_at_path(file_path: String, base64_data: String) -> FileOperationResult {
    match decode_base64_payload(&base64_data) {
        Ok(bytes) => write_bytes(PathBuf::from(file_path), bytes),
        Err(error) => err_file_result(error),
    }
}

#[tauri::command]
fn write_binary_file_at_path(file_path: String, bytes: Vec<u8>) -> FileOperationResult {
    write_bytes(PathBuf::from(file_path), bytes)
}

#[tauri::command]
fn open_folder(folder_path: String) -> FileOperationResult {
    match open::that(folder_path.as_str()) {
        Ok(_) => FileOperationResult {
            success: true,
            file_path: Some(folder_path),
            canceled: None,
            error: None,
        },
        Err(error) => err_file_result(error),
    }
}

#[tauri::command]
fn open_external_url(url: String) -> CommandResult {
    match open::that(url.as_str()) {
        Ok(_) => CommandResult {
            success: true,
            error: None,
        },
        Err(error) => CommandResult {
            success: false,
            error: Some(error.to_string()),
        },
    }
}

#[tauri::command]
fn secure_is_available() -> SecureAvailabilityResult {
    match Entry::new(KEYRING_SERVICE, "availability-check") {
        Ok(_) => SecureAvailabilityResult {
            available: true,
            error: None,
        },
        Err(error) => SecureAvailabilityResult {
            available: false,
            error: Some(error.to_string()),
        },
    }
}

#[tauri::command]
fn secure_get(key: String) -> SecureValueResult {
    let entry = match keyring_entry(&key) {
        Ok(entry) => entry,
        Err(error) => {
            return SecureValueResult {
                value: None,
                error: Some(error),
            }
        }
    };

    match entry.get_password() {
        Ok(value) => SecureValueResult {
            value: Some(value),
            error: None,
        },
        Err(KeyringError::NoEntry) => SecureValueResult {
            value: None,
            error: None,
        },
        Err(error) => SecureValueResult {
            value: None,
            error: Some(error.to_string()),
        },
    }
}

#[tauri::command]
fn secure_set(key: String, value: String) -> CommandResult {
    let entry = match keyring_entry(&key) {
        Ok(entry) => entry,
        Err(error) => {
            return CommandResult {
                success: false,
                error: Some(error),
            }
        }
    };

    match entry.set_password(&value) {
        Ok(_) => CommandResult {
            success: true,
            error: None,
        },
        Err(error) => CommandResult {
            success: false,
            error: Some(error.to_string()),
        },
    }
}

#[tauri::command]
fn secure_delete(key: String) -> CommandResult {
    let entry = match keyring_entry(&key) {
        Ok(entry) => entry,
        Err(error) => {
            return CommandResult {
                success: false,
                error: Some(error),
            }
        }
    };

    match entry.delete_credential() {
        Ok(_) | Err(KeyringError::NoEntry) => CommandResult {
            success: true,
            error: None,
        },
        Err(error) => CommandResult {
            success: false,
            error: Some(error.to_string()),
        },
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_base64_file,
            save_text_file,
            write_base64_file_at_path,
            write_binary_file_at_path,
            open_folder,
            open_external_url,
            secure_is_available,
            secure_get,
            secure_set,
            secure_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}